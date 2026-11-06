mod common;

use std::time::Duration;

use common::{
    body_of,
    eleven_labs::{
        conversational_settings, dialogue_final, dialogue_settings, dialogue_sound, eleven_labs,
        parts, serve_dialogue, serve_voice, sound,
    },
    serve_json, serve_once,
};
use september_desktop_lib::providers::{Provider, ProviderError, Providers};
use serde_json::json;
use tokio_tungstenite::tungstenite::Message;

fn open_router(base: &str) -> Providers {
    Providers::with_bases(base, "http://127.0.0.1:1")
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

async fn eleven_labs_refusal(status: &str, detail_status: &str) -> ProviderError {
    let (base, _requests) = serve_once(
        status,
        json!({ "detail": { "status": detail_status, "message": "Refused." } }),
    );
    eleven_labs(&base)
        .check(Provider::ElevenLabs, "xi-test")
        .await
        .unwrap_err()
}

#[tokio::test]
async fn an_eleven_labs_account_out_of_characters_is_not_a_bad_key() {
    let error = eleven_labs_refusal("401 Unauthorized", "quota_exceeded").await;

    assert!(matches!(error, ProviderError::QuotaEmpty), "{error:?}");
}

#[tokio::test]
async fn an_invalid_eleven_labs_key_is_rejected() {
    let error = eleven_labs_refusal("401 Unauthorized", "invalid_api_key").await;

    assert!(matches!(error, ProviderError::Rejected), "{error:?}");
}

#[tokio::test]
async fn a_busy_eleven_labs_service_asks_to_try_again() {
    for detail_status in ["too_many_concurrent_requests", "system_busy"] {
        let error = eleven_labs_refusal("429 Too Many Requests", detail_status).await;

        assert!(matches!(error, ProviderError::Busy), "{error:?}");
    }
}

#[tokio::test]
async fn the_voice_list_holds_every_voice_of_every_page_with_its_category() {
    let (base, requests) = serve_json(vec![
        json!({
            "voices": [{ "voice_id": "21m", "name": "Rachel", "category": "premade", "preview_url": "https://storage.googleapis.com/rachel.mp3" }],
            "has_more": true,
            "next_page_token": "page-2",
        }),
        json!({
            "voices": [{ "voice_id": "AZn", "name": "River", "category": "cloned" }],
            "has_more": false,
            "next_page_token": null,
        }),
    ]);

    let voices = eleven_labs(&base).voices("xi-test").await.unwrap();

    let first = requests.recv().unwrap();
    assert!(first.contains("GET /v2/voices"), "{first}");
    assert!(!first.contains("next_page_token"), "{first}");
    let second = requests
        .recv_timeout(Duration::from_secs(5))
        .expect("the list asks for the next page");
    assert!(second.contains("next_page_token=page-2"), "{second}");

    assert_eq!(
        voices
            .iter()
            .map(|voice| (voice.id.as_str(), voice.preview_url.as_deref()))
            .collect::<Vec<_>>(),
        vec![
            ("21m", Some("https://storage.googleapis.com/rachel.mp3")),
            ("AZn", None)
        ]
    );
    // The voice list groups the voices by category.
    let sent = serde_json::to_value(&voices).unwrap();
    assert_eq!(sent[0]["category"], "premade");
    assert_eq!(sent[1]["category"], "cloned");
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

#[tokio::test]
async fn a_dialogue_stream_sends_the_sentence_to_eleven_v3_and_returns_the_samples() {
    let first = dialogue_sound(&[1, 0, 2, 0]);
    let (head, tail) = first.split_at(9);
    let (base, mut requests) = serve_dialogue(
        "200 OK",
        vec![
            head.to_owned(),
            format!("{tail}\n"),
            dialogue_sound(&[0xff, 0xff]),
        ],
        1,
        false,
    )
    .await;
    let mut samples = Vec::new();

    eleven_labs(&base)
        .speak_dialogue(
            "xi-test",
            &dialogue_settings(),
            &parts("[laughs] Hello"),
            |chunk| samples.extend_from_slice(chunk),
        )
        .await
        .unwrap();

    assert_eq!(samples, [1, 2, -1]);
    let request = requests.recv().await.unwrap();
    assert!(
        request.starts_with(
            "POST /v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_24000 "
        ),
        "{request}"
    );
    assert!(
        request.to_lowercase().contains("xi-api-key: xi-test"),
        "{request}"
    );
    assert_eq!(
        body_of(&request),
        json!({
            "inputs": [{ "text": "[laughs] Hello", "voice_id": "voice-1" }],
            "model_id": "eleven_v3",
            "settings": { "stability": 0.0 },
        })
    );
}

#[tokio::test]
async fn a_dialogue_sample_split_between_chunks_arrives_whole() {
    let (base, _requests) = serve_dialogue(
        "200 OK",
        vec![dialogue_sound(&[1, 0, 2]), dialogue_sound(&[0])],
        1,
        false,
    )
    .await;
    let mut samples = Vec::new();

    eleven_labs(&base)
        .speak_dialogue("xi-test", &dialogue_settings(), &parts("Hi"), |chunk| {
            samples.extend_from_slice(chunk)
        })
        .await
        .unwrap();

    assert_eq!(samples, [1, 2]);
}

#[tokio::test]
async fn a_refused_dialogue_key_is_rejected() {
    let (base, _requests) = serve_dialogue("401 Unauthorized", vec!["{}".into()], 1, false).await;

    let error = eleven_labs(&base)
        .speak_dialogue("wrong", &dialogue_settings(), &parts("Hi"), |_| {})
        .await
        .unwrap_err();

    assert!(matches!(error, ProviderError::Rejected), "{error:?}");
}

#[tokio::test]
async fn a_dialogue_that_sends_no_sound_in_time_is_an_error() {
    let (base, _requests) = serve_dialogue("200 OK", Vec::new(), 1, true).await;

    let result = eleven_labs(&base)
        .first_audio_within(Duration::from_millis(100))
        .speak_dialogue("xi-test", &dialogue_settings(), &parts("Hi"), |_| {})
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn a_dialogue_that_breaks_after_the_first_sound_is_an_error() {
    let (base, _requests) = serve_dialogue(
        "200 OK",
        vec![dialogue_sound(&[1, 0]), "{\"audio_base64\": \"AAA".into()],
        1,
        false,
    )
    .await;
    let mut samples = Vec::new();

    let result = eleven_labs(&base)
        .speak_dialogue("xi-test", &dialogue_settings(), &parts("Hi"), |chunk| {
            samples.extend_from_slice(chunk)
        })
        .await;

    assert!(result.is_err());
    assert_eq!(samples, [1]);
}

#[tokio::test]
async fn a_conversational_dialogue_uses_the_dialogue_socket() {
    let (base, calls) = serve_voice(vec![
        sound(&[1, 0, 2, 0]),
        Message::Text(
            json!({ "is_final_audio_for_turn": true })
                .to_string()
                .into(),
        ),
        dialogue_final(),
    ])
    .await;
    let mut samples = Vec::new();

    eleven_labs(&base)
        .speak_dialogue(
            "xi-test",
            &conversational_settings(),
            &["[laughs] Hello".to_owned()],
            |chunk| samples.extend_from_slice(chunk),
        )
        .await
        .unwrap();

    assert_eq!(samples, [1, 2]);
    let call = calls.await.unwrap();
    assert_eq!(
        call.path,
        "/v1/text-to-dialogue/stream-input?model_id=eleven_v3_conversational&output_format=pcm_24000"
    );
    assert_eq!(call.key.as_deref(), Some("xi-test"));
    assert_eq!(
        call.messages,
        [
            json!({ "voices": ["voice-1"], "voice_settings": { "stability": 0.0 } }),
            json!({ "inputs": [{ "text": "[laughs] Hello", "voice_id": "voice-1" }] }),
            json!({ "close_socket": true }),
        ]
    );
}

#[tokio::test]
async fn a_conversational_dialogue_error_is_an_error() {
    let (base, _calls) = serve_voice(vec![Message::Text(
        json!({ "message": "Invalid API key", "error": "authentication_required", "code": 1008 })
            .to_string()
            .into(),
    )])
    .await;

    let error = eleven_labs(&base)
        .speak_dialogue(
            "xi-test",
            &conversational_settings(),
            &["Hi".to_owned()],
            |_| {},
        )
        .await
        .unwrap_err();

    assert!(error.to_string().contains("Invalid API key"), "{error}");
}
