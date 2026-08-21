//! The Core Media I/O camera extension that calling apps can select.
//!
//! The extension owns camera frames. This module sends only small control
//! messages, so no video enters Rust or the WebView.

use std::{
    ffi::{CStr, CString},
    os::raw::c_char,
};

use serde::Serialize;

pub const VIRTUAL_CAMERA_UID: &str = "app.september.desktop.camera.device";
const VIRTUAL_CAMERA_NAME: &str = "September Camera";
const ERROR_CAPACITY: usize = 512;
const MAX_TEXT_LENGTH: usize = 4096;

#[derive(Debug, Clone, Serialize)]
pub struct VirtualCameraStatus {
    pub active: bool,
    pub pending: bool,
    pub name: String,
    pub uid: String,
    pub detail: Option<String>,
}

extern "C" {
    fn september_virtual_camera_status(
        pending: *mut i32,
        error: *mut c_char,
        capacity: usize,
    ) -> i32;
    fn september_virtual_camera_start(error: *mut c_char, capacity: usize) -> i32;
    fn september_virtual_camera_stop(error: *mut c_char, capacity: usize) -> i32;
    fn september_virtual_camera_overlay(
        text: *const c_char,
        visible: i32,
        error: *mut c_char,
        capacity: usize,
    ) -> i32;
}

fn native_result(status: i32, error: &[c_char; ERROR_CAPACITY]) -> Result<(), String> {
    if status == 0 {
        return Ok(());
    }
    let detail = unsafe { CStr::from_ptr(error.as_ptr()) }
        .to_string_lossy()
        .into_owned();
    if detail.is_empty() {
        Err(format!("the camera system did not answer ({status})"))
    } else {
        Err(detail)
    }
}

fn bounded_text(text: &str) -> String {
    text.chars().take(MAX_TEXT_LENGTH).collect()
}

pub fn status() -> VirtualCameraStatus {
    let mut pending = 0;
    let mut error = [0 as c_char; ERROR_CAPACITY];
    let active = unsafe {
        september_virtual_camera_status(&mut pending, error.as_mut_ptr(), ERROR_CAPACITY) != 0
    };
    let detail = unsafe { CStr::from_ptr(error.as_ptr()) }
        .to_string_lossy()
        .into_owned();

    VirtualCameraStatus {
        active,
        pending: pending != 0,
        name: VIRTUAL_CAMERA_NAME.into(),
        uid: VIRTUAL_CAMERA_UID.into(),
        detail: (!detail.is_empty()).then_some(detail),
    }
}

pub fn start() -> Result<VirtualCameraStatus, String> {
    let mut error = [0 as c_char; ERROR_CAPACITY];
    let result = unsafe { september_virtual_camera_start(error.as_mut_ptr(), ERROR_CAPACITY) };
    native_result(result, &error)?;
    Ok(status())
}

pub fn stop() -> Result<VirtualCameraStatus, String> {
    let mut error = [0 as c_char; ERROR_CAPACITY];
    let result = unsafe { september_virtual_camera_stop(error.as_mut_ptr(), ERROR_CAPACITY) };
    native_result(result, &error)?;
    Ok(status())
}

pub fn set_overlay(text: &str, visible: bool) -> Result<(), String> {
    let text = CString::new(bounded_text(text))
        .map_err(|_| "the camera text contains an unsupported zero byte".to_string())?;
    let mut error = [0 as c_char; ERROR_CAPACITY];
    let result = unsafe {
        september_virtual_camera_overlay(
            text.as_ptr(),
            i32::from(visible),
            error.as_mut_ptr(),
            ERROR_CAPACITY,
        )
    };
    native_result(result, &error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_is_bounded_before_it_crosses_the_native_boundary() {
        let text = format!("{}end", "é".repeat(MAX_TEXT_LENGTH));
        let bounded = bounded_text(&text);

        assert_eq!(bounded.chars().count(), MAX_TEXT_LENGTH);
        assert!(!bounded.ends_with("end"));
    }
}
