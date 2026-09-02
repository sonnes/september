use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    ipc::{InvokeBody, Request as IpcRequest},
    AppHandle, Emitter, Manager, State,
};

use crate::{
    apfel::{ApfelGenerateRequest, ApfelGeneration, ApfelState, ApfelStatus},
    audio::{self, AudioDevice, VirtualMicrophoneStatus},
    gaze::GazeState,
    providers::{
        CreatedVoice, ElevenLabsQuota, Model, Provider, ProviderKeys, ProviderStatus, Providers,
        Voice, WritingModel,
    },
    proxy::{Endpoint, WritingProxy},
    repository::{
        AgentMessage, AnalyticsEvent, BackupContents, Message, Note, Repository, SavedPhrase,
        Space, SpacePatch,
    },
    speech::{self, SpeechSettings},
};

pub(crate) struct BackendState {
    repository: Mutex<Repository>,
}

pub(crate) const ANALYTICS_RETENTION_MS: i64 = 90 * 24 * 60 * 60 * 1_000;
const MAX_VOICE_CLONE_BYTES: usize = 100 * 1024 * 1024;
const AUDIO_OUTPUT_SETTING: &str = "audio-output";

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub(crate) fn retention_cutoff_ms(now: i64) -> i64 {
    now.saturating_sub(ANALYTICS_RETENTION_MS).max(0)
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
pub(crate) struct AgentToolStateRequest {
    id: String,
    expected: String,
    state: String,
    content: String,
    updated_at: i64,
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
pub(crate) struct AnalyticsListRequest {
    user_id: String,
    start_at: i64,
    end_at: i64,
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
pub(crate) struct AudioOutputRequest {
    uid: String,
}

#[derive(Deserialize)]
pub(crate) struct SpeakRequest {
    text: String,
    settings: SpeechSettings,
}

#[derive(Deserialize)]
pub(crate) struct SystemSpeechRequest {
    text: String,
    voice_id: Option<String>,
    speed: f32,
}

#[derive(Deserialize)]
pub(crate) struct SpeechFileRequest {
    path: PathBuf,
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
    // A public aggregate device can outlive a process that crashed. Each new
    // start removes that stale device, so the microphone begins off.
    let _ = audio::virtual_microphone_stop();

    let data_directory = app.path().app_local_data_dir()?;
    fs::create_dir_all(&data_directory)?;
    let repository = Repository::open(data_directory.join("september.sqlite3"))?;
    repository.delete_analytics_events_before(retention_cutoff_ms(now_ms()))?;
    let provider_keys = ProviderKeys::load();
    app.manage(BackendState {
        repository: Mutex::new(repository),
    });
    app.manage(provider_keys);
    app.manage(ApfelState::default());
    app.manage(WritingProxy::default());
    app.manage(GazeState::default());
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
pub(crate) fn backup_export(state: State<'_, BackendState>) -> RpcResult<BackupContents> {
    let fallback_user_id = user_id()?;
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .backup_contents(&fallback_user_id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn backup_import(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: BackupContents,
) -> RpcResult<()> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .replace_backup_contents(&request)
        .map_err(rpc_error)?;
    app.emit(
        "september://settings-changed",
        SettingsChanged {
            keys: [
                "setup",
                "speech",
                "dismissed-ideas",
                "space-modes",
                "new-space-draft",
                "panel-open",
                "present",
            ]
            .into_iter()
            .map(str::to_owned)
            .collect(),
        },
    )
    .map_err(rpc_error)
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

/// Stores one local usage event, then applies the rolling retention boundary.
#[tauri::command(async)]
pub(crate) fn analytics_put(
    state: State<'_, BackendState>,
    request: AnalyticsEvent,
) -> RpcResult<AnalyticsEvent> {
    let repository = state.repository.lock().map_err(lock_error)?;
    repository
        .put_analytics_event(&request)
        .map_err(rpc_error)?;
    repository
        .delete_analytics_events_before(retention_cutoff_ms(now_ms()))
        .map_err(rpc_error)?;
    Ok(request)
}

/// Reads one bounded report. Opening a report also cleans an app that has
/// stayed open without recording a new event.
#[tauri::command(async)]
pub(crate) fn analytics_list(
    state: State<'_, BackendState>,
    request: AnalyticsListRequest,
) -> RpcResult<Vec<AnalyticsEvent>> {
    let repository = state.repository.lock().map_err(lock_error)?;
    repository
        .delete_analytics_events_before(retention_cutoff_ms(now_ms()))
        .map_err(rpc_error)?;
    repository
        .list_analytics_events(&request.user_id, request.start_at, request.end_at)
        .map_err(rpc_error)
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
pub(crate) fn agent_message_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<AgentMessage>> {
    let space_id = request
        .space_id
        .as_deref()
        .ok_or("An agent transcript needs a space.")?;
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_agent_messages(space_id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn agent_message_put(
    state: State<'_, BackendState>,
    request: AgentMessage,
) -> RpcResult<AgentMessage> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_agent_message(&request)
        .map_err(rpc_error)?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn agent_tool_state(
    state: State<'_, BackendState>,
    request: AgentToolStateRequest,
) -> RpcResult<AgentMessage> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .update_agent_tool_state(
            &request.id,
            &request.expected,
            &request.state,
            &request.content,
            request.updated_at,
        )
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
        .ok_or_else(|| "This Mac has no login name.".to_owned())
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

/// One status for each cloud service. A cached key is tested again here,
/// because a key that worked in June can fail in August.
#[tauri::command]
pub(crate) async fn provider_status(
    keys: State<'_, ProviderKeys>,
) -> RpcResult<Vec<ProviderStatus>> {
    let providers = Providers::default();
    let mut statuses = Vec::with_capacity(Provider::ALL.len());

    for provider in Provider::ALL {
        let status = match keys.get(provider).map_err(rpc_error)? {
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
pub(crate) async fn provider_connect(
    keys: State<'_, ProviderKeys>,
    request: ProviderConnectRequest,
) -> RpcResult<ProviderStatus> {
    let status = Providers::default()
        .check(request.provider, &request.key)
        .await
        .map_err(rpc_error)?;
    keys.store(request.provider, &request.key)
        .map_err(rpc_error)?;
    Ok(status)
}

#[tauri::command]
pub(crate) async fn provider_forget(
    keys: State<'_, ProviderKeys>,
    request: ProviderRequest,
) -> RpcResult<bool> {
    keys.forget(request.provider).map_err(rpc_error)
}

/// The file that holds one sentence in the chosen voice.
///
/// The name of the file is the hash of the settings and the normalized words,
/// so the same request never goes to the service twice. The response carries
/// a path, never a key.
#[tauri::command]
pub(crate) async fn speech_synthesize(
    app: AppHandle,
    keys: State<'_, ProviderKeys>,
    request: SpeakRequest,
) -> RpcResult<SpokenAudio> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(rpc_error)?
        .join("audio");
    let key = keys.get(Provider::ElevenLabs).map_err(rpc_error)?;
    let (path, from_cache) =
        speech::synthesize(&directory, &request.settings, &request.text, key.as_deref()).await?;

    Ok(SpokenAudio {
        path: path.to_string_lossy().into_owned(),
        from_cache,
    })
}

/// Speaks with the voice of the operating system from the native process.
#[tauri::command]
pub(crate) async fn speech_system(
    state: State<'_, BackendState>,
    request: SystemSpeechRequest,
) -> RpcResult<()> {
    let output = september_output(&state)?;
    tauri::async_runtime::spawn_blocking(move || {
        audio::speak_system(
            &request.text,
            request.voice_id.as_deref(),
            request.speed,
            &output,
        )
    })
    .await
    .map_err(rpc_error)?
}

/// Plays one cached cloud-voice file from the native process.
#[tauri::command]
pub(crate) async fn speech_file_play(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: SpeechFileRequest,
) -> RpcResult<()> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(rpc_error)?
        .join("audio")
        .canonicalize()
        .map_err(rpc_error)?;
    let path = request.path.canonicalize().map_err(rpc_error)?;
    if !path.starts_with(&directory) {
        return Err("the voice file is outside the September audio folder".into());
    }

    let output = september_output(&state)?;
    tauri::async_runtime::spawn_blocking(move || audio::play_speech_file(&path, &output))
        .await
        .map_err(rpc_error)?
}

/// Stops either native voice now.
#[tauri::command(async)]
pub(crate) fn speech_native_stop() {
    audio::stop_speech();
}

/// The address the writing client calls, and the token for this run.
///
/// The proxy holds the key. The WebView is given an address on the loopback
/// and a token that means nothing to another process and nothing after this
/// run. A command still returns no key.
#[tauri::command]
pub(crate) async fn writing_proxy(
    app: AppHandle,
    state: State<'_, WritingProxy>,
) -> RpcResult<Endpoint> {
    state.endpoint(&app).await.map_err(rpc_error)
}

/// The ElevenLabs voices for the stored key. The list is empty without a key.
#[tauri::command]
pub(crate) async fn provider_voices(keys: State<'_, ProviderKeys>) -> RpcResult<Vec<Voice>> {
    let Some(key) = keys.get(Provider::ElevenLabs).map_err(rpc_error)? else {
        return Ok(Vec::new());
    };
    Providers::default().voices(&key).await.map_err(rpc_error)
}

/// The free OpenRouter models for the stored key. Empty without a key.
#[tauri::command]
pub(crate) async fn provider_writing_models(
    keys: State<'_, ProviderKeys>,
) -> RpcResult<Vec<WritingModel>> {
    let Some(key) = keys.get(Provider::OpenRouter).map_err(rpc_error)? else {
        return Ok(Vec::new());
    };
    Providers::default()
        .writing_models(&key)
        .await
        .map_err(rpc_error)
}

/// The ElevenLabs models for the stored key. The list is empty without a key.
#[tauri::command]
pub(crate) async fn provider_models(keys: State<'_, ProviderKeys>) -> RpcResult<Vec<Model>> {
    let Some(key) = keys.get(Provider::ElevenLabs).map_err(rpc_error)? else {
        return Ok(Vec::new());
    };
    Providers::default().models(&key).await.map_err(rpc_error)
}

/// Creates an ElevenLabs voice from a multipart body made by the Voice screen.
///
/// Raw IPC keeps audio out of JSON. Rust adds the cached native key to one
/// fixed endpoint, so neither the key nor an arbitrary provider URL reaches
/// the WebView.
#[tauri::command]
pub(crate) async fn provider_clone_voice(
    keys: State<'_, ProviderKeys>,
    request: IpcRequest<'_>,
) -> RpcResult<CreatedVoice> {
    let content_type = request
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .filter(|value| value.starts_with("multipart/form-data; boundary="))
        .ok_or("voice cloning needs a multipart form")?
        .to_owned();
    let body = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        InvokeBody::Json(_) => return Err("voice cloning needs raw audio bytes".into()),
    };
    if body.is_empty() {
        return Err("voice cloning needs at least one audio sample".into());
    }
    if body.len() > MAX_VOICE_CLONE_BYTES {
        return Err("voice cloning samples are too large".into());
    }

    let key = keys
        .get(Provider::ElevenLabs)
        .map_err(rpc_error)?
        .ok_or("Connect ElevenLabs in Settings first.")?;
    Providers::default()
        .clone_voice(&key, &content_type, body)
        .await
        .map_err(rpc_error)
}

/// The ElevenLabs allowance for the stored key. The result is absent when the
/// service is not connected.
#[tauri::command]
pub(crate) async fn provider_quota(
    keys: State<'_, ProviderKeys>,
) -> RpcResult<Option<ElevenLabsQuota>> {
    let Some(key) = keys.get(Provider::ElevenLabs).map_err(rpc_error)? else {
        return Ok(None);
    };
    Providers::default()
        .quota(&key)
        .await
        .map(Some)
        .map_err(rpc_error)
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

/// Changes some fields of a space, and leaves the rest.
///
/// The rename, the note, and the phrase count each arrive on their own. A
/// whole-row write would let the last one undo the others.
#[tauri::command(async)]
pub(crate) fn space_patch(state: State<'_, BackendState>, request: SpacePatch) -> RpcResult<Space> {
    let repository = state.repository.lock().map_err(rpc_error)?;
    repository.patch_space(&request).map_err(rpc_error)
}

/// Every output this Mac can play through.
#[tauri::command(async)]
pub(crate) fn audio_outputs() -> RpcResult<Vec<AudioDevice>> {
    audio::outputs()
}

/// The output September plays through now.
#[tauri::command(async)]
pub(crate) fn audio_output(state: State<'_, BackendState>) -> RpcResult<String> {
    september_output(&state)
}

/// Saves and verifies the output for both voices of September.
#[tauri::command(async)]
pub(crate) fn audio_output_set(
    state: State<'_, BackendState>,
    request: AudioOutputRequest,
) -> RpcResult<()> {
    audio::validate_output(&request.uid)?;
    audio::prepare_output(&request.uid)?;
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_setting(AUDIO_OUTPUT_SETTING, &Value::String(request.uid))
        .map_err(rpc_error)
}

/// The saved September output when it is present, otherwise the system output.
fn september_output(state: &BackendState) -> RpcResult<String> {
    let saved = state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_setting(AUDIO_OUTPUT_SETTING)
        .map_err(rpc_error)?;
    let devices = audio::outputs()?;
    let system_default = audio::default_output()?;
    Ok(audio::application_output(
        saved.as_ref().and_then(Value::as_str),
        &devices,
        &system_default,
    ))
}

/// Whether calling apps can select September Microphone now.
#[tauri::command(async)]
pub(crate) fn virtual_microphone_status() -> VirtualMicrophoneStatus {
    audio::virtual_microphone_status()
}

/// Publishes September speech as a system input.
#[tauri::command(async)]
pub(crate) fn virtual_microphone_start() -> RpcResult<VirtualMicrophoneStatus> {
    audio::virtual_microphone_start()
}

/// Removes the September system input.
#[tauri::command(async)]
pub(crate) fn virtual_microphone_stop() -> RpcResult<VirtualMicrophoneStatus> {
    audio::virtual_microphone_stop()
}

type RpcResult<T> = std::result::Result<T, String>;

fn rpc_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn lock_error<T>(_: std::sync::PoisonError<T>) -> String {
    "September could not reach its storage. Quit and open the app again.".into()
}

#[cfg(test)]
mod tests {
    use super::{
        clean_name, login_name, retention_cutoff_ms, EntityIdRequest, SpaceFilterRequest,
        SpaceListRequest, ANALYTICS_RETENTION_MS,
    };

    #[test]
    fn analytics_retention_is_ninety_days() {
        assert_eq!(ANALYTICS_RETENTION_MS, 90 * 24 * 60 * 60 * 1_000);
        assert_eq!(retention_cutoff_ms(ANALYTICS_RETENTION_MS + 42), 42);
        assert_eq!(retention_cutoff_ms(10), 0);
    }

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
