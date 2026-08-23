use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{BackendError, Result};

/// Released builds before the domain tables used 1, 2, and 3 for a database
/// that held only the settings. The domain tables arrive at 4, so those
/// installs migrate instead of staying at a number above the target. The
/// saved phrases arrive at 5. Local usage events arrive at 6.
const SCHEMA_VERSION: i64 = 6;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Space {
    pub id: String,
    pub user_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phrases_synced_count: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// The fields of a space that one writer changes. A field left out keeps the
/// value it holds.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct SpacePatch {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
    #[serde(default)]
    pub phrases_synced_count: Option<i64>,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Message {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub space_id: Option<String>,
    pub user_id: String,
    pub text: String,
    #[serde(rename = "type")]
    pub message_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_path: Option<String>,
    pub created_at: i64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Note {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub space_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct SavedPhrase {
    pub id: String,
    pub space_id: String,
    pub text: String,
    /// `phrase` for a complete thought, `starter` for an opening.
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct AnalyticsEvent {
    pub id: String,
    pub user_id: String,
    pub event_type: String,
    pub timestamp: i64,
    pub data: Value,
}

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
            // Every step makes its tables only when they are absent, so the
            // whole set runs for a database at any earlier version.
            transaction.execute_batch(concat!(
                include_str!("../migrations/0001_initial.sql"),
                include_str!("../migrations/0002_saved_phrases.sql"),
                include_str!("../migrations/0003_analytics.sql"),
            ))?;
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

    pub fn list_spaces(&self, user_id: &str) -> Result<Vec<Space>> {
        validate_identifier("space user ID", user_id)?;
        let mut statement = self.connection.prepare(
            "SELECT id, user_id, title, context, phrases_synced_count, created_at, updated_at \
             FROM spaces WHERE user_id = ?1 ORDER BY updated_at DESC, id",
        )?;
        let rows = statement.query_map([user_id], row_to_space)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn get_space(&self, id: &str) -> Result<Option<Space>> {
        validate_identifier("space ID", id)?;
        self.connection
            .query_row(
                "SELECT id, user_id, title, context, phrases_synced_count, created_at, updated_at \
                 FROM spaces WHERE id = ?1",
                [id],
                row_to_space,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn put_space(&self, space: &Space) -> Result<()> {
        validate_space(space)?;
        self.connection.execute(
            "INSERT INTO spaces \
             (id, user_id, title, context, phrases_synced_count, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
             ON CONFLICT(id) DO UPDATE SET \
               user_id = excluded.user_id, \
               title = excluded.title, \
               context = excluded.context, \
               phrases_synced_count = excluded.phrases_synced_count, \
               created_at = excluded.created_at, \
               updated_at = excluded.updated_at",
            params![
                space.id,
                space.user_id,
                space.title,
                space.context,
                space.phrases_synced_count,
                space.created_at,
                space.updated_at,
            ],
        )?;
        Ok(())
    }

    /// Changes some fields of a space, and leaves the rest as they are.
    ///
    /// A space has more than one writer: the user renames it, a model gives it
    /// a name and a note, and the phrase sync counts the messages. Each writer
    /// holds a copy of the row from the moment it started, so a whole-row
    /// write puts back the fields it never meant to touch, and the last writer
    /// undoes the others. One statement for each writer keeps every change.
    ///
    /// A field that is absent keeps its value. No writer needs to empty one.
    pub fn patch_space(&self, patch: &SpacePatch) -> Result<Space> {
        validate_identifier("space ID", &patch.id)?;
        validate_timestamp("space updated_at", patch.updated_at)?;
        if patch.phrases_synced_count.is_some_and(|count| count < 0) {
            return Err(BackendError::InvalidInput(
                "space phrases_synced_count must not be negative".into(),
            ));
        }

        self.connection.execute(
            "UPDATE spaces SET \
               title = COALESCE(?2, title), \
               context = COALESCE(?3, context), \
               phrases_synced_count = COALESCE(?4, phrases_synced_count), \
               updated_at = ?5 \
             WHERE id = ?1",
            params![
                patch.id,
                patch.title,
                patch.context,
                patch.phrases_synced_count,
                patch.updated_at,
            ],
        )?;

        self.get_space(&patch.id)?.ok_or_else(|| {
            BackendError::InvalidInput(format!("no space holds the ID {}", patch.id))
        })
    }

    pub fn delete_space(&self, id: &str) -> Result<bool> {
        validate_identifier("space ID", id)?;
        Ok(self
            .connection
            .execute("DELETE FROM spaces WHERE id = ?1", [id])?
            > 0)
    }

    pub fn list_messages(&self, space_id: Option<&str>) -> Result<Vec<Message>> {
        if let Some(space_id) = space_id {
            validate_identifier("message space ID", space_id)?;
        }
        let mut statement = self.connection.prepare(
            "SELECT id, space_id, user_id, text, type, audio_path, created_at \
             FROM messages WHERE (?1 IS NULL OR space_id = ?1) ORDER BY created_at, id",
        )?;
        let rows = statement.query_map([space_id], row_to_message)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn get_message(&self, id: &str) -> Result<Option<Message>> {
        validate_identifier("message ID", id)?;
        self.connection
            .query_row(
                "SELECT id, space_id, user_id, text, type, audio_path, created_at \
                 FROM messages WHERE id = ?1",
                [id],
                row_to_message,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn put_message(&self, message: &Message) -> Result<()> {
        validate_message(message)?;
        self.connection.execute(
            "INSERT INTO messages \
             (id, space_id, user_id, text, type, audio_path, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
             ON CONFLICT(id) DO UPDATE SET \
               space_id = excluded.space_id, \
               user_id = excluded.user_id, \
               text = excluded.text, \
               type = excluded.type, \
               audio_path = excluded.audio_path, \
               created_at = excluded.created_at",
            params![
                message.id,
                message.space_id,
                message.user_id,
                message.text,
                message.message_type,
                message.audio_path,
                message.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_message(&self, id: &str) -> Result<bool> {
        validate_identifier("message ID", id)?;
        Ok(self
            .connection
            .execute("DELETE FROM messages WHERE id = ?1", [id])?
            > 0)
    }

    pub fn list_notes(&self, space_id: Option<&str>) -> Result<Vec<Note>> {
        if let Some(space_id) = space_id {
            validate_identifier("note space ID", space_id)?;
        }
        let mut statement = self.connection.prepare(
            "SELECT id, space_id, name, content, created_at, updated_at \
             FROM notes WHERE (?1 IS NULL OR space_id = ?1) ORDER BY updated_at DESC, id",
        )?;
        let rows = statement.query_map([space_id], row_to_note)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn get_note(&self, id: &str) -> Result<Option<Note>> {
        validate_identifier("note ID", id)?;
        self.connection
            .query_row(
                "SELECT id, space_id, name, content, created_at, updated_at \
                 FROM notes WHERE id = ?1",
                [id],
                row_to_note,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn put_note(&self, note: &Note) -> Result<()> {
        validate_note(note)?;
        self.connection.execute(
            "INSERT INTO notes (id, space_id, name, content, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
             ON CONFLICT(id) DO UPDATE SET \
               space_id = excluded.space_id, \
               name = excluded.name, \
               content = excluded.content, \
               created_at = excluded.created_at, \
               updated_at = excluded.updated_at",
            params![
                note.id,
                note.space_id,
                note.name,
                note.content,
                note.created_at,
                note.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_note(&self, id: &str) -> Result<bool> {
        validate_identifier("note ID", id)?;
        Ok(self
            .connection
            .execute("DELETE FROM notes WHERE id = ?1", [id])?
            > 0)
    }

    pub fn list_phrases(&self, space_id: Option<&str>) -> Result<Vec<SavedPhrase>> {
        if let Some(space_id) = space_id {
            validate_identifier("phrase space ID", space_id)?;
        }
        // Pinned rows first, so a caller that takes the first few keeps the
        // rows that the user chose.
        let mut statement = self.connection.prepare(
            "SELECT id, space_id, text, kind, code, pinned, created_at, updated_at \
             FROM saved_phrases WHERE (?1 IS NULL OR space_id = ?1) \
             ORDER BY pinned DESC, created_at, id",
        )?;
        let rows = statement.query_map([space_id], row_to_phrase)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn put_phrase(&self, phrase: &SavedPhrase) -> Result<()> {
        validate_phrase(phrase)?;
        self.connection.execute(
            PHRASE_UPSERT,
            params![
                phrase.id,
                phrase.space_id,
                phrase.text,
                phrase.kind,
                phrase.code,
                phrase.pinned,
                phrase.created_at,
                phrase.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_phrase(&self, id: &str) -> Result<bool> {
        validate_identifier("phrase ID", id)?;
        Ok(self
            .connection
            .execute("DELETE FROM saved_phrases WHERE id = ?1", [id])?
            > 0)
    }

    pub fn put_analytics_event(&self, event: &AnalyticsEvent) -> Result<()> {
        validate_analytics_event(event)?;
        self.connection.execute(
            "INSERT INTO analytics_events (id, user_id, event_type, timestamp, data) \
             VALUES (?1, ?2, ?3, ?4, ?5) \
             ON CONFLICT(id) DO UPDATE SET \
               user_id = excluded.user_id, \
               event_type = excluded.event_type, \
               timestamp = excluded.timestamp, \
               data = excluded.data",
            params![
                event.id,
                event.user_id,
                event.event_type,
                event.timestamp,
                serde_json::to_string(&event.data)?,
            ],
        )?;
        Ok(())
    }

    pub fn list_analytics_events(
        &self,
        user_id: &str,
        start_at: i64,
        end_at: i64,
    ) -> Result<Vec<AnalyticsEvent>> {
        validate_identifier("analytics user ID", user_id)?;
        validate_timestamp("analytics range start", start_at)?;
        validate_timestamp("analytics range end", end_at)?;
        if end_at < start_at {
            return Err(BackendError::InvalidInput(
                "analytics range end must not precede its start".into(),
            ));
        }

        let mut statement = self.connection.prepare(
            "SELECT id, user_id, event_type, timestamp, data \
             FROM analytics_events \
             WHERE user_id = ?1 AND timestamp BETWEEN ?2 AND ?3 \
             ORDER BY timestamp DESC, id",
        )?;
        let rows = statement.query_map(params![user_id, start_at, end_at], |row| {
            let encoded: String = row.get(4)?;
            let data = serde_json::from_str(&encoded).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    4,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            Ok(AnalyticsEvent {
                id: row.get(0)?,
                user_id: row.get(1)?,
                event_type: row.get(2)?,
                timestamp: row.get(3)?,
                data,
            })
        })?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    /// Deletes events strictly before the boundary. An event exactly 90 days
    /// old remains until it crosses the boundary.
    pub fn delete_analytics_events_before(&self, cutoff: i64) -> Result<usize> {
        validate_timestamp("analytics retention cutoff", cutoff)?;
        Ok(self.connection.execute(
            "DELETE FROM analytics_events WHERE timestamp < ?1",
            [cutoff],
        )?)
    }

    /// Puts the rows that a model wrote in place of the rows before them.
    ///
    /// A pinned row is never touched. The user keeps what the user chose, so
    /// the erase and the insert happen together, in one transaction.
    pub fn replace_ai_phrases(&mut self, space_id: &str, rows: &[SavedPhrase]) -> Result<()> {
        validate_identifier("phrase space ID", space_id)?;
        for row in rows {
            validate_phrase(row)?;
            if row.pinned {
                return Err(BackendError::InvalidInput(
                    "a replacement phrase must not be pinned".into(),
                ));
            }
        }

        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM saved_phrases WHERE space_id = ?1 AND pinned = 0",
            [space_id],
        )?;
        for phrase in rows {
            transaction.execute(
                PHRASE_UPSERT,
                params![
                    phrase.id,
                    phrase.space_id,
                    phrase.text,
                    phrase.kind,
                    phrase.code,
                    phrase.pinned,
                    phrase.created_at,
                    phrase.updated_at,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(())
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

fn row_to_space(row: &Row<'_>) -> rusqlite::Result<Space> {
    Ok(Space {
        id: row.get(0)?,
        user_id: row.get(1)?,
        title: row.get(2)?,
        context: row.get(3)?,
        phrases_synced_count: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn row_to_message(row: &Row<'_>) -> rusqlite::Result<Message> {
    Ok(Message {
        id: row.get(0)?,
        space_id: row.get(1)?,
        user_id: row.get(2)?,
        text: row.get(3)?,
        message_type: row.get(4)?,
        audio_path: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn row_to_note(row: &Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        space_id: row.get(1)?,
        name: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn validate_space(space: &Space) -> Result<()> {
    validate_identifier("space ID", &space.id)?;
    validate_identifier("space user ID", &space.user_id)?;
    validate_timestamp("space created_at", space.created_at)?;
    validate_timestamp("space updated_at", space.updated_at)?;
    if space.updated_at < space.created_at {
        return Err(BackendError::InvalidInput(
            "space updated_at must not precede created_at".into(),
        ));
    }
    if space.phrases_synced_count.is_some_and(|count| count < 0) {
        return Err(BackendError::InvalidInput(
            "space phrases_synced_count must not be negative".into(),
        ));
    }
    Ok(())
}

fn validate_message(message: &Message) -> Result<()> {
    validate_identifier("message ID", &message.id)?;
    validate_identifier("message user ID", &message.user_id)?;
    validate_identifier("message type", &message.message_type)?;
    if let Some(space_id) = &message.space_id {
        validate_identifier("message space ID", space_id)?;
    }
    validate_timestamp("message created_at", message.created_at)
}

fn validate_note(note: &Note) -> Result<()> {
    validate_identifier("note ID", &note.id)?;
    if let Some(space_id) = &note.space_id {
        validate_identifier("note space ID", space_id)?;
    }
    validate_timestamp("note created_at", note.created_at)?;
    validate_timestamp("note updated_at", note.updated_at)?;
    if note.updated_at < note.created_at {
        return Err(BackendError::InvalidInput(
            "note updated_at must not precede created_at".into(),
        ));
    }
    Ok(())
}

const PHRASE_UPSERT: &str = "INSERT INTO saved_phrases \
     (id, space_id, text, kind, code, pinned, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) \
     ON CONFLICT(id) DO UPDATE SET \
       space_id = excluded.space_id, \
       text = excluded.text, \
       kind = excluded.kind, \
       code = excluded.code, \
       pinned = excluded.pinned, \
       created_at = excluded.created_at, \
       updated_at = excluded.updated_at";

fn row_to_phrase(row: &Row<'_>) -> rusqlite::Result<SavedPhrase> {
    Ok(SavedPhrase {
        id: row.get(0)?,
        space_id: row.get(1)?,
        text: row.get(2)?,
        kind: row.get(3)?,
        code: row.get(4)?,
        pinned: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn validate_phrase(phrase: &SavedPhrase) -> Result<()> {
    validate_identifier("phrase ID", &phrase.id)?;
    validate_identifier("phrase space ID", &phrase.space_id)?;
    validate_identifier("phrase text", &phrase.text)?;
    if !matches!(phrase.kind.as_str(), "phrase" | "starter") {
        return Err(BackendError::InvalidInput(
            "phrase kind must be phrase or starter".into(),
        ));
    }
    validate_timestamp("phrase created timestamp", phrase.created_at)?;
    validate_timestamp("phrase updated timestamp", phrase.updated_at)?;
    Ok(())
}

fn validate_analytics_event(event: &AnalyticsEvent) -> Result<()> {
    validate_identifier("analytics event ID", &event.id)?;
    validate_identifier("analytics user ID", &event.user_id)?;
    if !matches!(
        event.event_type.as_str(),
        "message_sent" | "ai_generation" | "tts_generation"
    ) {
        return Err(BackendError::InvalidInput(
            "analytics event type is not supported".into(),
        ));
    }
    validate_timestamp("analytics event timestamp", event.timestamp)
}

fn validate_identifier(name: &str, value: &str) -> Result<()> {
    if value.is_empty() || value.len() > 256 {
        return Err(BackendError::InvalidInput(format!(
            "{name} must contain 1 to 256 bytes"
        )));
    }
    Ok(())
}

fn validate_timestamp(name: &str, value: i64) -> Result<()> {
    if value < 0 {
        return Err(BackendError::InvalidInput(format!(
            "{name} must not be negative"
        )));
    }
    Ok(())
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
    use rusqlite::Connection;

    use super::{AnalyticsEvent, Repository, Space, SpacePatch};

    fn analytics_event(id: &str, user_id: &str, timestamp: i64) -> AnalyticsEvent {
        AnalyticsEvent {
            id: id.to_owned(),
            user_id: user_id.to_owned(),
            event_type: "message_sent".to_owned(),
            timestamp,
            data: serde_json::json!({ "text_length": 12, "keys_typed": 3 }),
        }
    }

    #[test]
    fn analytics_events_are_isolated_by_user_and_time_and_newest_first() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_analytics_event(&analytics_event("old", "user-1", 10))
            .unwrap();
        repository
            .put_analytics_event(&analytics_event("new", "user-1", 30))
            .unwrap();
        repository
            .put_analytics_event(&analytics_event("other", "user-2", 20))
            .unwrap();

        let rows = repository.list_analytics_events("user-1", 10, 30).unwrap();
        assert_eq!(
            rows.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
            vec!["new", "old"]
        );
    }

    #[test]
    fn analytics_cleanup_deletes_only_events_older_than_the_cutoff() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_analytics_event(&analytics_event("older", "user-1", 9))
            .unwrap();
        repository
            .put_analytics_event(&analytics_event("boundary", "user-1", 10))
            .unwrap();
        repository
            .put_analytics_event(&analytics_event("newer", "user-1", 11))
            .unwrap();

        assert_eq!(repository.delete_analytics_events_before(10).unwrap(), 1);
        let rows = repository.list_analytics_events("user-1", 0, 20).unwrap();
        assert_eq!(
            rows.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
            vec!["newer", "boundary"]
        );
    }

    #[test]
    fn a_database_from_an_earlier_backend_gains_the_domain_tables() {
        // An install from before the domain tables holds a higher version
        // number and only the settings table. It must not stay there.
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "CREATE TABLE settings (
                   key TEXT PRIMARY KEY NOT NULL,
                   value TEXT NOT NULL CHECK (json_valid(value))
                 ) STRICT;
                 INSERT INTO settings VALUES ('setup', '{\"name\":\"Ravi\"}');
                 PRAGMA user_version = 3;",
            )
            .unwrap();

        let repository = Repository::from_connection(connection).unwrap();
        let tables = repository.table_names().unwrap();

        assert!(tables.contains(&"spaces".to_owned()), "{tables:?}");
        assert!(tables.contains(&"messages".to_owned()), "{tables:?}");
        assert!(tables.contains(&"notes".to_owned()), "{tables:?}");
        // The settings of the user survive the migration.
        assert!(repository.get_setting("setup").unwrap().is_some());
    }

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

    #[test]
    fn one_writer_of_a_space_never_undoes_another() {
        // Three things write a space: the user renames it, a model writes its
        // name and its note, and the phrase sync counts the messages. Each
        // one knows only its own fields.
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&Space {
                id: "space-1".to_owned(),
                user_id: "user-1".to_owned(),
                title: Some("New space 2".to_owned()),
                context: None,
                phrases_synced_count: None,
                created_at: 1,
                updated_at: 1,
            })
            .unwrap();

        repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: Some("Asking for water".to_owned()),
                context: Some("I am talking to my carer.".to_owned()),
                phrases_synced_count: None,
                updated_at: 2,
            })
            .unwrap();
        let saved = repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: None,
                context: None,
                phrases_synced_count: Some(1),
                updated_at: 3,
            })
            .unwrap();

        // The count arrived last and must not have taken the name with it.
        assert_eq!(saved.title.as_deref(), Some("Asking for water"));
        assert_eq!(saved.context.as_deref(), Some("I am talking to my carer."));
        assert_eq!(saved.phrases_synced_count, Some(1));
    }

    #[test]
    fn the_phrase_count_can_land_before_the_name() {
        // The new-space screen runs the title model and the phrase writer
        // together, so either one may reach SQLite first. The old flow
        // chained them, and only ever saw the count arrive last.
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&Space {
                id: "space-1".to_owned(),
                user_id: "user-1".to_owned(),
                title: Some("Amber Cedar Meadow".to_owned()),
                context: Some("I speak to my sister here.".to_owned()),
                phrases_synced_count: None,
                created_at: 1,
                updated_at: 1,
            })
            .unwrap();

        // The phrase writer finishes first and counts the messages.
        repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: None,
                context: None,
                phrases_synced_count: Some(0),
                updated_at: 2,
            })
            .unwrap();

        // The title model answers second, with the name and the whole note.
        let saved = repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: Some("My sister".to_owned()),
                context: Some("I speak to my sister here.\n\nWe talk about her garden.".to_owned()),
                phrases_synced_count: None,
                updated_at: 3,
            })
            .unwrap();

        // The name arrived last and must not have taken the count with it.
        assert_eq!(saved.title.as_deref(), Some("My sister"));
        assert_eq!(saved.phrases_synced_count, Some(0));
        assert!(saved.context.unwrap().contains("her garden"));
    }

    #[test]
    fn a_space_that_is_gone_cannot_be_changed() {
        let repository = Repository::open_in_memory().unwrap();
        let missing = repository.patch_space(&SpacePatch {
            id: "no-such-space".to_owned(),
            title: Some("Anything".to_owned()),
            context: None,
            phrases_synced_count: None,
            updated_at: 2,
        });
        assert!(missing.is_err());
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
