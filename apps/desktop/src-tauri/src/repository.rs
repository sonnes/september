use std::path::Path;

use rusqlite::{params, params_from_iter, types::ToSql, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::error::{BackendError, Result};

/// Each step brings the database to its version. Versions 1 to 3 held only
/// the settings table, and step 4 creates it when it is absent.
const MIGRATIONS: [(i64, &str); 5] = [
    (4, include_str!("../migrations/0004_domain_tables.sql")),
    (5, include_str!("../migrations/0005_saved_phrases.sql")),
    (6, include_str!("../migrations/0006_analytics_events.sql")),
    (7, include_str!("../migrations/0007_agent_messages.sql")),
    (
        8,
        include_str!("../migrations/0008_drop_message_audio_path.sql"),
    ),
];

/// The settings a backup carries. Every other key belongs to this Mac.
pub const PORTABLE_SETTING_KEYS: [&str; 6] = [
    "setup",
    "speech",
    "dismissed-ideas",
    "space-modes",
    "panel-open",
    "present",
];

/// A usage event older than this is deleted before the next read or write.
pub const ANALYTICS_RETENTION_MS: i64 = 90 * 24 * 60 * 60 * 1_000;

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

/// Every portable value, as stored. The WebView checks the values and turns
/// the settings into the backup file.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupContents {
    /// Portable settings by key. A key with no value is absent.
    pub settings: Map<String, Value>,
    pub spaces: Vec<Space>,
    pub messages: Vec<Message>,
    pub agent_messages: Vec<AgentMessage>,
    pub notes: Vec<Note>,
    pub saved_phrases: Vec<SavedPhrase>,
    pub usage_events: Vec<AnalyticsEvent>,
}

/// A row type and the table that holds it. The columns are in the order of
/// `values` and `from_row`, with `id` first.
trait Record: Sized {
    const TABLE: &'static str;
    const COLUMNS: &'static [&'static str];
    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>>;
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self>;
    fn validate(&self) -> Result<()>;
}

fn select_sql<R: Record>(rest: &str) -> String {
    format!("SELECT {} FROM {} {rest}", R::COLUMNS.join(", "), R::TABLE)
}

fn insert_sql<R: Record>() -> String {
    let places: Vec<String> = (1..=R::COLUMNS.len()).map(|n| format!("?{n}")).collect();
    format!(
        "INSERT INTO {} ({}) VALUES ({})",
        R::TABLE,
        R::COLUMNS.join(", "),
        places.join(", ")
    )
}

fn upsert_sql<R: Record>() -> String {
    let updates: Vec<String> = R::COLUMNS[1..]
        .iter()
        .map(|column| format!("{column} = excluded.{column}"))
        .collect();
    format!(
        "{} ON CONFLICT(id) DO UPDATE SET {}",
        insert_sql::<R>(),
        updates.join(", ")
    )
}

fn write_row<R: Record>(connection: &Connection, sql: &str, row: &R) -> Result<()> {
    row.validate()?;
    connection.execute(sql, params_from_iter(row.values()?))?;
    Ok(())
}

fn query_rows<R: Record>(
    connection: &Connection,
    rest: &str,
    params: impl rusqlite::Params,
) -> Result<Vec<R>> {
    let mut statement = connection.prepare(&select_sql::<R>(rest))?;
    let rows = statement.query_map(params, R::from_row)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

fn find_row<R: Record>(connection: &Connection, id: &str) -> Result<Option<R>> {
    validate_identifier("ID", id)?;
    Ok(connection
        .query_row(&select_sql::<R>("WHERE id = ?1"), [id], R::from_row)
        .optional()?)
}

fn delete_row<R: Record>(connection: &Connection, id: &str) -> Result<bool> {
    validate_identifier("ID", id)?;
    Ok(connection.execute(&format!("DELETE FROM {} WHERE id = ?1", R::TABLE), [id])? > 0)
}

impl Record for Space {
    const TABLE: &'static str = "spaces";
    const COLUMNS: &'static [&'static str] = &[
        "id",
        "user_id",
        "title",
        "context",
        "phrases_synced_count",
        "created_at",
        "updated_at",
    ];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.user_id),
            Box::new(&self.title),
            Box::new(&self.context),
            Box::new(self.phrases_synced_count),
            Box::new(self.created_at),
            Box::new(self.updated_at),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            title: row.get(2)?,
            context: row.get(3)?,
            phrases_synced_count: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    fn validate(&self) -> Result<()> {
        validate_identifier("space ID", &self.id)?;
        validate_identifier("space user ID", &self.user_id)?;
        validate_timestamp("space created_at", self.created_at)?;
        validate_timestamp("space updated_at", self.updated_at)
    }
}

