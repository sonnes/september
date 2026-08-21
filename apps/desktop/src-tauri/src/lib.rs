pub mod apfel;
pub mod audio;
pub mod error;
pub mod providers;
pub mod repository;
pub mod speech;

mod rpc;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(rpc::setup)
        .invoke_handler(tauri::generate_handler![
            rpc::setting_get,
            rpc::setting_put,
            rpc::setting_delete,
            rpc::space_list,
            rpc::space_get,
            rpc::space_put,
            rpc::space_patch,
            rpc::space_delete,
            rpc::message_list,
            rpc::message_get,
            rpc::message_put,
            rpc::message_delete,
            rpc::note_list,
            rpc::note_get,
            rpc::note_put,
            rpc::note_delete,
            rpc::phrase_list,
            rpc::phrase_put,
            rpc::phrase_delete,
            rpc::phrase_replace_ai,
            rpc::user_name,
            rpc::user_id,
            rpc::apfel_status,
            rpc::apfel_generate,
            rpc::openrouter_generate,
            rpc::provider_status,
            rpc::provider_connect,
            rpc::provider_forget,
            rpc::provider_voices,
            rpc::speech_synthesize,
            rpc::audio_outputs,
            rpc::audio_output,
            rpc::audio_output_set,
        ])
        .run(tauri::generate_context!())
        .expect("error while running September desktop");
}
