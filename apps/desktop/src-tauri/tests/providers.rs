use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use september_desktop_lib::providers::{Provider, ProviderError, Providers};
use serde_json::{json, Value};

/// Answers one GET and hands back the request head, so a test can read the
/// authentication header. The provider calls are all GET, so no body is read.
fn serve_once(status: &str, body: Value) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();
    let status = status.to_owned();

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
        let body = body.to_string();
        write!(
            stream,
            "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
    });

    (format!("http://{address}"), receiver)
}

fn open_router(base: &str) -> Providers {
    Providers::with_bases(base, "http://127.0.0.1:1")
}

fn eleven_labs(base: &str) -> Providers {
    Providers::with_bases("http://127.0.0.1:1", base)
}

#[tokio::test]
async fn an_open_router_key_reports_its_label() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({ "data": { "label": "September", "is_free_tier": true } }),
    );

    let status = open_router(&base)
        .check(Provider::OpenRouter, "sk-or-test")
        .await
        .unwrap();

    let head = requests.recv().unwrap();
    assert!(head.contains("GET /api/v1/key"), "{head}");
    assert!(
        head.to_lowercase()
            .contains("authorization: bearer sk-or-test"),
        "{head}"
    );
    assert!(status.connected);
    assert_eq!(status.label.as_deref(), Some("September"));
    assert_eq!(status.detail.as_deref(), Some("Free models only"));
}

#[tokio::test]
async fn a_paid_open_router_key_reports_the_credit_that_is_left() {
    let (base, _requests) = serve_once(
        "200 OK",
        json!({ "data": { "label": "September", "is_free_tier": false, "usage": 1.5, "limit": 10.0 } }),
    );

    let status = open_router(&base)
        .check(Provider::OpenRouter, "sk-or-test")
        .await
        .unwrap();

    assert_eq!(status.detail.as_deref(), Some("$8.50 left"));
}

#[tokio::test]
async fn a_rejected_key_is_an_error() {
    let (base, _requests) = serve_once("401 Unauthorized", json!({ "error": "no" }));

    let error = open_router(&base)
        .check(Provider::OpenRouter, "wrong")
        .await
        .unwrap_err();

    assert!(matches!(error, ProviderError::Rejected), "{error:?}");
}

#[tokio::test]
async fn an_eleven_labs_key_reports_the_characters_that_are_left() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({ "tier": "starter", "character_count": 588, "character_limit": 10_000 }),
    );

    let status = eleven_labs(&base)
        .check(Provider::ElevenLabs, "xi-test")
        .await
        .unwrap();

    let head = requests.recv().unwrap();
    assert!(head.contains("GET /v1/user/subscription"), "{head}");
    assert!(
        head.to_lowercase().contains("xi-api-key: xi-test"),
        "{head}"
    );
    assert!(status.connected);
    assert_eq!(
        status.detail.as_deref(),
        Some("9,412 characters left this month")
    );
}

#[tokio::test]
async fn an_empty_eleven_labs_quota_is_an_error() {
    let (base, _requests) = serve_once(
        "200 OK",
        json!({ "tier": "free", "character_count": 10_000, "character_limit": 10_000 }),
    );

    let error = eleven_labs(&base)
        .check(Provider::ElevenLabs, "xi-test")
        .await
        .unwrap_err();

    assert!(matches!(error, ProviderError::QuotaEmpty), "{error:?}");
}

#[tokio::test]
async fn the_voice_list_asks_the_way_the_web_app_asks() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({ "voices": [
            { "voice_id": "21m", "name": "Rachel", "category": "premade", "preview_url": "https://storage.googleapis.com/rachel.mp3" },
            { "voice_id": "AZn", "name": "River", "category": "cloned" }
        ] }),
    );

    let voices = eleven_labs(&base).voices("xi-test").await.unwrap();

    // The web app asks the v2 list, and leaves out the stock voices.
    let head = requests.recv().unwrap();
    assert!(head.contains("GET /v2/voices"), "{head}");
    assert!(head.contains("voice_type=non-default"), "{head}");
    assert!(head.contains("page_size=100"), "{head}");

    // A voice that the user made comes before a stock voice.
    assert_eq!(voices.len(), 2);
    assert_eq!(voices[0].name, "River");
    assert_eq!(voices[1].name, "Rachel");
    assert_eq!(voices[0].preview_url, None);
    assert_eq!(
        voices[1].preview_url.as_deref(),
        Some("https://storage.googleapis.com/rachel.mp3")
    );
}

#[tokio::test]
async fn an_unreachable_service_is_not_a_rejected_key() {
    let error = open_router("http://127.0.0.1:1")
        .check(Provider::OpenRouter, "sk-or-test")
        .await
        .unwrap_err();

    assert!(matches!(error, ProviderError::Unreachable(_)), "{error:?}");
}
