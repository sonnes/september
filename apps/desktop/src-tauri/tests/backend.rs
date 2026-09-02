use september_desktop_lib::repository::{Message, Note, Repository, SavedPhrase, Space};
use serde_json::json;

#[test]
fn migration_creates_normalized_domain_tables() {
    let repository = Repository::open_in_memory().unwrap();

    assert_eq!(repository.schema_version().unwrap(), 7);
    assert_eq!(
        repository.table_names().unwrap(),
        vec![
            "agent_messages",
            "analytics_events",
            "messages",
            "notes",
            "saved_phrases",
            "settings",
            "spaces"
        ]
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

#[test]
fn spaces_are_upserted_read_by_user_and_deleted_with_their_children() {
    let repository = Repository::open_in_memory().unwrap();
    let first = space("space-1", "user-1", 10);
    let newest = space("space-2", "user-1", 30);
    let another_user = space("space-3", "user-2", 20);

    repository.put_space(&first).unwrap();
    repository.put_space(&newest).unwrap();
    repository.put_space(&another_user).unwrap();

    assert_eq!(
        repository.list_spaces("user-1").unwrap(),
        vec![newest.clone(), first.clone()]
    );
    assert_eq!(repository.get_space("space-1").unwrap(), Some(first));
    assert_eq!(repository.get_space("missing").unwrap(), None);

    let renamed = Space {
        title: Some("Renamed".into()),
        updated_at: 40,
        ..space("space-1", "user-1", 10)
    };
    repository.put_space(&renamed).unwrap();
    assert_eq!(repository.get_space("space-1").unwrap(), Some(renamed));

    repository
        .put_message(&message("message-1", Some("space-1"), 41))
        .unwrap();
    repository
        .put_note(&note("note-1", Some("space-1"), 42))
        .unwrap();
    repository.put_note(&note("global-note", None, 43)).unwrap();

    assert!(repository.delete_space("space-1").unwrap());
    assert!(!repository.delete_space("space-1").unwrap());
    assert_eq!(repository.get_message("message-1").unwrap(), None);
    assert_eq!(repository.get_note("note-1").unwrap(), None);
    assert!(repository.get_note("global-note").unwrap().is_some());
}

#[test]
fn messages_are_upserted_listed_in_conversation_order_and_deleted() {
    let repository = Repository::open_in_memory().unwrap();
    repository
        .put_space(&space("space-1", "user-1", 1))
        .unwrap();
    let later = message("message-2", Some("space-1"), 20);
    let first = message("message-1", Some("space-1"), 10);
    let global = message("message-3", None, 30);

    repository.put_message(&later).unwrap();
    repository.put_message(&first).unwrap();
    repository.put_message(&global).unwrap();

    assert_eq!(
        repository.list_messages(Some("space-1")).unwrap(),
        vec![first.clone(), later.clone()]
    );
    assert_eq!(
        repository.list_messages(None).unwrap(),
        vec![first.clone(), later, global]
    );
    assert_eq!(repository.get_message("message-1").unwrap(), Some(first));

    let edited = Message {
        text: "Hello again".into(),
        audio_path: Some("audio/message-1.wav".into()),
        ..message("message-1", Some("space-1"), 10)
    };
    repository.put_message(&edited).unwrap();
    assert_eq!(repository.get_message("message-1").unwrap(), Some(edited));
    assert!(repository.delete_message("message-1").unwrap());
    assert!(!repository.delete_message("message-1").unwrap());
}

#[test]
fn notes_are_upserted_listed_by_recent_update_and_deleted() {
    let repository = Repository::open_in_memory().unwrap();
    repository
        .put_space(&space("space-1", "user-1", 1))
        .unwrap();
    let older = note("note-1", Some("space-1"), 10);
    let newer = note("note-2", Some("space-1"), 30);
    let global = note("note-3", None, 20);

    repository.put_note(&older).unwrap();
    repository.put_note(&newer).unwrap();
    repository.put_note(&global).unwrap();

    assert_eq!(
        repository.list_notes(Some("space-1")).unwrap(),
        vec![newer.clone(), older.clone()]
    );
    assert_eq!(
        repository.list_notes(None).unwrap(),
        vec![newer, global, older.clone()]
    );
    assert_eq!(repository.get_note("note-1").unwrap(), Some(older));

    let edited = Note {
        name: Some("Daily update".into()),
        content: "# Today".into(),
        updated_at: 40,
        ..note("note-1", Some("space-1"), 10)
    };
    repository.put_note(&edited).unwrap();
    assert_eq!(repository.get_note("note-1").unwrap(), Some(edited));
    assert!(repository.delete_note("note-1").unwrap());
    assert!(!repository.delete_note("note-1").unwrap());
}

#[test]
fn domain_writes_validate_identity_timestamps_and_space_references() {
    let repository = Repository::open_in_memory().unwrap();

    assert!(repository
        .put_space(&Space {
            id: String::new(),
            ..space("unused", "user-1", 1)
        })
        .is_err());
    assert!(repository
        .put_message(&message("message-1", Some("missing-space"), 1))
        .is_err());
    assert!(repository
        .put_note(&note("note-1", Some("missing-space"), 1))
        .is_err());
    assert!(repository
        .put_note(&Note {
            updated_at: -1,
            ..note("note-2", None, 1)
        })
        .is_err());
}

#[test]
fn absent_optional_domain_fields_are_omitted_from_rpc_json() {
    assert_eq!(
        serde_json::to_value(space("space-1", "user-1", 1)).unwrap(),
        json!({
            "id": "space-1",
            "user_id": "user-1",
            "title": "Home",
            "created_at": 1,
            "updated_at": 1
        })
    );
    assert_eq!(
        serde_json::to_value(message("message-1", None, 1)).unwrap(),
        json!({
            "id": "message-1",
            "user_id": "user-1",
            "text": "Hello",
            "type": "text",
            "created_at": 1
        })
    );
    assert_eq!(
        serde_json::to_value(note("note-1", None, 1)).unwrap(),
        json!({
            "id": "note-1",
            "content": "",
            "created_at": 1,
            "updated_at": 1
        })
    );
}

fn space(id: &str, user_id: &str, updated_at: i64) -> Space {
    Space {
        id: id.into(),
        user_id: user_id.into(),
        title: Some("Home".into()),
        context: None,
        phrases_synced_count: None,
        created_at: 1,
        updated_at,
    }
}

fn message(id: &str, space_id: Option<&str>, created_at: i64) -> Message {
    Message {
        id: id.into(),
        space_id: space_id.map(Into::into),
        user_id: "user-1".into(),
        text: "Hello".into(),
        message_type: "text".into(),
        audio_path: None,
        created_at,
    }
}

fn note(id: &str, space_id: Option<&str>, updated_at: i64) -> Note {
    Note {
        id: id.into(),
        space_id: space_id.map(Into::into),
        name: None,
        content: String::new(),
        created_at: 1,
        updated_at,
    }
}

fn phrase(id: &str, text: &str, pinned: bool) -> SavedPhrase {
    SavedPhrase {
        id: id.into(),
        space_id: "space-1".into(),
        text: text.into(),
        kind: "phrase".into(),
        code: None,
        pinned,
        created_at: 1,
        updated_at: 1,
    }
}

fn space_for_phrases(repository: &Repository) {
    repository
        .put_space(&Space {
            id: "space-1".into(),
            user_id: "ravi".into(),
            title: Some("General".into()),
            context: None,
            phrases_synced_count: None,
            created_at: 1,
            updated_at: 1,
        })
        .unwrap();
}

#[test]
fn a_replacement_never_touches_a_pinned_phrase() {
    let mut repository = Repository::open_in_memory().unwrap();
    space_for_phrases(&repository);
    repository
        .put_phrase(&phrase("kept", "Please call the nurse", true))
        .unwrap();
    repository
        .put_phrase(&phrase("old", "Written by a model", false))
        .unwrap();

    repository
        .replace_ai_phrases("space-1", &[phrase("new", "Also by a model", false)])
        .unwrap();

    let texts: Vec<String> = repository
        .list_phrases(Some("space-1"))
        .unwrap()
        .into_iter()
        .map(|row| row.text)
        .collect();

    assert_eq!(texts, vec!["Please call the nurse", "Also by a model"]);
}

#[test]
fn a_replacement_row_must_not_claim_to_be_pinned() {
    let mut repository = Repository::open_in_memory().unwrap();
    space_for_phrases(&repository);

    assert!(repository
        .replace_ai_phrases("space-1", &[phrase("sneaky", "Pretends to be kept", true)])
        .is_err());
}

#[test]
fn deleting_a_space_deletes_its_phrases() {
    let repository = Repository::open_in_memory().unwrap();
    space_for_phrases(&repository);
    repository
        .put_phrase(&phrase("one", "Thank you", true))
        .unwrap();

    repository.delete_space("space-1").unwrap();

    assert!(repository.list_phrases(None).unwrap().is_empty());
}
