use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use september_desktop_lib::apfel::ApfelClient;
use serde_json::{json, Value};

/// Answers one request without a body and hands its head back.
fn serve_once(response_status: &str, response_body: Value) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();
    let response_status = response_status.to_owned();

    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut bytes = Vec::new();
        let mut buffer = [0_u8; 4096];
        while !bytes.windows(4).any(|window| window == b"\r\n\r\n") {
            let read = stream.read(&mut buffer).unwrap();
            assert!(read > 0, "request ended before its headers");
            bytes.extend_from_slice(&buffer[..read]);
        }
        sender
            .send(String::from_utf8_lossy(&bytes).into_owned())
            .unwrap();

        let response = response_body.to_string();
        write!(
            stream,
            "HTTP/1.1 {response_status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response}",
            response.len()
        )
        .unwrap();
    });

    (format!("http://{address}"), receiver)
}

#[test]
fn health_reports_whether_the_model_can_answer() {
    for available in [true, false] {
        let (base_url, captured) = serve_once(
            "200 OK",
            json!({
                "status": "ok",
                "model": "apple-foundationmodel",
                "model_available": available,
            }),
        );
        let client = ApfelClient::new(base_url, "secret-token".into()).unwrap();

        let status = tauri::async_runtime::block_on(client.status()).unwrap();

        assert_eq!(status.available, available);
        assert!(captured.recv().unwrap().starts_with("GET /health "));
    }
}

#[test]
fn a_health_error_keeps_the_message_of_the_sidecar() {
    let (base_url, _requests) = serve_once(
        "503 Service Unavailable",
        json!({ "error": { "message": "model is loading" } }),
    );
    let client = ApfelClient::new(base_url, "secret-token".into()).unwrap();

    let error = tauri::async_runtime::block_on(client.status()).unwrap_err();

    assert!(error.to_string().contains("model is loading"), "{error}");
}

#[test]
fn the_sidecar_must_answer_on_the_loopback() {
    assert!(ApfelClient::new("http://localhost:1".into(), "t".into()).is_ok());
    assert!(ApfelClient::new("http://192.168.1.2:1".into(), "t".into()).is_err());
    assert!(ApfelClient::new("https://127.0.0.1:1".into(), "t".into()).is_err());
}
