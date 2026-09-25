//! One voice file for one sound.
//!
//! A file is named for what makes its sound: the settings and the words. The
//! same request therefore never goes to the service twice.

use std::{
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::providers::Providers;

/// ponytail: the caller is one Tauri command, which answers with a string.
/// A typed error would gain nothing on the way.
type Result<T> = std::result::Result<T, String>;

/// Everything that shapes the sound of one sentence.
///
/// The WebView sends these fields, so the names are the names of the screen.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechSettings {
    pub provider: String,
    pub voice_id: Option<String>,
    pub model_id: String,
    /// The model of the Dialogue voice. An older setting does not have it.
    #[serde(default)]
    pub dialogue_model_id: Option<String>,
    pub stability: f64,
    pub similarity: f64,
    pub speed: f64,
}

/// The words without the spaces that a voice does not read.
///
/// The text keeps its case and its punctuation. Both change how a voice reads
/// a sentence, so both belong to the sound.
pub fn normalize(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// The name of the file that holds this sentence in this voice.
pub fn file_name(settings: &SpeechSettings, text: &str) -> String {
    // Three decimal places, so 0.5 and 0.50 give one name.
    // The Dialogue voice ignores the saved model and names its own.
    let model = if settings.provider == DIALOGUE_PROVIDER {
        dialogue_model(settings)
    } else {
        settings.model_id.as_str()
    };
    let line = format!(
        "{}|{}|{}|{:.3}|{:.3}|{:.3}|{}",
        settings.provider,
        settings.voice_id.as_deref().unwrap_or(""),
        model,
        settings.stability,
        settings.similarity,
        settings.speed,
        normalize(text),
    );

    format!("{:x}.mp3", Sha256::digest(line.as_bytes()))
}

/// The file for this sentence, and whether it was there already.
///
/// ponytail: no rule erases old files. One sentence is some tens of kilobytes,
/// so a year of talk stays small. Add a rule when the directory grows past a
/// size that a user notices.
pub async fn synthesize(
    directory: &Path,
    settings: &SpeechSettings,
    text: &str,
    key: Option<&str>,
    providers: &Providers,
) -> Result<(PathBuf, bool)> {
    let path = directory.join(file_name(settings, text));
    if path.exists() {
        return Ok((path, true));
    }

    let key = key.ok_or("Connect ElevenLabs in Settings first.")?;
    let audio = providers
        .speak(key, settings, &normalize(text))
        .await
        .map_err(|error| error.to_string())?;

    std::fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    // A stopped application leaves no half-written file under a name that
    // says it is complete.
    let partial = path.with_extension("part");
    std::fs::write(&partial, &audio).map_err(|error| error.to_string())?;
    std::fs::rename(&partial, &path).map_err(|error| error.to_string())?;

    Ok((path, false))
}

/// The ElevenLabs sound format of a stream: 16-bit mono samples at 24 kHz.
pub const STREAM_SAMPLE_RATE: u32 = 24_000;

/// The ElevenLabs models that the voice socket does not accept.
const FILE_ONLY_MODELS: [&str; 1] = ["eleven_v3"];

/// The provider name of the ElevenLabs Dialogue voice, as the WebView sends it.
pub const DIALOGUE_PROVIDER: &str = "dialogue";
/// The first model of the Dialogue voice.
pub const DIALOGUE_MODEL: &str = "eleven_v3";
/// The realtime model of the Dialogue voice. It has only the dialogue socket.
pub const CONVERSATIONAL_MODEL: &str = "eleven_v3_conversational";

/// The model of the Dialogue voice, or Eleven v3 for a missing or other model.
/// The same rule is `dialogueModelFrom` in `packages/core/rules/voice.ts`.
pub fn dialogue_model(settings: &SpeechSettings) -> &str {
    match settings.dialogue_model_id.as_deref() {
        Some(model @ (DIALOGUE_MODEL | CONVERSATIONAL_MODEL)) => model,
        _ => DIALOGUE_MODEL,
    }
}
/// ElevenLabs keeps a dialogue request reliable up to this many characters.
const DIALOGUE_LIMIT: usize = 2000;

/// The Eleven v3 stability mode nearest to `stability`: 1.0, 0.5, or 0.0.
pub fn v3_stability(stability: f64) -> f64 {
    [1.0, 0.5, 0.0]
        .into_iter()
        .min_by(|a: &f64, b: &f64| (a - stability).abs().total_cmp(&(b - stability).abs()))
        .unwrap_or(0.5)
}

/// The text in parts that one dialogue request each can hold.
///
/// A part ends at a sentence end. A sentence longer than the limit ends at
/// the last space before the limit, or at the limit when it has no space.
/// The same rule is `dialogueParts` in `packages/core/rules/voice.ts`.
pub fn dialogue_parts(text: &str, limit: usize) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();
    let mut chars = text.trim().chars().peekable();
    while let Some(character) = chars.next() {
        current.push(character);
        let ends =
            matches!(character, '.' | '!' | '?') && !matches!(chars.peek(), Some('.' | '!' | '?'));
        if ends {
            sentences.push(std::mem::take(&mut current));
        }
    }
    sentences.push(current);

    let mut pieces = Vec::new();
    for sentence in sentences {
        let mut rest = sentence.trim().to_owned();
        while rest.chars().count() > limit {
            let head: String = rest.chars().take(limit).collect();
            let cut = match head.rfind(' ') {
                Some(space) if space > 0 => space,
                _ => head.len(),
            };
            pieces.push(rest[..cut].trim().to_owned());
            rest = rest[cut..].trim().to_owned();
        }
        if !rest.is_empty() {
            pieces.push(rest);
        }
    }

    let mut parts: Vec<String> = Vec::new();
    for piece in pieces {
        match parts.last_mut() {
            Some(last) if last.chars().count() + 1 + piece.chars().count() <= limit => {
                last.push(' ');
                last.push_str(&piece);
            }
            _ => parts.push(piece),
        }
    }
    parts
}

