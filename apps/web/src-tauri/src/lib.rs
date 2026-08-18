pub mod error;
pub mod external;
pub mod files;
pub mod identity;
pub mod repository;

mod rpc;

pub fn run() {
    tauri::Builder::default()
        .setup(rpc::setup)
        .invoke_handler(tauri::generate_handler![
            rpc::record_list,
            rpc::record_get,
            rpc::record_put,
            rpc::record_delete,
            rpc::record_batch,
            rpc::setting_get,
            rpc::setting_put,
            rpc::setting_delete,
            rpc::file_write,
            rpc::file_read,
            rpc::file_get,
            rpc::file_list,
            rpc::file_delete,
            rpc::file_export,
            rpc::open_external,
            rpc::os_user_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running September desktop");
}
