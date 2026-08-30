//! The sound outputs of this Mac.
//!
//! September speaks with two voices: the voice of the operating system and a
//! cloud voice that plays a file. Both pass through one app-owned audio engine,
//! whose output can change without moving the default output of the Mac.
//!
//! ponytail: raw CoreAudio calls, because this is six properties. A crate for
//! the same job brings a build step and a bindgen dependency.

use std::{
    ffi::{c_void, CStr, CString},
    mem::size_of,
    os::raw::c_char,
    path::Path,
    ptr, thread,
    time::Duration,
};

use serde::Serialize;

type OsStatus = i32;
type AudioObjectId = u32;
type CfStringRef = *const c_void;

/// The object that answers for the whole sound system.
const SYSTEM_OBJECT: AudioObjectId = 1;
const UTF8: u32 = 0x0800_0100;
const MAIN_ELEMENT: u32 = 0;

/// A CoreAudio property carries a four-letter name.
const fn code(name: &[u8; 4]) -> u32 {
    ((name[0] as u32) << 24) | ((name[1] as u32) << 16) | ((name[2] as u32) << 8) | name[3] as u32
}

const DEVICES: u32 = code(b"dev#");
const DEFAULT_OUTPUT: u32 = code(b"dOut");
const DEVICE_UID: u32 = code(b"uid ");
const OBJECT_NAME: u32 = code(b"lnam");
const STREAMS: u32 = code(b"stm#");
const STREAM_DIRECTION: u32 = code(b"sdir");
const SCOPE_GLOBAL: u32 = code(b"glob");
const SCOPE_INPUT: u32 = code(b"inp ");
const SCOPE_OUTPUT: u32 = code(b"outp");

pub const VIRTUAL_MICROPHONE_UID: &str = "app.september.desktop.virtual-microphone";
const VIRTUAL_MICROPHONE_NAME: &str = "September Microphone";
const NATIVE_ERROR_CAPACITY: usize = 512;

#[repr(C)]
struct PropertyAddress {
    selector: u32,
    scope: u32,
    element: u32,
}

impl PropertyAddress {
    const fn global(selector: u32) -> Self {
        Self {
            selector,
            scope: SCOPE_GLOBAL,
            element: MAIN_ELEMENT,
        }
    }

    const fn output(selector: u32) -> Self {
        Self {
            selector,
            scope: SCOPE_OUTPUT,
            element: MAIN_ELEMENT,
        }
    }

    const fn input(selector: u32) -> Self {
        Self {
            selector,
            scope: SCOPE_INPUT,
            element: MAIN_ELEMENT,
        }
    }
}

#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioObjectGetPropertyDataSize(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: *mut u32,
    ) -> OsStatus;

    fn AudioObjectGetPropertyData(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: *mut u32,
        data: *mut c_void,
    ) -> OsStatus;

    fn september_virtual_microphone_status() -> bool;
    fn september_virtual_microphone_start(error: *mut c_char, capacity: usize) -> i32;
    fn september_virtual_microphone_stop(error: *mut c_char, capacity: usize) -> i32;
    fn september_audio_output_prepare(
        uid: *const c_char,
        error: *mut c_char,
        capacity: usize,
    ) -> i32;
    fn september_speech_system(
        words: *const c_char,
        voice_identifier: *const c_char,
        speed: f32,
        output_uid: *const c_char,
        error: *mut c_char,
        capacity: usize,
    ) -> i32;
    fn september_speech_file(
        path: *const c_char,
        output_uid: *const c_char,
        error: *mut c_char,
        capacity: usize,
    ) -> i32;
    fn september_speech_stop();
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringGetCString(text: CfStringRef, buffer: *mut c_char, size: isize, encoding: u32)
        -> u8;
    fn CFRelease(object: *const c_void);
}

/// One sound output, as a screen shows it.
#[derive(Debug, Clone, Serialize)]
pub struct AudioDevice {
    /// The name that lasts. A device keeps it across a restart and a replug.
    pub uid: String,
    /// The name the user reads, for example `MacBook Pro Speakers`.
    pub name: String,
}

/// The input that calling apps can read.
#[derive(Debug, Clone, Serialize)]
pub struct VirtualMicrophoneStatus {
    pub active: bool,
    pub name: String,
    pub uid: String,
    pub detail: Option<String>,
}

