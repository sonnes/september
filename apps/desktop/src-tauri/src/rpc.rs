use std::{fs, sync::Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::{
    apfel::{ApfelGenerateRequest, ApfelGeneration, ApfelState, ApfelStatus},
    providers::{self, Provider, ProviderStatus, Providers, Voice},
    repository::{Message, Note, Repository, SavedPhrase, Space},
    speech::{self, SpeechSettings},
};

pub(crate) struct BackendState {
    repository: Mutex<Repository>,
}

#[derive(Deserialize)]
pub(crate) struct KeyRequest {
    key: String,
}

#[derive(Deserialize)]
pub(crate) struct EntityIdRequest {
    id: String,
}

#[derive(Deserialize)]
pub(crate) struct SpaceListRequest {
    user_id: String,
}

#[derive(Deserialize)]
pub(crate) struct SpaceFilterRequest {
    space_id: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct ProviderRequest {
    provider: Provider,
}

#[derive(Deserialize)]
pub(crate) struct ProviderConnectRequest {
    provider: Provider,
    key: String,
}

#[derive(Deserialize)]
pub(crate) struct PhraseReplaceRequest {
    space_id: String,
    phrases: Vec<SavedPhrase>,
}

#[derive(Deserialize)]
pub(crate) struct SpeakRequest {
    text: String,
    settings: SpeechSettings,
}

#[derive(Serialize)]
pub(crate) struct SpokenAudio {
    /// The file on disk. The WebView reads it through the asset protocol.
    path: String,
    from_cache: bool,
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
    app.manage(ApfelState::default());
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

#[tauri::command(async)]
pub(crate) fn space_list(
    state: State<'_, BackendState>,
    request: SpaceListRequest,
) -> RpcResult<Vec<Space>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_spaces(&request.user_id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn space_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Space>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_space(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn space_put(state: State<'_, BackendState>, request: Space) -> RpcResult<Space> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_space(&request)
        .map_err(rpc_error)?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn space_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_space(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn message_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<Message>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_messages(request.space_id.as_deref())
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn message_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Message>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_message(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn message_put(state: State<'_, BackendState>, request: Message) -> RpcResult<Message> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_message(&request)
        .map_err(rpc_error)?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn message_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_message(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn note_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<Note>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_notes(request.space_id.as_deref())
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn note_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Note>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_note(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn note_put(state: State<'_, BackendState>, request: Note) -> RpcResult<Note> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_note(&request)
        .map_err(rpc_error)?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn note_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_note(&request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn phrase_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<SavedPhrase>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_phrases(request.space_id.as_deref())
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn phrase_put(
    state: State<'_, BackendState>,
    request: SavedPhrase,
) -> RpcResult<SavedPhrase> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_phrase(&request)
        .map_err(rpc_error)?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn phrase_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_phrase(&request.id)
        .map_err(rpc_error)
}

/// Puts the rows of a model in place of the rows before them.
///
/// A pinned row never changes. The erase and the insert happen together, so a
/// failure cannot leave a space with no phrases.
#[tauri::command(async)]
pub(crate) fn phrase_replace_ai(
    state: State<'_, BackendState>,
    request: PhraseReplaceRequest,
) -> RpcResult<Vec<SavedPhrase>> {
    let mut repository = state.repository.lock().map_err(lock_error)?;
    repository
        .replace_ai_phrases(&request.space_id, &request.phrases)
        .map_err(rpc_error)?;
    repository
        .list_phrases(Some(&request.space_id))
        .map_err(rpc_error)
}

/// The name the operating system holds for the signed-in user.
///
/// The result is empty when the system has no usable name. The onboarding
/// screen then starts with an empty field.
#[tauri::command(async)]
pub(crate) fn user_name() -> String {
    clean_name(&whoami::realname())
}

/// The login name of the operating system, for example `ravi`.
///
/// A space and a message need an identifier for the owner. The display name
/// from `user_name` can be empty, and the user can change it, so it cannot be
/// one. The command rejects when the system knows no login name.
#[tauri::command(async)]
pub(crate) fn user_id() -> RpcResult<String> {
    whoami::fallible::username()
        .ok()
        .as_deref()
        .and_then(login_name)
        .ok_or_else(|| "the system knows no login name".to_owned())
}

#[tauri::command]
pub(crate) async fn apfel_status(
    app: AppHandle,
    state: State<'_, ApfelState>,
) -> RpcResult<ApfelStatus> {
    Ok(state.status(&app).await)
}

#[tauri::command]
pub(crate) async fn apfel_generate(
    app: AppHandle,
    state: State<'_, ApfelState>,
    request: ApfelGenerateRequest,
) -> RpcResult<ApfelGeneration> {
    state.generate(&app, request).await.map_err(rpc_error)
}

/// One status for each cloud service. A stored key is tested again here,
/// because a key that worked in June can fail in August.
#[tauri::command]
pub(crate) async fn provider_status() -> RpcResult<Vec<ProviderStatus>> {
    let providers = Providers::default();
    let mut statuses = Vec::with_capacity(Provider::ALL.len());

    for provider in Provider::ALL {
        let status = match providers::stored(provider).map_err(rpc_error)? {
            Some(key) => providers
                .check(provider, &key)
                .await
                .unwrap_or_else(|error| ProviderStatus::broken(provider, error.to_string())),
            None => ProviderStatus::absent(provider),
        };
        statuses.push(status);
    }

    Ok(statuses)
}

/// Tests the key first. A key that fails never reaches the Keychain.
#[tauri::command]
pub(crate) async fn provider_connect(request: ProviderConnectRequest) -> RpcResult<ProviderStatus> {
    let status = Providers::default()
        .check(request.provider, &request.key)
        .await
        .map_err(rpc_error)?;
    providers::store(request.provider, &request.key).map_err(rpc_error)?;
    Ok(status)
}

#[tauri::command]
pub(crate) async fn provider_forget(request: ProviderRequest) -> RpcResult<bool> {
    providers::forget(request.provider).map_err(rpc_error)
}

/// The file that holds one sentence in the chosen voice.
///
/// The name of the file is the hash of the settings and the normalized words,
/// so the same request never goes to the service twice. The response carries
/// a path, never a key.
#[tauri::command]
pub(crate) async fn speech_synthesize(
    app: AppHandle,
    request: SpeakRequest,
) -> RpcResult<SpokenAudio> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(rpc_error)?
        .join("audio");
    let (path, from_cache) =
        speech::synthesize(&directory, &request.settings, &request.text).await?;

    Ok(SpokenAudio {
        path: path.to_string_lossy().into_owned(),
        from_cache,
    })
}

/// Text from OpenRouter, in the shape that `apfel_generate` answers in.
///
/// The key stays in the Keychain, so the call happens here and not in the
/// WebView.
#[tauri::command]
pub(crate) async fn openrouter_generate(
    request: ApfelGenerateRequest,
) -> RpcResult<ApfelGeneration> {
    let key = providers::stored(Provider::OpenRouter)
        .map_err(rpc_error)?
        .ok_or("no OpenRouter key is stored")?;
    Providers::default()
        .generate(&key, &request)
        .await
        .map_err(rpc_error)
}

/// The ElevenLabs voices for the stored key. The list is empty without a key.
#[tauri::command]
pub(crate) async fn provider_voices() -> RpcResult<Vec<Voice>> {
    let Some(key) = providers::stored(Provider::ElevenLabs).map_err(rpc_error)? else {
        return Ok(Vec::new());
    };
    Providers::default().voices(&key).await.map_err(rpc_error)
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

/// Keeps a login name that the repository accepts. A name of only spaces is
/// not one.
fn login_name(raw: &str) -> Option<String> {
    let name = raw.trim();
    (!name.is_empty()).then(|| name.to_owned())
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
    use super::{clean_name, login_name, EntityIdRequest, SpaceFilterRequest, SpaceListRequest};

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

    #[test]
    fn a_login_name_survives() {
        assert_eq!(login_name("ravi").as_deref(), Some("ravi"));
        assert_eq!(login_name("  ravi  ").as_deref(), Some("ravi"));
    }

    #[test]
    fn an_unusable_login_name_becomes_none() {
        assert_eq!(login_name(""), None);
        assert_eq!(login_name("   "), None);
    }

    #[test]
    fn domain_requests_use_snake_case_fields_inside_the_request_envelope() {
        let spaces: SpaceListRequest =
            serde_json::from_value(serde_json::json!({ "user_id": "user-1" })).unwrap();
        let messages: SpaceFilterRequest =
            serde_json::from_value(serde_json::json!({ "space_id": "space-1" })).unwrap();
        let all_notes: SpaceFilterRequest = serde_json::from_value(serde_json::json!({})).unwrap();
        let entity: EntityIdRequest =
            serde_json::from_value(serde_json::json!({ "id": "note-1" })).unwrap();

        assert_eq!(spaces.user_id, "user-1");
        assert_eq!(messages.space_id.as_deref(), Some("space-1"));
        assert_eq!(all_notes.space_id, None);
        assert_eq!(entity.id, "note-1");
    }
}
