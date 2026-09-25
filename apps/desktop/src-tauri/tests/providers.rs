use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use september_desktop_lib::providers::{Provider, ProviderError, Providers};
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

// ------------------------------------------------------------ voice stream

use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use september_desktop_lib::speech::SpeechSettings;
use std::time::Duration;
use tokio_tungstenite::tungstenite::{
    handshake::server::{ErrorResponse, Request, Response},
    http::StatusCode,
    Message,
};

/// What one voice socket received: the address, the key header, and the
/// open, text, and close messages.
struct VoiceCall {
    path: String,
    key: Option<String>,
    messages: Vec<Value>,
}

fn voice_settings() -> SpeechSettings {
    SpeechSettings {
        provider: "elevenlabs".into(),
        voice_id: Some("voice-1".into()),
        model_id: "eleven_turbo_v2_5".into(),
        stability: 0.5,
        similarity: 0.75,
        speed: 1.0,
    }
}

fn sound(bytes: &[u8]) -> Message {
    let audio = base64::engine::general_purpose::STANDARD.encode(bytes);
    Message::Text(
        json!({ "audio": audio, "alignment": null })
            .to_string()
            .into(),
    )
}

fn last_sound() -> Message {
    Message::Text(json!({ "audio": null, "isFinal": true }).to_string().into())
}

/// Accepts one socket, reads three messages, then sends the replies.
async fn serve_voice(replies: Vec<Message>) -> (String, tokio::sync::oneshot::Receiver<VoiceCall>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let mut seen = None;
        let mut socket =
            tokio_tungstenite::accept_hdr_async(stream, |request: &Request, response: Response| {
                seen = Some((
                    request.uri().to_string(),
                    request
                        .headers()
                        .get("xi-api-key")
                        .map(|value| value.to_str().unwrap().to_owned()),
                ));
                Ok(response)
            })
            .await
            .unwrap();
        let (path, key) = seen.unwrap();

        let mut messages = Vec::new();
        while messages.len() < 3 {
            match socket.next().await {
                Some(Ok(Message::Text(text))) => {
                    messages.push(serde_json::from_str(&text).unwrap())
                }
                Some(Ok(_)) => {}
                _ => break,
            }
        }
        sender
            .send(VoiceCall {
                path,
                key,
                messages,
            })
            .ok();

        for reply in replies {
            if socket.send(reply).await.is_err() {
                return;
            }
        }
        // The socket stays open, so only the replies can end the sentence.
        tokio::time::sleep(Duration::from_secs(2)).await;
    });

    (format!("http://{address}"), receiver)
}

/// Refuses the socket the way a service refuses a bad key.
async fn refuse_voice() -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let _ = tokio_tungstenite::accept_hdr_async(stream, |_: &Request, _: Response| {
            let mut refusal = ErrorResponse::new(None);
            *refusal.status_mut() = StatusCode::UNAUTHORIZED;
            Err(refusal)
        })
        .await;
    });

    format!("http://{address}")
}

#[tokio::test]
async fn a_voice_stream_sends_the_sentence_and_returns_the_samples() {
    let (base, calls) = serve_voice(vec![
        sound(&[1, 0, 2, 0]),
        sound(&[0xff, 0xff]),
        last_sound(),
    ])
    .await;
    let mut samples = Vec::new();

    eleven_labs(&base)
        .speak_stream("xi-test", &voice_settings(), "Hello there", |chunk| {
            samples.extend_from_slice(chunk)
        })
        .await
        .unwrap();

    assert_eq!(samples, [1, 2, -1]);
    let call = calls.await.unwrap();
    assert!(
        call.path
            .starts_with("/v1/text-to-speech/voice-1/stream-input?"),
        "{}",
        call.path
    );
    assert!(
        call.path.contains("model_id=eleven_turbo_v2_5"),
        "{}",
        call.path
    );
    assert!(
        call.path.contains("output_format=pcm_24000"),
        "{}",
        call.path
    );
    assert_eq!(call.key.as_deref(), Some("xi-test"));
    assert_eq!(
        call.messages[0],
        json!({
            "text": " ",
            "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "speed": 1.0 },
        })
    );
    assert_eq!(
        call.messages[1],
        json!({ "text": "Hello there ", "flush": true })
    );
    assert_eq!(call.messages[2], json!({ "text": "" }));
}

#[tokio::test]
async fn a_sample_split_between_chunks_arrives_whole() {
    let (base, _calls) = serve_voice(vec![sound(&[1, 0, 2]), sound(&[0]), last_sound()]).await;
    let mut samples = Vec::new();

    eleven_labs(&base)
        .speak_stream("xi-test", &voice_settings(), "Hi", |chunk| {
            samples.extend_from_slice(chunk)
        })
        .await
        .unwrap();

    assert_eq!(samples, [1, 2]);
}

#[tokio::test]
async fn a_refused_voice_key_is_rejected() {
    let base = refuse_voice().await;

    let error = eleven_labs(&base)
        .speak_stream("wrong", &voice_settings(), "Hi", |_| {})
        .await
        .unwrap_err();

    assert!(matches!(error, ProviderError::Rejected), "{error:?}");
}

