pub mod apfel;
pub mod error;
pub mod providers;
pub mod repository;

mod rpc;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(rpc::setup)
        .invoke_handler(tauri::generate_handler![
            rpc::setting_get,
            rpc::setting_put,
            rpc::setting_delete,
            rpc::user_name,
            rpc::apfel_status,
            rpc::apfel_generate,
            rpc::provider_status,
            rpc::provider_connect,
            rpc::provider_forget,
            rpc::provider_voices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running September desktop");
}
