use september_desktop_lib::repository::Repository;
use serde_json::json;

#[test]
fn migration_creates_normalized_domain_tables() {
    let repository = Repository::open_in_memory().unwrap();

    assert_eq!(repository.schema_version().unwrap(), 1);
    assert_eq!(
        repository.table_names().unwrap(),
        vec!["messages", "notes", "settings", "spaces"]
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
