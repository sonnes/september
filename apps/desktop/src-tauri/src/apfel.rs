use reqwest::{StatusCode, Url};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use tauri::AppHandle;

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use {
    std::{net::TcpListener, process::Command},
    tauri_plugin_shell::{process::CommandChild, ShellExt},
    tokio::{sync::Mutex, time::Duration},
    uuid::Uuid,
};

const MODEL: &str = "apple-foundationmodel";

#[derive(Debug, thiserror::Error)]
pub enum ApfelError {
    #[error("invalid apfel endpoint: {0}")]
    InvalidEndpoint(String),
    #[error("could not reach apfel: {0}")]
    Unreachable(#[from] reqwest::Error),
    #[error("apfel request failed: {0}")]
    Request(String),
    #[error("apfel returned an invalid response: {0}")]
    InvalidResponse(String),
    #[error("could not start apfel: {0}")]
    Start(String),
    #[error("Apple Intelligence is not available")]
    ModelUnavailable,
    #[error("apfel requires Apple Silicon and macOS 26 or newer")]
    Unsupported,
}

pub type Result<T> = std::result::Result<T, ApfelError>;

#[derive(Clone)]
pub struct ApfelClient {
    client: reqwest::Client,
    base_url: String,
    token: String,
}

impl ApfelClient {
    pub fn new(base_url: String, token: String) -> Result<Self> {
        let url = Url::parse(&base_url)
            .map_err(|error| ApfelError::InvalidEndpoint(error.to_string()))?;
        let is_loopback = match url.host_str() {
            Some("localhost" | "::1") => true,
            Some(host) => host
                .parse::<std::net::IpAddr>()
                .is_ok_and(|ip| ip.is_loopback()),
            None => false,
        };
        if url.scheme() != "http" || !is_loopback {
            return Err(ApfelError::InvalidEndpoint(
                "endpoint must use HTTP on the loopback interface".into(),
            ));
        }

        Ok(Self {
            client: reqwest::Client::new(),
            base_url: base_url.trim_end_matches('/').to_owned(),
            token,
        })
    }

    pub async fn status(&self) -> Result<ApfelHealth> {
        let response = self
            .client
            .get(format!("{}/health", self.base_url))
            .send()
            .await?;
        decode_response(response).await
    }