impl Record for Message {
    const TABLE: &'static str = "messages";
    const COLUMNS: &'static [&'static str] =
        &["id", "space_id", "user_id", "text", "type", "created_at"];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.space_id),
            Box::new(&self.user_id),
            Box::new(&self.text),
            Box::new(&self.message_type),
            Box::new(self.created_at),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            space_id: row.get(1)?,
            user_id: row.get(2)?,
            text: row.get(3)?,
            message_type: row.get(4)?,
            created_at: row.get(5)?,
        })
    }

    fn validate(&self) -> Result<()> {
        validate_identifier("message ID", &self.id)?;
        validate_identifier("message user ID", &self.user_id)?;
        validate_text("message type", &self.message_type)?;
        if let Some(space_id) = &self.space_id {
            validate_identifier("message space ID", space_id)?;
        }
        validate_timestamp("message created_at", self.created_at)
    }
}

impl Record for AgentMessage {
    const TABLE: &'static str = "agent_messages";
    const COLUMNS: &'static [&'static str] = &[
        "id",
        "space_id",
        "role",
        "content",
        "tool_call_id",
        "tool_name",
        "tool_arguments",
        "tool_state",
        "created_at",
        "updated_at",
    ];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.space_id),
            Box::new(&self.role),
            Box::new(&self.content),
            Box::new(&self.tool_call_id),
            Box::new(&self.tool_name),
            Box::new(&self.tool_arguments),
            Box::new(&self.tool_state),
            Box::new(self.created_at),
            Box::new(self.updated_at),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
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

    fn validate(&self) -> Result<()> {
        validate_identifier("agent message ID", &self.id)?;
        validate_identifier("agent message space ID", &self.space_id)?;
        validate_text("agent message role", &self.role)?;
        if let Some(tool_call_id) = &self.tool_call_id {
            validate_identifier("agent tool call ID", tool_call_id)?;
        }
        validate_timestamp("agent message created_at", self.created_at)?;
        validate_timestamp("agent message updated_at", self.updated_at)
    }
}

impl Record for Note {
    const TABLE: &'static str = "notes";
    const COLUMNS: &'static [&'static str] = &[
        "id",
        "space_id",
        "name",
        "content",
        "created_at",
        "updated_at",
    ];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.space_id),
            Box::new(&self.name),
            Box::new(&self.content),
            Box::new(self.created_at),
            Box::new(self.updated_at),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }

    fn validate(&self) -> Result<()> {
        validate_identifier("note ID", &self.id)?;
        if let Some(space_id) = &self.space_id {
            validate_identifier("note space ID", space_id)?;
        }
        validate_timestamp("note created_at", self.created_at)?;
        validate_timestamp("note updated_at", self.updated_at)
    }
}

impl Record for SavedPhrase {
    const TABLE: &'static str = "saved_phrases";
    const COLUMNS: &'static [&'static str] = &[
        "id",
        "space_id",
        "text",
        "kind",
        "code",
        "pinned",
        "created_at",
        "updated_at",
    ];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.space_id),
            Box::new(&self.text),
            Box::new(&self.kind),
            Box::new(&self.code),
            Box::new(self.pinned),
            Box::new(self.created_at),
            Box::new(self.updated_at),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
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

    fn validate(&self) -> Result<()> {
        validate_identifier("phrase ID", &self.id)?;
        validate_identifier("phrase space ID", &self.space_id)?;
        validate_text("phrase text", &self.text)?;
        validate_text("phrase kind", &self.kind)?;
        validate_timestamp("phrase created_at", self.created_at)?;
        validate_timestamp("phrase updated_at", self.updated_at)
    }
}

