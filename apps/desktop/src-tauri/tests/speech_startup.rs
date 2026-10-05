use std::process::Command;

#[test]
fn native_startup_exception_returns_an_error_and_stops_the_engine() {
    let binary = std::env::temp_dir().join(format!("september-audio-{}", uuid::Uuid::new_v4()));
    let compiled = Command::new("clang")
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .args([
            "-fobjc-arc",
            "-mmacosx-version-min=14.2",
            "tests/speech_startup.m",
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
