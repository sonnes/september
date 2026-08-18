use september_desktop_lib::{
    external::validate_external_url,
    files::{export_suggestion, FileStore},
    identity::normalize_os_user,
    repository::{RecordBatchWrite, RecordDelete, RecordPut, Repository},
};
use serde_json::json;

fn put(collection: &str, id: &str, title: &str, updated_at: i64) -> RecordPut {
    RecordPut {
        collection: collection.into(),
        id: id.into(),
        data: json!({ "title": title }),
        version: Some(format!("v-{updated_at}")),
        updated_at,
    }
}

#[test]
fn os_user_uses_the_account_id_and_display_name() {
    let user = normalize_os_user("  ravi  ", "  Ravi Atluri  ").unwrap();
    assert_eq!(user.id, "ravi");
    assert_eq!(user.name, "Ravi Atluri");

    let fallback = normalize_os_user("ravi", "").unwrap();
    assert_eq!(fallback.name, "ravi");
    assert!(normalize_os_user("", "Nobody").is_err());
}

#[test]
fn migrations_create_every_storage_table() {
    let repository = Repository::open_in_memory().unwrap();

    assert_eq!(repository.schema_version().unwrap(), 2);
    assert_eq!(
        repository.table_names().unwrap(),
        vec!["file_metadata", "records", "settings"]
    );
}

#[test]
fn version_two_migration_removes_existing_cloud_sync_tables() {
    let temp = tempfile::tempdir().unwrap();
    let database = temp.path().join("version-one.sqlite3");
    let connection = rusqlite::Connection::open(&database).unwrap();
    connection
        .execute_batch(include_str!("../migrations/0001_initial.sql"))
        .unwrap();
    connection
        .execute_batch(
            "CREATE TABLE outbox (outbox_id INTEGER PRIMARY KEY); \
             CREATE TABLE sync_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL); \
             PRAGMA user_version = 1;",
        )
        .unwrap();
    drop(connection);

    let repository = Repository::open(database).unwrap();

    assert_eq!(repository.schema_version().unwrap(), 2);
    assert_eq!(
        repository.table_names().unwrap(),
        vec!["file_metadata", "records", "settings"]
    );
}

#[test]
fn record_crud_lists_live_records() {
    let mut repository = Repository::open_in_memory().unwrap();

    let created = repository
        .put_record(put("spaces", "space-1", "Home", 10))
        .unwrap();
    repository
        .put_record(put("spaces", "space-2", "Work", 20))
        .unwrap();

    assert_eq!(created.collection, "spaces");
    assert_eq!(created.id, "space-1");
    assert_eq!(created.data, Some(json!({ "title": "Home" })));
    assert!(!created.deleted);
    assert!(created.sequence > 0);
    assert_eq!(
        repository
            .get_record("spaces", "space-1", false)
            .unwrap()
            .unwrap()
            .data,
        Some(json!({ "title": "Home" }))
    );
    assert_eq!(repository.list_records("spaces", false).unwrap().len(), 2);
}

#[test]
fn record_delete_keeps_a_tombstone() {
    let mut repository = Repository::open_in_memory().unwrap();
    repository
        .put_record(put("messages", "message-1", "Hello", 10))
        .unwrap();

    let tombstone = repository
        .delete_record(RecordDelete {
            collection: "messages".into(),
            id: "message-1".into(),
            version: Some("v-20".into()),
            updated_at: 20,
        })
        .unwrap();

    assert!(tombstone.deleted);
    assert_eq!(tombstone.data, None);
    assert!(repository
        .get_record("messages", "message-1", false)
        .unwrap()
        .is_none());
    assert!(
        repository
            .get_record("messages", "message-1", true)
            .unwrap()
            .unwrap()
            .deleted
    );
    assert!(repository
        .list_records("messages", false)
        .unwrap()
        .is_empty());
    assert_eq!(repository.list_records("messages", true).unwrap().len(), 1);
}

#[test]
fn record_batch_is_atomic() {
    let mut repository = Repository::open_in_memory().unwrap();
    let invalid_batch = [
        RecordBatchWrite::Put {
            collection: "spaces".into(),
            id: "space-1".into(),
            data: json!({ "title": "Home" }),
            version: Some("v-10".into()),
            updated_at: 10,
        },
        RecordBatchWrite::Delete {
            collection: "".into(),
            id: "bad".into(),
            version: None,
            updated_at: 11,
        },
    ];

    assert!(repository.write_record_batch(&invalid_batch).is_err());
    assert!(repository
        .get_record("spaces", "space-1", true)
        .unwrap()
        .is_none());

    repository.write_record_batch(&invalid_batch[..1]).unwrap();
    assert_eq!(repository.list_records("spaces", false).unwrap().len(), 1);
}

