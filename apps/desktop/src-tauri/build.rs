fn main() {
    println!("cargo:rerun-if-changed=native/audio.m");
    println!("cargo:rerun-if-changed=native/window.m");

    cc::Build::new()
        .file("native/audio.m")
        .flag("-fobjc-arc")
        .flag("-mmacosx-version-min=14.2")
        .compile("september_audio_native");

    cc::Build::new()
        .file("native/window.m")
        .flag("-fobjc-arc")
        .flag("-mmacosx-version-min=14.2")
        .compile("september_window_native");

    println!("cargo:rustc-link-lib=framework=AppKit");
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=AudioToolbox");
    println!("cargo:rustc-link-lib=framework=CoreAudio");
    println!("cargo:rustc-link-lib=framework=Foundation");

    tauri_build::build()
}