#[tokio::test]
async fn a_voice_that_closes_before_the_end_is_an_error() {
    let (base, _calls) = serve_voice(vec![sound(&[1, 0]), Message::Close(None)]).await;
    let mut samples = Vec::new();

    let result = eleven_labs(&base)
        .speak_stream("xi-test", &voice_settings(), "Hi", |chunk| {
            samples.extend_from_slice(chunk)
        })
        .await;

    assert!(result.is_err());
    assert_eq!(samples, [1]);
}

#[tokio::test]
async fn a_voice_that_sends_no_sound_in_time_is_an_error() {
    let (base, _calls) = serve_voice(Vec::new()).await;

    let result = eleven_labs(&base)
        .first_audio_within(Duration::from_millis(100))
        .speak_stream("xi-test", &voice_settings(), "Hi", |_| {})
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn an_error_reply_from_the_voice_is_an_error() {
    let (base, _calls) = serve_voice(vec![Message::Text(
        json!({ "message": "Voice not found", "error": "voice_not_found" })
            .to_string()
            .into(),
    )])
    .await;

    let error = eleven_labs(&base)
        .speak_stream("xi-test", &voice_settings(), "Hi", |_| {})
        .await
        .unwrap_err();

    assert!(error.to_string().contains("Voice not found"), "{error}");
}

// ------------------------------------------------------ the kept voice file

use september_desktop_lib::speech::{self, file_name, StreamError, Streamed};

fn voice_folder() -> std::path::PathBuf {
    let directory = std::env::temp_dir().join(format!("september-stream-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&directory).unwrap();
    directory
}

fn unreachable() -> Providers {
    eleven_labs("http://127.0.0.1:1")
}

#[tokio::test]
async fn a_complete_stream_is_kept_as_a_wav_file_and_played_again() {
    let directory = voice_folder();
    let (base, _calls) = serve_voice(vec![sound(&[1, 0, 2, 0]), last_sound()]).await;
    let mut samples = Vec::new();

    let first = speech::stream(
        &directory,
        &voice_settings(),
        "  Hello  ",
        Some("xi-test"),
        &eleven_labs(&base),
        |chunk| samples.extend_from_slice(chunk),
    )
    .await
    .unwrap();

    assert!(matches!(first, Streamed::Spoken { .. }));
    assert_eq!(samples, [1, 2]);
    let kept = directory
        .join(file_name(&voice_settings(), "Hello"))
        .with_extension("wav");
    let bytes = std::fs::read(&kept).unwrap();
    assert_eq!(&bytes[..4], b"RIFF");
    assert_eq!(&bytes[8..12], b"WAVE");
    assert_eq!(
        u32::from_le_bytes(bytes[24..28].try_into().unwrap()),
        24_000
    );
    assert_eq!(&bytes[44..], [1, 0, 2, 0]);

    // The service is gone now, so only the kept file can answer.
    let second = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        Some("xi-test"),
        &unreachable(),
        |_| panic!("a kept sentence needs no socket"),
    )
    .await
    .unwrap();

    assert!(matches!(second, Streamed::File { ref path, from_cache: true } if *path == kept));
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn an_interrupted_stream_keeps_no_file() {
    let directory = voice_folder();
    let (base, _calls) = serve_voice(vec![sound(&[1, 0]), Message::Close(None)]).await;

    let error = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        Some("xi-test"),
        &eleven_labs(&base),
        |_| {},
    )
    .await
    .unwrap_err();

    assert!(matches!(error, StreamError { started: true, .. }));
    assert_eq!(std::fs::read_dir(&directory).unwrap().count(), 0);
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_stream_that_fails_before_any_sound_has_not_started() {
    let directory = voice_folder();
    let base = refuse_voice().await;

    let error = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        Some("wrong"),
        &eleven_labs(&base),
        |_| {},
    )
    .await
    .unwrap_err();

    assert!(matches!(error, StreamError { started: false, .. }));
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn an_mp3_from_before_the_stream_is_played_again() {
    let directory = voice_folder();
    let kept = directory.join(file_name(&voice_settings(), "Hello"));
    std::fs::write(&kept, b"pretend audio").unwrap();

    let found = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        None,
        &unreachable(),
        |_| {},
    )
    .await
    .unwrap();

    assert!(matches!(found, Streamed::File { ref path, from_cache: true } if *path == kept));
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_model_without_a_socket_uses_a_file() {
    let directory = voice_folder();
    let (base, requests) = serve_once("200 OK", json!("pretend audio"));
    let mut settings = voice_settings();
    settings.model_id = "eleven_v3".into();

    let found = speech::stream(
        &directory,
        &settings,
        "Hello",
        Some("xi-test"),
        &eleven_labs(&base),
        |_| panic!("this model has no socket"),
    )
    .await
    .unwrap();

    let head = requests.recv().unwrap();
    assert!(head.contains("POST /v1/text-to-speech/voice-1?"), "{head}");
    assert!(matches!(
        found,
        Streamed::File {
            from_cache: false,
            ..
        }
    ));
    std::fs::remove_dir_all(&directory).ok();
}
