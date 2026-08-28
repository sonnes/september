pub mod apfel;
pub mod audio;
pub mod error;
pub mod gaze;
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
            rpc::analytics_put,
            rpc::analytics_list,
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
            rpc::provider_models,
            rpc::provider_writing_models,
            rpc::provider_clone_voice,
            rpc::provider_quota,
            rpc::speech_synthesize,
            rpc::speech_system,
            rpc::speech_file_play,
            rpc::speech_native_stop,
            rpc::audio_outputs,
            rpc::audio_output,
            rpc::audio_output_set,
            rpc::virtual_microphone_status,
            rpc::virtual_microphone_start,
            rpc::virtual_microphone_stop,
            gaze::gaze_start,
            gaze::gaze_stop,
        ])
        .build(tauri::generate_context!())
        .expect("error while building September desktop")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                audio::stop_speech();
                let _ = audio::virtual_microphone_stop();
                use tauri::Manager;
                let _ = app.state::<gaze::GazeState>().stop();
            }
        });
}
