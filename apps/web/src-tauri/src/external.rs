use url::Url;

use crate::error::{BackendError, Result};

pub fn validate_external_url(value: &str) -> Result<String> {
    if value.is_empty()
        || value.len() > 8_192
        || value != value.trim()
        || value.chars().any(char::is_control)
    {
        return Err(BackendError::InvalidInput(
            "external URL contains invalid characters".into(),
        ));
    }

    let parsed = Url::parse(value)
        .map_err(|_| BackendError::InvalidInput("external URL is not valid".into()))?;
    match parsed.scheme() {
        "http" | "https" if parsed.host_str().is_some() => {}
        "mailto" if !parsed.path().is_empty() => {}
        _ => {
            return Err(BackendError::InvalidInput(
                "external URL must use http, https, or mailto".into(),
            ));
        }
    }
    Ok(value.to_string())
}

pub fn open_external_url(value: &str) -> Result<()> {
    let validated = validate_external_url(value)?;
    open::that_detached(validated).map_err(|error| BackendError::ExternalOpen(error.to_string()))
}
