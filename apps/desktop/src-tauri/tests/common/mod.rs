//! A loopback HTTP server that answers one request, for the tests that call a service.

// Each test file uses some of these helpers, not all of them.
#![allow(dead_code)]

use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use serde_json::Value;

/// Answers one request with `status` and a JSON body, and hands the request back.
pub fn serve_once(status: &str, body: Value) -> (String, mpsc::Receiver<String>) {
    let body = body.to_string();
    serve_raw(format!(
        "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        body.len()
    ))
}

/// Answers one request with a raw response, and hands the request back with
/// its body.
pub fn serve_raw(response: String) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
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
    });

    (format!("http://{address}"), receiver)
}
