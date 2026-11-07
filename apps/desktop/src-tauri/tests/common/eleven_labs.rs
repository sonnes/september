//! Fake ElevenLabs servers and voice settings for the voice tests.

use std::time::Duration;

use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use september_desktop_lib::{
    providers::Providers,
    speech::{FileSettings, VoiceSettings},
};
use serde_json::{json, Value};
use tokio_tungstenite::tungstenite::{
    handshake::server::{Request, Response},
    Message,
};

/// The services with ElevenLabs at `base`.
pub fn eleven_labs(base: &str) -> Providers {
    Providers::with_bases("http://127.0.0.1:1", base)
}

/// What one dialogue socket received: the address, the key header, and the
/// open, text, and close messages.
pub struct VoiceCall {
    pub path: String,
    pub key: Option<String>,
    pub messages: Vec<Value>,
}

pub fn voice_settings() -> VoiceSettings {
    VoiceSettings {
        voice_id: "voice-1".into(),
        model_id: "eleven_flash_v2_5".into(),
        stability: 0.5,
        similarity: 0.75,
        speed: 1.0,
        file_settings: FileSettings {
            provider: "elevenlabs".into(),
            model_id: "eleven_flash_v2_5".into(),
            stability: 0.5,
            similarity: 0.75,
            speed: 1.0,
        },
    }
}

pub fn sound(bytes: &[u8]) -> Message {
    let audio = base64::engine::general_purpose::STANDARD.encode(bytes);
    Message::Text(
        json!({ "audio": audio, "alignment": null })
            .to_string()
            .into(),
    )
}

/// Accepts one socket, reads three messages, then sends the replies.
// The handshake callback of tungstenite returns its large error type.
#[allow(clippy::result_large_err)]
pub async fn serve_voice(
    replies: Vec<Message>,
) -> (String, tokio::sync::oneshot::Receiver<VoiceCall>) {
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

pub fn dialogue_settings() -> VoiceSettings {
    VoiceSettings {
        model_id: "eleven_v3".into(),
        stability: 0.0,
        file_settings: FileSettings {
            provider: "dialogue".into(),
            model_id: "eleven_v3".into(),
            stability: 0.1,
            similarity: 0.75,
            speed: 1.1,
        },
        ..voice_settings()
    }
}

pub fn parts(text: &str) -> Vec<String> {
    vec![text.to_owned()]
}

pub fn dialogue_sound(bytes: &[u8]) -> String {
    let audio = base64::engine::general_purpose::STANDARD.encode(bytes);
    json!({ "audio_base64": audio, "alignment": null }).to_string()
}

/// Answers `connections` requests, one after the other. Each answer sends the
/// pieces with a pause between them. When `hold` is true, the answer stays
/// open after the last piece.
pub async fn serve_dialogue(
    status: &'static str,
    pieces: Vec<String>,
    connections: usize,
    hold: bool,
) -> (String, tokio::sync::mpsc::UnboundedReceiver<String>) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = tokio::sync::mpsc::unbounded_channel();

    tokio::spawn(async move {
        for _ in 0..connections {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut bytes = Vec::new();
            let mut buffer = [0_u8; 8192];
            let header_end = loop {
                let read = stream.read(&mut buffer).await.unwrap();
                assert!(read > 0, "request ended before its headers");
                bytes.extend_from_slice(&buffer[..read]);
                if let Some(end) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
                    break end + 4;
                }
            };
            let head = String::from_utf8_lossy(&bytes[..header_end]).into_owned();
            let length = head
                .lines()
                .find_map(|line| {
                    let (name, value) = line.split_once(':')?;
                    name.eq_ignore_ascii_case("content-length")
                        .then(|| value.trim().parse::<usize>().ok())
                        .flatten()
                })
                .unwrap_or(0);
            while bytes.len() < header_end + length {
                let read = stream.read(&mut buffer).await.unwrap();
                assert!(read > 0, "request ended before its body");
                bytes.extend_from_slice(&buffer[..read]);
            }
            sender
                .send(String::from_utf8_lossy(&bytes).into_owned())
                .ok();

            let answer = format!(
                "HTTP/1.1 {status}\r\ncontent-type: application/json\r\nconnection: close\r\n\r\n"
            );
            stream.write_all(answer.as_bytes()).await.unwrap();
            for piece in &pieces {
                stream.write_all(piece.as_bytes()).await.unwrap();
                stream.flush().await.unwrap();
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
            if hold {
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    });

    (format!("http://{address}"), receiver)
}

pub fn conversational_settings() -> VoiceSettings {
    let dialogue = dialogue_settings();
    VoiceSettings {
        model_id: "eleven_v3_conversational".into(),
        file_settings: FileSettings {
            model_id: "eleven_v3_conversational".into(),
            ..dialogue.file_settings.clone()
        },
        ..dialogue
    }
}

pub fn dialogue_final() -> Message {
    Message::Text(json!({ "is_final": true }).to_string().into())
}
