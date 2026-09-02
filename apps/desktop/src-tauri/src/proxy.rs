//! A loopback proxy that lends the WebView the OpenRouter key.
//!
//! The WebView holds a typed model client, and a typed model client wants an
//! address and a key. September gives it the address of this proxy and a token
//! that lasts one run. The real key is read here, one request at a time, and
//! never crosses into the WebView.

use std::{future::Future, pin::Pin, sync::Arc};

use axum::{
    body::{Body, Bytes},
    extract::State,
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::Response,
    routing::post,
    Router,
};
use serde::Serialize;
use serde_json::{json, Value};
use tokio::net::TcpListener;
use uuid::Uuid;

/// Where the on-Mac model answers, and the token it wants. It starts on use.
pub type AppleSource = Arc<
    dyn Fn() -> Pin<Box<dyn Future<Output = Result<(String, String), String>> + Send>>
        + Send
        + Sync,
>;

/// Wraps an async source of the sidecar address, so a caller writes a closure.
pub fn apple_upstream<F, Fut>(source: F) -> AppleSource
where
    F: Fn() -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<(String, String), String>> + Send + 'static,
{
    Arc::new(move || Box::pin(source()))
}

/// Where the proxy forwards, and what it asks for when nobody chose a model.
#[derive(Clone)]
pub struct ProxyConfig {
    pub upstream: String,
    pub fallback_models: Vec<String>,
    /// The on-Mac sidecar, when this Mac has one.
    pub apple: Option<AppleSource>,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            upstream: crate::providers::OPEN_ROUTER.to_owned(),
            fallback_models: crate::providers::OPEN_ROUTER_MODELS
                .iter()
                .map(|model| (*model).to_owned())
                .collect(),
            apple: None,
        }
    }
}

/// The addresses and the run token the WebView needs. It holds no API key.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint {
    /// Where a cloud model answers.
    pub base_url: String,
    /// Where the model on this Mac answers.
    pub apple_url: String,
    pub token: String,
}

type KeySource = Arc<dyn Fn() -> Result<String, String> + Send + Sync>;

#[derive(Clone)]
struct ProxyState {
    token: String,
    upstream: String,
    fallback_models: Vec<String>,
    apple: Option<AppleSource>,
    client: reqwest::Client,
    key: KeySource,
}

/// Starts the proxy on a free loopback port and answers with its address.
pub async fn serve<F>(config: ProxyConfig, key: F) -> std::io::Result<Endpoint>
where
    F: Fn() -> Result<String, String> + Send + Sync + 'static,
{
    let token = Uuid::new_v4().to_string();
    let state = ProxyState {
        token: token.clone(),
        upstream: config.upstream.trim_end_matches('/').to_owned(),
        fallback_models: config.fallback_models,
        apple: config.apple,
        client: reqwest::Client::new(),
        key: Arc::new(key),
    };

    let listener = TcpListener::bind(("127.0.0.1", 0)).await?;
    let port = listener.local_addr()?.port();
    let router = Router::new()
        .route("/v1/chat/completions", post(completions).options(preflight))
        .route(
            "/apple/v1/chat/completions",
            post(apple_completions).options(preflight),
        )
        .fallback(missing)
        .with_state(state);
    tokio::spawn(async move {
        let _ = axum::serve(listener, router).await;
    });

    Ok(Endpoint {
        base_url: format!("http://127.0.0.1:{port}/v1"),
        apple_url: format!("http://127.0.0.1:{port}/apple/v1"),
        token,
    })
}

/// One request from the WebView, forwarded with the key of this Mac.
async fn completions(State(state): State<ProxyState>, headers: HeaderMap, body: Bytes) -> Response {
    let Some(mut request) = accepted(&state, &headers, &body) else {
        return failure(StatusCode::UNAUTHORIZED, "This request has no run token.");
    };
    let Some(fields) = request.as_object_mut() else {
        return failure(StatusCode::BAD_REQUEST, "The request was not an object.");
    };
    // A user who named a model gets that model. A user who named none gets the
    // free list, where the first model that answers wins.
    let named = fields
        .get("model")
        .and_then(Value::as_str)
        .is_some_and(|model| !model.trim().is_empty());
    if !named {
        fields.remove("model");
        fields.insert("models".to_owned(), json!(state.fallback_models));
    }

    let key = match (state.key)() {
        Ok(key) => key,
        Err(reason) => return failure(StatusCode::BAD_GATEWAY, &reason),
    };
    let target = format!("{}/api/v1/chat/completions", state.upstream);
    forward(&state, target, key, &request).await
}

/// One request for the model that runs on this Mac.
///
/// The sidecar allows a loopback origin only, and the WebView is not one, so
/// the WebView cannot reach it by itself. It also holds its own token, which
/// is no more the WebView's business than a cloud key is.
async fn apple_completions(
    State(state): State<ProxyState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let Some(request) = accepted(&state, &headers, &body) else {
        return failure(StatusCode::UNAUTHORIZED, "This request has no run token.");
    };
    let Some(source) = state.apple.clone() else {
        return failure(
            StatusCode::BAD_GATEWAY,
            "Apple Intelligence is not available on this Mac.",
        );
    };
    let (base_url, token) = match source().await {
        Ok(found) => found,
        Err(reason) => return failure(StatusCode::BAD_GATEWAY, &reason),
    };
    let target = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    forward(&state, target, token, &request).await
}