#[test]
fn settings_are_json_values() {
    let mut repository = Repository::open_in_memory().unwrap();

    repository
        .put_setting("speech", &json!({ "rate": 1.2 }))
        .unwrap();
    assert_eq!(
        repository.get_setting("speech").unwrap(),
        Some(json!({ "rate": 1.2 }))
    );
    assert!(repository.delete_setting("speech").unwrap());
    assert_eq!(repository.get_setting("speech").unwrap(), None);
}

#[test]
fn file_bytes_live_on_disk_and_metadata_lives_in_sqlite() {
    let temp = tempfile::tempdir().unwrap();
    let mut repository = Repository::open_in_memory().unwrap();
    let files = FileStore::new(temp.path()).unwrap();

    let metadata = files
        .write(&mut repository, "audio", "audio/webm", b"not actually webm")
        .unwrap();

    assert_eq!(metadata.kind, "audio");
    assert_eq!(metadata.media_type, "audio/webm");
    assert_eq!(metadata.size, 17);
    assert_eq!(
        files.read(&repository, &metadata.id).unwrap(),
        b"not actually webm"
    );
    assert_eq!(
        files.list(&repository, Some("audio")).unwrap(),
        vec![metadata.clone()]
    );
    assert_eq!(
        std::fs::read_dir(temp.path().join("files"))
            .unwrap()
            .count(),
        1
    );

    assert!(files.delete(&mut repository, &metadata.id).unwrap());
    assert!(files.metadata(&repository, &metadata.id).unwrap().is_none());
    assert_eq!(
        std::fs::read_dir(temp.path().join("files"))
            .unwrap()
            .count(),
        0
    );
    assert!(!files.delete(&mut repository, &metadata.id).unwrap());
}

#[test]
fn file_ids_are_opaque_and_cannot_escape_the_storage_directory() {
    let temp = tempfile::tempdir().unwrap();
    let sentinel = temp.path().join("sentinel");
    std::fs::write(&sentinel, b"keep").unwrap();
    let mut repository = Repository::open_in_memory().unwrap();
    let files = FileStore::new(temp.path()).unwrap();

    assert!(files.read(&repository, "../../sentinel").is_err());
    assert!(files.delete(&mut repository, "../../sentinel").is_err());
    assert_eq!(std::fs::read(sentinel).unwrap(), b"keep");
}

#[test]
fn export_suggestion_removes_paths_and_uses_the_media_type_extension() {
    let suggestion = export_suggestion(
        Some("../../private\\Meeting: notes.exe"),
        Some("Audio/WebM; codecs=opus"),
    );

    assert_eq!(suggestion.file_name, "Meeting_ notes.webm");
    assert_eq!(suggestion.media_type, "audio/webm");
    assert_eq!(suggestion.extension, "webm");
    assert_eq!(suggestion.filter_name, "WebM audio");
    assert!(!suggestion.file_name.contains('/'));
    assert!(!suggestion.file_name.contains('\\'));
}

#[test]
fn export_suggestion_has_safe_cross_platform_fallbacks() {
    let reserved = export_suggestion(Some("CON.txt"), Some("text/plain"));
    assert_eq!(reserved.file_name, "september-CON.txt");

    let invalid = export_suggestion(Some("..\u{0}"), Some("../../not-a-media-type"));
    assert_eq!(invalid.file_name, "september-export.bin");
    assert_eq!(invalid.media_type, "application/octet-stream");
    assert_eq!(invalid.extension, "bin");

    let long_name = "🙂".repeat(200);
    let bounded = export_suggestion(Some(&long_name), Some("application/pdf"));
    assert!(bounded.file_name.len() <= 200);
    assert!(bounded.file_name.ends_with(".pdf"));

    let csv = export_suggestion(Some("usage.csv"), Some("text/csv"));
    assert_eq!(csv.file_name, "usage.csv");
    assert_eq!(csv.media_type, "text/csv");
}

#[test]
fn external_url_validation_allows_only_web_and_email_links() {
    assert_eq!(
        validate_external_url("https://september.to/help?q=speech#setup").unwrap(),
        "https://september.to/help?q=speech#setup"
    );
    assert_eq!(
        validate_external_url("http://localhost:3009/callback").unwrap(),
        "http://localhost:3009/callback"
    );
    assert_eq!(
        validate_external_url("mailto:support@september.to?subject=Help").unwrap(),
        "mailto:support@september.to?subject=Help"
    );

    for unsafe_url in [
        "javascript:alert(1)",
        "file:///etc/passwd",
        "tauri://localhost",
        "httpsx://september.to",
        "/relative/path",
        "https://",
        "mailto:",
        " https://september.to",
        "https://september.to\nfile:///etc/passwd",
    ] {
        assert!(
            validate_external_url(unsafe_url).is_err(),
            "accepted unsafe URL: {unsafe_url:?}"
        );
    }
}
