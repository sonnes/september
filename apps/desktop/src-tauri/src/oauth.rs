//! OpenRouter PKCE: browser authorization, loopback callback, Keychain storage.
use crate::providers::{Provider, ProviderKeys, ProviderStatus, Providers};
use axum::{
    http::Uri,
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
use tauri_plugin_opener::OpenerExt;
use tokio::sync::oneshot;

/// The OpenRouter sign-in that runs now, with the sender that cancels it.
#[derive(Default)]
pub(crate) struct SignIns(Mutex<Option<(String, oneshot::Sender<()>)>>);

const LOCK_LOST: &str = "Could not reach the sign-in. Quit and open the app again.";

impl SignIns {
    /// Starts the sign-in `id` and cancels the one before it.
    fn begin(&self, id: &str) -> Result<oneshot::Receiver<()>, String> {
        let (cancel, cancelled) = oneshot::channel();
        let mut active = self.0.lock().map_err(|_| LOCK_LOST)?;
        if let Some((_, previous)) = active.replace((id.to_owned(), cancel)) {
            let _ = previous.send(());
        }
        Ok(cancelled)
    }

    /// Cancels the sign-in `id`, and leaves a newer one running.
    fn cancel(&self, id: &str) -> Result<(), String> {
        let mut active = self.0.lock().map_err(|_| LOCK_LOST)?;
        if active.as_ref().is_some_and(|(current, _)| current == id) {
            if let Some((_, cancel)) = active.take() {
                let _ = cancel.send(());
            }
        }
        Ok(())
    }

    /// Ends the sign-in `id` and runs `keep` under the lock, so a cancel
    /// cannot come between the check and the write. A cancelled or newer
    /// sign-in keeps nothing.
    fn finish<T>(&self, id: &str, keep: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        let mut active = self.0.lock().map_err(|_| LOCK_LOST)?;
        if active.as_ref().is_none_or(|(current, _)| current != id) {
            return Err("Connection cancelled. Try again.".into());
        }
        active.take();
        keep()
    }
}

fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

/// The one authorization code in the query of the callback.
fn callback_code(query: &str) -> Result<String, String> {
    let url = reqwest::Url::parse(&format!("http://localhost/?{query}"))
        .map_err(|error| format!("OpenRouter sent an invalid callback. ({error})"))?;
    let pairs: Vec<_> = url.query_pairs().collect();
    let codes: Vec<_> = pairs.iter().filter(|(key, _)| key == "code").collect();
    if codes.len() == 1
        && !codes[0].1.is_empty()
        && codes[0].1.len() <= 4096
        && !pairs.iter().any(|(key, _)| key == "error")
    {
        Ok(codes[0].1.to_string())
    } else {
        Err("OpenRouter did not authorize the connection. Try again.".into())
    }
}

#[tauri::command]
pub(crate) fn openrouter_cancel(
    sign_ins: State<'_, SignIns>,
    request: crate::rpc::SignInRequest,
) -> Result<(), String> {
    sign_ins.cancel(&request.request_id)
}

#[tauri::command]
pub(crate) async fn openrouter_connect(
    app: AppHandle,
    keys: State<'_, ProviderKeys>,
    providers: State<'_, Providers>,
    sign_ins: State<'_, SignIns>,
    request: crate::rpc::SignInRequest,
) -> Result<ProviderStatus, String> {
    let request_id = request.request_id;
    let cancelled = sign_ins.begin(&request_id)?;
    let result = tokio::select! {
        _ = cancelled => Err("Connection cancelled. Try again.".into()),
        result = tokio::time::timeout(Duration::from_secs(300), authorize(&app, &providers)) =>
            result.unwrap_or_else(|_| Err("Connection timed out. Try again.".into())),
    };
    sign_ins.finish(&request_id, || {
        let (key, status) = result?;
        keys.store(Provider::OpenRouter, &key)
            .map_err(|error| error.to_string())?;
        Ok(status)
    })
}

async fn authorize(
    app: &AppHandle,
    providers: &Providers,
) -> Result<(String, ProviderStatus), String> {
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(|error| format!("Could not open the local authorization callback. ({error})"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Could not read the callback address. ({error})"))?
        .port();
    let path = format!("/callback/{}", uuid::Uuid::new_v4().simple());
    let verifier = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let open_router = providers.open_router();
    let mut auth = reqwest::Url::parse(&format!("{open_router}/auth"))
        .map_err(|error| format!("Invalid authorization address. ({error})"))?;
    auth.query_pairs_mut()
        .append_pair("callback_url", &format!("http://localhost:{port}{path}"))
        .append_pair("code_challenge", &challenge(&verifier))
        .append_pair("code_challenge_method", "S256");
    app.opener()
        .open_url(auth.as_str(), None::<&str>)
        .map_err(|error| format!("Could not open your browser. ({error})"))?;
    let code = receive_code(listener, path).await?;
    let response = providers
        .client()
        .post(format!("{open_router}/api/v1/auth/keys"))
        .json(&serde_json::json!({ "code": code, "code_verifier": verifier, "code_challenge_method": "S256" }))
        .send()
        .await
        .map_err(|error| format!("Could not reach OpenRouter. Try again. ({error})"))?;
    if !response.status().is_success() {
        return Err(format!(
            "OpenRouter authorization expired or failed. Try again. (HTTP {})",
            response.status().as_u16()
        ));
    }
    #[derive(serde::Deserialize)]
    struct IssuedKey {
        key: String,
    }
    let key = response
        .json::<IssuedKey>()
        .await
        .map_err(|error| format!("OpenRouter sent an invalid reply. ({error})"))?
        .key;
    if key.is_empty() {
        return Err("OpenRouter did not return a key.".into());
    }
    let status = providers
        .check(Provider::OpenRouter, &key)
        .await
        .map_err(|error| error.to_string())?;
    Ok((key, status))
}

async fn receive_code(listener: tokio::net::TcpListener, path: String) -> Result<String, String> {
    let (send, receive) = oneshot::channel();
    let sender = Arc::new(Mutex::new(Some(send)));
    let router = Router::new().route(&path, get(move |uri: Uri| {
        let sender = sender.clone();
        async move {
            let result = callback_code(uri.query().unwrap_or_default());
            if let Ok(mut sender) = sender.lock() {
                if let Some(sender) = sender.take() { let _ = sender.send(result); }
            }
            ([("Cache-Control", "no-store"), ("Referrer-Policy", "no-referrer")], Html("<!doctype html><title>September</title><h1>Return to September</h1><p>You can close this tab. September will show whether the connection succeeded.</p>")).into_response()
        }
    }));
    // Keep the server in this future: cancellation or timeout drops the listener.
    tokio::select! {
        code = receive => code.map_err(|_| "The authorization callback closed.".to_owned())?,
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
        assert_eq!(wrong.status(), axum::http::StatusCode::NOT_FOUND);
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
    fn a_cancel_stops_only_the_sign_in_it_names() {
        let sign_ins = SignIns::default();
        let mut cancelled = sign_ins.begin("current").unwrap();

        sign_ins.cancel("stale").unwrap();
        assert!(matches!(
            cancelled.try_recv(),
            Err(oneshot::error::TryRecvError::Empty)
        ));

        sign_ins.cancel("current").unwrap();
        assert_eq!(cancelled.try_recv(), Ok(()));
        assert!(sign_ins.finish("current", || Ok(())).is_err());
    }

    #[test]
    fn a_new_sign_in_cancels_the_one_before_it() {
        let sign_ins = SignIns::default();
        let mut first = sign_ins.begin("first").unwrap();
        sign_ins.begin("second").unwrap();

        assert_eq!(first.try_recv(), Ok(()));
        assert!(sign_ins.finish("first", || Ok(())).is_err());
        assert_eq!(sign_ins.finish("second", || Ok(7)), Ok(7));
    }

    #[test]
    fn a_lost_lock_is_an_error() {
        let sign_ins = std::sync::Arc::new(SignIns::default());
        let poisoner = sign_ins.clone();
        std::thread::spawn(move || {
            let _held = poisoner.0.lock().unwrap();
            panic!("poison the lock");
        })
        .join()
        .unwrap_err();

        assert!(sign_ins.begin("one").is_err());
        assert!(sign_ins.cancel("one").is_err());
    }

    #[test]
    fn challenge_matches_the_pkce_standard_vector() {
        assert_eq!(
            challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn a_callback_holds_exactly_one_code_and_no_error() {
        assert_eq!(callback_code("code=authorized"), Ok("authorized".into()));
        assert!(callback_code("error=denied").is_err());
        assert!(callback_code("code=authorized&error=denied").is_err());
        assert!(callback_code("code=a&code=b").is_err());
        assert!(callback_code("").is_err());
    }
}
