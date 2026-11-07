mod common;

#[test]
fn native_playback_obeys_stop_and_reports_a_broken_sound() {
    common::run_native_audio_test("speech_playback");
}

#[test]
fn an_unreadable_voice_file_is_removed_so_the_next_sentence_asks_again() {
    let path = std::env::temp_dir().join(format!("{}.mp3", uuid::Uuid::new_v4()));
    std::fs::write(&path, b"not audio").unwrap();

    let played = september_desktop_lib::audio::play_speech_file(
        september_desktop_lib::audio::claim_speech(),
        &path,
        "no output",
    );

    assert!(played.is_err());
    assert!(!path.exists());
}
