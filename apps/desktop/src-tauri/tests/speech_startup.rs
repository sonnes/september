mod common;

#[test]
fn native_startup_exception_returns_an_error_and_stops_the_engine() {
    common::run_native_audio_test("speech_startup");
}