/// How a sentence was heard.
#[derive(Debug)]
pub enum Streamed {
    /// A file plays the sentence: a kept file, or a model without a socket.
    File { path: PathBuf, from_cache: bool },
    /// The socket sent the sound, and the first sound came after this time.
    Spoken { first_audio: Duration },
}

/// A stream that stopped. `started` says whether any sound went out, because
/// a second voice must not say the words again after the first one began.
#[derive(Debug)]
pub struct StreamError {
    pub started: bool,
    pub message: String,
}

/// Speaks one sentence through the voice socket, or finds a kept file.
///
/// Each chunk of samples goes to `on_samples` as it arrives. The samples of a
/// complete sentence are kept as a WAV file beside the MP3 files, so the same
/// sentence never goes to the service twice. A stopped sentence keeps nothing.
pub async fn stream(
    directory: &Path,
    settings: &SpeechSettings,
    text: &str,
    key: Option<&str>,
    providers: &Providers,
    mut on_samples: impl FnMut(&[i16]),
) -> std::result::Result<Streamed, StreamError> {
    let not_started = |message: String| StreamError {
        started: false,
        message,
    };
    let mp3 = directory.join(file_name(settings, text));
    let wav = mp3.with_extension("wav");
    for path in [wav.clone(), mp3] {
        if path.exists() {
            return Ok(Streamed::File {
                path,
                from_cache: true,
            });
        }
    }

    let dialogue = settings.provider == DIALOGUE_PROVIDER;
    if !dialogue && FILE_ONLY_MODELS.contains(&settings.model_id.as_str()) {
        let (path, from_cache) = synthesize(directory, settings, text, key, providers)
            .await
            .map_err(not_started)?;
        return Ok(Streamed::File { path, from_cache });
    }

    let key = key.ok_or_else(|| not_started("Connect ElevenLabs in Settings first.".into()))?;
    let began = Instant::now();
    let mut first_audio = None;
    let mut samples = Vec::new();
    let mut heard = |chunk: &[i16]| {
        first_audio.get_or_insert_with(|| began.elapsed());
        samples.extend_from_slice(chunk);
        on_samples(chunk);
    };
    let spoken = if dialogue && dialogue_model(settings) == CONVERSATIONAL_MODEL {
        let parts = dialogue_parts(&normalize(text), DIALOGUE_LIMIT);
        providers
            .speak_dialogue_socket(key, settings, &parts, &mut heard)
            .await
    } else if dialogue {
        let mut spoken = Ok(());
        for part in dialogue_parts(&normalize(text), DIALOGUE_LIMIT) {
            spoken = providers
                .speak_dialogue_stream(key, settings, &part, &mut heard)
                .await;
            if spoken.is_err() {
                break;
            }
        }
        spoken
    } else {
        providers
            .speak_stream(key, settings, &normalize(text), &mut heard)
            .await
    };
    if let Err(error) = spoken {
        return Err(StreamError {
            started: !samples.is_empty(),
            message: error.to_string(),
        });
    }
    if samples.is_empty() {
        return Err(StreamError {
            started: false,
            message: "ElevenLabs sent no sound.".into(),
        });
    }

    // The sentence was heard, so a file that cannot be written costs only a
    // second request later.
    let _ = keep_wav(&wav, &samples);
    Ok(Streamed::Spoken {
        first_audio: first_audio.unwrap_or_default(),
    })
}

/// Writes 16-bit mono samples as a WAV file, under a name that is complete
/// only after the last byte.
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

    if let Some(directory) = path.parent() {
        std::fs::create_dir_all(directory)?;
    }
    let partial = path.with_extension("part");
    std::fs::write(&partial, &bytes)?;
    std::fs::rename(&partial, path)
}

