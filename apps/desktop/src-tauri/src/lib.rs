pub mod error;
pub mod repository;

mod rpc;

pub fn run() {
    tauri::Builder::default()
        .setup(rpc::setup)
        .invoke_handler(tauri::generate_handler![
            rpc::setting_get,
            rpc::setting_put,
            rpc::setting_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running September desktop");
}
