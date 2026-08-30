fn main() {
    println!("cargo:rerun-if-changed=native/audio.m");

    cc::Build::new()
        .file("native/audio.m")
        .flag("-fobjc-arc")
        .flag("-mmacosx-version-min=26.0")
        .compile("september_audio_native");

    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=AudioToolbox");
    println!("cargo:rustc-link-lib=framework=CoreAudio");
    println!("cargo:rustc-link-lib=framework=Foundation");

    tauri_build::build()
}