#[cfg(test)]
mod tests {
    use super::{dialogue_parts, file_name, normalize, synthesize, v3_stability, SpeechSettings};
    use crate::providers::Providers;

    fn settings() -> SpeechSettings {
        SpeechSettings {
            provider: "elevenlabs".into(),
            voice_id: Some("voice-1".into()),
            model_id: "eleven_turbo_v2_5".into(),
            dialogue_model_id: None,
            stability: 0.5,
            similarity: 0.75,
            speed: 1.0,
        }
    }

    #[test]
    fn the_settings_of_the_screen_arrive_whole() {
        // The Voice screen sends the fields of `SpeechSettings` in TypeScript.
        // A name that does not match makes every cloud sentence fail.
        let sent = serde_json::json!({
            "provider": "elevenlabs",
            "voiceId": "voice-1",
            "modelId": "eleven_turbo_v2_5",
            "stability": 0.5,
            "similarity": 0.75,
            "speed": 1.0,
        });
        let settings: SpeechSettings = serde_json::from_value(sent).unwrap();

        assert_eq!(settings.voice_id.as_deref(), Some("voice-1"));
        assert_eq!(settings.model_id, "eleven_turbo_v2_5");
    }

    #[test]
    fn only_the_spaces_between_words_change() {
        assert_eq!(normalize("  I want   some\n water "), "I want some water");
        assert_eq!(normalize("Mr. Smith, ASAP!"), "Mr. Smith, ASAP!");
        assert_eq!(normalize("   "), "");
    }

    #[test]
    fn extra_spaces_give_one_name() {
        assert_eq!(
            file_name(&settings(), "I want some water"),
            file_name(&settings(), "  I want   some water  "),
        );
    }

    #[test]
    fn a_changed_setting_gives_a_new_name() {
        let base = file_name(&settings(), "Hello");

        let mut louder = settings();
        louder.stability = 0.6;
        assert_ne!(base, file_name(&louder, "Hello"));

        let mut other_voice = settings();
        other_voice.voice_id = Some("voice-2".into());
        assert_ne!(base, file_name(&other_voice, "Hello"));

        let mut faster = settings();
        faster.speed = 1.1;
        assert_ne!(base, file_name(&faster, "Hello"));
    }

    #[test]
    fn the_same_number_written_two_ways_gives_one_name() {
        let mut rounded = settings();
        rounded.stability = 0.5000004;
        assert_eq!(
            file_name(&settings(), "Hello"),
            file_name(&rounded, "Hello")
        );
    }

    #[test]
    fn a_changed_word_gives_a_new_name() {
        assert_ne!(
            file_name(&settings(), "Hello"),
            file_name(&settings(), "hello")
        );
    }

    #[tokio::test]
    async fn a_file_that_is_there_needs_no_service() {
        let directory =
            std::env::temp_dir().join(format!("september-speech-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join(file_name(&settings(), "Hello"));
        std::fs::write(&path, b"pretend audio").unwrap();

        // No key is passed in a test, so a call to the service would fail.
        // The extra spaces prove that the lookup reads the normalized words.
        let (found, from_cache) = synthesize(
            &directory,
            &settings(),
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

    #[test]
    fn the_name_is_hex_and_mp3() {
        let name = file_name(&settings(), "Hello");
        let (stem, extension) = name.split_once('.').unwrap();

        assert_eq!(extension, "mp3");
        assert_eq!(stem.len(), 64);
        assert!(stem
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_uppercase()));
    }

    #[test]
    fn a_short_text_is_one_dialogue_part() {
        assert_eq!(
            dialogue_parts("Hello there. How are you?", 2000),
            ["Hello there. How are you?"]
        );
    }

    #[test]
    fn a_long_text_is_cut_at_sentence_ends() {
        assert_eq!(
            dialogue_parts("One two three. Four five six. Seven eight nine.", 30),
            ["One two three. Four five six.", "Seven eight nine."]
        );
    }

    #[test]
    fn a_sentence_longer_than_the_limit_is_cut_at_the_last_space() {
        assert_eq!(
            dialogue_parts("alpha beta gamma delta", 12),
            ["alpha beta", "gamma delta"]
        );
    }

    #[test]
    fn an_empty_text_has_no_dialogue_parts() {
        assert!(dialogue_parts("   ", 2000).is_empty());
    }

    #[test]
    fn a_stability_snaps_to_the_nearest_eleven_v3_mode() {
        assert_eq!(v3_stability(0.1), 0.0);
        assert_eq!(v3_stability(0.35), 0.5);
        assert_eq!(v3_stability(0.8), 1.0);
    }
}