/// What a running microphone tells the user.
///
/// macOS publishes no way to read the answer to its audio-recording question.
/// A refused microphone carries sound with no words in it and reports nothing,
/// so the app names the one setting that mends it.
fn microphone_detail(active: bool) -> Option<String> {
    active.then(|| {
        "If callers hear nothing, allow September under System Settings, \
         Privacy & Security, Audio Recording."
            .to_owned()
    })
}

fn checked(status: OsStatus, what: &str) -> Result<(), String> {
    if status == 0 {
        Ok(())
    } else {
        Err(format!("the sound system could not {what} ({status})"))
    }
}

fn native_result(status: i32, error: &[c_char; NATIVE_ERROR_CAPACITY]) -> Result<(), String> {
    if status == 0 {
        return Ok(());
    }

    let text = unsafe { CStr::from_ptr(error.as_ptr()) }
        .to_string_lossy()
        .into_owned();
    if text.is_empty() {
        Err(format!("the sound system did not answer ({status})"))
    } else {
        Err(text)
    }
}

fn native_text(text: &str, what: &str) -> Result<CString, String> {
    CString::new(text).map_err(|_| format!("{what} contains an unsupported zero byte"))
}

fn property_size(
    object: AudioObjectId,
    address: &PropertyAddress,
    what: &str,
) -> Result<u32, String> {
    let mut size = 0u32;
    let status =
        unsafe { AudioObjectGetPropertyDataSize(object, address, 0, ptr::null(), &mut size) };
    checked(status, what)?;
    Ok(size)
}

fn read_id(
    object: AudioObjectId,
    address: &PropertyAddress,
    what: &str,
) -> Result<AudioObjectId, String> {
    let mut value: AudioObjectId = 0;
    let mut size = size_of::<AudioObjectId>() as u32;
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            address,
            0,
            ptr::null(),
            &mut size,
            &mut value as *mut AudioObjectId as *mut c_void,
        )
    };
    checked(status, what)?;
    Ok(value)
}

fn read_ids(
    object: AudioObjectId,
    address: &PropertyAddress,
    what: &str,
) -> Result<Vec<AudioObjectId>, String> {
    let mut size = property_size(object, address, what)?;
    let mut ids = vec![0u32; size as usize / size_of::<AudioObjectId>()];
    if ids.is_empty() {
        return Ok(ids);
    }

    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            address,
            0,
            ptr::null(),
            &mut size,
            ids.as_mut_ptr() as *mut c_void,
        )
    };
    checked(status, what)?;
    ids.truncate(size as usize / size_of::<AudioObjectId>());
    Ok(ids)
}

fn read_string(
    object: AudioObjectId,
    address: &PropertyAddress,
    what: &str,
) -> Result<String, String> {
    let mut text: CfStringRef = ptr::null();
    let mut size = size_of::<CfStringRef>() as u32;
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            address,
            0,
            ptr::null(),
            &mut size,
            &mut text as *mut CfStringRef as *mut c_void,
        )
    };
    checked(status, what)?;
    if text.is_null() {
        return Err(format!(
            "the sound system gave nothing when asked to {what}"
        ));
    }

    // A device name and a UID are both short. The buffer holds either one.
    let mut buffer = [0 as c_char; 256];
    let copied =
        unsafe { CFStringGetCString(text, buffer.as_mut_ptr(), buffer.len() as isize, UTF8) };
    // The property call hands over one reference. This gives it back.
    unsafe { CFRelease(text) };
    if copied == 0 {
        return Err(format!(
            "the sound system gave an unreadable answer to {what}"
        ));
    }

    let bytes: Vec<u8> = buffer
        .iter()
        .take_while(|byte| **byte != 0)
        .map(|byte| *byte as u8)
        .collect();
    String::from_utf8(bytes).map_err(|_| format!("the answer to {what} was not text"))
}

/// Whether the device plays sound. A microphone has no output stream.
fn plays_sound(device: AudioObjectId) -> bool {
    let address = PropertyAddress::output(STREAMS);
    property_size(device, &address, "count the output streams").unwrap_or(0) > 0
}

/// Whether the device records sound. A speaker has no input stream.
fn records_sound(device: AudioObjectId) -> bool {
    let address = PropertyAddress::input(STREAMS);
    if property_size(device, &address, "count the input streams").unwrap_or(0) > 0 {
        return true;
    }

    // A tap-backed aggregate exposes its streams through the global scope.
    // The direction property on each stream marks it as an input.
    read_ids(
        device,
        &PropertyAddress::global(STREAMS),
        "list the device streams",
    )
    .is_ok_and(|streams| {
        streams.into_iter().any(|stream| {
            read_id(
                stream,
                &PropertyAddress::global(STREAM_DIRECTION),
                "read a stream direction",
            ) == Ok(1)
        })
    })
}

