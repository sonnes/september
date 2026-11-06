use std::{fs, path::PathBuf, sync::Mutex, time::Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    ipc::{InvokeBody, Request as IpcRequest},
    AppHandle, Manager, State,
};

use crate::{
    apfel::{ApfelState, ApfelStatus},
    audio::{self, AudioDevice, VirtualMicrophoneStatus},
    gaze::GazeState,
    providers::{
        CreatedVoice, ElevenLabsQuota, Provider, ProviderKeys, ProviderStatus, Providers, Voice,
        NO_ELEVEN_LABS_KEY,
    },
    proxy::{Endpoint, WritingProxy},
    repository::{
        AgentMessage, AnalyticsEvent, BackupContents, Message, Note, Repository, SavedPhrase,
        Space, SpacePatch,
    },
    speech::{self, StreamError, Streamed, VoiceSettings},
};

type RpcResult<T> = std::result::Result<T, String>;

/// The samples of one clone, as `packages/core/rules/voice-clone.ts` allows
/// them, and room for the multipart headers around them.
const MAX_VOICE_CLONE_BYTES: usize = 101 * 1024 * 1024;
const AUDIO_OUTPUT_SETTING: &str = "audio-output";
/// The folder of the voice files, under the local data folder of the app. The
/// asset scope in `tauri.conf.json` lets the WebView read it.
const AUDIO_DIRECTORY: &str = "audio";

/// The storage of the app, and the cloud-voice sentence that streams now.
pub(crate) struct BackendState {
    repository: Mutex<Repository>,
    /// A stop or a new sentence cancels the sentence that streams.
    speech_stream: Mutex<Option<tokio::task::AbortHandle>>,
}

impl BackendState {
    /// Runs one repository call under the lock, with one error for a lock
    /// that a panic left behind.
    fn with_repo<T>(
        &self,
        call: impl FnOnce(&mut Repository) -> crate::error::Result<T>,
    ) -> RpcResult<T> {
        let mut repository = self.repository.lock().map_err(|_| {
            "September could not reach its storage. Quit and open the app again.".to_owned()
        })?;
        call(&mut repository).map_err(|error| error.to_string())
    }

    pub(crate) fn setting(&self, key: &str) -> RpcResult<Option<Value>> {
        self.with_repo(|repository| repository.get_setting(key))
    }

