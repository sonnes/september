//! One voice file for one sound.
//!
//! A file is named for what makes its sound: the voice settings and the
//! words. The same request therefore never goes to the service twice.

use std::{
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::providers::{Providers, NO_ELEVEN_LABS_KEY};

type Result<T> = std::result::Result<T, String>;

/// One cloud voice, with the values its model takes. The WebView resolves
/// them, so the model of the Dialogue voice and the stability modes of
/// Eleven v3 arrive here as plain values.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct VoiceSettings {
    pub voice_id: String,
    pub model_id: String,
    pub stability: f64,
    pub similarity: f64,
    pub speed: f64,
    pub file_settings: FileSettings,
}

/// The settings that name the voice file of a sentence. The WebView resolves
/// them. For the Dialogue voice they are the values that the user saved,
/// which are not the values that ElevenLabs gets.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct FileSettings {
    pub provider: String,
    pub model_id: String,
    pub stability: f64,
    pub similarity: f64,
    pub speed: f64,
}

/// The ElevenLabs sound format of a Dialogue stream: 16-bit mono samples at 24 kHz.
pub const STREAM_SAMPLE_RATE: u32 = 24_000;

/// The words without the spaces that a voice does not read.
///
/// The text keeps its case and its punctuation. Both change how a voice reads
/// a sentence, so both belong to the sound.
pub fn normalize(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// The name of the MP3 file that holds this sentence in this voice. The WAV
/// file of a Dialogue sentence has the same stem.
pub fn file_name(voice: &VoiceSettings, text: &str) -> String {
    // Three decimal places, so 0.5 and 0.50 give one name.
    let file = &voice.file_settings;
    let line = format!(
        "{}|{}|{}|{:.3}|{:.3}|{:.3}|{}",
        file.provider,
        voice.voice_id,
        file.model_id,
        file.stability,
        file.similarity,
        file.speed,
        normalize(text),
    );

    format!("{:x}.mp3", Sha256::digest(line.as_bytes()))
}

/// The MP3 file for this sentence, and whether it was there already.
///
/// No rule erases old files. One sentence is some tens of kilobytes.
pub async fn synthesize(
    directory: &Path,
    voice: &VoiceSettings,
    text: &str,
    key: Option<&str>,
    providers: &Providers,
) -> Result<(PathBuf, bool)> {
    let path = directory.join(file_name(voice, text));
    if path.exists() {
        return Ok((path, true));
    }

    let key = key.ok_or(NO_ELEVEN_LABS_KEY)?;
    let audio = providers
        .speak(key, voice, &normalize(text))
        .await
        .map_err(|error| error.to_string())?;

    write_whole(&path, &audio).map_err(|error| error.to_string())?;

    Ok((path, false))
}

/// How a sentence was heard.
#[derive(Debug)]
pub enum Streamed {
    /// A file plays the sentence: a kept file, or the MP3 file of the ElevenLabs voice.
    File { path: PathBuf, from_cache: bool },
    /// The Dialogue voice sent the sound, and the first sound came after this time.
    Spoken { first_audio: Duration },
}

/// A stream that stopped. `started` says whether any sound went out, because
/// a second voice must not say the words again after the first one began.
#[derive(Debug)]
pub struct StreamError {
    pub started: bool,
    pub message: String,
}

/// Finds a kept file, or makes the MP3 file of the voice, or speaks the
/// sentence through the Dialogue voice when `dialogue_parts` holds its parts.
///
/// Each Dialogue chunk of samples goes to `on_samples` as it arrives. The
/// samples of a complete sentence are kept as a WAV file beside the MP3 files.
/// A stopped sentence keeps nothing.
pub async fn stream(
    directory: &Path,
    voice: &VoiceSettings,
    text: &str,
    dialogue_parts: Option<&[String]>,
    key: Option<&str>,
    providers: &Providers,
    mut on_samples: impl FnMut(&[i16]),
) -> std::result::Result<Streamed, StreamError> {
    let not_started = |message: String| StreamError {
        started: false,
        message,
    };

    let Some(parts) = dialogue_parts else {
        let (path, from_cache) = tokio::time::timeout(
            providers.first_file_audio(),
            synthesize(directory, voice, text, key, providers),
        )
        .await
        .map_err(|_| not_started("ElevenLabs sent no sound in time.".into()))?
        .map_err(not_started)?;
        return Ok(Streamed::File { path, from_cache });
    };

    let mp3 = directory.join(file_name(voice, text));
    let wav = mp3.with_extension("wav");
    for path in [&wav, &mp3] {
        if path.exists() {
            return Ok(Streamed::File {
                path: path.clone(),
                from_cache: true,
            });
        }
    }

    let key = key.ok_or_else(|| not_started(NO_ELEVEN_LABS_KEY.into()))?;
    let began = Instant::now();
    let mut first_audio = None;
    let mut samples = Vec::new();
    let spoken = providers
        .speak_dialogue(key, voice, parts, |chunk: &[i16]| {
            first_audio.get_or_insert_with(|| began.elapsed());
            samples.extend_from_slice(chunk);
            on_samples(chunk);
        })
        .await;
    if let Err(error) = spoken {
        return Err(StreamError {
            started: !samples.is_empty(),
            message: error.to_string(),
        });
    }
    let Some(first_audio) = first_audio else {
        return Err(not_started("ElevenLabs sent no sound.".into()));
    };

    // The sentence was heard, so a file that cannot be written costs only a
    // second request later.
    if let Err(error) = keep_wav(&wav, &samples) {
        eprintln!("[speech] could not keep the voice file: {error}");
    }
    Ok(Streamed::Spoken { first_audio })
}

/// Writes 16-bit mono samples as a WAV file.
fn keep_wav(path: &Path, samples: &[i16]) -> std::io::Result<()> {
    let data = (samples.len() * 2) as u32;
    let mut bytes = Vec::with_capacity(44 + samples.len() * 2);
    bytes.extend_from_slice(b"RIFF");
    bytes.extend_from_slice(&(36 + data).to_le_bytes());
    bytes.extend_from_slice(b"WAVEfmt ");
    bytes.extend_from_slice(&16_u32.to_le_bytes());
    bytes.extend_from_slice(&1_u16.to_le_bytes()); // PCM
    bytes.extend_from_slice(&1_u16.to_le_bytes()); // mono
    bytes.extend_from_slice(&STREAM_SAMPLE_RATE.to_le_bytes());
    bytes.extend_from_slice(&(STREAM_SAMPLE_RATE * 2).to_le_bytes());
    bytes.extend_from_slice(&2_u16.to_le_bytes());
    bytes.extend_from_slice(&16_u16.to_le_bytes());
    bytes.extend_from_slice(b"data");
    bytes.extend_from_slice(&data.to_le_bytes());
    for sample in samples {
        bytes.extend_from_slice(&sample.to_le_bytes());
    }

    write_whole(path, &bytes)
}

/// Writes a voice file under a name that holds the file only after its last
/// byte, so a stopped app leaves no half-written file under that name.
fn write_whole(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(directory) = path.parent() {
        std::fs::create_dir_all(directory)?;
    }
    let partial = path.with_extension("part");
    std::fs::write(&partial, bytes)?;
    std::fs::rename(&partial, path)
}

#[cfg(test)]
mod tests {
    use super::{file_name, synthesize, FileSettings, VoiceSettings};
    use crate::providers::Providers;

    fn voice() -> VoiceSettings {
        VoiceSettings {
            voice_id: "voice-1".into(),
            model_id: "eleven_flash_v2_5".into(),
            stability: 0.5,
            similarity: 0.75,
            speed: 1.0,
            file_settings: FileSettings {
                provider: "elevenlabs".into(),
                model_id: "eleven_flash_v2_5".into(),
                stability: 0.5,
                similarity: 0.75,
                speed: 1.0,
            },
        }
    }

    #[test]
    fn the_voice_of_the_screen_arrives_whole() {
        let sent = serde_json::json!({
            "voiceId": "voice-1",
            "modelId": "eleven_flash_v2_5",
            "stability": 0.5,
            "similarity": 0.75,
            "speed": 1.0,
            "fileSettings": {
                "provider": "elevenlabs",
                "modelId": "eleven_flash_v2_5",
                "stability": 0.5,
                "similarity": 0.75,
                "speed": 1.0,
            },
        });
        let sent: VoiceSettings = serde_json::from_value(sent).unwrap();

        assert_eq!(file_name(&sent, "Hello"), file_name(&voice(), "Hello"));
    }

    #[test]
    fn a_voice_file_keeps_the_name_of_its_saved_settings() {
        assert_eq!(
            file_name(&voice(), " Hello   world "),
            "e3f2731ebb4264780916732f5ff2cca005e32bec46359493f9cb82e83ade539a.mp3"
        );

        // The Dialogue voice sends Eleven v3 a stability mode and no speed,
        // and names its file with the values that the user saved.
        let mut dialogue = voice();
        dialogue.model_id = "eleven_v3_conversational".into();
        dialogue.stability = 0.5;
        dialogue.file_settings = FileSettings {
            provider: "dialogue".into(),
            model_id: "eleven_v3_conversational".into(),
            stability: 0.6,
            similarity: 0.75,
            speed: 1.2,
        };
        assert_eq!(
            file_name(&dialogue, "Hello world"),
            "77c68fe9187c14690c9e5bb5932cf717fe408fb85950e3d91e5cf4ef8571e171.mp3"
        );
    }

    #[test]
    fn extra_spaces_give_one_name() {
        assert_eq!(
            file_name(&voice(), "I want some water"),
            file_name(&voice(), "  I want   some\n water  "),
        );
    }

    #[test]
    fn a_changed_setting_gives_a_new_name() {
        let base = file_name(&voice(), "Hello");
        let changes: [fn(&mut VoiceSettings); 6] = [
            |v| v.file_settings.provider = "dialogue".into(),
            |v| v.file_settings.stability = 0.6,
            |v| v.file_settings.similarity = 0.7,
            |v| v.file_settings.speed = 1.1,
            |v| v.voice_id = "voice-2".into(),
            |v| v.file_settings.model_id = "eleven_v3".into(),
        ];
        for change in changes {
            let mut changed = voice();
            change(&mut changed);
            assert_ne!(base, file_name(&changed, "Hello"));
        }
    }

    #[test]
    fn the_same_number_written_two_ways_gives_one_name() {
        let mut rounded = voice();
        rounded.file_settings.stability = 0.5000004;
        assert_eq!(file_name(&voice(), "Hello"), file_name(&rounded, "Hello"));
    }

    #[test]
    fn a_changed_word_gives_a_new_name() {
        assert_ne!(file_name(&voice(), "Hello"), file_name(&voice(), "hello"));
    }

    #[tokio::test]
    async fn a_file_that_is_there_needs_no_service() {
        let directory =
            std::env::temp_dir().join(format!("september-speech-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join(file_name(&voice(), "Hello"));
        std::fs::write(&path, b"pretend audio").unwrap();

        // No key is passed, so a call to the service would fail.
        let (found, from_cache) = synthesize(
            &directory,
            &voice(),
            "  Hello  ",
            None,
            &Providers::default(),
        )
        .await
        .unwrap();

        assert!(from_cache);
        assert_eq!(found, path);
        std::fs::remove_dir_all(&directory).ok();
    }
}
