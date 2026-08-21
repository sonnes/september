use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::error::{BackendError, Result};

const SCHEMA_VERSION: i64 = 1;

pub struct Repository {
    connection: Connection,
}

impl Repository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        Self::from_connection(Connection::open(path)?)
    }

    pub fn open_in_memory() -> Result<Self> {
        Self::from_connection(Connection::open_in_memory()?)
    }

    fn from_connection(connection: Connection) -> Result<Self> {
        connection.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        let mut repository = Self { connection };
        repository.migrate()?;
        Ok(repository)
    }

    fn migrate(&mut self) -> Result<()> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version < SCHEMA_VERSION {
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

    pub fn get_setting(&self, key: &str) -> Result<Option<Value>> {
        validate_key(key)?;
        let encoded: Option<String> = self
            .connection
            .query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
                row.get(0)
            })
            .optional()?;
        encoded
            .map(|value| serde_json::from_str(&value).map_err(Into::into))
            .transpose()
    }

    pub fn put_setting(&self, key: &str, value: &Value) -> Result<()> {
        validate_key(key)?;
        self.connection.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, serde_json::to_string(value)?],
        )?;
        Ok(())
    }

    pub fn delete_setting(&self, key: &str) -> Result<bool> {
        validate_key(key)?;
        Ok(self
            .connection
            .execute("DELETE FROM settings WHERE key = ?1", [key])?
            > 0)
    }
}

fn validate_key(key: &str) -> Result<()> {
    if key.is_empty() || key.len() > 256 {
        return Err(BackendError::InvalidInput(
            "setting key must contain 1 to 256 bytes".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::Repository;

    #[test]
    fn domain_tables_store_fields_in_columns() {
        let repository = Repository::open_in_memory().unwrap();

        assert_eq!(
            column_names(&repository, "spaces"),
            vec![
                "id",
                "user_id",
                "title",
                "context",
                "phrases_synced_count",
                "created_at",
                "updated_at",
            ]
        );
        assert_eq!(
            column_names(&repository, "messages"),
            vec![
                "id",
                "space_id",
                "user_id",
                "text",
                "type",
                "audio_path",
                "created_at",
            ]
        );
        assert_eq!(
            column_names(&repository, "notes"),
            vec![
                "id",
                "space_id",
                "name",
                "content",
                "created_at",
                "updated_at",
            ]
        );
    }

    #[test]
    fn deleting_a_space_cascades_to_messages_and_scoped_notes() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .connection
            .execute(
                "INSERT INTO spaces (id, user_id, created_at, updated_at) \
                 VALUES ('space-1', 'user-1', 1, 1)",
                [],
            )
            .unwrap();
        repository
            .connection
            .execute(
                "INSERT INTO messages \
                 (id, space_id, user_id, text, type, created_at) \
                 VALUES ('message-1', 'space-1', 'user-1', 'Hello', 'user', 1)",
                [],
            )
            .unwrap();
        repository
            .connection
            .execute(
                "INSERT INTO notes (id, space_id, content, created_at, updated_at) \
                 VALUES ('note-1', 'space-1', '', 1, 1), \
                        ('note-2', NULL, '', 1, 1)",
                [],
            )
            .unwrap();

        repository
            .connection
            .execute("DELETE FROM spaces WHERE id = 'space-1'", [])
            .unwrap();

        assert_eq!(row_count(&repository, "messages"), 0);
        assert_eq!(row_count(&repository, "notes"), 1);
    }

    fn column_names(repository: &Repository, table: &str) -> Vec<String> {
        let mut statement = repository
            .connection
            .prepare(&format!("PRAGMA table_info({table})"))
            .unwrap();
        statement
            .query_map([], |row| row.get(1))
            .unwrap()
            .collect::<rusqlite::Result<Vec<_>>>()
            .unwrap()
    }

    fn row_count(repository: &Repository, table: &str) -> i64 {
        repository
            .connection
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .unwrap()
    }
}
