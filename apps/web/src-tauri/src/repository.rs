use std::{collections::BTreeSet, path::Path};

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{BackendError, Result};

const SCHEMA_VERSION: i64 = 1;
const SYNCED_COLLECTIONS: &[&str] = &[
    "user-account",
    "spaces",
    "messages",
    "saved-phrases",
    "documents",
];

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub collection: String,
    pub id: String,
    pub data: Option<Value>,
    pub version: Option<String>,
    pub updated_at: i64,
    pub deleted: bool,
    pub sequence: i64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordPut {
    pub collection: String,
    pub id: String,
    pub data: Value,
    pub version: Option<String>,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordDelete {
    pub collection: String,
    pub id: String,
    pub version: Option<String>,
    pub updated_at: i64,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncOp {
    Upsert,
    Delete,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteMutation {
    pub collection: String,
    pub id: String,
    pub op: SyncOp,
    pub data: Option<Value>,
    pub version: Option<String>,
    pub updated_at: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboxMutation {
    pub outbox_id: i64,
    pub collection: String,
    pub id: String,
    pub op: SyncOp,
    pub data: Option<Value>,
    pub version: Option<String>,
    pub updated_at: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub id: String,
    pub kind: String,
    pub media_type: String,
    pub size: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Debug)]
pub(crate) struct StoredFileMetadata {
    pub metadata: FileMetadata,
    pub relative_name: String,
}

pub struct Repository {
    connection: Connection,
}

impl Repository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let connection = Connection::open(path)?;
        Self::from_connection(connection)
    }

    pub fn open_in_memory() -> Result<Self> {
        Self::from_connection(Connection::open_in_memory()?)
    }

    fn from_connection(connection: Connection) -> Result<Self> {
        connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
        let mut repository = Self { connection };
        repository.migrate()?;
        Ok(repository)
    }

    fn migrate(&mut self) -> Result<()> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version < 1 {
            let transaction = self.connection.transaction()?;
            transaction.execute_batch(include_str!("../migrations/0001_initial.sql"))?;
            transaction.pragma_update(None, "user_version", SCHEMA_VERSION)?;
            transaction.commit()?;
        }
        Ok(())
    }

    pub fn schema_version(&self) -> Result<i64> {
        Ok(self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?)
    }

    pub fn table_names(&self) -> Result<Vec<String>> {
        let mut statement = self.connection.prepare(
            "SELECT name FROM sqlite_master \
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )?;
        let rows = statement.query_map([], |row| row.get(0))?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn list_records(&self, collection: &str, include_deleted: bool) -> Result<Vec<Record>> {
        validate_key("collection", collection, 128)?;
        let mut statement = self.connection.prepare(
            "SELECT collection, id, data, version, updated_at, deleted, seq \
             FROM records WHERE collection = ?1 AND (?2 OR deleted = 0) ORDER BY id",
        )?;
        let rows = statement.query_map(params![collection, include_deleted], row_to_record)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn get_record(
        &self,
        collection: &str,
        id: &str,
        include_deleted: bool,
    ) -> Result<Option<Record>> {
        validate_record_key(collection, id)?;
        self.connection
            .query_row(
                "SELECT collection, id, data, version, updated_at, deleted, seq \
                 FROM records WHERE collection = ?1 AND id = ?2 AND (?3 OR deleted = 0)",
                params![collection, id, include_deleted],
                row_to_record,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn put_record(&mut self, request: RecordPut) -> Result<Record> {
        validate_record_key(&request.collection, &request.id)?;
        validate_timestamp(request.updated_at)?;
        let transaction = self.connection.transaction()?;
        let record = write_record(
            &transaction,
            RecordWrite {
                collection: &request.collection,
                id: &request.id,
                op: SyncOp::Upsert,
                data: Some(&request.data),
                version: request.version.as_deref(),
                updated_at: request.updated_at,
            },
            should_sync(&request.collection),
        )?;
        transaction.commit()?;
        Ok(record)
    }

    pub fn delete_record(&mut self, request: RecordDelete) -> Result<Record> {
        validate_record_key(&request.collection, &request.id)?;
        validate_timestamp(request.updated_at)?;
        let transaction = self.connection.transaction()?;
        let record = write_record(
            &transaction,
            RecordWrite {
                collection: &request.collection,
                id: &request.id,
                op: SyncOp::Delete,
                data: None,
                version: request.version.as_deref(),
                updated_at: request.updated_at,
            },
            should_sync(&request.collection),
        )?;
        transaction.commit()?;
        Ok(record)
    }

    pub fn list_outbox(&self, limit: usize) -> Result<Vec<OutboxMutation>> {
        let limit = limit.clamp(1, 1_000) as i64;
        let mut statement = self.connection.prepare(
            "SELECT outbox_id, collection, record_id, op, data, version, updated_at \
             FROM outbox ORDER BY outbox_id LIMIT ?1",
        )?;
        let rows = statement.query_map([limit], |row| {
            let op: String = row.get(3)?;
            Ok(OutboxMutation {
                outbox_id: row.get(0)?,
                collection: row.get(1)?,
                id: row.get(2)?,
                op: if op == "delete" {
                    SyncOp::Delete
                } else {
                    SyncOp::Upsert
                },
                data: parse_optional_json(row.get(4)?)?,
                version: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn ack_outbox(&mut self, outbox_ids: &[i64]) -> Result<usize> {
        let transaction = self.connection.transaction()?;
        let mut removed = 0;
        for id in outbox_ids {
            removed += transaction.execute("DELETE FROM outbox WHERE outbox_id = ?1", [id])?;
        }
        transaction.commit()?;
        Ok(removed)
    }

    pub fn apply_remote(
        &mut self,
        mutations: &[RemoteMutation],
        cursor: i64,
    ) -> Result<(usize, Vec<String>)> {
        validate_timestamp(cursor)?;
        for mutation in mutations {
            validate_record_key(&mutation.collection, &mutation.id)?;
            validate_timestamp(mutation.updated_at)?;
            if mutation.op == SyncOp::Upsert && mutation.data.is_none() {
                return Err(BackendError::InvalidInput(
                    "an upsert mutation requires data".into(),
                ));
            }
        }

        let transaction = self.connection.transaction()?;
        let mut applied = 0;
        let mut collections = BTreeSet::new();
        for mutation in mutations {
            let existing_updated_at: Option<i64> = transaction
                .query_row(
                    "SELECT updated_at FROM records WHERE collection = ?1 AND id = ?2",
                    params![mutation.collection, mutation.id],
                    |row| row.get(0),
                )
                .optional()?;
            if existing_updated_at.is_some_and(|stored| stored >= mutation.updated_at) {
                continue;
            }
            write_record(
                &transaction,
                RecordWrite {
                    collection: &mutation.collection,
                    id: &mutation.id,
                    op: mutation.op,
                    data: mutation.data.as_ref(),
                    version: mutation.version.as_deref(),
                    updated_at: mutation.updated_at,
                },
                false,
            )?;
            applied += 1;
            collections.insert(mutation.collection.clone());
        }
        put_json_value(
            &transaction,
            "sync_metadata",
            "cloud_cursor",
            &Value::from(cursor),
        )?;
        transaction.commit()?;
        Ok((applied, collections.into_iter().collect()))
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<Value>> {
        get_json_value(&self.connection, "settings", key)
    }

    pub fn put_setting(&mut self, key: &str, value: &Value) -> Result<()> {
        validate_key("setting key", key, 256)?;
        let transaction = self.connection.transaction()?;
        put_json_value(&transaction, "settings", key, value)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn delete_setting(&mut self, key: &str) -> Result<bool> {
        validate_key("setting key", key, 256)?;
        Ok(self
            .connection
            .execute("DELETE FROM settings WHERE key = ?1", [key])?
            > 0)
    }

    pub fn get_sync_metadata(&self, key: &str) -> Result<Option<Value>> {
        get_json_value(&self.connection, "sync_metadata", key)
    }

    pub fn put_sync_metadata(&mut self, key: &str, value: &Value) -> Result<()> {
        validate_key("sync metadata key", key, 256)?;
        let transaction = self.connection.transaction()?;
        put_json_value(&transaction, "sync_metadata", key, value)?;
        transaction.commit()?;
        Ok(())
    }

    pub(crate) fn insert_file_metadata(&mut self, stored: &StoredFileMetadata) -> Result<()> {
        self.connection.execute(
            "INSERT INTO file_metadata \
             (id, relative_name, kind, media_type, size, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                stored.metadata.id,
                stored.relative_name,
                stored.metadata.kind,
                stored.metadata.media_type,
                stored.metadata.size,
                stored.metadata.created_at,
                stored.metadata.updated_at,
            ],
        )?;
        Ok(())
    }

    pub(crate) fn get_file_metadata(&self, id: &str) -> Result<Option<StoredFileMetadata>> {
        self.connection
            .query_row(
                "SELECT id, relative_name, kind, media_type, size, created_at, updated_at \
                 FROM file_metadata WHERE id = ?1",
                [id],
                |row| {
                    Ok(StoredFileMetadata {
                        metadata: FileMetadata {
                            id: row.get(0)?,
                            kind: row.get(2)?,
                            media_type: row.get(3)?,
                            size: row.get(4)?,
                            created_at: row.get(5)?,
                            updated_at: row.get(6)?,
                        },
                        relative_name: row.get(1)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub(crate) fn list_file_metadata(&self, kind: Option<&str>) -> Result<Vec<StoredFileMetadata>> {
        let mut statement = self.connection.prepare(
            "SELECT id, relative_name, kind, media_type, size, created_at, updated_at \
             FROM file_metadata WHERE (?1 IS NULL OR kind = ?1) ORDER BY created_at, id",
        )?;
        let rows = statement.query_map([kind], |row| {
            Ok(StoredFileMetadata {
                metadata: FileMetadata {
                    id: row.get(0)?,
                    kind: row.get(2)?,
                    media_type: row.get(3)?,
                    size: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                },
                relative_name: row.get(1)?,
            })
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub(crate) fn delete_file_metadata(&mut self, id: &str) -> Result<bool> {
        Ok(self
            .connection
            .execute("DELETE FROM file_metadata WHERE id = ?1", [id])?
            > 0)
    }
}

fn row_to_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<Record> {
    Ok(Record {
        collection: row.get(0)?,
        id: row.get(1)?,
        data: parse_optional_json(row.get(2)?)?,
        version: row.get(3)?,
        updated_at: row.get(4)?,
        deleted: row.get::<_, i64>(5)? != 0,
        sequence: row.get(6)?,
    })
}

fn parse_optional_json(value: Option<String>) -> rusqlite::Result<Option<Value>> {
    value
        .map(|encoded| {
            serde_json::from_str(&encoded).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })
        })
        .transpose()
}

struct RecordWrite<'a> {
    collection: &'a str,
    id: &'a str,
    op: SyncOp,
    data: Option<&'a Value>,
    version: Option<&'a str>,
    updated_at: i64,
}

fn write_record(
    transaction: &Transaction<'_>,
    write: RecordWrite<'_>,
    capture_outbox: bool,
) -> Result<Record> {
    let sequence: i64 =
        transaction.query_row("SELECT COALESCE(MAX(seq), 0) + 1 FROM records", [], |row| {
            row.get(0)
        })?;
    let deleted = write.op == SyncOp::Delete;
    let encoded = if deleted {
        None
    } else {
        Some(serde_json::to_string(write.data.unwrap_or(&Value::Null))?)
    };
    transaction.execute(
        "INSERT INTO records (collection, id, data, version, updated_at, deleted, seq) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
         ON CONFLICT(collection, id) DO UPDATE SET \
           data = excluded.data, version = excluded.version, updated_at = excluded.updated_at, \
           deleted = excluded.deleted, seq = excluded.seq",
        params![
            write.collection,
            write.id,
            encoded,
            write.version,
            write.updated_at,
            deleted,
            sequence
        ],
    )?;
    if capture_outbox {
        transaction.execute(
            "INSERT INTO outbox (collection, record_id, op, data, version, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                write.collection,
                write.id,
                if deleted { "delete" } else { "upsert" },
                encoded,
                write.version,
                write.updated_at,
            ],
        )?;
    }
    Ok(Record {
        collection: write.collection.into(),
        id: write.id.into(),
        data: if deleted { None } else { write.data.cloned() },
        version: write.version.map(Into::into),
        updated_at: write.updated_at,
        deleted,
        sequence,
    })
}

fn should_sync(collection: &str) -> bool {
    SYNCED_COLLECTIONS.contains(&collection)
}

fn validate_record_key(collection: &str, id: &str) -> Result<()> {
    validate_key("collection", collection, 128)?;
    validate_key("record id", id, 1_024)
}

fn validate_key(label: &str, value: &str, max_len: usize) -> Result<()> {
    if value.is_empty() || value.len() > max_len {
        return Err(BackendError::InvalidInput(format!(
            "{label} must contain 1 to {max_len} bytes"
        )));
    }
    Ok(())
}

fn validate_timestamp(value: i64) -> Result<()> {
    if value < 0 {
        return Err(BackendError::InvalidInput(
            "timestamps and cursors cannot be negative".into(),
        ));
    }
    Ok(())
}

fn get_json_value(connection: &Connection, table: &str, key: &str) -> Result<Option<Value>> {
    validate_key("storage key", key, 256)?;
    let query = format!("SELECT value FROM {table} WHERE key = ?1");
    let encoded: Option<String> = connection
        .query_row(&query, [key], |row| row.get(0))
        .optional()?;
    encoded
        .map(|value| serde_json::from_str(&value).map_err(Into::into))
        .transpose()
}

fn put_json_value(
    transaction: &Transaction<'_>,
    table: &str,
    key: &str,
    value: &Value,
) -> Result<()> {
    validate_key("storage key", key, 256)?;
    let query = format!(
        "INSERT INTO {table} (key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    transaction.execute(&query, params![key, serde_json::to_string(value)?])?;
    Ok(())
}