/// The body of a request that carries the run token, or nothing.
fn accepted(state: &ProxyState, headers: &HeaderMap, body: &Bytes) -> Option<Value> {
    if !holds_run_token(headers, &state.token) {
        return None;
    }
    serde_json::from_slice::<Value>(body).ok()
}

/// Sends one request on, and hands the reply back as it arrives.
async fn forward(state: &ProxyState, target: String, key: String, request: &Value) -> Response {
    let answer = state
        .client
        .post(target)
        .bearer_auth(key)
        .header(header::CONTENT_TYPE, "application/json")
        .body(serde_json::to_vec(request).unwrap_or_default())
        .send()
        .await;

    let answer = match answer {
        Ok(answer) => answer,
        Err(error) => {
            return failure(
                StatusCode::BAD_GATEWAY,
                &format!("Could not reach the writing service. ({error})"),
            )
        }
    };

    let status = StatusCode::from_u16(answer.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let content_type = answer
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| HeaderValue::from_bytes(value.as_bytes()).ok())
        .unwrap_or(HeaderValue::from_static("application/json"));

    // The body is passed through byte for byte, so a streamed answer streams
    // without the proxy knowing what an event is.
    let mut response = Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, content_type);
    for (name, value) in shared_headers() {
        response = response.header(name, value);
    }
    response
        .body(Body::from_stream(answer.bytes_stream()))
        .unwrap_or_else(|_| failure(StatusCode::BAD_GATEWAY, "The reply could not be read."))
}

/// The client sends an authorization header, so the browser asks first.
async fn preflight() -> Response {
    let mut response = Response::builder().status(StatusCode::NO_CONTENT);
    for (name, value) in shared_headers() {
        response = response.header(name, value);
    }
    response
        .body(Body::empty())
        .unwrap_or_else(|_| failure(StatusCode::BAD_GATEWAY, "The reply could not be built."))
}

/// The proxy serves one path. Everything else is not here.
async fn missing() -> Response {
    failure(StatusCode::NOT_FOUND, "This proxy serves one path.")
}

/// The origin is open because the run token is the gate, not the address. A
/// page that guesses the port still needs a token it was never given.
fn shared_headers() -> [(&'static str, &'static str); 4] {
    [
        ("access-control-allow-origin", "*"),
        ("access-control-allow-methods", "POST, OPTIONS"),
        (
            "access-control-allow-headers",
            "authorization, content-type",
        ),
        ("access-control-max-age", "600"),
    ]
}

/// One failure in the shape an OpenAI-compatible client already reads.
fn failure(status: StatusCode, message: &str) -> Response {
    let body = json!({ "error": { "message": message } }).to_string();
    let mut response = Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json");
    for (name, value) in shared_headers() {
        response = response.header(name, value);
    }
    response
        .body(Body::from(body))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}

fn holds_run_token(headers: &HeaderMap, token: &str) -> bool {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .is_some_and(|sent| same_secret(sent, token))
}

/// Compares every byte, so a wrong token takes as long as a right one.
fn same_secret(sent: &str, token: &str) -> bool {
    sent.len() == token.len()
        && sent
            .bytes()
            .zip(token.bytes())
            .fold(0_u8, |seen, (one, other)| seen | (one ^ other))
            == 0
}

/// The proxy of this run, started the first time the WebView asks for it.
///
/// A Mac with no writing service never starts one. The address and the token
/// last as long as the process, and mean nothing to another.
#[derive(Default)]
pub struct WritingProxy {
    endpoint: tokio::sync::Mutex<Option<Endpoint>>,
}

impl WritingProxy {
    pub async fn endpoint(&self, app: &tauri::AppHandle) -> std::io::Result<Endpoint> {
        let mut held = self.endpoint.lock().await;
        if let Some(endpoint) = held.as_ref() {
            return Ok(endpoint.clone());
        }

        let sidecar = app.clone();
        let config = ProxyConfig {
            apple: Some(apple_upstream(move || {
                let sidecar = sidecar.clone();
                async move {
                    use tauri::Manager;
                    sidecar
                        .state::<crate::apfel::ApfelState>()
                        .endpoint(&sidecar)
                        .await
                        .map_err(|error| error.to_string())
                }
            })),
            ..ProxyConfig::default()
        };

        let app = app.clone();
        let endpoint = serve(config, move || {
            use tauri::Manager;
            app.state::<crate::providers::ProviderKeys>()
                .get(crate::providers::Provider::OpenRouter)
                .map_err(|error| error.to_string())?
                .ok_or_else(|| "Connect OpenRouter in Settings first.".to_owned())
        })
        .await?;
        *held = Some(endpoint.clone());
        Ok(endpoint)
    }
}
