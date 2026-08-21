use september_desktop_lib::audio::{
    inputs, virtual_microphone_start, virtual_microphone_status, virtual_microphone_stop,
    VIRTUAL_MICROPHONE_UID,
};

struct StopMicrophone;

impl Drop for StopMicrophone {
    fn drop(&mut self) {
        let _ = virtual_microphone_stop();
    }
}

#[test]
fn the_virtual_microphone_is_an_input_until_it_stops() {
    let _ = virtual_microphone_stop();
    let _stop = StopMicrophone;

    let started = virtual_microphone_start().expect("the virtual microphone starts");
    assert!(started.active);
    assert_eq!(started.name, "September Microphone");
    assert!(inputs()
        .expect("this Mac lists its inputs")
        .iter()
        .any(|device| device.uid == VIRTUAL_MICROPHONE_UID));

    let repeated = virtual_microphone_start().expect("starting twice changes nothing");
    assert_eq!(repeated.uid, started.uid);

    virtual_microphone_stop().expect("the virtual microphone stops");
    assert!(!virtual_microphone_status().active);
}
