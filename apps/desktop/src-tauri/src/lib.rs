pub mod apfel;
pub mod audio;
pub mod error;
pub mod gaze;
pub mod providers;
pub mod proxy;
pub mod repository;
pub mod speech;
pub mod window;

mod oauth;
mod rpc;

pub fn builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION,
                )
                .build(),
        )
        .setup(|app| {
            rpc::setup(app)?;
            window::setup(app)
        })
        .on_window_event(window::on_window_event)
        .invoke_handler(tauri::generate_handler![
            rpc::setting_get,
            rpc::setting_put,
            rpc::backup_export,
            rpc::backup_import,
            rpc::space_list,
            rpc::space_get,
            rpc::space_put,
            rpc::space_patch,
            rpc::space_delete,
            rpc::message_list,
            rpc::message_get,
            rpc::message_put,
            rpc::message_delete,
            rpc::agent_message_list,
            rpc::agent_message_put,
            rpc::agent_tool_state,
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
            rpc::writing_proxy,
            rpc::provider_status,
            rpc::provider_connect,
            oauth::openrouter_connect,
            oauth::openrouter_cancel,
            rpc::provider_forget,
            rpc::provider_voices,
            rpc::provider_clone_voice,
            rpc::provider_quota,
            rpc::speech_synthesize,
            rpc::speech_stream,
            rpc::speech_system,
            rpc::speech_native_stop,
            rpc::audio_outputs,
            rpc::audio_output,
            rpc::audio_output_set,
            rpc::virtual_microphone_status,
            rpc::virtual_microphone_start,
            rpc::virtual_microphone_stop,
            gaze::gaze_start,
            gaze::gaze_stop,
            window::panel_show,
            window::panel_hide,
            window::panel_float,
            window::panel_set_float,
            window::panel_setup,
            window::panel_present,
        ])
}

pub fn run() {
    builder()
        .build(tauri::generate_context!())
        .expect("error while building September desktop")
        .run(|app, event| {
            window::on_run_event(app, &event);
            if matches!(event, tauri::RunEvent::Exit) {
                audio::stop_speech();
                if let Err(error) = audio::virtual_microphone_stop() {
                    eprintln!("[audio] could not remove the microphone: {error}");
                }
                use tauri::Manager;
                if let Err(error) = app.state::<gaze::GazeState>().stop() {
                    eprintln!("[gaze] could not stop the eye tracker: {error}");
                }
                app.state::<apfel::ApfelState>().stop();
            }
        });
}

#[cfg(test)]
mod tests {
    #[test]
    fn cidre_targets_the_oldest_macos_the_bundle_allows() {
        let feature = format!(
            "\"macos_{}\"",
            env!("SEPTEMBER_MACOS_MIN").replace('.', "_")
        );
        assert!(
            include_str!("../Cargo.toml").contains(&feature),
            "{feature}"
        );
    }
}
