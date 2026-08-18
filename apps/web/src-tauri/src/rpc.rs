use std::{collections::BTreeSet, fs, sync::Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    ipc::{InvokeBody, Request, Response},
    AppHandle, Emitter, Manager, State,
};

use crate::{
    external::open_external_url,
    files::{export_bytes, FileStore},
    identity::{current_os_user, OsUser},
    repository::{
        FileMetadata, OutboxMutation, Record, RecordDelete, RecordPut, RemoteMutation, Repository,
    },
};

pub(crate) struct BackendState {
    repository: Mutex<Repository>,
    files: FileStore,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecordListRequest {
    collection: String,
    #[serde(default)]
    include_deleted: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecordGetRequest {
    collection: String,
    id: String,
    #[serde(default)]
    include_deleted: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OutboxListRequest {
    #[serde(default = "default_outbox_limit")]
    limit: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OutboxAckRequest {
    outbox_ids: Vec<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApplyRemoteRequest {
    mutations: Vec<RemoteMutation>,
    cursor: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApplyRemoteResponse {
    applied: usize,
    collections: Vec<String>,
}

#[derive(Deserialize)]
pub(crate) struct KeyRequest {
    key: String,
}

#[derive(Deserialize)]
pub(crate) struct ValuePutRequest {
    key: String,
    value: Value,
}

#[derive(Deserialize)]
pub(crate) struct FileIdRequest {
    id: String,
}

#[derive(Deserialize)]
pub(crate) struct FileListRequest {
    kind: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct OpenExternalRequest {
    url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecordsChanged {
    collections: Vec<String>,
}

#[derive(Clone, Serialize)]
struct FilesChanged {
    ids: Vec<String>,
}

#[derive(Clone, Serialize)]
struct SettingsChanged {
    keys: Vec<String>,
}

pub(crate) fn setup(app: &mut tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let data_directory = app.path().app_local_data_dir()?;
    fs::create_dir_all(&data_directory)?;
    let repository = Repository::open(data_directory.join("september.sqlite3"))?;
    let files = FileStore::new(&data_directory)?;
    app.manage(BackendState {
        repository: Mutex::new(repository),
        files,
    });
    Ok(())
}

#[tauri::command(async)]
pub(crate) fn os_user_get() -> RpcResult<OsUser> {
    current_os_user().map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn record_list(
    state: State<'_, BackendState>,
    request: RecordListRequest,
) -> RpcResult<Vec<Record>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_records(&request.collection, request.include_deleted)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn record_get(
    state: State<'_, BackendState>,
    request: RecordGetRequest,
) -> RpcResult<Option<Record>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_record(&request.collection, &request.id, request.include_deleted)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn record_put(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: RecordPut,
) -> RpcResult<Record> {
    let collection = request.collection.clone();
    let record = state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_record(request)
        .map_err(rpc_error)?;
    emit_records_changed(&app, vec![collection])?;
    Ok(record)
}

#[tauri::command(async)]
pub(crate) fn record_delete(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: RecordDelete,
) -> RpcResult<Record> {
    let collection = request.collection.clone();
    let record = state
        .repository
        .lock()
        .map_err(lock_error)?
        .delete_record(request)
        .map_err(rpc_error)?;
    emit_records_changed(&app, vec![collection])?;
    Ok(record)
}

#[tauri::command(async)]
pub(crate) fn sync_outbox_list(
    state: State<'_, BackendState>,
    request: OutboxListRequest,
) -> RpcResult<Vec<OutboxMutation>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .list_outbox(request.limit)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn sync_outbox_ack(
    state: State<'_, BackendState>,
    request: OutboxAckRequest,
) -> RpcResult<usize> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .ack_outbox(&request.outbox_ids)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn sync_apply_remote(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: ApplyRemoteRequest,
) -> RpcResult<ApplyRemoteResponse> {
    let (applied, collections) = state
        .repository
        .lock()
        .map_err(lock_error)?
        .apply_remote(&request.mutations, request.cursor)
        .map_err(rpc_error)?;
    if !collections.is_empty() {
        emit_records_changed(&app, collections.clone())?;
    }
    Ok(ApplyRemoteResponse {
        applied,
        collections,
    })
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
    request: ValuePutRequest,
) -> RpcResult<Value> {
    let key = request.key;
    let value = request.value;
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_setting(&key, &value)
        .map_err(rpc_error)?;
    app.emit(
        "september://settings-changed",
        SettingsChanged { keys: vec![key] },
    )
    .map_err(rpc_error)?;
    Ok(value)
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
pub(crate) fn sync_metadata_get(
    state: State<'_, BackendState>,
    request: KeyRequest,
) -> RpcResult<Option<Value>> {
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .get_sync_metadata(&request.key)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn sync_metadata_put(
    state: State<'_, BackendState>,
    request: ValuePutRequest,
) -> RpcResult<Value> {
    let value = request.value;
    state
        .repository
        .lock()
        .map_err(lock_error)?
        .put_sync_metadata(&request.key, &value)
        .map_err(rpc_error)?;
    Ok(value)
}

#[tauri::command(async)]
pub(crate) fn file_write(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: Request<'_>,
) -> RpcResult<FileMetadata> {
    let media_type = header(&request, "content-type").unwrap_or("application/octet-stream");
    let kind = header(&request, "x-september-file-kind").unwrap_or("attachment");
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("file_write requires a raw Uint8Array request body".into());
    };
    let mut repository = state.repository.lock().map_err(lock_error)?;
    let metadata = state
        .files
        .write(&mut repository, kind, media_type, bytes)
        .map_err(rpc_error)?;
    drop(repository);
    app.emit(
        "september://files-changed",
        FilesChanged {
            ids: vec![metadata.id.clone()],
        },
    )
    .map_err(rpc_error)?;
    Ok(metadata)
}

#[tauri::command(async)]
pub(crate) fn file_read(
    state: State<'_, BackendState>,
    request: FileIdRequest,
) -> RpcResult<Response> {
    let repository = state.repository.lock().map_err(lock_error)?;
    let bytes = state
        .files
        .read(&repository, &request.id)
        .map_err(rpc_error)?;
    Ok(Response::new(bytes))
}

#[tauri::command(async)]
pub(crate) fn file_get(
    state: State<'_, BackendState>,
    request: FileIdRequest,
) -> RpcResult<Option<FileMetadata>> {
    let repository = state.repository.lock().map_err(lock_error)?;
    state
        .files
        .metadata(&repository, &request.id)
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn file_list(
    state: State<'_, BackendState>,
    request: FileListRequest,
) -> RpcResult<Vec<FileMetadata>> {
    let repository = state.repository.lock().map_err(lock_error)?;
    state
        .files
        .list(&repository, request.kind.as_deref())
        .map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn file_delete(
    app: AppHandle,
    state: State<'_, BackendState>,
    request: FileIdRequest,
) -> RpcResult<bool> {
    let mut repository = state.repository.lock().map_err(lock_error)?;
    let deleted = state
        .files
        .delete(&mut repository, &request.id)
        .map_err(rpc_error)?;
    drop(repository);
    if deleted {
        app.emit(
            "september://files-changed",
            FilesChanged {
                ids: vec![request.id],
            },
        )
        .map_err(rpc_error)?;
    }
    Ok(deleted)
}

#[tauri::command(async)]
pub(crate) fn file_export(request: Request<'_>) -> RpcResult<bool> {
    let suggested_name = header(&request, "x-september-suggested-name");
    let media_type = header(&request, "content-type");
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("file_export requires a raw Uint8Array request body".into());
    };
    export_bytes(bytes, suggested_name, media_type).map_err(rpc_error)
}

#[tauri::command(async)]
pub(crate) fn open_external(request: OpenExternalRequest) -> RpcResult<()> {
    open_external_url(&request.url).map_err(rpc_error)
}

fn emit_records_changed(app: &AppHandle, collections: Vec<String>) -> RpcResult<()> {
    let collections = collections
        .into_iter()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    app.emit(
        "september://records-changed",
        RecordsChanged { collections },
    )
    .map_err(rpc_error)
}

fn header<'a>(request: &'a Request<'_>, name: &str) -> Option<&'a str> {
    request.headers().get(name)?.to_str().ok()
}

fn default_outbox_limit() -> usize {
    100
}

type RpcResult<T> = std::result::Result<T, String>;

fn rpc_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn lock_error<T>(_: std::sync::PoisonError<T>) -> String {
    "desktop storage lock is poisoned".into()
}
