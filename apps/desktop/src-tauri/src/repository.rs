use std::{
    collections::{HashMap, HashSet},
    path::Path,
};

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;

use crate::error::{BackendError, Result};

/// Released builds before the domain tables used 1, 2, and 3 for a database
/// that held only the settings. The domain tables arrive at 4, so those
/// installs migrate instead of staying at a number above the target. The
/// saved phrases arrive at 5. Local usage events arrive at 6. The separate
/// Agent transcript arrives at 7.
const SCHEMA_VERSION: i64 = 7;

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
    #[serde(default)]
    pub reset_phrases_synced_count: bool,
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
pub struct AgentMessage {
    pub id: String,
    pub space_id: String,
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_arguments: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_state: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
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

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupModelConfig {
    pub service: String,
    pub model: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSetup {
    #[serde(default)]
    pub id: String,
    pub name: String,
    pub speaking_style: String,
    pub personal_words: String,
    pub mode: String,
    pub default_model: BackupModelConfig,
    pub suggestions_model: Option<BackupModelConfig>,
    pub voice_service: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSpeech {
    pub provider: String,
    pub voice_id: Option<String>,
    pub model_id: String,
    pub stability: f64,
    pub similarity: f64,
    pub speed: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct BackupPanel {
    pub open: bool,
    pub tab: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct BackupPresent {
    pub tone: String,
    pub spoken: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettings {
    pub setup: Option<BackupSetup>,
    pub speech: Option<BackupSpeech>,
    pub dismissed_ideas: Vec<String>,
    pub space_modes: HashMap<String, String>,
    pub new_space_draft: String,
    pub panel: BackupPanel,
    pub present: BackupPresent,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct BackupMessage {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub space_id: Option<String>,
    pub user_id: String,
    pub text: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub created_at: i64,
}

impl BackupMessage {
    fn as_message(&self) -> Message {
        Message {
            id: self.id.clone(),
            space_id: self.space_id.clone(),
            user_id: self.user_id.clone(),
            text: self.text.clone(),
            message_type: self.message_type.clone(),
            audio_path: None,
            created_at: self.created_at,
        }
    }
}

impl From<Message> for BackupMessage {
    fn from(message: Message) -> Self {
        Self {
            id: message.id,
            space_id: message.space_id,
            user_id: message.user_id,
            text: message.text,
            message_type: message.message_type,
            created_at: message.created_at,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupContents {
    pub settings: BackupSettings,
    pub spaces: Vec<Space>,
    pub messages: Vec<BackupMessage>,
    #[serde(default)]
    pub agent_messages: Vec<AgentMessage>,
    pub notes: Vec<Note>,
    pub saved_phrases: Vec<SavedPhrase>,
    pub usage_events: Vec<AnalyticsEvent>,
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
                include_str!("../migrations/0004_agent_messages.sql"),
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

    fn list_all_spaces(&self) -> Result<Vec<Space>> {
        let mut statement = self.connection.prepare(
            "SELECT id, user_id, title, context, phrases_synced_count, created_at, updated_at \
             FROM spaces ORDER BY id",
        )?;
        let rows = statement.query_map([], row_to_space)?;
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
               phrases_synced_count = CASE WHEN ?5 THEN NULL ELSE COALESCE(?4, phrases_synced_count) END, \
               updated_at = ?6 \
             WHERE id = ?1",
            params![
                patch.id,
                patch.title,
                patch.context,
                patch.phrases_synced_count,
                patch.reset_phrases_synced_count,
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

    pub fn list_agent_messages(&self, space_id: &str) -> Result<Vec<AgentMessage>> {
        validate_identifier("agent message space ID", space_id)?;
        let mut statement = self.connection.prepare(
            "SELECT id, space_id, role, content, tool_call_id, tool_name, tool_arguments, \
                    tool_state, created_at, updated_at \
             FROM agent_messages WHERE space_id = ?1 ORDER BY created_at, id",
        )?;
        let rows = statement.query_map([space_id], row_to_agent_message)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    fn list_all_agent_messages(&self) -> Result<Vec<AgentMessage>> {
        let mut statement = self.connection.prepare(
            "SELECT id, space_id, role, content, tool_call_id, tool_name, tool_arguments, \
                    tool_state, created_at, updated_at \
             FROM agent_messages ORDER BY id",
        )?;
        let rows = statement.query_map([], row_to_agent_message)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn put_agent_message(&self, message: &AgentMessage) -> Result<()> {
        validate_agent_message(message)?;
        self.connection.execute(
            "INSERT INTO agent_messages \
             (id, space_id, role, content, tool_call_id, tool_name, tool_arguments, tool_state, \
              created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
             ON CONFLICT(id) DO UPDATE SET \
               space_id = excluded.space_id, role = excluded.role, content = excluded.content, \
               tool_call_id = excluded.tool_call_id, tool_name = excluded.tool_name, \
               tool_arguments = excluded.tool_arguments, tool_state = excluded.tool_state, \
               created_at = excluded.created_at, updated_at = excluded.updated_at",
            params![
                message.id,
                message.space_id,
                message.role,
                message.content,
                message.tool_call_id,
                message.tool_name,
                message.tool_arguments,
                message.tool_state,
                message.created_at,
                message.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_agent_tool_state(
        &self,
        id: &str,
        expected: &str,
        state: &str,
        content: &str,
        updated_at: i64,
    ) -> Result<AgentMessage> {
        validate_identifier("agent message ID", id)?;
        validate_agent_tool_state(expected)?;
        validate_agent_tool_state(state)?;
        validate_timestamp("agent message updated_at", updated_at)?;
        let changed = self.connection.execute(
            "UPDATE agent_messages SET tool_state = ?3, content = ?4, updated_at = ?5 \
             WHERE id = ?1 AND tool_state = ?2",
            params![id, expected, state, content, updated_at],
        )?;
        if changed == 0 {
            return Err(BackendError::InvalidInput(
                "that agent request is gone or already resolved".into(),
            ));
        }
        self.connection
            .query_row(
                "SELECT id, space_id, role, content, tool_call_id, tool_name, tool_arguments, \
                        tool_state, created_at, updated_at \
                 FROM agent_messages WHERE id = ?1",
                [id],
                row_to_agent_message,
            )
            .map_err(Into::into)
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
        let rows = statement.query_map(params![user_id, start_at, end_at], row_to_analytics)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn list_all_analytics_events(&self) -> Result<Vec<AnalyticsEvent>> {
        let mut statement = self.connection.prepare(
            "SELECT id, user_id, event_type, timestamp, data \
             FROM analytics_events ORDER BY id",
        )?;
        let rows = statement.query_map([], row_to_analytics)?;
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

    fn typed_setting<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        self.get_setting(key)?
            .map(|value| serde_json::from_value(value).map_err(Into::into))
            .transpose()
    }

    fn backup_panel(&self) -> Result<BackupPanel> {
        match self.get_setting("panel-open")? {
            Some(Value::Bool(open)) => Ok(BackupPanel {
                open,
                tab: "phrases".to_owned(),
            }),
            Some(value) => {
                let mut panel: BackupPanel = serde_json::from_value(value)?;
                if !matches!(panel.tab.as_str(), "phrases" | "voice") {
                    panel.tab = "phrases".to_owned();
                }
                Ok(panel)
            }
            None => Ok(BackupPanel {
                open: false,
                tab: "phrases".to_owned(),
            }),
        }
    }

    pub fn backup_contents(&self, fallback_user_id: &str) -> Result<BackupContents> {
        let mut setup: Option<BackupSetup> = self.typed_setting("setup")?;
        if let Some(setup) = &mut setup {
            if setup.id.is_empty() {
                validate_identifier("backup fallback user ID", fallback_user_id)?;
                setup.id = fallback_user_id.to_owned();
            }
        }

        Ok(BackupContents {
            settings: BackupSettings {
                setup,
                speech: self.typed_setting("speech")?,
                dismissed_ideas: self.typed_setting("dismissed-ideas")?.unwrap_or_default(),
                space_modes: self.typed_setting("space-modes")?.unwrap_or_default(),
                new_space_draft: self.typed_setting("new-space-draft")?.unwrap_or_default(),
                panel: self.backup_panel()?,
                present: self.typed_setting("present")?.unwrap_or(BackupPresent {
                    tone: "indigo".to_owned(),
                    spoken: true,
                }),
            },
            spaces: self.list_all_spaces()?,
            messages: self
                .list_messages(None)?
                .into_iter()
                .map(BackupMessage::from)
                .collect(),
            agent_messages: self.list_all_agent_messages()?,
            notes: self.list_notes(None)?,
            saved_phrases: self.list_phrases(None)?,
            usage_events: self.list_all_analytics_events()?,
        })
    }

    pub fn replace_backup_contents<'a>(&mut self, contents: &'a BackupContents) -> Result<()> {
        validate_backup_contents(contents)?;
        // One backup belongs to one person. The app reads spaces, messages,
        // and usage by owner, and it asks for the owner named in the
        // settings, so a row that names anybody else would be stored here
        // and then never shown. Every row takes the owner of the setup.
        let owner = |row: &'a str| {
            contents
                .settings
                .setup
                .as_ref()
                .map_or(row, |setup| setup.id.as_str())
        };
        let transaction = self.connection.transaction()?;
        transaction.execute_batch(
            "DELETE FROM agent_messages;
             DELETE FROM messages;
             DELETE FROM notes;
             DELETE FROM saved_phrases;
             DELETE FROM spaces;
             DELETE FROM analytics_events;
             DELETE FROM settings WHERE key IN (
               'setup', 'speech', 'dismissed-ideas', 'space-modes',
               'new-space-draft', 'panel-open', 'present'
             );",
        )?;

        for space in &contents.spaces {
            transaction.execute(
                "INSERT INTO spaces \
                 (id, user_id, title, context, phrases_synced_count, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    space.id,
                    owner(&space.user_id),
                    space.title,
                    space.context,
                    space.phrases_synced_count,
                    space.created_at,
                    space.updated_at,
                ],
            )?;
        }
        for message in &contents.messages {
            transaction.execute(
                "INSERT INTO messages \
                 (id, space_id, user_id, text, type, audio_path, created_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)",
                params![
                    message.id,
                    message.space_id,
                    owner(&message.user_id),
                    message.text,
                    message.message_type,
                    message.created_at,
                ],
            )?;
        }
        for message in &contents.agent_messages {
            transaction.execute(
                "INSERT INTO agent_messages \
                 (id, space_id, role, content, tool_call_id, tool_name, tool_arguments, tool_state, \
                  created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    message.id,
                    message.space_id,
                    message.role,
                    message.content,
                    message.tool_call_id,
                    message.tool_name,
                    message.tool_arguments,
                    message.tool_state,
                    message.created_at,
                    message.updated_at,
                ],
            )?;
        }
        for note in &contents.notes {
            transaction.execute(
                "INSERT INTO notes (id, space_id, name, content, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    note.id,
                    note.space_id,
                    note.name,
                    note.content,
                    note.created_at,
                    note.updated_at,
                ],
            )?;
        }
        for phrase in &contents.saved_phrases {
            transaction.execute(
                "INSERT INTO saved_phrases \
                 (id, space_id, text, kind, code, pinned, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
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
        for event in &contents.usage_events {
            transaction.execute(
                "INSERT INTO analytics_events (id, user_id, event_type, timestamp, data) \
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    event.id,
                    owner(&event.user_id),
                    event.event_type,
                    event.timestamp,
                    serde_json::to_string(&event.data)?,
                ],
            )?;
        }

        let mut settings = vec![
            (
                "dismissed-ideas",
                serde_json::to_value(&contents.settings.dismissed_ideas)?,
            ),
            (
                "space-modes",
                serde_json::to_value(&contents.settings.space_modes)?,
            ),
            (
                "new-space-draft",
                serde_json::to_value(&contents.settings.new_space_draft)?,
            ),
            (
                "panel-open",
                serde_json::to_value(&contents.settings.panel)?,
            ),
            ("present", serde_json::to_value(&contents.settings.present)?),
        ];
        if let Some(setup) = &contents.settings.setup {
            settings.push(("setup", serde_json::to_value(setup)?));
        }
        if let Some(speech) = &contents.settings.speech {
            settings.push(("speech", serde_json::to_value(speech)?));
        }
        for (key, value) in settings {
            transaction.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                params![key, serde_json::to_string(&value)?],
            )?;
        }

        transaction.commit()?;
        Ok(())
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

fn row_to_agent_message(row: &Row<'_>) -> rusqlite::Result<AgentMessage> {
    Ok(AgentMessage {
        id: row.get(0)?,
        space_id: row.get(1)?,
        role: row.get(2)?,
        content: row.get(3)?,
        tool_call_id: row.get(4)?,
        tool_name: row.get(5)?,
        tool_arguments: row.get(6)?,
        tool_state: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn validate_agent_tool_state(state: &str) -> Result<()> {
    if !matches!(state, "pending" | "applied" | "rejected" | "failed") {
        return Err(BackendError::InvalidInput(
            "agent tool state is not supported".into(),
        ));
    }
    Ok(())
}

fn validate_agent_message(message: &AgentMessage) -> Result<()> {
    validate_identifier("agent message ID", &message.id)?;
    validate_identifier("agent message space ID", &message.space_id)?;
    if !matches!(message.role.as_str(), "user" | "assistant" | "tool") {
        return Err(BackendError::InvalidInput(
            "agent message role is not supported".into(),
        ));
    }
    if let Some(tool_call_id) = &message.tool_call_id {
        validate_identifier("agent tool call ID", tool_call_id)?;
    }
    if let Some(tool_name) = &message.tool_name {
        if !matches!(
            tool_name.as_str(),
            "inspect_space"
                | "read_note"
                | "read_talk_messages"
                | "configure_space"
                | "change_note"
                | "change_phrase"
                | "change_talk_message"
        ) {
            return Err(BackendError::InvalidInput(
                "agent tool name is not supported".into(),
            ));
        }
    }
    if let Some(state) = &message.tool_state {
        validate_agent_tool_state(state)?;
    }
    let tool_fields = [
        message.tool_call_id.is_some(),
        message.tool_name.is_some(),
        message.tool_arguments.is_some(),
        message.tool_state.is_some(),
    ];
    if message.role == "tool" && tool_fields.iter().any(|present| !present) {
        return Err(BackendError::InvalidInput(
            "an agent tool message must include its call ID, name, arguments, and state".into(),
        ));
    }
    if message.role != "tool" && tool_fields.iter().any(|present| *present) {
        return Err(BackendError::InvalidInput(
            "a plain agent message cannot include tool fields".into(),
        ));
    }
    validate_timestamp("agent message created_at", message.created_at)?;
    validate_timestamp("agent message updated_at", message.updated_at)?;
    if message.updated_at < message.created_at {
        return Err(BackendError::InvalidInput(
            "agent message updated_at must not precede created_at".into(),
        ));
    }
    Ok(())
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

fn row_to_analytics(row: &Row<'_>) -> rusqlite::Result<AnalyticsEvent> {
    let encoded: String = row.get(4)?;
    let data = serde_json::from_str(&encoded).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(error))
    })?;
    Ok(AnalyticsEvent {
        id: row.get(0)?,
        user_id: row.get(1)?,
        event_type: row.get(2)?,
        timestamp: row.get(3)?,
        data,
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
    if phrase.updated_at < phrase.created_at {
        return Err(BackendError::InvalidInput(
            "phrase updated timestamp must not precede its created timestamp".into(),
        ));
    }
    Ok(())
}

fn validate_analytics_event(event: &AnalyticsEvent) -> Result<()> {
    validate_identifier("analytics event ID", &event.id)?;
    validate_identifier("analytics user ID", &event.user_id)?;
    if !matches!(
        event.event_type.as_str(),
        "message_sent" | "ai_generation" | "tts_generation" | "note_present" | "note_export"
    ) {
        return Err(BackendError::InvalidInput(
            "analytics event type is not supported".into(),
        ));
    }
    if !event.data.is_object() {
        return Err(BackendError::InvalidInput(
            "analytics event data must be an object".into(),
        ));
    }
    validate_timestamp("analytics event timestamp", event.timestamp)
}

fn validate_backup_contents(contents: &BackupContents) -> Result<()> {
    if let Some(setup) = &contents.settings.setup {
        validate_identifier("setup ID", &setup.id)?;
        if setup.name.is_empty() {
            return Err(BackendError::InvalidInput(
                "backup setup name must not be empty".into(),
            ));
        }
        if !matches!(setup.mode.as_str(), "free" | "advanced") {
            return Err(BackendError::InvalidInput(
                "backup setup mode is not supported".into(),
            ));
        }
        validate_backup_model_config("default", &setup.default_model)?;
        if let Some(config) = &setup.suggestions_model {
            validate_backup_model_config("Suggestions", config)?;
        }
        if !matches!(setup.voice_service.as_str(), "system" | "elevenlabs") {
            return Err(BackendError::InvalidInput(
                "backup voice service is not supported".into(),
            ));
        }
    }
    if let Some(speech) = &contents.settings.speech {
        if !matches!(speech.provider.as_str(), "system" | "elevenlabs") {
            return Err(BackendError::InvalidInput(
                "backup speech provider is not supported".into(),
            ));
        }
        if let Some(voice_id) = &speech.voice_id {
            validate_identifier("backup voice ID", voice_id)?;
        }
        validate_identifier("backup model ID", &speech.model_id)?;
        validate_range("backup speech stability", speech.stability, 0.0, 1.0)?;
        validate_range("backup speech similarity", speech.similarity, 0.0, 1.0)?;
        validate_range("backup speech speed", speech.speed, 0.7, 1.2)?;
    }
    for (slug, mode) in &contents.settings.space_modes {
        validate_identifier("backup space mode slug", slug)?;
        if !matches!(mode.as_str(), "talk" | "notes" | "agent") {
            return Err(BackendError::InvalidInput(
                "backup space mode is not supported".into(),
            ));
        }
    }
    if !matches!(contents.settings.panel.tab.as_str(), "phrases" | "voice") {
        return Err(BackendError::InvalidInput(
            "backup panel tab is not supported".into(),
        ));
    }
    if !matches!(
        contents.settings.present.tone.as_str(),
        "indigo" | "ink" | "paper" | "cream" | "sage" | "blush" | "sky"
    ) {
        return Err(BackendError::InvalidInput(
            "backup presentation tone is not supported".into(),
        ));
    }

    validate_unique_ids("space", contents.spaces.iter().map(|row| row.id.as_str()))?;
    validate_unique_ids(
        "message",
        contents.messages.iter().map(|row| row.id.as_str()),
    )?;
    validate_unique_ids(
        "agent message",
        contents.agent_messages.iter().map(|row| row.id.as_str()),
    )?;
    validate_unique_ids("note", contents.notes.iter().map(|row| row.id.as_str()))?;
    validate_unique_ids(
        "saved phrase",
        contents.saved_phrases.iter().map(|row| row.id.as_str()),
    )?;
    validate_unique_ids(
        "usage event",
        contents.usage_events.iter().map(|row| row.id.as_str()),
    )?;

    let mut space_ids = HashSet::new();
    let mut space_slugs = HashSet::new();
    for space in &contents.spaces {
        validate_space(space)?;
        space_ids.insert(space.id.as_str());
        let slug = backup_space_slug(space.title.as_deref());
        if !space_slugs.insert(slug.clone()) {
            return Err(BackendError::InvalidInput(format!(
                "more than one backup space title uses the route {slug}"
            )));
        }
    }
    for message in &contents.messages {
        validate_message(&message.as_message())?;
        validate_backup_space_reference("message", message.space_id.as_deref(), &space_ids)?;
    }
    for message in &contents.agent_messages {
        validate_agent_message(message)?;
        validate_backup_space_reference("agent message", Some(&message.space_id), &space_ids)?;
    }
    for note in &contents.notes {
        validate_note(note)?;
        validate_backup_space_reference("note", note.space_id.as_deref(), &space_ids)?;
    }
    for phrase in &contents.saved_phrases {
        validate_phrase(phrase)?;
        validate_backup_space_reference("saved phrase", Some(&phrase.space_id), &space_ids)?;
    }
    for event in &contents.usage_events {
        validate_analytics_event(event)?;
    }
    Ok(())
}

fn validate_backup_model_config(label: &str, config: &BackupModelConfig) -> Result<()> {
    if !matches!(config.service.as_str(), "apple" | "openrouter" | "none") {
        return Err(BackendError::InvalidInput(format!(
            "backup {label} model service is not supported"
        )));
    }
    Ok(())
}

fn validate_unique_ids<'a>(label: &str, ids: impl Iterator<Item = &'a str>) -> Result<()> {
    let mut found = HashSet::new();
    for id in ids {
        if !found.insert(id) {
            return Err(BackendError::InvalidInput(format!(
                "backup contains a duplicate {label} ID"
            )));
        }
    }
    Ok(())
}

fn validate_backup_space_reference(
    label: &str,
    space_id: Option<&str>,
    space_ids: &HashSet<&str>,
) -> Result<()> {
    if space_id.is_some_and(|id| !space_ids.contains(id)) {
        return Err(BackendError::InvalidInput(format!(
            "backup {label} refers to a missing space"
        )));
    }
    Ok(())
}

fn backup_space_slug(title: Option<&str>) -> String {
    let mut slug = String::new();
    let mut separated = false;
    // The whole title lowercases, not only its ASCII, so this agrees with
    // `spaceSlug` in the core package on every title the apps accept.
    for character in title.unwrap_or_default().to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            if separated && !slug.is_empty() {
                slug.push('-');
            }
            slug.push(character);
            separated = false;
        } else {
            separated = true;
        }
    }
    if slug.is_empty() {
        "space".to_owned()
    } else {
        slug
    }
}

fn validate_range(name: &str, value: f64, minimum: f64, maximum: f64) -> Result<()> {
    if !value.is_finite() || value < minimum || value > maximum {
        return Err(BackendError::InvalidInput(format!(
            "{name} must be from {minimum} to {maximum}"
        )));
    }
    Ok(())
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

    use super::{
        AgentMessage, AnalyticsEvent, BackupContents, BackupMessage, BackupModelConfig,
        BackupPanel, BackupPresent, BackupSettings, BackupSetup, BackupSpeech, Note, Repository,
        SavedPhrase, Space, SpacePatch,
    };

    fn analytics_event(id: &str, user_id: &str, timestamp: i64) -> AnalyticsEvent {
        AnalyticsEvent {
            id: id.to_owned(),
            user_id: user_id.to_owned(),
            event_type: "message_sent".to_owned(),
            timestamp,
            data: serde_json::json!({ "text_length": 12, "keys_typed": 3 }),
        }
    }

    fn backup_contents(space_id: &str) -> BackupContents {
        BackupContents {
            settings: BackupSettings {
                setup: Some(BackupSetup {
                    id: "user-1".to_owned(),
                    name: "Ravi".to_owned(),
                    speaking_style: "Plain and direct.".to_owned(),
                    personal_words: String::new(),
                    mode: "advanced".to_owned(),
                    default_model: BackupModelConfig {
                        service: "openrouter".to_owned(),
                        model: "default/model".to_owned(),
                    },
                    suggestions_model: Some(BackupModelConfig {
                        service: "openrouter".to_owned(),
                        model: "suggestions/model".to_owned(),
                    }),
                    voice_service: "elevenlabs".to_owned(),
                }),
                speech: Some(BackupSpeech {
                    provider: "elevenlabs".to_owned(),
                    voice_id: Some("voice-1".to_owned()),
                    model_id: "eleven_turbo_v2_5".to_owned(),
                    stability: 0.5,
                    similarity: 0.75,
                    speed: 1.0,
                }),
                dismissed_ideas: vec!["idea-1".to_owned()],
                space_modes: [("general".to_owned(), "notes".to_owned())].into(),
                new_space_draft: "New draft".to_owned(),
                panel: BackupPanel {
                    open: true,
                    tab: "voice".to_owned(),
                },
                present: BackupPresent {
                    tone: "cream".to_owned(),
                    spoken: false,
                },
            },
            spaces: vec![Space {
                id: space_id.to_owned(),
                user_id: "user-1".to_owned(),
                title: Some("General".to_owned()),
                context: Some("At home".to_owned()),
                phrases_synced_count: Some(1),
                created_at: 10,
                updated_at: 20,
            }],
            messages: vec![BackupMessage {
                id: "message-1".to_owned(),
                space_id: Some(space_id.to_owned()),
                user_id: "user-1".to_owned(),
                text: "Hello".to_owned(),
                message_type: "user".to_owned(),
                created_at: 30,
            }],
            agent_messages: Vec::new(),
            notes: vec![Note {
                id: "note-1".to_owned(),
                space_id: Some(space_id.to_owned()),
                name: Some("Greeting".to_owned()),
                content: "Hello there".to_owned(),
                created_at: 40,
                updated_at: 50,
            }],
            saved_phrases: vec![SavedPhrase {
                id: "phrase-1".to_owned(),
                space_id: space_id.to_owned(),
                text: "Give me a minute.".to_owned(),
                kind: "phrase".to_owned(),
                code: Some("gmm".to_owned()),
                pinned: true,
                created_at: 60,
                updated_at: 60,
            }],
            usage_events: vec![analytics_event("event-1", "user-1", 70)],
        }
    }

    #[test]
    fn a_backup_round_trip_keeps_every_portable_value() {
        let mut repository = Repository::open_in_memory().unwrap();
        let contents = backup_contents("space-1");

        repository.replace_backup_contents(&contents).unwrap();

        assert_eq!(repository.backup_contents("user-1").unwrap(), contents);
    }

    #[test]
    fn a_backup_keeps_the_agent_mode_of_a_space() {
        let mut repository = Repository::open_in_memory().unwrap();
        let mut contents = backup_contents("space-1");
        contents
            .settings
            .space_modes
            .insert("general".to_owned(), "agent".to_owned());

        repository.replace_backup_contents(&contents).unwrap();

        assert_eq!(
            repository
                .backup_contents("user-1")
                .unwrap()
                .settings
                .space_modes
                .get("general")
                .map(String::as_str),
            Some("agent")
        );
    }

    #[test]
    fn the_shared_version_one_fixture_restores_on_desktop() {
        let contents: BackupContents = serde_json::from_str(include_str!(
            "../../../../packages/core/rules/fixtures/backup-v1.json"
        ))
        .unwrap();
        let mut repository = Repository::open_in_memory().unwrap();

        repository.replace_backup_contents(&contents).unwrap();

        let restored = repository.backup_contents("person-1").unwrap();
        assert_eq!(restored.spaces[0].id, "space-1");
        assert_eq!(restored.saved_phrases[0].id, "phrase-1");
    }

    #[test]
    fn a_backup_replacement_removes_every_row_that_was_here() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .replace_backup_contents(&backup_contents("old-space"))
            .unwrap();

        let mut next = backup_contents("new-space");
        next.notes.clear();
        next.saved_phrases.clear();
        next.usage_events.clear();
        repository.replace_backup_contents(&next).unwrap();

        let restored = repository.backup_contents("user-1").unwrap();
        assert!(restored.notes.is_empty());
        assert!(restored.saved_phrases.is_empty());
        assert!(restored.usage_events.is_empty());
        assert_eq!(restored.spaces.len(), 1);
        assert_eq!(restored.spaces[0].id, "new-space");
    }

    #[test]
    fn a_backup_gives_every_row_the_owner_that_setup_names() {
        let mut repository = Repository::open_in_memory().unwrap();
        let mut contents = backup_contents("space-1");
        contents.spaces[0].user_id = "an-old-mac-login".to_owned();
        contents.messages[0].user_id = "an-old-mac-login".to_owned();
        contents.usage_events[0].user_id = "an-old-mac-login".to_owned();

        repository.replace_backup_contents(&contents).unwrap();

        let restored = repository.backup_contents("user-1").unwrap();
        assert_eq!(restored.spaces[0].user_id, "user-1");
        assert_eq!(restored.messages[0].user_id, "user-1");
        assert_eq!(restored.usage_events[0].user_id, "user-1");
    }

    #[test]
    fn a_backup_route_reads_a_title_the_way_the_shared_rule_reads_it() {
        // `spaceSlug` in the core package lowercases the whole title, not
        // only its ASCII, so the two must agree on where a route collides.
        assert_eq!(super::backup_space_slug(Some("My Family")), "my-family");
        assert_eq!(super::backup_space_slug(Some("\u{212a}elvin")), "kelvin");
        assert_eq!(
            super::backup_space_slug(Some("\u{130}stanbul")),
            "i-stanbul"
        );
        assert_eq!(super::backup_space_slug(Some("Caf\u{e9} One")), "caf-one");
        assert_eq!(super::backup_space_slug(Some("...")), "space");
    }

    #[test]
    fn a_backup_replacement_keeps_device_settings() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .put_setting("audio-output", &serde_json::json!("speaker-1"))
            .unwrap();
        repository
            .put_setting("internal-state", &serde_json::json!({ "ready": true }))
            .unwrap();

        repository
            .replace_backup_contents(&backup_contents("space-1"))
            .unwrap();

        assert_eq!(
            repository.get_setting("audio-output").unwrap(),
            Some(serde_json::json!("speaker-1"))
        );
        assert_eq!(
            repository.get_setting("internal-state").unwrap(),
            Some(serde_json::json!({ "ready": true }))
        );
    }

    #[test]
    fn a_backup_normalizes_the_old_boolean_panel_setting() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_setting("panel-open", &serde_json::json!(true))
            .unwrap();

        assert_eq!(
            repository.backup_contents("user-1").unwrap().settings.panel,
            BackupPanel {
                open: true,
                tab: "phrases".to_owned(),
            }
        );
    }

    #[test]
    fn a_backup_normalizes_an_old_panel_tab() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_setting(
                "panel-open",
                &serde_json::json!({ "open": true, "tab": "camera" }),
            )
            .unwrap();

        assert_eq!(
            repository.backup_contents("user-1").unwrap().settings.panel,
            BackupPanel {
                open: true,
                tab: "phrases".to_owned(),
            }
        );
    }

    #[test]
    fn a_backup_adds_the_owner_to_an_old_setup_setting() {
        let repository = Repository::open_in_memory().unwrap();
        let mut setup =
            serde_json::to_value(backup_contents("space-1").settings.setup.unwrap()).unwrap();
        setup.as_object_mut().unwrap().remove("id");
        repository.put_setting("setup", &setup).unwrap();

        assert_eq!(
            repository
                .backup_contents("legacy-owner")
                .unwrap()
                .settings
                .setup
                .unwrap()
                .id,
            "legacy-owner"
        );
    }

    #[test]
    fn a_failed_backup_write_rolls_back_every_erasure() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&backup_contents("old-space").spaces[0])
            .unwrap();
        repository
            .put_setting("new-space-draft", &serde_json::json!("Old draft"))
            .unwrap();
        repository
            .connection
            .execute_batch(
                "CREATE TRIGGER stop_backup BEFORE INSERT ON spaces
                 WHEN NEW.id = 'new-space'
                 BEGIN SELECT RAISE(ABORT, 'stop backup'); END;",
            )
            .unwrap();

        assert!(repository
            .replace_backup_contents(&backup_contents("new-space"))
            .is_err());
        assert!(repository.get_space("old-space").unwrap().is_some());
        assert_eq!(
            repository.get_setting("new-space-draft").unwrap(),
            Some(serde_json::json!("Old draft"))
        );
    }

    #[test]
    fn every_shared_usage_event_type_is_stored() {
        let repository = Repository::open_in_memory().unwrap();

        for (index, event_type) in [
            "message_sent",
            "ai_generation",
            "tts_generation",
            "note_present",
            "note_export",
        ]
        .into_iter()
        .enumerate()
        {
            repository
                .put_analytics_event(&AnalyticsEvent {
                    id: format!("event-{index}"),
                    user_id: "user-1".to_owned(),
                    event_type: event_type.to_owned(),
                    timestamp: index as i64,
                    data: serde_json::json!({}),
                })
                .unwrap();
        }

        assert_eq!(repository.list_all_analytics_events().unwrap().len(), 5);
    }

    #[test]
    fn a_backup_rejects_non_object_usage_data() {
        let mut repository = Repository::open_in_memory().unwrap();
        let mut contents = backup_contents("space-1");
        contents.usage_events[0].data = serde_json::json!([]);

        assert!(repository.replace_backup_contents(&contents).is_err());
        assert!(repository.list_all_analytics_events().unwrap().is_empty());
    }

    #[test]
    fn a_backup_rejects_an_unknown_suggestions_service() {
        let mut repository = Repository::open_in_memory().unwrap();
        let mut contents = backup_contents("space-1");
        contents
            .settings
            .setup
            .as_mut()
            .unwrap()
            .suggestions_model
            .as_mut()
            .unwrap()
            .service = "unknown".to_owned();

        assert!(repository.replace_backup_contents(&contents).is_err());
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
    fn agent_messages_are_separate_cascade_and_a_proposal_resolves_once() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&Space {
                id: "space-1".to_owned(),
                user_id: "user-1".to_owned(),
                title: Some("General".to_owned()),
                context: None,
                phrases_synced_count: None,
                created_at: 1,
                updated_at: 1,
            })
            .unwrap();
        repository
            .put_agent_message(&AgentMessage {
                id: "agent-1".to_owned(),
                space_id: "space-1".to_owned(),
                role: "tool".to_owned(),
                content: "Delete note".to_owned(),
                tool_call_id: Some("call-1".to_owned()),
                tool_name: Some("change_note".to_owned()),
                tool_arguments: Some("{\"operation\":\"delete\"}".to_owned()),
                tool_state: Some("pending".to_owned()),
                created_at: 2,
                updated_at: 2,
            })
            .unwrap();

        assert!(repository
            .list_messages(Some("space-1"))
            .unwrap()
            .is_empty());
        assert_eq!(repository.list_agent_messages("space-1").unwrap().len(), 1);
        let applied = repository
            .update_agent_tool_state("agent-1", "pending", "applied", "Done.", 3)
            .unwrap();
        assert_eq!(applied.tool_state.as_deref(), Some("applied"));
        assert!(repository
            .update_agent_tool_state("agent-1", "pending", "rejected", "", 4)
            .is_err());

        repository.delete_space("space-1").unwrap();
        assert!(repository
            .list_agent_messages("space-1")
            .unwrap()
            .is_empty());
    }

    #[test]
    fn an_agent_tool_row_must_keep_all_tool_fields_off_plain_messages() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&Space {
                id: "space-1".to_owned(),
                user_id: "user-1".to_owned(),
                title: None,
                context: None,
                phrases_synced_count: None,
                created_at: 1,
                updated_at: 1,
            })
            .unwrap();
        let malformed = AgentMessage {
            id: "agent-1".to_owned(),
            space_id: "space-1".to_owned(),
            role: "assistant".to_owned(),
            content: "Hello".to_owned(),
            tool_call_id: None,
            tool_name: None,
            tool_arguments: None,
            tool_state: Some("pending".to_owned()),
            created_at: 2,
            updated_at: 2,
        };

        assert!(repository.put_agent_message(&malformed).is_err());
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
                reset_phrases_synced_count: false,
                updated_at: 2,
            })
            .unwrap();
        let saved = repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: None,
                context: None,
                phrases_synced_count: Some(1),
                reset_phrases_synced_count: false,
                updated_at: 3,
            })
            .unwrap();

        // The count arrived last and must not have taken the name with it.
        assert_eq!(saved.title.as_deref(), Some("Asking for water"));
        assert_eq!(saved.context.as_deref(), Some("I am talking to my carer."));
        assert_eq!(saved.phrases_synced_count, Some(1));

        let reset = repository
            .patch_space(&SpacePatch {
                id: "space-1".to_owned(),
                title: None,
                context: None,
                phrases_synced_count: None,
                reset_phrases_synced_count: true,
                updated_at: 4,
            })
            .unwrap();
        assert_eq!(reset.phrases_synced_count, None);
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
                reset_phrases_synced_count: false,
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
                reset_phrases_synced_count: false,
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
            reset_phrases_synced_count: false,
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
