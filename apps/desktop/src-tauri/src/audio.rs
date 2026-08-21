//! The sound outputs of this Mac.
//!
//! September speaks with two voices: the voice of the operating system and a
//! cloud voice that plays a file. Both follow the default output of the Mac.
//! The app moves that one setting, so the user picks a speaker once and both
//! voices go there.
//!
//! ponytail: raw CoreAudio calls, because this is six properties. A crate for
//! the same job brings a build step and a bindgen dependency.

use std::{ffi::c_void, mem::size_of, os::raw::c_char, ptr};

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
const SCOPE_GLOBAL: u32 = code(b"glob");
const SCOPE_OUTPUT: u32 = code(b"outp");

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

    fn AudioObjectSetPropertyData(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: u32,
        data: *const c_void,
    ) -> OsStatus;
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

fn checked(status: OsStatus, what: &str) -> Result<(), String> {
    if status == 0 {
        Ok(())
    } else {
        Err(format!("the sound system could not {what} ({status})"))
    }
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

/// The UID of the output the Mac plays through now.
pub fn default_output() -> Result<String, String> {
    let address = PropertyAddress::global(DEFAULT_OUTPUT);
    let device = read_id(SYSTEM_OBJECT, &address, "find the output in use")?;
    uid_of(device)
}

/// Moves the sound of this Mac to the named output.
pub fn set_default_output(uid: &str) -> Result<(), String> {
    let listed = PropertyAddress::global(DEVICES);
    let device = read_ids(SYSTEM_OBJECT, &listed, "list the sound devices")?
        .into_iter()
        .find(|device| uid_of(*device).is_ok_and(|found| found == uid))
        .ok_or_else(|| format!("this Mac has no output called {uid}"))?;

    let address = PropertyAddress::global(DEFAULT_OUTPUT);
    let status = unsafe {
        AudioObjectSetPropertyData(
            SYSTEM_OBJECT,
            &address,
            0,
            ptr::null(),
            size_of::<AudioObjectId>() as u32,
            &device as *const AudioObjectId as *const c_void,
        )
    };
    checked(status, "move the sound to that output")
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
    fn choosing_the_output_already_in_use_changes_nothing() {
        let before = default_output().unwrap();
        set_default_output(&before).expect("the output in use can be chosen");
        assert_eq!(default_output().unwrap(), before);
    }

    #[test]
    fn an_output_that_is_gone_is_refused() {
        assert!(set_default_output("no-such-device").is_err());
    }
}