fn uid_of(device: AudioObjectId) -> Result<String, String> {
    read_string(
        device,
        &PropertyAddress::global(DEVICE_UID),
        "name a device",
    )
}

/// Every output this Mac can play through, in the order the system gives.
pub fn outputs() -> Result<Vec<AudioDevice>, String> {
    let address = PropertyAddress::global(DEVICES);
    let mut found = Vec::new();

    for device in read_ids(SYSTEM_OBJECT, &address, "list the sound devices")? {
        if !plays_sound(device) {
            continue;
        }
        // A device that will not answer is left out. One quiet virtual device
        // must not hide the speakers the user can hear.
        let (Ok(uid), Ok(name)) = (
            uid_of(device),
            read_string(
                device,
                &PropertyAddress::global(OBJECT_NAME),
                "read a device name",
            ),
        ) else {
            continue;
        };
        found.push(AudioDevice { uid, name });
    }

    Ok(found)
}

/// Every input this Mac can record from, in the order the system gives.
pub fn inputs() -> Result<Vec<AudioDevice>, String> {
    let address = PropertyAddress::global(DEVICES);
    let mut found = Vec::new();

    for device in read_ids(SYSTEM_OBJECT, &address, "list the sound devices")? {
        if !records_sound(device) {
            continue;
        }
        let (Ok(uid), Ok(name)) = (
            uid_of(device),
            read_string(
                device,
                &PropertyAddress::global(OBJECT_NAME),
                "read a device name",
            ),
        ) else {
            continue;
        };
        found.push(AudioDevice { uid, name });
    }

    Ok(found)
}

/// The UID of the output the Mac plays through now.
pub fn default_output() -> Result<String, String> {
    let address = PropertyAddress::global(DEFAULT_OUTPUT);
    let device = read_id(SYSTEM_OBJECT, &address, "find the output in use")?;
    uid_of(device)
}

/// The output September uses, or the system output when its saved device left.
pub fn application_output(
    saved: Option<&str>,
    devices: &[AudioDevice],
    system_default: &str,
) -> String {
    saved
        .filter(|saved| devices.iter().any(|device| device.uid == *saved))
        .unwrap_or(system_default)
        .to_owned()
}

/// Refuses a UID that is not one of this Mac's current sound outputs.
pub fn validate_output(uid: &str) -> Result<(), String> {
    if outputs()?.iter().any(|device| device.uid == uid) {
        Ok(())
    } else {
        Err(format!("this Mac has no output called {uid}"))
    }
}

/// Verifies that a September-owned audio engine can use this output.
pub fn prepare_output(uid: &str) -> Result<(), String> {
    let uid = native_text(uid, "the sound output identifier")?;
    let mut error = [0 as c_char; NATIVE_ERROR_CAPACITY];
    let status = unsafe {
        september_audio_output_prepare(uid.as_ptr(), error.as_mut_ptr(), NATIVE_ERROR_CAPACITY)
    };
    native_result(status, &error)
}

/// Whether calling apps can select the September input now.
pub fn virtual_microphone_status() -> VirtualMicrophoneStatus {
    let published = unsafe { september_virtual_microphone_status() };
    let selectable = published
        && inputs().is_ok_and(|devices| {
            devices
                .iter()
                .any(|device| device.uid == VIRTUAL_MICROPHONE_UID)
        });
    VirtualMicrophoneStatus {
        active: selectable,
        name: VIRTUAL_MICROPHONE_NAME.into(),
        uid: VIRTUAL_MICROPHONE_UID.into(),
        detail: microphone_detail(selectable),
    }
}

/// Publishes the September process tap as one system input.
pub fn virtual_microphone_start() -> Result<VirtualMicrophoneStatus, String> {
    let mut error = [0 as c_char; NATIVE_ERROR_CAPACITY];
    let status =
        unsafe { september_virtual_microphone_start(error.as_mut_ptr(), NATIVE_ERROR_CAPACITY) };
    native_result(status, &error)?;
    wait_for_microphone(true)
}

