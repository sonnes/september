use std::{fs, sync::Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::repository::Repository;

pub(crate) struct BackendState {
    repository: Mutex<Repository>,
}

#[derive(Deserialize)]
pub(crate) struct KeyRequest {
    key: String,
}

#[derive(Deserialize)]
pub(crate) struct SettingPutRequest {
    key: String,
    value: Value,
}

#[derive(Clone, Serialize)]
struct SettingsChanged {
    keys: Vec<String>,
}

pub(crate) fn setup(app: &mut tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let data_directory = app.path().app_local_data_dir()?;
    fs::create_dir_all(&data_directory)?;
    let repository = Repository::open(data_directory.join("september.sqlite3"))?;
    app.manage(BackendState {
        repository: Mutex::new(repository),
    });
    Ok(())
}

#[tauri::command(async)]
pub(crate) fn setting_get(
    state: State<'_, BackendState>,
    request: KeyRequest,
) -> RpcResult<Option<Value>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_setting(&request.key)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn setting_put(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: SettingPutRequest,
) -> RpcResult<Value> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_setting(&request.key, &request.value)
        .map_err(rpc_error)?;
    app.emit(
        "september://settings-changed",
        SettingsChanged {
            keys: vec![request.key],
        },
    )
    .map_err(rpc_error)?;
    Ok(request.value)
}

#[tauri::command(async)]
pub(crate) fn setting_delete(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: KeyRequest,
) -> RpcResult<bool> {
    let deleted = state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_setting(&request.key)
        .map_err(rpc_error)?;
    if deleted {
        app.emit(
            "september://settings-changed",
            SettingsChanged {
                keys: vec![request.key],
            },
        )
        .map_err(rpc_error)?;
    }
    Ok(deleted)
}

/// The name the operating system holds for the signed-in user.
///
/// The result is empty when the system has no usable name. The onboarding
/// screen then starts with an empty field.
#[tauri::command(async)]
pub(crate) fn user_name() -> String {
    clean_name(&whoami::realname())
}

/// Keeps the first GECOS field and rejects the placeholder `whoami` supplies
/// when the system knows no name.
fn clean_name(raw: &str) -> String {
    let name = raw.split(',').next().unwrap_or_default().trim();
    if name == "Unknown" {
        return String::new();
    }
    name.to_owned()
}

type RpcResult<T> = std::result::Result<T, String>;

fn rpc_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn lock_error<T>(_: std::sync::PoisonError<T>) -> String {
    "desktop storage lock is poisoned".into()
}

#[cfg(test)]
mod tests {
    use super::clean_name;

    #[test]
    fn a_display_name_survives() {
        assert_eq!(clean_name("Ravi Atluri"), "Ravi Atluri");
    }

    #[test]
    fn gecos_fields_after_the_name_are_dropped() {
        assert_eq!(clean_name("Ravi Atluri,,,"), "Ravi Atluri");
        assert_eq!(clean_name("Ravi Atluri,Room 1,555,555"), "Ravi Atluri");
    }

    #[test]
    fn an_unusable_name_becomes_empty() {
        assert_eq!(clean_name(""), "");
        assert_eq!(clean_name("   "), "");
        assert_eq!(clean_name("Unknown"), "");
        assert_eq!(clean_name(",,,"), "");
    }
}