impl Record for AnalyticsEvent {
    const TABLE: &'static str = "analytics_events";
    const COLUMNS: &'static [&'static str] = &["id", "user_id", "event_type", "timestamp", "data"];

    fn values(&self) -> Result<Vec<Box<dyn ToSql + '_>>> {
        Ok(vec![
            Box::new(&self.id),
            Box::new(&self.user_id),
            Box::new(&self.event_type),
            Box::new(self.timestamp),
            Box::new(serde_json::to_string(&self.data)?),
        ])
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let encoded: String = row.get(4)?;
        let data = serde_json::from_str(&encoded).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                4,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })?;
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            event_type: row.get(2)?,
            timestamp: row.get(3)?,
            data,
        })
    }

    fn validate(&self) -> Result<()> {
        validate_identifier("analytics event ID", &self.id)?;
        validate_identifier("analytics user ID", &self.user_id)?;
        validate_text("analytics event type", &self.event_type)?;
        validate_timestamp("analytics event timestamp", self.timestamp)
    }
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
        let transaction = self.connection.transaction()?;
        for (step, sql) in MIGRATIONS.iter().filter(|(step, _)| *step > version) {
            transaction.execute_batch(sql)?;
            transaction.pragma_update(None, "user_version", step)?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn list_spaces(&self, user_id: &str) -> Result<Vec<Space>> {
        validate_identifier("space user ID", user_id)?;
        query_rows(
            &self.connection,
            "WHERE user_id = ?1 ORDER BY updated_at DESC, id",
            [user_id],
        )
    }

    pub fn get_space(&self, id: &str) -> Result<Option<Space>> {
        find_row(&self.connection, id)
    }

    pub fn put_space(&self, space: &Space) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<Space>(), space)
    }

    /// Changes some fields of a space, and leaves the rest as they are.
    ///
    /// A space has more than one writer, and each writer knows only its own
    /// fields. One statement for each writer keeps every change.
    pub fn patch_space(&self, patch: &SpacePatch) -> Result<Space> {
        validate_identifier("space ID", &patch.id)?;
        validate_timestamp("space updated_at", patch.updated_at)?;
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
        delete_row::<Space>(&self.connection, id)
    }

    pub fn list_messages(&self, space_id: Option<&str>) -> Result<Vec<Message>> {
        validate_space_filter(space_id)?;
        query_rows(
            &self.connection,
            "WHERE (?1 IS NULL OR space_id = ?1) ORDER BY created_at, id",
            [space_id],
        )
    }

    pub fn get_message(&self, id: &str) -> Result<Option<Message>> {
        find_row(&self.connection, id)
    }

    pub fn put_message(&self, message: &Message) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<Message>(), message)
    }

    pub fn delete_message(&self, id: &str) -> Result<bool> {
        delete_row::<Message>(&self.connection, id)
    }

    pub fn list_agent_messages(&self, space_id: &str) -> Result<Vec<AgentMessage>> {
        validate_identifier("agent message space ID", space_id)?;
        query_rows(
            &self.connection,
            "WHERE space_id = ?1 ORDER BY created_at, id",
            [space_id],
        )
    }

    pub fn put_agent_message(&self, message: &AgentMessage) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<AgentMessage>(), message)
    }

    /// Moves a tool request from `expected` to `state`. A request that is not
    /// in `expected` any more stays as it is, so it resolves once.
    pub fn update_agent_tool_state(
        &self,
        id: &str,
        expected: &str,
        state: &str,
        content: &str,
        updated_at: i64,
    ) -> Result<AgentMessage> {
        validate_identifier("agent message ID", id)?;
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
        find_row(&self.connection, id)?.ok_or_else(|| {
            BackendError::InvalidInput("that agent request is gone or already resolved".into())
        })
    }

    pub fn list_notes(&self, space_id: Option<&str>) -> Result<Vec<Note>> {
        validate_space_filter(space_id)?;
        query_rows(
            &self.connection,
            "WHERE (?1 IS NULL OR space_id = ?1) ORDER BY updated_at DESC, id",
            [space_id],
        )
    }

    pub fn get_note(&self, id: &str) -> Result<Option<Note>> {
        find_row(&self.connection, id)
    }

    pub fn put_note(&self, note: &Note) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<Note>(), note)
    }

    pub fn delete_note(&self, id: &str) -> Result<bool> {
        delete_row::<Note>(&self.connection, id)
    }

    /// The phrases of one space, or of every space. Pinned rows come first.
    pub fn list_phrases(&self, space_id: Option<&str>) -> Result<Vec<SavedPhrase>> {
        validate_space_filter(space_id)?;
        query_rows(
            &self.connection,
            "WHERE (?1 IS NULL OR space_id = ?1) ORDER BY pinned DESC, created_at, id",
            [space_id],
        )
    }

    pub fn put_phrase(&self, phrase: &SavedPhrase) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<SavedPhrase>(), phrase)
    }

    pub fn delete_phrase(&self, id: &str) -> Result<bool> {
        delete_row::<SavedPhrase>(&self.connection, id)
    }

    /// Puts the rows that a model wrote in place of the unpinned rows of one
    /// space, in one transaction. A pinned row is never touched.
    pub fn replace_ai_phrases(&mut self, space_id: &str, rows: &[SavedPhrase]) -> Result<()> {
        validate_identifier("phrase space ID", space_id)?;
        for row in rows {
            if row.pinned {
                return Err(BackendError::InvalidInput(
                    "a replacement phrase must not be pinned".into(),
                ));
            }
            if row.space_id != space_id {
                return Err(BackendError::InvalidInput(
                    "a replacement phrase must belong to the space it replaces".into(),
                ));
            }
        }

        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM saved_phrases WHERE space_id = ?1 AND pinned = 0",
            [space_id],
        )?;
        let upsert = upsert_sql::<SavedPhrase>();
        for row in rows {
            write_row(&transaction, &upsert, row)?;
        }
        transaction.commit()?;
        Ok(())
    }

    /// Stores one usage event, then applies the retention boundary.
    pub fn put_analytics_event(&self, event: &AnalyticsEvent, now: i64) -> Result<()> {
        write_row(&self.connection, &upsert_sql::<AnalyticsEvent>(), event)?;
        self.delete_expired_analytics(now)
    }

    /// The events of one user in a time range, newest first, after the
    /// retention boundary is applied.
    pub fn list_analytics_events(
        &self,
        user_id: &str,
        start_at: i64,
        end_at: i64,
        now: i64,
    ) -> Result<Vec<AnalyticsEvent>> {
        validate_identifier("analytics user ID", user_id)?;
        self.delete_expired_analytics(now)?;
        query_rows(
            &self.connection,
            "WHERE user_id = ?1 AND timestamp BETWEEN ?2 AND ?3 ORDER BY timestamp DESC, id",
            params![user_id, start_at, end_at],
        )
    }

    /// Deletes events strictly older than the retention period.
    fn delete_expired_analytics(&self, now: i64) -> Result<()> {
        let cutoff = now.saturating_sub(ANALYTICS_RETENTION_MS);
        self.connection.execute(
            "DELETE FROM analytics_events WHERE timestamp < ?1",
            [cutoff],
        )?;
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
        put_setting(&self.connection, key, value)
    }

    /// Every portable value. Usage events past the retention boundary are
    /// deleted first.
    pub fn backup_contents(&self, now: i64) -> Result<BackupContents> {
        self.delete_expired_analytics(now)?;
        let mut settings = Map::new();
        for key in PORTABLE_SETTING_KEYS {
            if let Some(value) = self.get_setting(key)? {
                settings.insert(key.to_owned(), value);
            }
        }
        let all = "ORDER BY id";
        Ok(BackupContents {
            settings,
            spaces: query_rows(&self.connection, all, [])?,
            messages: query_rows(&self.connection, all, [])?,
            agent_messages: query_rows(&self.connection, all, [])?,
            notes: query_rows(&self.connection, all, [])?,
            saved_phrases: query_rows(&self.connection, all, [])?,
            usage_events: query_rows(&self.connection, all, [])?,
        })
    }

    /// Replaces every portable value in one transaction. A setting that is
    /// not portable stays as it is. A row with an ID that repeats, or with a
    /// space that is not in the backup, fails the whole restore.
    pub fn replace_backup_contents(&mut self, contents: &BackupContents) -> Result<()> {
        if let Some(key) = contents
            .settings
            .keys()
            .find(|key| !PORTABLE_SETTING_KEYS.contains(&key.as_str()))
        {
            return Err(BackendError::InvalidInput(format!(
                "a backup cannot hold the setting {key}"
            )));
        }

        let transaction = self.connection.transaction()?;
        transaction.execute_batch(
            "DELETE FROM agent_messages;
             DELETE FROM messages;
             DELETE FROM notes;
             DELETE FROM saved_phrases;
             DELETE FROM spaces;
             DELETE FROM analytics_events;",
        )?;
        for key in PORTABLE_SETTING_KEYS {
            transaction.execute("DELETE FROM settings WHERE key = ?1", [key])?;
        }
        for (key, value) in &contents.settings {
            put_setting(&transaction, key, value)?;
        }
        insert_rows(&transaction, &contents.spaces)?;
        insert_rows(&transaction, &contents.messages)?;
        insert_rows(&transaction, &contents.agent_messages)?;
        insert_rows(&transaction, &contents.notes)?;
        insert_rows(&transaction, &contents.saved_phrases)?;
        insert_rows(&transaction, &contents.usage_events)?;
        transaction.commit()?;
        Ok(())
    }
}

