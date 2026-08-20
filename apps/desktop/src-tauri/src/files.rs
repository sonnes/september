use std::{
    fs,
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use uuid::Uuid;

use crate::{
    error::{BackendError, Result},
    repository::{FileMetadata, Repository, StoredFileMetadata},
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExportSuggestion {
    pub file_name: String,
    pub media_type: String,
    pub extension: String,
    pub filter_name: String,
}

pub struct FileStore {
    directory: PathBuf,
}

impl FileStore {
    pub fn new(app_local_data: impl AsRef<Path>) -> Result<Self> {
        let directory = app_local_data.as_ref().join("files");
        fs::create_dir_all(&directory)?;
        Ok(Self { directory })
    }

    pub fn write(
        &self,
        repository: &mut Repository,
        kind: &str,
        media_type: &str,
        bytes: &[u8],
    ) -> Result<FileMetadata> {
        validate_label("file kind", kind, 128)?;
        validate_label("media type", media_type, 256)?;
        let id = Uuid::new_v4().to_string();
        let relative_name = id.clone();
        let final_path = self.resolve_relative_name(&relative_name)?;
        let temporary_path = self.directory.join(format!("{id}.tmp"));
        fs::write(&temporary_path, bytes)?;
        fs::rename(&temporary_path, &final_path)?;

        let now = now_millis()?;
        let stored = StoredFileMetadata {
            metadata: FileMetadata {
                id,
                kind: kind.into(),
                media_type: media_type.into(),
                size: i64::try_from(bytes.len()).map_err(|_| {
                    BackendError::InvalidInput("file is too large to represent".into())
                })?,
                created_at: now,
                updated_at: now,
            },
            relative_name,
        };
        if let Err(error) = repository.insert_file_metadata(&stored) {
            let _ = fs::remove_file(&final_path);
            return Err(error);
        }
        Ok(stored.metadata)
    }

    pub fn read(&self, repository: &Repository, id: &str) -> Result<Vec<u8>> {
        validate_id(id)?;
        let stored = repository
            .get_file_metadata(id)?
            .ok_or(BackendError::FileNotFound)?;
        Ok(fs::read(
            self.resolve_relative_name(&stored.relative_name)?,
        )?)
    }

    pub fn metadata(&self, repository: &Repository, id: &str) -> Result<Option<FileMetadata>> {
        validate_id(id)?;
        Ok(repository
            .get_file_metadata(id)?
            .map(|stored| stored.metadata))
    }

    pub fn list(&self, repository: &Repository, kind: Option<&str>) -> Result<Vec<FileMetadata>> {
        if let Some(kind) = kind {
            validate_label("file kind", kind, 128)?;
        }
        Ok(repository
            .list_file_metadata(kind)?
            .into_iter()
            .map(|stored| stored.metadata)
            .collect())
    }

    pub fn delete(&self, repository: &mut Repository, id: &str) -> Result<bool> {
        validate_id(id)?;
        let Some(stored) = repository.get_file_metadata(id)? else {
            return Ok(false);
        };
        let path = self.resolve_relative_name(&stored.relative_name)?;
        match fs::remove_file(path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        repository.delete_file_metadata(id)
    }

    fn resolve_relative_name(&self, relative_name: &str) -> Result<PathBuf> {
        validate_id(relative_name)?;
        let relative = Path::new(relative_name);
        if relative.components().count() != 1
            || !matches!(relative.components().next(), Some(Component::Normal(_)))
        {
            return Err(BackendError::InvalidInput(
                "invalid stored file name".into(),
            ));
        }
        Ok(self.directory.join(relative))
    }
}

pub fn export_suggestion(
    suggested_name: Option<&str>,
    media_type: Option<&str>,
) -> ExportSuggestion {
    let normalized_media_type = media_type
        .and_then(|value| value.split(';').next())
        .map(str::trim)
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    let (media_type, extension, filter_name) = match normalized_media_type.as_str() {
        "application/json" => ("application/json", "json", "JSON document"),
        "application/pdf" => ("application/pdf", "pdf", "PDF document"),
        "audio/mp4" => ("audio/mp4", "m4a", "MPEG-4 audio"),
        "audio/mpeg" => ("audio/mpeg", "mp3", "MP3 audio"),
        "audio/wav" => ("audio/wav", "wav", "WAV audio"),
        "audio/webm" => ("audio/webm", "webm", "WebM audio"),
        "image/jpeg" => ("image/jpeg", "jpg", "JPEG image"),
        "image/png" => ("image/png", "png", "PNG image"),
        "text/csv" => ("text/csv", "csv", "CSV document"),
        "text/markdown" => ("text/markdown", "md", "Markdown document"),
        "text/plain" => ("text/plain", "txt", "Text document"),
        "video/mp4" => ("video/mp4", "mp4", "MPEG-4 video"),
        _ => ("application/octet-stream", "bin", "Binary file"),
    };

    let leaf_name = suggested_name
        .unwrap_or_default()
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or_default();
    let sanitized: String = leaf_name
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || matches!(character, ' ' | '.' | '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect();
    let sanitized = sanitized.trim_matches([' ', '.']);
    let stem = sanitized
        .rsplit_once('.')
        .map_or(sanitized, |(stem, _)| stem)
        .trim_matches([' ', '.']);
    let mut bounded_stem = String::new();
    for character in stem.chars() {
        if bounded_stem.len() + character.len_utf8() > 160 {
            break;
        }
        bounded_stem.push(character);
    }
    let bounded_stem = bounded_stem.trim_matches([' ', '.']);
    let mut safe_stem =
        if bounded_stem.is_empty() || !bounded_stem.chars().any(char::is_alphanumeric) {
            "september-export".to_string()
        } else {
            bounded_stem.to_string()
        };
    if is_windows_reserved_name(&safe_stem) {
        safe_stem.insert_str(0, "september-");
    }

    ExportSuggestion {
        file_name: format!("{safe_stem}.{extension}"),
        media_type: media_type.into(),
        extension: extension.into(),
        filter_name: filter_name.into(),
    }
}

pub fn export_bytes(
    bytes: &[u8],
    suggested_name: Option<&str>,
    media_type: Option<&str>,
) -> Result<bool> {
    let suggestion = export_suggestion(suggested_name, media_type);
    let selected_path = rfd::FileDialog::new()
        .set_file_name(&suggestion.file_name)
        .add_filter(&suggestion.filter_name, &[&suggestion.extension])
        .save_file();
    let Some(selected_path) = selected_path else {
        return Ok(false);
    };
    fs::write(selected_path, bytes)?;
    Ok(true)
}

fn is_windows_reserved_name(name: &str) -> bool {
    let normalized = name.to_ascii_uppercase();
    matches!(
        normalized.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

fn validate_id(id: &str) -> Result<()> {
    let parsed = Uuid::parse_str(id)
        .map_err(|_| BackendError::InvalidInput("file id must be an opaque UUID".into()))?;
    if parsed.get_version_num() != 4 {
        return Err(BackendError::InvalidInput(
            "file id must be an opaque UUID".into(),
        ));
    }
    Ok(())
}

fn validate_label(label: &str, value: &str, max_len: usize) -> Result<()> {
    if value.is_empty() || value.len() > max_len || value.chars().any(char::is_control) {
        return Err(BackendError::InvalidInput(format!(
            "{label} must contain 1 to {max_len} non-control characters"
        )));
    }
    Ok(())
}

fn now_millis() -> Result<i64> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| BackendError::InvalidInput("system clock is before Unix epoch".into()))?
        .as_millis();
    i64::try_from(millis).map_err(|_| {
        BackendError::InvalidInput("system clock is outside the supported range".into())
    })
}
