mod common;

use std::time::Duration;

use common::{
    body_of,
    eleven_labs::{
        conversational_settings, dialogue_final, dialogue_settings, dialogue_sound, eleven_labs,
        parts, serve_dialogue, serve_voice, sound, voice_settings,
    },
    serve_once,
};
use september_desktop_lib::{
    providers::Providers,
    speech::{self, file_name, StreamError, Streamed},
};
use serde_json::json;

fn voice_folder() -> std::path::PathBuf {
    let directory = std::env::temp_dir().join(format!("september-stream-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&directory).unwrap();
    directory
}

fn unreachable() -> Providers {
    eleven_labs("http://127.0.0.1:1")
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
async fn an_eleven_labs_sentence_plays_an_mp3_file_from_http() {
    let directory = voice_folder();
    let (base, requests) = serve_once("200 OK", json!("pretend audio"));

    let found = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        None,
        Some("xi-test"),
        &eleven_labs(&base),
        |_| panic!("the ElevenLabs voice plays a file"),
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

#[tokio::test]
async fn a_refused_eleven_labs_sentence_has_not_started() {
    let directory = voice_folder();
    let (base, _requests) = serve_once("401 Unauthorized", json!({}));

    let error = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        None,
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
async fn an_eleven_labs_file_that_does_not_arrive_in_time_has_not_started() {
    let directory = voice_folder();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        // The service takes the request and never answers.
        let (_stream, _) = listener.accept().await.unwrap();
        tokio::time::sleep(Duration::from_secs(10)).await;
    });
    let began = std::time::Instant::now();

    let error = speech::stream(
        &directory,
        &voice_settings(),
        "Hello",
        None,
        Some("xi-test"),
        &eleven_labs(&base).first_audio_within(Duration::from_millis(100)),
        |_| {},
    )
    .await
    .unwrap_err();

    assert!(
        began.elapsed() < Duration::from_secs(2),
        "{:?}",
        began.elapsed()
    );
    assert!(matches!(error, StreamError { started: false, .. }));
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_complete_dialogue_is_kept_as_a_wav_file_and_played_again() {
    let directory = voice_folder();
    let (base, _requests) =
        serve_dialogue("200 OK", vec![dialogue_sound(&[1, 0, 2, 0])], 1, false).await;
    let mut samples = Vec::new();

    let first = speech::stream(
        &directory,
        &dialogue_settings(),
        "Hello",
        Some(&parts("Hello")),
        Some("xi-test"),
        &eleven_labs(&base),
        |chunk| samples.extend_from_slice(chunk),
    )
    .await
    .unwrap();

    assert!(matches!(first, Streamed::Spoken { .. }));
    assert_eq!(samples, [1, 2]);
    let kept = directory
        .join(file_name(&dialogue_settings(), "Hello"))
        .with_extension("wav");
    assert_eq!(&std::fs::read(&kept).unwrap()[44..], [1, 0, 2, 0]);

    let second = speech::stream(
        &directory,
        &dialogue_settings(),
        "Hello",
        Some(&parts("Hello")),
        Some("xi-test"),
        &unreachable(),
        |_| panic!("a kept sentence needs no request"),
    )
    .await
    .unwrap();

    assert!(matches!(second, Streamed::File { ref path, from_cache: true } if *path == kept));
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_dialogue_that_ends_without_sound_has_not_started() {
    let directory = voice_folder();
    let (base, _requests) = serve_dialogue("200 OK", Vec::new(), 1, false).await;

    let error = speech::stream(
        &directory,
        &dialogue_settings(),
        "Hello",
        Some(&parts("Hello")),
        Some("xi-test"),
        &eleven_labs(&base),
        |_| {},
    )
    .await
    .unwrap_err();

    assert!(matches!(error, StreamError { started: false, .. }));
    assert_eq!(std::fs::read_dir(&directory).unwrap().count(), 0);
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_long_dialogue_goes_in_parts_one_request_after_the_other() {
    let directory = voice_folder();
    let (base, mut requests) =
        serve_dialogue("200 OK", vec![dialogue_sound(&[1, 0])], 2, false).await;
    let first = format!("{}end.", "word ".repeat(396));
    let text = format!("{first} The last sentence.");
    let mut samples = Vec::new();

    speech::stream(
        &directory,
        &dialogue_settings(),
        &text,
        Some(&[first.clone(), "The last sentence.".to_owned()]),
        Some("xi-test"),
        &eleven_labs(&base),
        |chunk| samples.extend_from_slice(chunk),
    )
    .await
    .unwrap();

    let one = body_of(&requests.recv().await.unwrap());
    let two = body_of(&requests.recv().await.unwrap());
    assert_eq!(one["inputs"][0]["text"], json!(first));
    assert_eq!(two["inputs"][0]["text"], json!("The last sentence."));
    assert_eq!(samples, [1, 1]);
    std::fs::remove_dir_all(&directory).ok();
}

#[tokio::test]
async fn a_conversational_dialogue_is_kept_apart_from_eleven_v3() {
    let directory = voice_folder();
    let (base, _calls) = serve_voice(vec![sound(&[1, 0]), dialogue_final()]).await;

    let heard = speech::stream(
        &directory,
        &conversational_settings(),
        "Hello",
        Some(&parts("Hello")),
        Some("xi-test"),
        &eleven_labs(&base),
        |_| {},
    )
    .await
    .unwrap();

    assert!(matches!(heard, Streamed::Spoken { .. }));
    assert_ne!(
        file_name(&conversational_settings(), "Hello"),
        file_name(&dialogue_settings(), "Hello")
    );
    assert!(directory
        .join(file_name(&conversational_settings(), "Hello"))
        .with_extension("wav")
        .exists());
    std::fs::remove_dir_all(&directory).ok();
}
