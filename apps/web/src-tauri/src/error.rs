use thiserror::Error;

#[derive(Debug, Error)]
pub enum BackendError {
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("file not found")]
    FileNotFound,
    #[error("could not open external URL: {0}")]
    ExternalOpen(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),
}

pub type Result<T> = std::result::Result<T, BackendError>;
