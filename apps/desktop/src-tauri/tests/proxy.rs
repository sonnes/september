use std::{
    io::{Read, Write},
    net::TcpListener,
    sync::mpsc,
    thread,
};

use september_desktop_lib::proxy::{self, ProxyConfig};
use serde_json::{json, Value};

/// Answers one request with a raw response and hands the request back.
fn serve_once(response: &'static str) -> (String, mpsc::Receiver<String>) {
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

const REPLY: &str = concat!(
    "HTTP/1.1 200 OK\r\n",
    "content-type: application/json\r\n",
    "content-length: 11\r\n",
    "connection: close\r\n\r\n",
    "{\"ok\":true}"
);

fn config(upstream: &str) -> ProxyConfig {
    ProxyConfig {
        upstream: upstream.to_owned(),
        fallback_models: vec!["free/one".to_owned(), "free/two".to_owned()],
        apple: None,
    }
}

fn body_of(request: &str) -> Value {
    let (_, body) = request.split_once("\r\n\r\n").unwrap();
    serde_json::from_str(body).unwrap()
}

fn header_of(request: &str, name: &str) -> String {
    request
        .lines()
        .find_map(|line| {
            let (key, value) = line.split_once(':')?;
            key.eq_ignore_ascii_case(name)
                .then(|| value.trim().to_owned())
        })
        .unwrap_or_default()
}

#[tokio::test]
async fn it_lends_the_key_without_giving_it_away() {
    let (upstream, requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "messages": [] }))
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 200);
    assert_eq!(answer.text().await.unwrap(), "{\"ok\":true}");

    let sent = requests.recv().unwrap();
    assert_eq!(header_of(&sent, "authorization"), "Bearer sk-real");
    // A request that names no model gets the free list, first answer wins.
    assert_eq!(body_of(&sent)["models"], json!(["free/one", "free/two"]));
}

#[tokio::test]
async fn it_leaves_a_chosen_model_alone() {
    let (upstream, requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "model": "vendor/model", "messages": [] }))
        .send()
        .await
        .unwrap();

    let body = body_of(&requests.recv().unwrap());
    assert_eq!(body["model"], json!("vendor/model"));
    assert_eq!(body["models"], Value::Null);
}

#[tokio::test]
async fn it_answers_nothing_without_the_run_token() {
    let (upstream, _requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();
    let client = reqwest::Client::new();

    let no_token = client
        .post(format!("{}/chat/completions", endpoint.base_url))
        .json(&json!({ "messages": [] }))
        .send()
        .await
        .unwrap();
    assert_eq!(no_token.status(), 401);

    let wrong_token = client
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth("guess")
        .json(&json!({ "messages": [] }))
        .send()
        .await
        .unwrap();
    assert_eq!(wrong_token.status(), 401);

    let wrong_path = client
        .post(format!("{}/models", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .send()
        .await
        .unwrap();
    assert_eq!(wrong_path.status(), 404);
}

#[tokio::test]
async fn it_says_which_service_is_not_connected() {
    let (upstream, _requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || {
        Err("Connect OpenRouter in Settings first.".to_owned())
    })
    .await
    .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "messages": [] }))
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 502);
    let body: Value = answer.json().await.unwrap();
    assert_eq!(
        body["error"]["message"],
        json!("Connect OpenRouter in Settings first.")
    );
}

#[tokio::test]
async fn it_passes_a_streamed_reply_through() {
    const STREAM: &str = concat!(
        "HTTP/1.1 200 OK\r\n",
        "content-type: text/event-stream\r\n",
        "connection: close\r\n\r\n",
        "data: {\"one\":1}\n\n",
        "data: [DONE]\n\n"
    );
    let (upstream, _requests) = serve_once(STREAM);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "messages": [], "stream": true }))
        .send()
        .await
        .unwrap();

    assert_eq!(
        answer.headers().get("content-type").unwrap(),
        "text/event-stream"
    );
    assert_eq!(
        answer.text().await.unwrap(),
        "data: {\"one\":1}\n\ndata: [DONE]\n\n"
    );
}

#[tokio::test]
async fn it_lets_the_web_view_ask_first() {
    let (upstream, _requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    // The client sends an authorization header, so the browser asks first.
    let answer = reqwest::Client::new()
        .request(
            reqwest::Method::OPTIONS,
            format!("{}/chat/completions", endpoint.base_url),
        )
        .header("origin", "tauri://localhost")
        .header("access-control-request-method", "POST")
        .header("access-control-request-headers", "authorization")
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 204);
    let headers = answer.headers();
    assert_eq!(headers.get("access-control-allow-origin").unwrap(), "*");
    let allowed = headers
        .get("access-control-allow-headers")
        .unwrap()
        .to_str()
        .unwrap()
        .to_ascii_lowercase();
    assert!(allowed.contains("authorization"));
    assert!(allowed.contains("content-type"));
}

#[tokio::test]
async fn it_carries_apple_intelligence_for_the_web_view() {
    let (sidecar, requests) = serve_once(REPLY);
    let apple = sidecar.clone();
    let endpoint = proxy::serve(
        ProxyConfig {
            apple: Some(proxy::apple_upstream(move || {
                let apple = apple.clone();
                async move { Ok((apple, "sidecar-token".to_owned())) }
            })),
            ..config("http://127.0.0.1:1")
        },
        || Err("no cloud key here".to_owned()),
    )
    .await
    .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.apple_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "model": "apple-foundationmodel", "messages": [] }))
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 200);
    let sent = requests.recv().unwrap();
    // The sidecar has its own token, and the run token never reaches it.
    assert_eq!(header_of(&sent, "authorization"), "Bearer sidecar-token");
    assert!(sent.starts_with("POST /v1/chat/completions"), "{sent}");
    // The Mac model is named, so the free cloud list has no business here.
    assert_eq!(body_of(&sent)["models"], Value::Null);
}

#[tokio::test]
async fn it_says_when_this_mac_has_no_apple_intelligence() {
    let (upstream, _requests) = serve_once(REPLY);
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.apple_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "model": "apple-foundationmodel", "messages": [] }))
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 502);
}
