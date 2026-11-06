mod common;

use common::serve_raw;
use september_desktop_lib::proxy::{self, ProxyConfig};
use serde_json::{json, Value};

const REPLY: &str = concat!(
    "HTTP/1.1 200 OK\r\n",
    "content-type: application/json\r\n",
    "content-length: 11\r\n",
    "connection: close\r\n\r\n",
    "{\"ok\":true}"
);

/// A Mac whose model does not start.
fn config(upstream: &str) -> ProxyConfig {
    ProxyConfig {
        upstream: upstream.to_owned(),
        apple: proxy::apple_upstream(|| async {
            Err("Apple Intelligence needs macOS 26 on Apple silicon.".to_owned())
        }),
        client: reqwest::Client::new(),
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
    let (upstream, requests) = serve_raw(REPLY.to_owned());
    let endpoint = proxy::serve(config(&upstream), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    let answer = reqwest::Client::new()
        .post(format!("{}/chat/completions", endpoint.base_url))
        .bearer_auth(&endpoint.token)
        .json(&json!({ "model": "openrouter/free", "messages": [] }))
        .send()
        .await
        .unwrap();

    assert_eq!(answer.status(), 200);
    assert_eq!(answer.text().await.unwrap(), "{\"ok\":true}");

    let sent = requests.recv().unwrap();
    assert_eq!(header_of(&sent, "authorization"), "Bearer sk-real");
    assert_eq!(
        body_of(&sent),
        json!({ "model": "openrouter/free", "messages": [] })
    );
}

#[tokio::test]
async fn it_refuses_a_body_that_is_not_a_json_object() {
    let endpoint = proxy::serve(config("http://127.0.0.1:9"), || Ok("sk-real".to_owned()))
        .await
        .unwrap();

    for body in ["not json", "[]"] {
        let answer = reqwest::Client::new()
            .post(format!("{}/chat/completions", endpoint.base_url))
            .bearer_auth(&endpoint.token)
            .body(body)
            .send()
            .await
            .unwrap();
        assert_eq!(answer.status(), 400, "{body}");
    }
}

#[tokio::test]
async fn it_answers_nothing_without_the_run_token() {
    let (upstream, _requests) = serve_raw(REPLY.to_owned());
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
    let (upstream, _requests) = serve_raw(REPLY.to_owned());
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
    let (upstream, _requests) = serve_raw(STREAM.to_owned());
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
    let (upstream, _requests) = serve_raw(REPLY.to_owned());
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
    let (sidecar, requests) = serve_raw(REPLY.to_owned());
    let apple = sidecar.clone();
    let endpoint = proxy::serve(
        ProxyConfig {
            apple: proxy::apple_upstream(move || {
                let apple = apple.clone();
                async move { Ok((apple, "sidecar-token".to_owned())) }
            }),
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
}

#[tokio::test]
async fn it_says_when_this_mac_has_no_apple_intelligence() {
    let (upstream, _requests) = serve_raw(REPLY.to_owned());
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
    let body: Value = answer.json().await.unwrap();
    assert_eq!(
        body["error"]["message"],
        json!("Apple Intelligence needs macOS 26 on Apple silicon.")
    );
}

/// The typed client adds its own headers, such as `x-stainless-os`, so the
/// preflight must allow the headers the browser asks for.
#[tokio::test]
async fn it_allows_the_headers_the_client_sends() {
    let endpoint = proxy::serve(config("http://127.0.0.1:9"), || Ok("sk-real".to_owned()))
        .await
        .unwrap();
    let asked = "authorization,content-type,user-agent,x-stainless-os,x-stainless-retry-count";

    let answer = reqwest::Client::new()
        .request(
            reqwest::Method::OPTIONS,
            format!("{}/chat/completions", endpoint.base_url),
        )
        .header("origin", "http://localhost:3010")
        .header("access-control-request-method", "POST")
        .header("access-control-request-headers", asked)
        .send()
        .await
        .unwrap();

    let allowed = answer
        .headers()
        .get("access-control-allow-headers")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();
    for header in asked.split(',') {
        assert!(
            allowed.split(',').any(|name| name.trim() == header),
            "{header} is not allowed: {allowed}"
        );
    }
}