fn insert_rows<R: Record>(connection: &Connection, rows: &[R]) -> Result<()> {
    let insert = insert_sql::<R>();
    for row in rows {
        write_row(connection, &insert, row)?;
    }
    Ok(())
}

fn put_setting(connection: &Connection, key: &str, value: &Value) -> Result<()> {
    connection.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, serde_json::to_string(value)?],
    )?;
    Ok(())
}

fn validate_space_filter(space_id: Option<&str>) -> Result<()> {
    match space_id {
        Some(space_id) => validate_identifier("space ID", space_id),
        None => Ok(()),
    }
}

fn validate_identifier(name: &str, value: &str) -> Result<()> {
    if value.is_empty() || value.len() > 256 {
        return Err(BackendError::InvalidInput(format!(
            "{name} must contain 1 to 256 bytes"
        )));
    }
    Ok(())
}

fn validate_text(name: &str, value: &str) -> Result<()> {
    if value.trim().is_empty() {
        return Err(BackendError::InvalidInput(format!(
            "{name} must not be empty"
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
    validate_identifier("setting key", key)
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::json;

    use super::*;

    const NOW: i64 = 1_800_000_000_000;

    fn space(id: &str) -> Space {
        Space {
            id: id.to_owned(),
            user_id: "user-1".to_owned(),
            title: Some("General".to_owned()),
            context: Some("At home".to_owned()),
            phrases_synced_count: Some(1),
            created_at: 10,
            updated_at: 20,
        }
    }

    fn analytics_event(id: &str, user_id: &str, timestamp: i64) -> AnalyticsEvent {
        AnalyticsEvent {
            id: id.to_owned(),
            user_id: user_id.to_owned(),
            event_type: "message_sent".to_owned(),
            timestamp,
            data: json!({ "text_length": 12, "keys_typed": 3 }),
        }
    }

    fn backup_contents(space_id: &str) -> BackupContents {
        let mut settings = Map::new();
        settings.insert(
            "setup".to_owned(),
            json!({ "id": "user-1", "name": "Ravi" }),
        );
        settings.insert(
            "present".to_owned(),
            json!({ "tone": "cream", "spoken": false }),
        );
        BackupContents {
            settings,
            spaces: vec![space(space_id)],
            messages: vec![Message {
                id: "message-1".to_owned(),
                space_id: Some(space_id.to_owned()),
                user_id: "user-1".to_owned(),
                text: "Hello".to_owned(),
                message_type: "user".to_owned(),
                created_at: 30,
            }],
            agent_messages: vec![AgentMessage {
                id: "agent-1".to_owned(),
                space_id: space_id.to_owned(),
                role: "assistant".to_owned(),
                content: "Hi".to_owned(),
                tool_call_id: None,
                tool_name: None,
                tool_arguments: None,
                tool_state: None,
                created_at: 31,
                updated_at: 31,
            }],
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
            usage_events: vec![analytics_event("event-1", "user-1", NOW - 1_000)],
        }
    }

    #[test]
    fn a_backup_round_trip_keeps_every_portable_value() {
        let mut repository = Repository::open_in_memory().unwrap();
        let contents = backup_contents("space-1");

        repository.replace_backup_contents(&contents).unwrap();

        assert_eq!(repository.backup_contents(NOW).unwrap(), contents);
    }

    #[test]
    fn a_backup_replacement_removes_every_row_that_was_here() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .replace_backup_contents(&backup_contents("old-space"))
            .unwrap();
        repository
            .put_setting("speech", &json!({ "provider": "system" }))
            .unwrap();

        let mut next = backup_contents("new-space");
        next.notes.clear();
        next.saved_phrases.clear();
        next.usage_events.clear();
        next.settings.remove("present");
        repository.replace_backup_contents(&next).unwrap();

        let restored = repository.backup_contents(NOW).unwrap();
        assert_eq!(restored, next);
    }

    #[test]
    fn a_backup_replacement_keeps_device_settings() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .put_setting("audio-output", &json!("speaker-1"))
            .unwrap();

        repository
            .replace_backup_contents(&backup_contents("space-1"))
            .unwrap();

        assert_eq!(
            repository.get_setting("audio-output").unwrap(),
            Some(json!("speaker-1"))
        );
        assert!(!repository
            .backup_contents(NOW)
            .unwrap()
            .settings
            .contains_key("audio-output"));
    }

    #[test]
    fn a_backup_cannot_write_a_device_setting() {
        let mut repository = Repository::open_in_memory().unwrap();
        let mut contents = backup_contents("space-1");
        contents
            .settings
            .insert("audio-output".to_owned(), json!("speaker-2"));

        assert!(repository.replace_backup_contents(&contents).is_err());
        assert_eq!(repository.get_setting("audio-output").unwrap(), None);
    }

    #[test]
    fn a_backup_with_a_repeated_id_or_a_missing_space_changes_nothing() {
        let mut repository = Repository::open_in_memory().unwrap();
        repository
            .replace_backup_contents(&backup_contents("old-space"))
            .unwrap();

        let mut repeated = backup_contents("space-1");
        repeated.messages.push(repeated.messages[0].clone());
        let mut orphan = backup_contents("space-1");
        orphan.notes[0].space_id = Some("missing".to_owned());

        for contents in [repeated, orphan] {
            assert!(repository.replace_backup_contents(&contents).is_err());
            assert_eq!(
                repository.backup_contents(NOW).unwrap(),
                backup_contents("old-space")
            );
        }
    }

    #[test]
    fn a_usage_event_older_than_the_retention_period_is_deleted() {
        let repository = Repository::open_in_memory().unwrap();
        let boundary = NOW - ANALYTICS_RETENTION_MS;
        for (id, timestamp) in [("older", boundary - 1), ("boundary", boundary)] {
            repository
                .connection
                .execute(
                    &insert_sql::<AnalyticsEvent>(),
                    params_from_iter(analytics_event(id, "user-1", timestamp).values().unwrap()),
                )
                .unwrap();
        }

        let rows = repository
            .list_analytics_events("user-1", 0, NOW, NOW)
            .unwrap();

        assert_eq!(
            rows.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
            vec!["boundary"]
        );
    }

    #[test]
    fn analytics_events_are_isolated_by_user_and_time_and_newest_first() {
        let repository = Repository::open_in_memory().unwrap();
        for (id, user, timestamp) in [
            ("old", "user-1", NOW - 30),
            ("new", "user-1", NOW - 10),
            ("other", "user-2", NOW - 20),
            ("outside", "user-1", NOW - 40),
        ] {
            repository
                .put_analytics_event(&analytics_event(id, user, timestamp), NOW)
                .unwrap();
        }

        let rows = repository
            .list_analytics_events("user-1", NOW - 30, NOW, NOW)
            .unwrap();
        assert_eq!(
            rows.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
            vec!["new", "old"]
        );
    }

    #[test]
    fn a_database_from_an_earlier_backend_keeps_its_rows() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(concat!(
                include_str!("../migrations/0004_domain_tables.sql"),
                "INSERT INTO settings VALUES ('setup', '{\"name\":\"Ravi\"}');
                 INSERT INTO spaces (id, user_id, created_at, updated_at)
                 VALUES ('space-1', 'user-1', 1, 1);
                 INSERT INTO messages (id, space_id, user_id, text, type, audio_path, created_at)
                 VALUES ('message-1', 'space-1', 'user-1', 'Hello', 'user', '/a.mp3', 2);
                 PRAGMA user_version = 4;"
            ))
            .unwrap();

        let repository = Repository::from_connection(connection).unwrap();

        assert!(repository.get_setting("setup").unwrap().is_some());
        assert_eq!(
            repository.get_message("message-1").unwrap().unwrap().text,
            "Hello"
        );
        assert!(repository.list_phrases(None).unwrap().is_empty());
        assert!(repository
            .list_agent_messages("space-1")
            .unwrap()
            .is_empty());
    }

    #[test]
    fn a_settings_only_database_gains_the_domain_tables() {
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

        assert!(repository.get_setting("setup").unwrap().is_some());
        repository.put_space(&space("space-1")).unwrap();
        assert_eq!(repository.list_spaces("user-1").unwrap().len(), 1);
    }

    #[test]
    fn agent_messages_are_separate_cascade_and_a_proposal_resolves_once() {
        let repository = Repository::open_in_memory().unwrap();
        repository.put_space(&space("space-1")).unwrap();
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

    fn patch(title: Option<&str>, count: Option<i64>, updated_at: i64) -> SpacePatch {
        SpacePatch {
            id: "space-1".to_owned(),
            title: title.map(str::to_owned),
            context: None,
            phrases_synced_count: count,
            reset_phrases_synced_count: false,
            updated_at,
        }
    }

    #[test]
    fn one_writer_of_a_space_never_undoes_another() {
        let repository = Repository::open_in_memory().unwrap();
        repository
            .put_space(&Space {
                phrases_synced_count: None,
                ..space("space-1")
            })
            .unwrap();

        repository
            .patch_space(&SpacePatch {
                context: Some("I am talking to my carer.".to_owned()),
                ..patch(Some("Asking for water"), None, 21)
            })
            .unwrap();
        let saved = repository.patch_space(&patch(None, Some(1), 22)).unwrap();

        assert_eq!(saved.title.as_deref(), Some("Asking for water"));
        assert_eq!(saved.context.as_deref(), Some("I am talking to my carer."));
        assert_eq!(saved.phrases_synced_count, Some(1));

        let renamed = repository
            .patch_space(&patch(Some("My sister"), None, 23))
            .unwrap();
        assert_eq!(renamed.phrases_synced_count, Some(1));

        let reset = repository
            .patch_space(&SpacePatch {
                reset_phrases_synced_count: true,
                ..patch(None, None, 24)
            })
            .unwrap();
        assert_eq!(reset.phrases_synced_count, None);
        assert_eq!(reset.title.as_deref(), Some("My sister"));
    }

    #[test]
    fn a_space_that_is_gone_cannot_be_changed() {
        let repository = Repository::open_in_memory().unwrap();
        assert!(repository
            .patch_space(&patch(Some("Anything"), None, 2))
            .is_err());
    }
}
