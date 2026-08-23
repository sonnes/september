use std::{
    env,
    io::{Read, Write},
    net::TcpListener,
    process::{Child, Command, Stdio},
    sync::mpsc,
    thread,
    time::Duration,
};

use september_desktop_lib::apfel::{
    ApfelClient, ApfelGenerateRequest, ApfelMessage, ApfelResponseFormat,
};
use serde_json::{json, Value};

struct CapturedRequest {
    head: String,
    body: Value,
}

fn serve_once(
    response_status: &str,
    response_body: Value,
) -> (String, mpsc::Receiver<CapturedRequest>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();
    let response_status = response_status.to_owned();

    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut bytes = Vec::new();
        let mut buffer = [0_u8; 4096];
        let header_end;

        loop {
            let read = stream.read(&mut buffer).unwrap();
            assert!(read > 0, "request ended before its headers");
            bytes.extend_from_slice(&buffer[..read]);
            if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
                header_end = index + 4;
                break;
            }
        }

        let head = String::from_utf8(bytes[..header_end].to_vec()).unwrap();
        let content_length = head
            .lines()
            .find_map(|line| {
                let (name, value) = line.split_once(':')?;
                name.eq_ignore_ascii_case("content-length")
                    .then(|| value.trim().parse::<usize>().unwrap())
            })
            .unwrap_or(0);

        while bytes.len() - header_end < content_length {
            let read = stream.read(&mut buffer).unwrap();
            assert!(read > 0, "request ended before its body");
            bytes.extend_from_slice(&buffer[..read]);
        }

        let body = if content_length == 0 {
            Value::Null
        } else {
            serde_json::from_slice(&bytes[header_end..header_end + content_length]).unwrap()
        };
        let _ = sender.send(CapturedRequest { head, body });

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
fn health_reports_model_capabilities() {
    let (base_url, captured) = serve_once(
        "200 OK",
        json!({
            "status": "ok",
            "model": "apple-foundationmodel",
            "version": "1.9.1",
            "context_window": 4096,
            "model_available": true,
            "prewarmed": true,
            "supported_languages": ["en", "de"]
        }),
    );
    let client = ApfelClient::new(base_url, "secret-token".into()).unwrap();

    let status = tauri::async_runtime::block_on(client.status()).unwrap();

    assert!(status.available);
    assert!(status.prewarmed);
    assert_eq!(status.model, "apple-foundationmodel");
    assert_eq!(status.version, "1.9.1");
    assert_eq!(status.context_window, 4096);
    assert_eq!(status.supported_languages, ["en", "de"]);
    assert!(captured.recv().unwrap().head.starts_with("GET /health "));
}

#[test]
fn generation_uses_the_authenticated_openai_contract() {
    let (base_url, captured) = serve_once(
        "200 OK",
        json!({
            "choices": [{
                "message": {"role": "assistant", "content": "Could I have a short pause?"},
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 23,
                "completion_tokens": 9,
                "total_tokens": 32
            }
        }),
    );
    let client = ApfelClient::new(base_url, "secret-token".into()).unwrap();
    let request = ApfelGenerateRequest {
        messages: vec![
            ApfelMessage::system("Write brief AAC suggestions."),
            ApfelMessage::user("Ask politely for a pause."),
        ],
        temperature: Some(0.0),
        max_tokens: Some(64),
        response_format: Some(ApfelResponseFormat::JsonSchema {
            name: "suggestion".into(),
            schema: json!({
                "type": "object",
                "properties": {"text": {"type": "string"}},
                "required": ["text"],
                "additionalProperties": false
            }),
        }),
        model: None,
    };

    let generated = tauri::async_runtime::block_on(client.generate(request)).unwrap();

    assert_eq!(generated.text, "Could I have a short pause?");
    assert_eq!(generated.finish_reason, "stop");
    assert_eq!(generated.usage.prompt_tokens, 23);
    assert_eq!(generated.usage.completion_tokens, 9);
    assert_eq!(generated.usage.total_tokens, 32);
    assert_eq!(generated.model.as_deref(), Some("apple-foundationmodel"));
    assert_eq!(generated.cost_usd, Some(0.0));

    let captured = captured.recv().unwrap();
    assert!(captured.head.starts_with("POST /v1/chat/completions "));
    assert!(captured
        .head
        .to_ascii_lowercase()
        .contains("authorization: bearer secret-token"));
    assert_eq!(captured.body["model"], "apple-foundationmodel");
    assert_eq!(captured.body["stream"], false);
    assert_eq!(captured.body["max_tokens"], 64);
    assert_eq!(captured.body["response_format"]["type"], "json_schema");
    assert_eq!(
        captured.body["response_format"]["json_schema"]["name"],
        "suggestion"
    );
}

#[test]
fn an_apfel_error_keeps_its_message() {
    let (base_url, _) = serve_once(
        "400 Bad Request",
        json!({
            "error": {
                "message": "[context overflow] prompt exceeds the model context window",
                "type": "invalid_request_error"
            }
        }),
    );
    let client = ApfelClient::new(base_url, "secret-token".into()).unwrap();
    let request = ApfelGenerateRequest {
        messages: vec![ApfelMessage::user("A long prompt")],
        temperature: None,
        max_tokens: None,
        response_format: None,
        model: None,
    };

    let error = tauri::async_runtime::block_on(client.generate(request)).unwrap_err();

    assert_eq!(
        error.to_string(),
        "apfel request failed: [context overflow] prompt exceeds the model context window"
    );
}

#[test]
fn a_structured_response_format_deserializes_from_the_tauri_request() {
    let request: ApfelGenerateRequest = serde_json::from_value(json!({
        "messages": [{"role": "user", "content": "Suggest a reply"}],
        "temperature": 0,
        "max_tokens": 64,
        "response_format": {
            "type": "json_schema",
            "name": "suggestion",
            "schema": {
                "type": "object",
                "properties": {"text": {"type": "string"}},
                "required": ["text"]
            }
        }
    }))
    .unwrap();

    assert!(matches!(
        request.response_format,
        Some(ApfelResponseFormat::JsonSchema { ref name, .. }) if name == "suggestion"
    ));
}

#[test]
#[ignore = "requires APFEL_BIN and Apple Intelligence"]
fn live_apfel_serves_a_completion_through_the_rust_client() {
    struct Server(Child);

    impl Drop for Server {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }

    let binary = env::var("APFEL_BIN").expect("set APFEL_BIN to the apfel executable");
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    let token = "september-live-test";
    let child = Command::new(binary)
        .args([
            "--serve",
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
            "--max-concurrent",
            "1",
            "--no-color",
        ])
        .env("APFEL_TOKEN", token)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let _server = Server(child);
    let client = ApfelClient::new(format!("http://127.0.0.1:{port}"), token.into()).unwrap();

    let health = (0..80)
        .find_map(|_| {
            let status = tauri::async_runtime::block_on(client.status()).ok();
            if status.is_none() {
                thread::sleep(Duration::from_millis(250));
            }
            status
        })
        .expect("apfel did not become ready");
    assert!(health.available, "Apple Intelligence is unavailable");

    let generated = tauri::async_runtime::block_on(client.generate(ApfelGenerateRequest {
        messages: vec![ApfelMessage::user(
            "Reply with exactly this word and nothing else: september",
        )],
        temperature: Some(0.0),
        max_tokens: Some(16),
        response_format: None,
        model: None,
    }))
    .unwrap();

    assert!(!generated.text.trim().is_empty());
    assert!(generated.usage.total_tokens > 0);
}
