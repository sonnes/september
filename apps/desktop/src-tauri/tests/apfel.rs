mod common;

use common::serve_once;
use september_desktop_lib::apfel::ApfelClient;
use serde_json::json;

#[test]
fn health_reports_whether_the_model_can_answer() {
    for available in [true, false] {
        let (base_url, captured) = serve_once(
            "200 OK",
            json!({
                "status": "ok",
                "model": "apple-foundationmodel",
                "model_available": available,
            }),
        );
        let client = ApfelClient::new(reqwest::Client::new(), base_url, "secret-token".into());

        let status = tauri::async_runtime::block_on(client.status()).unwrap();

        assert_eq!(status.available, available);
        assert!(captured.recv().unwrap().starts_with("GET /health "));
    }
}

#[test]
fn a_health_error_keeps_the_message_of_the_sidecar() {
    let (base_url, _requests) = serve_once(
        "503 Service Unavailable",
        json!({ "error": { "message": "model is loading" } }),
    );
    let client = ApfelClient::new(reqwest::Client::new(), base_url, "secret-token".into());

    let error = tauri::async_runtime::block_on(client.status()).unwrap_err();

    assert!(error.to_string().contains("model is loading"), "{error}");
}
