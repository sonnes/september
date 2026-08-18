use serde::Serialize;

use crate::error::{BackendError, Result};

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OsUser {
    pub id: String,
    pub name: String,
}

pub fn normalize_os_user(id: &str, name: &str) -> Result<OsUser> {
    let id = id.trim();
    if id.is_empty() {
        return Err(BackendError::InvalidInput(
            "the OS user identifier is empty".into(),
        ));
    }
    let name = name.trim();
    Ok(OsUser {
        id: id.into(),
        name: if name.is_empty() {
            id.into()
        } else {
            name.into()
        },
    })
}

pub fn current_os_user() -> Result<OsUser> {
    normalize_os_user(&whoami::username(), &whoami::realname())
}