/// Removes the system input and its process tap.
pub fn virtual_microphone_stop() -> Result<VirtualMicrophoneStatus, String> {
    let mut error = [0 as c_char; NATIVE_ERROR_CAPACITY];
    let status =
        unsafe { september_virtual_microphone_stop(error.as_mut_ptr(), NATIVE_ERROR_CAPACITY) };
    native_result(status, &error)?;
    wait_for_microphone(false)
}

fn wait_for_microphone(active: bool) -> Result<VirtualMicrophoneStatus, String> {
    for _ in 0..100 {
        let status = virtual_microphone_status();
        if status.active == active {
            return Ok(status);
        }
        thread::sleep(Duration::from_millis(10));
    }

    let action = if active { "appear" } else { "disappear" };
    Err(format!(
        "September Microphone did not {action} in the sound system"
    ))
}

/// Speaks with the operating-system voice from the native process.
pub fn speak_system(
    text: &str,
    voice_id: Option<&str>,
    speed: f32,
    output_uid: &str,
) -> Result<(), String> {
    let words = native_text(text, "the words")?;
    let voice = native_text(voice_id.unwrap_or_default(), "the voice identifier")?;
    let output = native_text(output_uid, "the sound output identifier")?;
    let mut error = [0 as c_char; NATIVE_ERROR_CAPACITY];
    let status = unsafe {
        september_speech_system(
            words.as_ptr(),
            voice.as_ptr(),
            speed,
            output.as_ptr(),
            error.as_mut_ptr(),
            NATIVE_ERROR_CAPACITY,
        )
    };
    native_result(status, &error)
}

/// Plays one cached cloud-voice file from the native process.
pub fn play_speech_file(path: &Path, output_uid: &str) -> Result<(), String> {
    let path = native_text(&path.to_string_lossy(), "the voice file path")?;
    let output = native_text(output_uid, "the sound output identifier")?;
    let mut error = [0 as c_char; NATIVE_ERROR_CAPACITY];
    let status = unsafe {
        september_speech_file(
            path.as_ptr(),
            output.as_ptr(),
            error.as_mut_ptr(),
            NATIVE_ERROR_CAPACITY,
        )
    };
    native_result(status, &error)
}

/// Stops either native voice now.
pub fn stop_speech() {
    unsafe { september_speech_stop() };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_output_has_a_name_and_a_lasting_identifier() {
        let devices = outputs().expect("this Mac lists its outputs");
        assert!(!devices.is_empty(), "a Mac always has one output");

        for device in &devices {
            assert!(
                !device.uid.is_empty(),
                "an output without a UID cannot be chosen again"
            );
            assert!(!device.name.is_empty(), "a user picks an output by name");
        }
    }

    #[test]
    fn the_output_in_use_is_one_of_the_outputs() {
        let chosen = default_output().expect("this Mac has a default output");
        let devices = outputs().unwrap();
        assert!(devices.iter().any(|device| device.uid == chosen));
    }

    #[test]
    fn september_uses_its_saved_output_instead_of_the_system_default() {
        let devices = vec![
            AudioDevice {
                uid: "mac-speakers".into(),
                name: "Mac speakers".into(),
            },
            AudioDevice {
                uid: "headphones".into(),
                name: "Headphones".into(),
            },
        ];

        assert_eq!(
            application_output(Some("headphones"), &devices, "mac-speakers"),
            "headphones"
        );
    }

    #[test]
    fn september_follows_the_system_when_its_saved_output_is_gone() {
        let devices = vec![AudioDevice {
            uid: "mac-speakers".into(),
            name: "Mac speakers".into(),
        }];

        assert_eq!(
            application_output(Some("unplugged"), &devices, "mac-speakers"),
            "mac-speakers"
        );
    }

    #[test]
    fn preparing_septembers_output_does_not_move_the_system_output() {
        let before = default_output().unwrap();
        let chosen = outputs()
            .unwrap()
            .into_iter()
            .find(|device| device.uid != before)
            .map(|device| device.uid)
            .unwrap_or_else(|| before.clone());

        prepare_output(&chosen).expect("September can route to a listed output");

        assert_eq!(default_output().unwrap(), before);
    }

    #[test]
    fn a_running_microphone_says_where_a_silent_call_is_mended() {
        let detail = microphone_detail(true).expect("a running microphone explains itself");

        assert!(detail.contains("Audio Recording"), "{detail}");
    }

    #[test]
    fn a_stopped_microphone_says_nothing() {
        assert_eq!(microphone_detail(false), None);
    }

    #[test]
    fn an_output_that_is_gone_is_refused() {
        assert!(validate_output("no-such-device").is_err());
    }
}
