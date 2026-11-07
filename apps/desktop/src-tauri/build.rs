/// The system frameworks that `native/audio.m` and `native/window.m` use.
const FRAMEWORKS: [&str; 5] = [
    "AppKit",
    "AVFoundation",
    "AudioToolbox",
    "CoreAudio",
    "Foundation",
];

fn main() {
    println!("cargo:rerun-if-changed=native/audio.m");
    println!("cargo:rerun-if-changed=native/window.m");
    println!("cargo:rerun-if-changed=tauri.conf.json");

    let config: serde_json::Value =
        serde_json::from_str(include_str!("tauri.conf.json")).expect("tauri.conf.json is JSON");
    let macos_min = config["bundle"]["macOS"]["minimumSystemVersion"]
        .as_str()
        .expect("tauri.conf.json names the oldest macOS");
    println!("cargo:rustc-env=SEPTEMBER_MACOS_MIN={macos_min}");
    println!(
        "cargo:rustc-env=SEPTEMBER_NATIVE_FRAMEWORKS={}",
        FRAMEWORKS.join(" ")
    );

    for (file, library) in [
        ("native/audio.m", "september_audio_native"),
        ("native/window.m", "september_window_native"),
    ] {
        cc::Build::new()
            .file(file)
            .flag("-fobjc-arc")
            .flag(format!("-mmacosx-version-min={macos_min}"))
            .compile(library);
    }

    for framework in FRAMEWORKS {
        println!("cargo:rustc-link-lib=framework={framework}");
    }

    tauri_build::build()
}
