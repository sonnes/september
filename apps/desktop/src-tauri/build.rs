/// The oldest macOS that runs September. `tauri.conf.json` names it too.
const MACOS_MIN: &str = "14.2";

fn main() {
    println!("cargo:rerun-if-changed=native/audio.m");
    println!("cargo:rerun-if-changed=native/window.m");
    println!("cargo:rustc-env=SEPTEMBER_MACOS_MIN={MACOS_MIN}");

    for (file, library) in [
        ("native/audio.m", "september_audio_native"),
        ("native/window.m", "september_window_native"),
    ] {
        cc::Build::new()
            .file(file)
            .flag("-fobjc-arc")
            .flag(format!("-mmacosx-version-min={MACOS_MIN}"))
            .compile(library);
    }

    println!("cargo:rustc-link-lib=framework=AppKit");
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=AudioToolbox");
    println!("cargo:rustc-link-lib=framework=CoreAudio");
    println!("cargo:rustc-link-lib=framework=Foundation");

    tauri_build::build()
}
