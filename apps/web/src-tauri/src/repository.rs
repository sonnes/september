use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{BackendError, Result};

const SCHEMA_VERSION: i64 = 2;

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

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "op", rename_all = "lowercase")]
pub enum RecordBatchWrite {
    Put {
        collection: String,
        id: String,
        data: Value,
        version: Option<String>,
        #[serde(rename = "updatedAt")]
        updated_at: i64,
    },
    Delete {
        collection: String,
        id: String,
        version: Option<String>,
        #[serde(rename = "updatedAt")]
        updated_at: i64,
    },
}

impl RecordBatchWrite {
    pub fn collection(&self) -> &str {
        match self {
            Self::Put { collection, .. } | Self::Delete { collection, .. } => collection,
        }
    }
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
            transaction.pragma_update(None, "user_version", 1)?;
            transaction.commit()?;
        }
        if version < 2 {
            let transaction = self.connection.transaction()?;
            transaction.execute_batch(include_str!("../migrations/0002_remove_cloud_sync.sql"))?;
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
                data: Some(&request.data),
                version: request.version.as_deref(),
                updated_at: request.updated_at,
            },
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
                data: None,
                version: request.version.as_deref(),
                updated_at: request.updated_at,
            },
        )?;
        transaction.commit()?;
        Ok(record)
    }

    pub fn write_record_batch(&mut self, writes: &[RecordBatchWrite]) -> Result<Vec<Record>> {
        for write in writes {
            match write {
                RecordBatchWrite::Put {
                    collection,
                    id,
                    updated_at,
                    ..
                }
                | RecordBatchWrite::Delete {
                    collection,
                    id,
                    updated_at,
                    ..
                } => {
                    validate_record_key(collection, id)?;
                    validate_timestamp(*updated_at)?;
                }
            }
        }

        let transaction = self.connection.transaction()?;
        let mut records = Vec::with_capacity(writes.len());
        for write in writes {
            let record = match write {
                RecordBatchWrite::Put {
                    collection,
                    id,
                    data,
                    version,
                    updated_at,
                } => write_record(
                    &transaction,
                    RecordWrite {
                        collection,
                        id,
                        data: Some(data),
                        version: version.as_deref(),
                        updated_at: *updated_at,
                    },
                )?,
                RecordBatchWrite::Delete {
                    collection,
                    id,
                    version,
                    updated_at,
                } => write_record(
                    &transaction,
                    RecordWrite {
                        collection,
                        id,
                        data: None,
                        version: version.as_deref(),
                        updated_at: *updated_at,
                    },
                )?,
            };
            records.push(record);
        }
        transaction.commit()?;
        Ok(records)
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
    data: Option<&'a Value>,
    version: Option<&'a str>,
    updated_at: i64,
}

fn write_record(transaction: &Transaction<'_>, write: RecordWrite<'_>) -> Result<Record> {
    let sequence: i64 =
        transaction.query_row("SELECT COALESCE(MAX(seq), 0) + 1 FROM records", [], |row| {
            row.get(0)
        })?;
    let deleted = write.data.is_none();
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
