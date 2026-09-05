//! OpenRouter PKCE: browser authorization, loopback callback, Keychain storage.
use crate::providers::{Provider, ProviderKeys, ProviderStatus, Providers};
use axum::{
    http::{StatusCode, Uri},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use sha2::{Digest, Sha256};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;
use tokio::sync::oneshot;

type Attempt = (String, oneshot::Sender<()>);
static ACTIVE: Mutex<Option<Attempt>> = Mutex::new(None);

fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

fn callback_code(uri: &str, path: &str) -> Option<Result<String, String>> {
    let url = reqwest::Url::parse(&format!("http://localhost{uri}")).ok()?;
    if url.path() != path {
        return None;
    }
    let codes: Vec<_> = url.query_pairs().filter(|(key, _)| key == "code").collect();
    if codes.len() == 1
        && !codes[0].1.is_empty()
        && codes[0].1.len() <= 4096
        && !url.query_pairs().any(|(key, _)| key == "error")
    {
        Some(Ok(codes[0].1.to_string()))
    } else {
        Some(Err(
            "OpenRouter did not authorize the connection. Try again.".into(),
        ))
    }
}

#[tauri::command]
pub(crate) fn openrouter_cancel(request_id: String) {
    if let Ok(mut active) = ACTIVE.lock() {
        if active.as_ref().is_some_and(|(id, _)| id == &request_id) {
            if let Some((_, cancel)) = active.take() {
                let _ = cancel.send(());
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn openrouter_connect(
    app: AppHandle,
    keys: State<'_, ProviderKeys>,
    request_id: String,
) -> Result<ProviderStatus, String> {
    let (cancel, cancelled) = oneshot::channel();
    {
        let mut active = ACTIVE
            .lock()
            .map_err(|_| "Could not start authorization.")?;
        if let Some((_, previous)) = active.replace((request_id.clone(), cancel)) {
            let _ = previous.send(());
        }
    }
    let result = tokio::select! {
        _ = cancelled => Err("Connection cancelled. Try again.".into()),
        result = tokio::time::timeout(Duration::from_secs(300), authorize(&app)) =>
            result.unwrap_or_else(|_| Err("Connection timed out. Try again.".into())),
    };
    // A cancelled or superseded attempt must not persist a late result.
    // Keep this lock through the synchronous Keychain write.
    let mut active = ACTIVE
        .lock()
        .map_err(|_| "Could not finish authorization.")?;
    if active.as_ref().is_none_or(|(id, _)| id != &request_id) {
        return Err("Connection cancelled. Try again.".into());
    }
    active.take();
    let (key, status) = result?;
    keys.store(Provider::OpenRouter, &key)
        .map_err(|_| "The key could not be saved on this Mac.".to_string())?;
    Ok(status)
}

async fn authorize(app: &AppHandle) -> Result<(String, ProviderStatus), String> {
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(|_| "Could not open the local authorization callback.")?;
    let port = listener
        .local_addr()
        .map_err(|_| "Could not read the callback address.")?
        .port();
    let path = format!("/callback/{}", uuid::Uuid::new_v4().simple());
    let verifier = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let mut auth = reqwest::Url::parse("https://openrouter.ai/auth")
        .map_err(|_| "Invalid authorization address.")?;
    auth.query_pairs_mut()
        .append_pair("callback_url", &format!("http://localhost:{port}{path}"))
        .append_pair("code_challenge", &challenge(&verifier))
        .append_pair("code_challenge_method", "S256");
    #[allow(deprecated)]
    app.shell()
        .open(auth.as_str(), None)
        .map_err(|_| "Could not open your browser.")?;
    let code = receive_code(listener, path).await?;
    let response = reqwest::Client::new().post("https://openrouter.ai/api/v1/auth/keys")
        .json(&serde_json::json!({ "code": code, "code_verifier": verifier, "code_challenge_method": "S256" }))
        .send().await.map_err(|_| "Could not reach OpenRouter. Try again.")?;
    if !response.status().is_success() {
        return Err("OpenRouter authorization expired or failed. Try again.".into());
    }
    #[derive(serde::Deserialize)]
    struct IssuedKey {
        key: String,
    }
    let key = response
        .json::<IssuedKey>()
        .await
        .map_err(|_| "OpenRouter sent an invalid reply.")?
        .key;
    if key.is_empty() {
        return Err("OpenRouter did not return a key.".into());
    }
    let status = Providers::default()
        .check(Provider::OpenRouter, &key)
        .await
        .map_err(|_| "Could not verify the OpenRouter connection. Try again.")?;
    Ok((key, status))
}

async fn receive_code(listener: tokio::net::TcpListener, path: String) -> Result<String, String> {
    let (send, receive) = oneshot::channel();
    let sender = Arc::new(Mutex::new(Some(send)));
    let callback_path = path.clone();
    let router = Router::new().route(&path, get(move |uri: Uri| {
        let sender = sender.clone();
        let path = callback_path.clone();
        async move {
            let Some(result) = callback_code(&uri.to_string(), &path) else { return StatusCode::NOT_FOUND.into_response(); };
            if let Ok(mut sender) = sender.lock() {
                if let Some(sender) = sender.take() { let _ = sender.send(result); }
            }
            ([("Cache-Control", "no-store"), ("Referrer-Policy", "no-referrer")], Html("<!doctype html><title>September</title><h1>Return to September</h1><p>You can close this tab. September will show whether the connection succeeded.</p>")).into_response()
        }
    }));
    // Keep the server in this future: cancellation or timeout drops the listener.
    tokio::select! {
        code = receive => code.map_err(|_| "The authorization callback closed.")?,
        _ = axum::serve(listener, router) => Err("The authorization callback stopped.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn loopback_ignores_other_paths_and_receives_the_authorized_code() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let pending = tokio::spawn(receive_code(listener, "/callback/nonce".into()));
        let client = reqwest::Client::new();
        let wrong = client
            .get(format!("http://{address}/other?code=foreign"))
            .send()
            .await
            .unwrap();
        assert_eq!(wrong.status(), StatusCode::NOT_FOUND);
        let response = client
            .get(format!("http://{address}/callback/nonce?code=authorized"))
            .send()
            .await
            .unwrap();
        assert!(response.status().is_success());
        assert!(response
            .text()
            .await
            .unwrap()
            .contains("Return to September"));
        assert_eq!(pending.await.unwrap().unwrap(), "authorized");
    }

    #[test]
    fn cancellation_only_stops_the_matching_attempt() {
        let (send, mut receive) = oneshot::channel();
        *ACTIVE.lock().unwrap() = Some(("current".into(), send));
        openrouter_cancel("stale".into());
        assert!(matches!(
            receive.try_recv(),
            Err(oneshot::error::TryRecvError::Empty)
        ));
        openrouter_cancel("current".into());
        assert_eq!(receive.try_recv(), Ok(()));
        assert!(ACTIVE.lock().unwrap().is_none());
    }

    #[test]
    fn challenge_matches_the_pkce_standard_vector() {
        assert_eq!(
            challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn callback_is_bound_to_its_random_path() {
        assert!(callback_code("/other?code=foreign", "/callback/nonce").is_none());
        assert_eq!(
            callback_code("/callback/nonce?code=authorized", "/callback/nonce"),
            Some(Ok("authorized".into()))
        );
        assert!(
            callback_code("/callback/nonce?error=denied", "/callback/nonce")
                .unwrap()
                .is_err()
        );
        assert!(
            callback_code("/callback/nonce?code=a&code=b", "/callback/nonce")
                .unwrap()
                .is_err()
        );
    }
}