    pub(crate) fn put_setting(&self, key: &str, value: &Value) -> RpcResult<()> {
        self.with_repo(|repository| repository.put_setting(key, value))
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct KeyRequest {
    key: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EntityIdRequest {
    id: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AgentToolStateRequest {
    id: String,
    expected: String,
    state: String,
    content: String,
    updated_at: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SpaceListRequest {
    user_id: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SpaceFilterRequest {
    space_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AnalyticsListRequest {
    user_id: String,
    start_at: i64,
    end_at: i64,
    /// Events of every user from before this time are deleted.
    since: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct BackupExportRequest {
    setting_keys: Vec<String>,
    /// Usage events from before this time are deleted.
    usage_since: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct BackupImportRequest {
    contents: BackupContents,
    setting_keys: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ProviderRequest {
    provider: Provider,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ProviderConnectRequest {
    provider: Provider,
    key: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PhraseReplaceRequest {
    space_id: String,
    phrases: Vec<SavedPhrase>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AudioOutputRequest {
    uid: String,
}

/// One sentence in one cloud voice. `dialogue_parts` holds the parts of the
/// sentence for the Dialogue voice, and is absent for a voice that makes a
/// file.
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SpeakRequest {
    text: String,
    voice: VoiceSettings,
    #[serde(default)]
    dialogue_parts: Option<Vec<String>>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SystemSpeechRequest {
    text: String,
    speed: f32,
}

#[derive(Serialize)]
pub(crate) struct SpokenAudio {
    /// The file on disk. The WebView reads it through the asset protocol.
    path: String,
    from_cache: bool,
}

/// One streamed sentence. `interrupted` holds the reason when the sound
/// started and then broke, because the WebView must not repeat those words in
/// a second voice.
#[derive(Serialize)]
pub(crate) struct StreamedAudio {
    from_cache: bool,
    latency_ms: u64,
    interrupted: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SettingPutRequest {
    key: String,
    value: Value,
}

/// Turns one panel state on or off.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SwitchRequest {
    pub(crate) on: bool,
}

/// Names one OpenRouter sign-in, so a cancel reaches only that one.
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SignInRequest {
    pub(crate) request_id: String,
}

pub(crate) fn setup(app: &mut tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // A public aggregate device can outlive a process that crashed. Each new
    // start removes that stale device, so the microphone begins off.
    if let Err(error) = audio::virtual_microphone_stop() {
        eprintln!("[audio] could not remove a stale microphone: {error}");
    }

    let data_directory = app.path().app_local_data_dir()?;
    fs::create_dir_all(&data_directory)?;
    let repository = Repository::open(data_directory.join("september.sqlite3"))?;
    app.manage(BackendState {
        repository: Mutex::new(repository),
        speech_stream: Mutex::new(None),
    });
    app.manage(ProviderKeys::load());
    app.manage(Providers::default());
    app.manage(ApfelState::default());
    app.manage(WritingProxy::default());
    app.manage(GazeState::default());
    app.manage(crate::oauth::SignIns::default());
    Ok(())
}

#[tauri::command(async)]
pub(crate) fn setting_get(
    state: State<'_, BackendState>,
    request: KeyRequest,
) -> RpcResult<Option<Value>> {
    state.setting(&request.key)
}

#[tauri::command(async)]
pub(crate) fn setting_put(
    state: State<'_, BackendState>,
    request: SettingPutRequest,
) -> RpcResult<Value> {
    state.put_setting(&request.key, &request.value)?;
    Ok(request.value)
}

#[tauri::command(async)]
pub(crate) fn backup_export(
    state: State<'_, BackendState>,
    request: BackupExportRequest,
) -> RpcResult<BackupContents> {
    state.with_repo(|repository| {
        repository.backup_contents(&request.setting_keys, request.usage_since)
    })
}

#[tauri::command(async)]
pub(crate) fn backup_import(
    state: State<'_, BackendState>,
    request: BackupImportRequest,
) -> RpcResult<()> {
    state.with_repo(|repository| {
        repository.replace_backup_contents(&request.contents, &request.setting_keys)
    })
}

#[tauri::command(async)]
pub(crate) fn space_list(
    state: State<'_, BackendState>,
    request: SpaceListRequest,
) -> RpcResult<Vec<Space>> {
    state.with_repo(|repository| repository.list_spaces(&request.user_id))
}

#[tauri::command(async)]
pub(crate) fn space_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Space>> {
    state.with_repo(|repository| repository.get_space(&request.id))
}

#[tauri::command(async)]
pub(crate) fn space_put(state: State<'_, BackendState>, request: Space) -> RpcResult<Space> {
    state.with_repo(|repository| repository.put_space(&request))?;
    Ok(request)
}

/// Changes some fields of a space, and leaves the rest.
#[tauri::command(async)]
pub(crate) fn space_patch(state: State<'_, BackendState>, request: SpacePatch) -> RpcResult<Space> {
    state.with_repo(|repository| repository.patch_space(&request))
}

#[tauri::command(async)]
pub(crate) fn space_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state.with_repo(|repository| repository.delete_space(&request.id))
}

#[tauri::command(async)]
pub(crate) fn message_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<Message>> {
    state.with_repo(|repository| repository.list_messages(request.space_id.as_deref()))
}

#[tauri::command(async)]
pub(crate) fn message_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Message>> {
    state.with_repo(|repository| repository.get_message(&request.id))
}

#[tauri::command(async)]
pub(crate) fn message_put(state: State<'_, BackendState>, request: Message) -> RpcResult<Message> {
    state.with_repo(|repository| repository.put_message(&request))?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn message_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state.with_repo(|repository| repository.delete_message(&request.id))
}

#[tauri::command(async)]
pub(crate) fn analytics_put(
    state: State<'_, BackendState>,
    request: AnalyticsEvent,
) -> RpcResult<AnalyticsEvent> {
    state.with_repo(|repository| repository.put_analytics_event(&request))?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn analytics_list(
    state: State<'_, BackendState>,
    request: AnalyticsListRequest,
) -> RpcResult<Vec<AnalyticsEvent>> {
    state.with_repo(|repository| {
        repository.list_analytics_events(
            &request.user_id,
            request.start_at,
            request.end_at,
            request.since,
        )
    })
}

#[tauri::command(async)]
pub(crate) fn agent_message_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<AgentMessage>> {
    let space_id = request
        .space_id
        .ok_or("An agent transcript needs a space.")?;
    state.with_repo(|repository| repository.list_agent_messages(&space_id))
}

#[tauri::command(async)]
pub(crate) fn agent_message_put(
    state: State<'_, BackendState>,
    request: AgentMessage,
) -> RpcResult<AgentMessage> {
    state.with_repo(|repository| repository.put_agent_message(&request))?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn agent_tool_state(
    state: State<'_, BackendState>,
    request: AgentToolStateRequest,
) -> RpcResult<AgentMessage> {
    state.with_repo(|repository| {
        repository.update_agent_tool_state(
            &request.id,
            &request.expected,
            &request.state,
            &request.content,
            request.updated_at,
        )
    })
}

#[tauri::command(async)]
pub(crate) fn note_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<Note>> {
    state.with_repo(|repository| repository.list_notes(request.space_id.as_deref()))
}

#[tauri::command(async)]
pub(crate) fn note_get(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<Option<Note>> {
    state.with_repo(|repository| repository.get_note(&request.id))
}

#[tauri::command(async)]
pub(crate) fn note_put(state: State<'_, BackendState>, request: Note) -> RpcResult<Note> {
    state.with_repo(|repository| repository.put_note(&request))?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn note_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state.with_repo(|repository| repository.delete_note(&request.id))
}

#[tauri::command(async)]
pub(crate) fn phrase_list(
    state: State<'_, BackendState>,
    request: SpaceFilterRequest,
) -> RpcResult<Vec<SavedPhrase>> {
    state.with_repo(|repository| repository.list_phrases(request.space_id.as_deref()))
}

#[tauri::command(async)]
pub(crate) fn phrase_put(
    state: State<'_, BackendState>,
    request: SavedPhrase,
) -> RpcResult<SavedPhrase> {
    state.with_repo(|repository| repository.put_phrase(&request))?;
    Ok(request)
}

#[tauri::command(async)]
pub(crate) fn phrase_delete(
    state: State<'_, BackendState>,
    request: EntityIdRequest,
) -> RpcResult<bool> {
    state.with_repo(|repository| repository.delete_phrase(&request.id))
}

/// Puts the rows of a model in place of the unpinned rows of one space.
#[tauri::command(async)]
pub(crate) fn phrase_replace_ai(
    state: State<'_, BackendState>,
    request: PhraseReplaceRequest,
) -> RpcResult<()> {
    state.with_repo(|repository| repository.replace_ai_phrases(&request.space_id, &request.phrases))
}

/// The name the operating system holds for the signed-in user. Empty when the
/// system has no usable name.
#[tauri::command(async)]
pub(crate) fn user_name() -> String {
    clean_name(&whoami::realname())
}

/// The login name of the operating system, for example `ravi`. Absent when
/// the system gives no usable login name.
#[tauri::command(async)]
pub(crate) fn user_id() -> RpcResult<Option<String>> {
    let raw = whoami::fallible::username().map_err(|error| error.to_string())?;
    Ok(login_name(&raw))
}

#[tauri::command]
pub(crate) async fn apfel_status(
    app: AppHandle,
    state: State<'_, ApfelState>,
) -> RpcResult<ApfelStatus> {
    Ok(state.status(&app).await)
}

/// One status for each cloud service. A cached key is tested again here,
/// because a key that worked in June can fail in August.
#[tauri::command]
pub(crate) async fn provider_status(
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
) -> RpcResult<Vec<ProviderStatus>> {
    let mut statuses = Vec::with_capacity(Provider::ALL.len());
    for provider in Provider::ALL {
        let status = match keys.get(provider).map_err(|error| error.to_string())? {
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
    providers: State<'_, Providers>,
    request: ProviderConnectRequest,
) -> RpcResult<ProviderStatus> {
    let status = providers
        .check(request.provider, &request.key)
        .await
        .map_err(|error| error.to_string())?;
    keys.store(request.provider, &request.key)
        .map_err(|error| error.to_string())?;
    Ok(status)
}

#[tauri::command]
pub(crate) async fn provider_forget(
    keys: State<'_, ProviderKeys>,
    request: ProviderRequest,
) -> RpcResult<bool> {
    keys.forget(request.provider)
        .map_err(|error| error.to_string())
}

fn audio_directory(app: &AppHandle) -> RpcResult<PathBuf> {
    Ok(app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join(AUDIO_DIRECTORY))
}

fn eleven_labs_key(keys: &ProviderKeys) -> RpcResult<Option<String>> {
    keys.get(Provider::ElevenLabs)
        .map_err(|error| error.to_string())
}

/// The MP3 file that holds one sentence in the chosen voice. The response
/// carries a path, never a key.
#[tauri::command]
pub(crate) async fn speech_synthesize(
    app: AppHandle,
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
    request: SpeakRequest,
) -> RpcResult<SpokenAudio> {
    let directory = audio_directory(&app)?;
    let key = eleven_labs_key(&keys)?;
    let (path, from_cache) = speech::synthesize(
        &directory,
        &request.voice,
        &request.text,
        key.as_deref(),
        &providers,
    )
    .await?;

    Ok(SpokenAudio {
        path: path.to_string_lossy().into_owned(),
        from_cache,
    })
}

/// Speaks one sentence in a cloud voice through the native engine, so the
/// virtual microphone hears it. The command returns when the sound stops.
#[tauri::command]
pub(crate) async fn speech_stream(
    app: AppHandle,
    state: State<'_, BackendState>,
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
    request: SpeakRequest,
) -> RpcResult<StreamedAudio> {
    let directory = audio_directory(&app)?;
    let key = eleven_labs_key(&keys)?;
    let output = september_output(&state)?;
    // From here on, a stop silences this sentence even before it plays.
    let sentence = audio::claim_speech();
    let providers = (*providers).clone();

    let task = tokio::spawn(async move {
        stream_sentence(sentence, directory, request, key, output, &providers).await
    });
    if let Some(previous) = state
        .speech_stream
        .lock()
        .map_err(|error| error.to_string())?
        .replace(task.abort_handle())
    {
        previous.abort();
    }

    match task.await {
        Ok(result) => result,
        // A stop or a newer sentence cancels this one on purpose.
        Err(error) if error.is_cancelled() => Ok(StreamedAudio {
            from_cache: false,
            latency_ms: 0,
            interrupted: None,
        }),
        Err(error) => Err(format!("The voice stopped unexpectedly. ({error})")),
    }
}

async fn stream_sentence(
    sentence: i64,
    directory: PathBuf,
    request: SpeakRequest,
    key: Option<String>,
    output: String,
    providers: &Providers,
) -> RpcResult<StreamedAudio> {
    let began = Instant::now();
    let mut playing: Option<audio::SpeechStream> = None;
    let mut refused: Option<String> = None;
    let mut broken: Option<String> = None;
    let outcome = speech::stream(
        &directory,
        &request.voice,
        &request.text,
        request.dialogue_parts.as_deref(),
        key.as_deref(),
        providers,
        |samples| {
            if refused.is_some() || broken.is_some() {
                return;
            }
            if playing.is_none() {
                match audio::SpeechStream::begin(sentence, speech::STREAM_SAMPLE_RATE, &output) {
                    Ok(stream) => playing = Some(stream),
                    Err(error) => {
                        refused = Some(error);
                        return;
                    }
                }
            }
            if let Some(stream) = &playing {
                // An append fails after a stop or a broken output.
                if let Err(error) = stream.append(samples) {
                    broken = Some(error);
                }
            }
        },
    )
    .await;

    // No sound went out when the engine did not start, so the system voice
    // can still say the whole sentence.
    if let Some(error) = refused {
        return Err(error);
    }

    match outcome {
        Ok(Streamed::File { path, from_cache }) => {
            let latency_ms = began.elapsed().as_millis() as u64;
            let played = tokio::task::spawn_blocking(move || {
                audio::play_speech_file(sentence, &path, &output)
            })
            .await
            .map_err(|error| error.to_string())??;
            Ok(StreamedAudio {
                from_cache,
                latency_ms,
                interrupted: match played {
                    audio::Played::Whole => None,
                    audio::Played::Interrupted(message) => Some(message),
                },
            })
        }
        Ok(Streamed::Spoken { first_audio }) => {
            // The sound began, so a failure now is an interruption.
            let finished = match playing {
                Some(stream) => tokio::task::spawn_blocking(move || stream.finish())
                    .await
                    .map_err(|error| error.to_string())?
                    .err(),
                None => None,
            };
            Ok(StreamedAudio {
                from_cache: false,
                latency_ms: first_audio.as_millis() as u64,
                interrupted: broken.or(finished),
            })
        }
        Err(StreamError {
            started: true,
            message,
        }) if playing.is_some() => {
            audio::stop_speech();
            Ok(StreamedAudio {
                from_cache: false,
                latency_ms: 0,
                interrupted: Some(message),
            })
        }
        Err(StreamError { message, .. }) => Err(message),
    }
}

/// Speaks with the voice of the operating system from the native process.
#[tauri::command]
pub(crate) async fn speech_system(
    state: State<'_, BackendState>,
    request: SystemSpeechRequest,
) -> RpcResult<()> {
    let output = september_output(&state)?;
    tokio::task::spawn_blocking(move || audio::speak_system(&request.text, request.speed, &output))
        .await
        .map_err(|error| error.to_string())?
}

/// Stops every native voice now, and the cloud stream that feeds one.
#[tauri::command(async)]
pub(crate) fn speech_native_stop(state: State<'_, BackendState>) -> RpcResult<()> {
    let stream = state
        .speech_stream
        .lock()
        .map_err(|error| error.to_string())?
        .take();
    if let Some(stream) = stream {
        stream.abort();
    }
    audio::stop_speech();
    Ok(())
}

/// The address the writing client calls, and the token for this run. The
/// proxy holds the key, and a command returns no key.
#[tauri::command]
pub(crate) async fn writing_proxy(
    app: AppHandle,
    state: State<'_, WritingProxy>,
) -> RpcResult<Endpoint> {
    state
        .endpoint(&app)
        .await
        .map_err(|error| error.to_string())
}

/// The ElevenLabs voices for the stored key. The list is empty without a key.
#[tauri::command]
pub(crate) async fn provider_voices(
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
) -> RpcResult<Vec<Voice>> {
    let Some(key) = eleven_labs_key(&keys)? else {
        return Ok(Vec::new());
    };
    providers
        .voices(&key)
        .await
        .map_err(|error| error.to_string())
}

/// Creates an ElevenLabs voice from a multipart body made by the Voice screen.
///
/// Raw IPC keeps audio out of JSON. Rust adds the cached key to one fixed
/// endpoint, so neither the key nor an arbitrary provider URL reaches the
/// WebView.
#[tauri::command]
pub(crate) async fn provider_clone_voice(
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
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

    let key = eleven_labs_key(&keys)?.ok_or(NO_ELEVEN_LABS_KEY)?;
    providers
        .clone_voice(&key, &content_type, body)
        .await
        .map_err(|error| error.to_string())
}

/// The ElevenLabs allowance for the stored key. Absent when the service is
/// not connected.
#[tauri::command]
pub(crate) async fn provider_quota(
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
) -> RpcResult<Option<ElevenLabsQuota>> {
    let Some(key) = eleven_labs_key(&keys)? else {
        return Ok(None);
    };
    providers
        .quota(&key)
        .await
        .map(Some)
        .map_err(|error| error.to_string())
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

/// A login name that the repository accepts. A name of only spaces is not one.
fn login_name(raw: &str) -> Option<String> {
    let name = raw.trim();
    (!name.is_empty()).then(|| name.to_owned())
}

#[tauri::command(async)]
pub(crate) fn audio_outputs() -> RpcResult<Vec<AudioDevice>> {
    audio::outputs()
}

#[tauri::command(async)]
pub(crate) fn audio_output(state: State<'_, BackendState>) -> RpcResult<String> {
    september_output(&state)
}

/// Saves the output for both voices of September after the native engine
/// accepts it.
#[tauri::command(async)]
pub(crate) fn audio_output_set(
    state: State<'_, BackendState>,
    request: AudioOutputRequest,
) -> RpcResult<()> {
    audio::validate_output(&request.uid)?;
    audio::prepare_output(&request.uid)?;
    state.put_setting(AUDIO_OUTPUT_SETTING, &Value::String(request.uid))
}

/// The saved September output when it is present, otherwise the system output.
fn september_output(state: &BackendState) -> RpcResult<String> {
    let saved = state.setting(AUDIO_OUTPUT_SETTING)?;
    let devices = audio::outputs()?;
    let system_default = audio::default_output()?;
    Ok(audio::application_output(
        saved.as_ref().and_then(Value::as_str),
        &devices,
        &system_default,
    ))
}

#[tauri::command(async)]
pub(crate) fn virtual_microphone_status() -> VirtualMicrophoneStatus {
    audio::virtual_microphone_status()
}

#[tauri::command(async)]
pub(crate) fn virtual_microphone_start() -> RpcResult<VirtualMicrophoneStatus> {
    audio::virtual_microphone_start()
}

#[tauri::command(async)]
pub(crate) fn virtual_microphone_stop() -> RpcResult<VirtualMicrophoneStatus> {
    audio::virtual_microphone_stop()
}

#[cfg(test)]
mod contract;

#[cfg(test)]
mod tests {
    use super::{clean_name, login_name, AUDIO_DIRECTORY, MAX_VOICE_CLONE_BYTES};

    #[test]
    fn the_webview_may_read_the_voice_files() {
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let scope = &config["app"]["security"]["assetProtocol"]["scope"];
        assert_eq!(
            scope,
            &serde_json::json!([format!("$APPLOCALDATA/{AUDIO_DIRECTORY}/*")])
        );
    }

    #[test]
    fn a_display_name_keeps_only_its_first_gecos_field() {
        assert_eq!(clean_name("Ravi Atluri"), "Ravi Atluri");
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
    fn a_login_name_is_trimmed_and_a_blank_one_is_refused() {
        assert_eq!(login_name("  ravi  ").as_deref(), Some("ravi"));
        assert_eq!(login_name("   "), None);
    }

    #[test]
    fn the_clone_body_holds_every_sample_the_form_allows() {
        let rules = include_str!("../../../../packages/core/rules/voice-clone.ts");
        assert!(rules.contains("const MB = 1024 * 1024;"));
        let megabytes: usize = rules
            .split_once("totalBytes: ")
            .and_then(|(_, rest)| rest.split_once(" * MB"))
            .and_then(|(count, _)| count.parse().ok())
            .expect("voice-clone.ts states totalBytes in MB");
        assert!(MAX_VOICE_CLONE_BYTES > megabytes * 1024 * 1024);
    }
}
