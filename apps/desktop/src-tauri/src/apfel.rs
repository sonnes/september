//! The apfel sidecar, which serves Apple Intelligence on the loopback.

use reqwest::{StatusCode, Url};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use {
    std::{net::TcpListener, process::Command},
    tauri::Manager,
    tauri_plugin_shell::{process::CommandChild, ShellExt},
    tokio::{sync::Mutex, time::Duration},
    uuid::Uuid,
};

#[derive(Debug, thiserror::Error)]
pub enum ApfelError {
    #[error("Apple Intelligence has an invalid address. ({0})")]
    InvalidEndpoint(String),
    #[error("Could not reach Apple Intelligence. ({0})")]
    Unreachable(#[from] reqwest::Error),
    #[error("Apple Intelligence did not answer. ({0})")]
    Request(String),
    #[error("Apple Intelligence sent a reply September could not read. ({0})")]
    InvalidResponse(String),
    #[error("Could not start Apple Intelligence. ({0})")]
    Start(String),
    #[error("Apple Intelligence is off or still getting ready. Turn it on in System Settings.")]
    ModelUnavailable,
    #[error("Apple Intelligence needs macOS 26 on Apple silicon.")]
    Unsupported,
}

pub type Result<T> = std::result::Result<T, ApfelError>;

/// The health endpoint of one sidecar on the loopback.
#[derive(Clone)]
pub struct ApfelClient {
    client: reqwest::Client,
    base_url: String,
    token: String,
}

impl ApfelClient {
    pub fn new(client: reqwest::Client, base_url: String, token: String) -> Result<Self> {
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
            client,
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
        let status = response.status();
        if !status.is_success() {
            return Err(ApfelError::Request(error_message(status, response).await));
        }
        response
            .json()
            .await
            .map_err(|error| ApfelError::InvalidResponse(error.to_string()))
    }
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

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct ApfelHealth {
    #[serde(rename = "model_available")]
    pub available: bool,
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
}

#[derive(Default)]
pub(crate) struct ApfelState {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    managed: Mutex<Option<ManagedApfel>>,
}

impl ApfelState {
    /// Where the sidecar of this run answers, and its token. It starts the
    /// sidecar when it is not up, and fails when the model cannot answer.
    pub(crate) async fn endpoint(&self, app: &AppHandle) -> Result<(String, String)> {
        let client = self.available(app).await?;
        Ok((client.base_url, client.token))
    }

    pub(crate) async fn status(&self, app: &AppHandle) -> ApfelStatus {
        match self.available(app).await {
            Ok(_) => ApfelStatus {
                supported: true,
                available: true,
                reason: None,
            },
            Err(error) => ApfelStatus {
                supported: !matches!(error, ApfelError::Unsupported),
                available: false,
                reason: Some(error.to_string()),
            },
        }
    }

    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    async fn available(&self, _app: &AppHandle) -> Result<ApfelClient> {
        Err(ApfelError::Unsupported)
    }

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    async fn available(&self, app: &AppHandle) -> Result<ApfelClient> {
        if !macos_is_supported() {
            return Err(ApfelError::Unsupported);
        }
        let (client, health) = self.ready(app).await?;
        if !health.available {
            return Err(ApfelError::ModelUnavailable);
        }
        Ok(client)
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

        let client = ApfelClient::new(
            app.state::<crate::providers::Providers>().client().clone(),
            format!("http://127.0.0.1:{port}"),
            token,
        )?;
        let mut process = ManagedApfel {
            client: client.clone(),
            child: Some(child),
        };
        let mut last_error = "it did not answer in time".to_owned();

        // The sidecar reports no start event, so its health endpoint is asked
        // until it answers, for up to 20 seconds.
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
    match Command::new("/usr/bin/sw_vers")
        .arg("-productVersion")
        .output()
    {
        Ok(output) if output.status.success() => {
            macos_version_is_supported(&String::from_utf8_lossy(&output.stdout))
        }
        Ok(output) => {
            eprintln!("[apfel] sw_vers failed: {}", output.status);
            false
        }
        Err(error) => {
            eprintln!("[apfel] sw_vers did not run: {error}");
            false
        }
    }
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
            if let Err(error) = child.kill() {
                eprintln!("[apfel] could not stop the sidecar: {error}");
            }
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