    pub async fn generate(&self, request: ApfelGenerateRequest) -> Result<ApfelGeneration> {
        let response = self
            .client
            .post(format!("{}/v1/chat/completions", self.base_url))
            .bearer_auth(&self.token)
            .json(&ChatCompletionRequest {
                model: MODEL,
                messages: &request.messages,
                stream: false,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
                response_format: request.response_format.as_ref(),
            })
            .send()
            .await?;
        let response: ChatCompletionResponse = decode_response(response).await?;
        let choice = response
            .choices
            .into_iter()
            .next()
            .ok_or_else(|| ApfelError::InvalidResponse("missing completion choice".into()))?;

        Ok(ApfelGeneration {
            text: choice.message.content,
            finish_reason: choice.finish_reason,
            usage: response.usage,
            model: Some(MODEL.to_owned()),
            cost_usd: Some(0.0),
        })
    }
}

async fn decode_response<T: for<'de> Deserialize<'de>>(response: reqwest::Response) -> Result<T> {
    let status = response.status();
    if !status.is_success() {
        return Err(ApfelError::Request(error_message(status, response).await));
    }
    response
        .json()
        .await
        .map_err(|error| ApfelError::InvalidResponse(error.to_string()))
}

async fn error_message(status: StatusCode, response: reqwest::Response) -> String {
    let fallback = format!("HTTP {}", status.as_u16());
    let Ok(body) = response.json::<OpenAiErrorEnvelope>().await else {
        return fallback;
    };
    if body.error.message.trim().is_empty() {
        fallback
    } else {
        body.error.message
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ApfelHealth {
    pub model: String,
    pub version: String,
    pub context_window: u32,
    #[serde(rename = "model_available")]
    pub available: bool,
    pub prewarmed: bool,
    pub supported_languages: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ApfelGenerateRequest {
    pub messages: Vec<ApfelMessage>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub response_format: Option<ApfelResponseFormat>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ApfelMessage {
    pub role: ApfelRole,
    pub content: String,
}

impl ApfelMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: ApfelRole::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: ApfelRole::User,
            content: content.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ApfelRole {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ApfelResponseFormat {
    JsonObject,
    JsonSchema { name: String, schema: Value },
}

impl<'de> Deserialize<'de> for ApfelResponseFormat {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(tag = "type", rename_all = "snake_case")]
        enum WireFormat {
            JsonObject,
            JsonSchema { name: String, schema: Value },
        }

        match WireFormat::deserialize(deserializer)? {
            WireFormat::JsonObject => Ok(Self::JsonObject),
            WireFormat::JsonSchema { name, schema } => Ok(Self::JsonSchema { name, schema }),
        }
    }
}

impl Serialize for ApfelResponseFormat {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::JsonObject => serde_json::json!({ "type": "json_object" }).serialize(serializer),
            Self::JsonSchema { name, schema } => serde_json::json!({
                "type": "json_schema",
                "json_schema": {
                    "name": name,
                    "schema": schema,
                    "strict": true
                }
            })
            .serialize(serializer),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ApfelGeneration {
    pub text: String,
    pub finish_reason: String,
    pub usage: ApfelUsage,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cost_usd: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ApfelUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Serialize)]
struct ChatCompletionRequest<'a> {
    model: &'static str,
    messages: &'a [ApfelMessage],
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    response_format: Option<&'a ApfelResponseFormat>,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatCompletionChoice>,
    usage: ApfelUsage,
}

#[derive(Deserialize)]
struct ChatCompletionChoice {
    message: ChatCompletionMessage,
    finish_reason: String,
}

#[derive(Deserialize)]
struct ChatCompletionMessage {
    content: String,
}

#[derive(Deserialize)]
struct OpenAiErrorEnvelope {
    error: OpenAiError,
}

#[derive(Deserialize)]
struct OpenAiError {
    message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ApfelStatus {
    pub supported: bool,
    pub available: bool,
    pub reason: Option<String>,
    pub model: Option<String>,
    pub version: Option<String>,
    pub context_window: Option<u32>,
    pub prewarmed: Option<bool>,
    pub supported_languages: Vec<String>,
}

impl ApfelStatus {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    fn from_health(health: ApfelHealth) -> Self {
        let reason = (!health.available)
            .then(|| "Apple Intelligence is disabled, unsupported, or still preparing".into());
        Self {
            supported: true,
            available: health.available,
            reason,
            model: Some(health.model),
            version: Some(health.version),
            context_window: Some(health.context_window),
            prewarmed: Some(health.prewarmed),
            supported_languages: health.supported_languages,
        }
    }

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    fn unavailable(reason: impl Into<String>) -> Self {
        Self {
            supported: true,
            available: false,
            reason: Some(reason.into()),
            model: None,
            version: None,
            context_window: None,
            prewarmed: None,
            supported_languages: Vec::new(),
        }
    }

    fn unsupported() -> Self {
        Self {
            supported: false,
            available: false,
            reason: Some(ApfelError::Unsupported.to_string()),
            model: None,
            version: None,
            context_window: None,
            prewarmed: None,
            supported_languages: Vec::new(),
        }
    }
}

#[derive(Default)]
pub(crate) struct ApfelState {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    managed: Mutex<Option<ManagedApfel>>,
}

impl ApfelState {
    pub(crate) async fn status(&self, app: &AppHandle) -> ApfelStatus {
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        {
            if !macos_is_supported() {
                return ApfelStatus::unsupported();
            }
            return match self.ready(app).await {
                Ok((_, health)) => ApfelStatus::from_health(health),
                Err(error) => ApfelStatus::unavailable(error.to_string()),
            };
        }

        #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
        {
            let _ = app;
            ApfelStatus::unsupported()
        }
    }

    pub(crate) async fn generate(
        &self,
        app: &AppHandle,
        request: ApfelGenerateRequest,
    ) -> Result<ApfelGeneration> {
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        {
            if !macos_is_supported() {
                return Err(ApfelError::Unsupported);
            }
            let (client, health) = self.ready(app).await?;
            if !health.available {
                return Err(ApfelError::ModelUnavailable);
            }
            return client.generate(request).await;
        }

        #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
        {
            let _ = (app, request);
            Err(ApfelError::Unsupported)
        }
    }

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    async fn ready(&self, app: &AppHandle) -> Result<(ApfelClient, ApfelHealth)> {
        let mut managed = self.managed.lock().await;

        if let Some(current) = managed.as_ref() {
            if let Ok(health) = current.client.status().await {
                return Ok((current.client.clone(), health));
            }
        }

        if let Some(mut stale) = managed.take() {
            stale.stop();
        }

        let listener = TcpListener::bind(("127.0.0.1", 0))
            .map_err(|error| ApfelError::Start(error.to_string()))?;
        let port = listener
            .local_addr()
            .map_err(|error| ApfelError::Start(error.to_string()))?
            .port();
        drop(listener);

        let token = Uuid::new_v4().to_string();
        let args = vec![
            "--serve".to_owned(),
            "--host".to_owned(),
            "127.0.0.1".to_owned(),
            "--port".to_owned(),
            port.to_string(),
            "--max-concurrent".to_owned(),
            "1".to_owned(),
            "--no-color".to_owned(),
        ];
        let (mut events, child) = app
            .shell()
            .sidecar("apfel")
            .map_err(|error| ApfelError::Start(error.to_string()))?
            .args(args)
            .env("APFEL_TOKEN", &token)
            .spawn()
            .map_err(|error| ApfelError::Start(error.to_string()))?;
        tauri::async_runtime::spawn(async move { while events.recv().await.is_some() {} });

        let client = ApfelClient::new(format!("http://127.0.0.1:{port}"), token)?;
        let mut process = ManagedApfel {
            client: client.clone(),
            child: Some(child),
        };
        let mut last_error = "the health endpoint did not become ready".to_owned();

        for _ in 0..80 {
            match client.status().await {
                Ok(health) => {
                    *managed = Some(process);
                    return Ok((client, health));
                }
                Err(error) => last_error = error.to_string(),
            }
            tokio::time::sleep(Duration::from_millis(250)).await;
        }

        process.stop();
        Err(ApfelError::Start(last_error))
    }
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn macos_is_supported() -> bool {
    Command::new("/usr/bin/sw_vers")
        .arg("-productVersion")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .is_some_and(|version| macos_version_is_supported(&version))
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn macos_version_is_supported(version: &str) -> bool {
    version
        .trim()
        .split('.')
        .next()
        .and_then(|major| major.parse::<u32>().ok())
        .is_some_and(|major| major >= 26)
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
struct ManagedApfel {
    client: ApfelClient,
    child: Option<CommandChild>,
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
impl ManagedApfel {
    fn stop(&mut self) {
        if let Some(child) = self.child.take() {
            let _ = child.kill();
        }
    }
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
impl Drop for ManagedApfel {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(all(test, target_os = "macos", target_arch = "aarch64"))]
mod tests {
    use super::macos_version_is_supported;

    #[test]
    fn apfel_requires_macos_26_or_newer() {
        assert!(!macos_version_is_supported("25.6.0"));
        assert!(macos_version_is_supported("26.0"));
        assert!(macos_version_is_supported("27.1.2"));
        assert!(!macos_version_is_supported("Unknown"));
    }
}
