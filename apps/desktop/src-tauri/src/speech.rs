//! One voice file for one sound.
//!
//! A file is named for what makes its sound: the settings and the words. The
//! same request therefore never goes to the service twice.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::providers::{self, Provider, Providers};

/// ponytail: the caller is one Tauri command, which answers with a string.
/// A typed error would gain nothing on the way.
type Result<T> = std::result::Result<T, String>;

/// Everything that shapes the sound of one sentence.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SpeechSettings {
    pub provider: String,
    pub voice_id: Option<String>,
    pub model_id: String,
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
    let line = format!(
        "{}|{}|{}|{:.3}|{:.3}|{:.3}|{}",
        settings.provider,
        settings.voice_id.as_deref().unwrap_or(""),
        settings.model_id,
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
) -> Result<(PathBuf, bool)> {
    let path = directory.join(file_name(settings, text));
    if path.exists() {
        return Ok((path, true));
    }

    let key = providers::stored(Provider::ElevenLabs)
        .map_err(|error| error.to_string())?
        .ok_or("no ElevenLabs key is stored")?;
    let audio = Providers::default()
        .speak(&key, settings, &normalize(text))
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

#[cfg(test)]
mod tests {
    use super::{file_name, normalize, synthesize, SpeechSettings};

    fn settings() -> SpeechSettings {
        SpeechSettings {
            provider: "elevenlabs".into(),
            voice_id: Some("voice-1".into()),
            model_id: "eleven_turbo_v2_5".into(),
            stability: 0.5,
            similarity: 0.75,
            speed: 1.0,
        }
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

        // No key is stored in a test, so a call to the service would fail.
        // The extra spaces prove that the lookup reads the normalized words.
        let (found, from_cache) = synthesize(&directory, &settings(), "  Hello  ")
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
}
