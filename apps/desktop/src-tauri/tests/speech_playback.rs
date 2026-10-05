use std::process::Command;

#[test]
fn native_playback_obeys_stop_and_reports_a_broken_sound() {
    let binary = std::env::temp_dir().join(format!("september-audio-{}", uuid::Uuid::new_v4()));
    let compiled = Command::new("clang")
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .args([
            "-fobjc-arc",
            "-mmacosx-version-min=14.2",
            "tests/speech_playback.m",
            "native/audio.m",
            "-framework",
            "AVFoundation",
            "-framework",
            "AudioToolbox",
            "-framework",
            "CoreAudio",
            "-framework",
            "Foundation",
            "-o",
        ])
        .arg(&binary)
        .output()
        .unwrap();
    assert!(
        compiled.status.success(),
        "{}",
        String::from_utf8_lossy(&compiled.stderr)
    );
    let result = Command::new(&binary).output().unwrap();
    std::fs::remove_file(binary).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
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
