//! Helpers for the integration tests: a loopback HTTP server for the tests
//! that call a service, and a runner for the native audio tests.

// Each test file uses some of these helpers, not all of them.
#![allow(dead_code)]

use std::{
    io::{Read, Write},
    net::TcpListener,
    process::Command,
    sync::mpsc,
    thread,
};

use serde_json::Value;

/// Answers one request with `status` and a JSON body, and hands the request back.
pub fn serve_once(status: &str, body: Value) -> (String, mpsc::Receiver<String>) {
    serve_each(vec![json_response(status, body)])
}

/// Answers one request with each JSON body in turn, and hands each request back.
pub fn serve_json(bodies: Vec<Value>) -> (String, mpsc::Receiver<String>) {
    serve_each(
        bodies
            .into_iter()
            .map(|body| json_response("200 OK", body))
            .collect(),
    )
}

/// Answers one request with a raw response, and hands the request back with
/// its body.
pub fn serve_raw(response: String) -> (String, mpsc::Receiver<String>) {
    serve_each(vec![response])
}

fn json_response(status: &str, body: Value) -> String {
    let body = body.to_string();
    format!(
        "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        body.len()
    )
}

/// Answers one request with each raw response in turn.
fn serve_each(responses: Vec<String>) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        for response in responses {
            answer(&listener, &response, &sender);
        }
    });

    (format!("http://{address}"), receiver)
}

fn answer(listener: &TcpListener, response: &str, sender: &mpsc::Sender<String>) {
    let (mut stream, _) = listener.accept().unwrap();
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 4096];

    while !bytes.windows(4).any(|window| window == b"\r\n\r\n") {
        let read = stream.read(&mut buffer).unwrap();
        assert!(read > 0, "request ended before its headers");
        bytes.extend_from_slice(&buffer[..read]);
    }

    let header_end = bytes
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .unwrap()
        + 4;
    let head = String::from_utf8_lossy(&bytes[..header_end]);
    let content_length = head
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().ok())
                .flatten()
        })
        .unwrap_or(0);
    while bytes.len() < header_end + content_length {
        let read = stream.read(&mut buffer).unwrap();
        assert!(read > 0, "request ended before its body");
        bytes.extend_from_slice(&buffer[..read]);
    }

    sender
        .send(String::from_utf8_lossy(&bytes).into_owned())
        .unwrap();
    stream.write_all(response.as_bytes()).unwrap();
}

/// Builds `tests/<test>.m` with `native/audio.m`, runs it, and fails with its
/// output when either step fails.
pub fn run_native_audio_test(test: &str) {
    let binary = std::env::temp_dir().join(format!("september-audio-{}", uuid::Uuid::new_v4()));
    let compiled = Command::new("clang")
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .args([
            "-fobjc-arc",
            concat!("-mmacosx-version-min=", env!("SEPTEMBER_MACOS_MIN")),
            &format!("tests/{test}.m"),
            "native/audio.m",
            "-framework",
            "AVFoundation",
            "-framework",
            "AudioToolbox",
            "-framework",
            "CoreAudio",
            "-framework",
            "Foundation",
            "-o",
        ])
        .arg(&binary)
        .output()
        .unwrap();
    assert!(
        compiled.status.success(),
        "{}",
        String::from_utf8_lossy(&compiled.stderr)
    );
    let result = Command::new(&binary).output().unwrap();
    std::fs::remove_file(binary).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
