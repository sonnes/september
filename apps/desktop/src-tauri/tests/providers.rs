use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use september_desktop_lib::{
    apfel::{ApfelGenerateRequest, ApfelMessage},
    providers::{Provider, ProviderError, Providers},
};
use serde_json::{json, Value};

/// Answers one request and hands it back, including a body when it has one.
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
async fn eleven_labs_quota_keeps_the_reset_and_raw_counts() {
    let (base, _requests) = serve_once(
        "200 OK",
        json!({
            "tier": "starter",
            "character_count": 588,
            "character_limit": 10_000,
            "next_character_count_reset_unix": 1_782_864_000
        }),
    );

    let quota = eleven_labs(&base).quota("xi-test").await.unwrap();

    assert_eq!(quota.tier.as_deref(), Some("starter"));
    assert_eq!(quota.character_count, 588);
    assert_eq!(quota.character_limit, 10_000);
    assert_eq!(quota.resets_at, Some(1_782_864_000));
    assert_eq!(
        serde_json::to_value(&quota).unwrap()["resets_at"],
        1_782_864_000
    );
}

#[tokio::test]
async fn open_router_generation_reports_its_model_and_measured_cost() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({
            "model": "qwen/qwen3-next-80b-a3b-instruct:free",
            "choices": [{
                "message": {"content": "Hello"},
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 2,
                "total_tokens": 14,
                "cost": 0.003
            }
        }),
    );
    let request = ApfelGenerateRequest {
        messages: vec![ApfelMessage::user("Say hello")],
        temperature: None,
        max_tokens: None,
        response_format: None,
        model: None,
    };

    let answer = open_router(&base)
        .generate("sk-test", &request)
        .await
        .unwrap();

    // No choice sends the free list, so one bad model is not one bad day.
    let head = requests.recv().unwrap();
    assert!(head.contains("\"models\""), "{head}");
    assert_eq!(
        answer.model.as_deref(),
        Some("qwen/qwen3-next-80b-a3b-instruct:free")
    );
    assert_eq!(answer.cost_usd, Some(0.003));
}

#[tokio::test]
async fn the_writing_models_hold_the_free_ones_first() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({ "data": [
            {
                "id": "openai/gpt-5",
                "name": "OpenAI: GPT-5",
                "pricing": { "prompt": "0.00001", "completion": "0.00003" }
            },
            {
                "id": "qwen/qwen3-next-80b-a3b-instruct:free",
                "name": "Qwen: Qwen3 Next 80B (free)",
                "pricing": { "prompt": "0", "completion": "0" }
            },
            {
                "id": "acme/no-price",
                "name": "Acme: no price",
                "pricing": { "prompt": "", "completion": "" }
            }
        ] }),
    );

    let models = open_router(&base).writing_models("sk-test").await.unwrap();

    let head = requests.recv().unwrap();
    assert!(head.contains("GET /api/v1/models"), "{head}");
    // The search reaches every model, so every model crosses. The free rows
    // come first, because the picker shows them before the user types.
    // A model with no price is not known to be free.
    assert_eq!(
        models
            .iter()
            .map(|model| (model.id.as_str(), model.free))
            .collect::<Vec<_>>(),
        vec![
            ("qwen/qwen3-next-80b-a3b-instruct:free", true),
            ("acme/no-price", false),
            ("openai/gpt-5", false),
        ]
    );
    assert_eq!(models[0].name, "Qwen: Qwen3 Next 80B (free)");
}

#[tokio::test]
async fn a_chosen_model_replaces_the_free_list() {
    let (base, requests) = serve_once(
        "200 OK",
        json!({
            "model": "qwen/qwen3-next-80b-a3b-instruct:free",
            "choices": [{ "message": {"content": "Hello"}, "finish_reason": "stop" }],
            "usage": { "prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2 }
        }),
    );
    let request = ApfelGenerateRequest {
        messages: vec![ApfelMessage::user("Say hello")],
        temperature: None,
        max_tokens: None,
        response_format: None,
        model: Some("qwen/qwen3-next-80b-a3b-instruct:free".into()),
    };

    open_router(&base)
        .generate("sk-test", &request)
        .await
        .unwrap();

    // The user named one model, so the request asks for that one only.
    let head = requests.recv().unwrap();
    assert!(
        head.contains("\"model\":\"qwen/qwen3-next-80b-a3b-instruct:free\""),
        "{head}"
    );
    assert!(!head.contains("\"models\""), "{head}");
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
async fn a_voice_clone_forwards_the_multipart_body_without_exposing_the_key() {
    let (base, requests) = serve_once("200 OK", json!({ "voice_id": "clone-1" }));
    let content_type = "multipart/form-data; boundary=september-test";
    let body = b"--september-test\r\ncontent-disposition: form-data; name=\"name\"\r\n\r\nMy voice\r\n--september-test--\r\n";

    let created = eleven_labs(&base)
        .clone_voice("xi-test", content_type, body.to_vec())
        .await
        .unwrap();

    assert_eq!(created.id, "clone-1");
    let request = requests.recv().unwrap();
    assert!(request.contains("POST /v1/voices/add"), "{request}");
    assert!(
        request.to_lowercase().contains("xi-api-key: xi-test"),
        "{request}"
    );
    assert!(
        request
            .to_lowercase()
            .contains(&format!("content-type: {content_type}")),
        "{request}"
    );
    assert!(request.contains("My voice"), "{request}");
}

#[tokio::test]
async fn a_voice_clone_keeps_the_provider_failure_reason() {
    let (base, _requests) = serve_once(
        "422 Unprocessable Entity",
        json!({ "detail": { "message": "File format not supported" } }),
    );

    let error = eleven_labs(&base)
        .clone_voice(
            "xi-test",
            "multipart/form-data; boundary=x",
            b"--x--\r\n".to_vec(),
        )
        .await
        .unwrap_err();

    assert!(
        error.to_string().contains("File format not supported"),
        "{error}"
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
