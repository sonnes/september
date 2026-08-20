use september_desktop_lib::repository::Repository;
use serde_json::json;

#[test]
fn migrations_create_only_the_settings_table() {
    let repository = Repository::open_in_memory().unwrap();

    assert_eq!(repository.schema_version().unwrap(), 3);
    assert_eq!(repository.table_names().unwrap(), vec!["settings"]);
}

#[test]
fn legacy_database_keeps_settings_and_removes_generic_storage() {
    let temp = tempfile::tempdir().unwrap();
    let database = temp.path().join("legacy.sqlite3");
    let connection = rusqlite::Connection::open(&database).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE records (
               collection TEXT NOT NULL,
               id TEXT NOT NULL,
               data TEXT,
               PRIMARY KEY (collection, id)
             );
             CREATE TABLE settings (
               key TEXT PRIMARY KEY,
               value TEXT NOT NULL
             );
             CREATE TABLE file_metadata (
               id TEXT PRIMARY KEY,
               relative_name TEXT NOT NULL
             );
             INSERT INTO settings (key, value)
             VALUES ('speech', '{\"rate\":1.2}');
             INSERT INTO records (collection, id, data)
             VALUES ('spaces', 'space-1', '{}');
             INSERT INTO file_metadata (id, relative_name)
             VALUES ('file-1', 'file-1.bin');
             PRAGMA user_version = 2;",
        )
        .unwrap();
    drop(connection);

    let repository = Repository::open(database).unwrap();

    assert_eq!(repository.schema_version().unwrap(), 3);
    assert_eq!(repository.table_names().unwrap(), vec!["settings"]);
    assert_eq!(
        repository.get_setting("speech").unwrap(),
        Some(json!({ "rate": 1.2 }))
    );
}

#[test]
fn settings_store_json_values_by_key() {
    let repository = Repository::open_in_memory().unwrap();

    assert_eq!(repository.get_setting("speech").unwrap(), None);

    repository
        .put_setting("speech", &json!({ "rate": 1.2 }))
        .unwrap();
    assert_eq!(
        repository.get_setting("speech").unwrap(),
        Some(json!({ "rate": 1.2 }))
    );

    repository
        .put_setting("speech", &json!({ "rate": 0.8 }))
        .unwrap();
    assert_eq!(
        repository.get_setting("speech").unwrap(),
        Some(json!({ "rate": 0.8 }))
    );

    assert!(repository.delete_setting("speech").unwrap());
    assert!(!repository.delete_setting("speech").unwrap());
    assert_eq!(repository.get_setting("speech").unwrap(), None);
}

#[test]
fn setting_keys_must_not_be_empty_or_exceed_256_bytes() {
    let repository = Repository::open_in_memory().unwrap();
    let oversized = "x".repeat(257);

    assert!(repository.get_setting("").is_err());
    assert!(repository.put_setting("", &json!(true)).is_err());
    assert!(repository.delete_setting("").is_err());
    assert!(repository.get_setting(&oversized).is_err());
    assert!(repository.put_setting(&oversized, &json!(true)).is_err());
    assert!(repository.delete_setting(&oversized).is_err());
}
