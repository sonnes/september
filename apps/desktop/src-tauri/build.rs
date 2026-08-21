fn main() {
    println!("cargo:rerun-if-changed=native/audio.m");
    println!("cargo:rerun-if-changed=native/camera.m");

    cc::Build::new()
        .files(["native/audio.m", "native/camera.m"])
        .flag("-fobjc-arc")
        .flag("-mmacosx-version-min=26.0")
        .compile("september_audio_native");

    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=CoreAudio");
    println!("cargo:rustc-link-lib=framework=CoreMediaIO");
    println!("cargo:rustc-link-lib=framework=Foundation");
    println!("cargo:rustc-link-lib=framework=SystemExtensions");

    tauri_build::build()
}
