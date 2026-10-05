//! The one app window, the floating `panel`.

use serde_json::Value;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::rpc::BackendState;

/// The label of the panel in `tauri.conf.json`.
const PANEL: &str = "panel";

/// The setting that keeps the panel above other apps. It is on until the user
/// turns it off.
const PANEL_FLOAT_SETTING: &str = "panel-float";

#[derive(Debug, PartialEq, Eq)]
pub enum Toggle {
    Show,
    Hide,
}

/// The global key hides the panel when the panel is visible and is the key
/// window. In all other states, the key shows the panel.
pub fn panel_toggle(visible: bool, key: bool) -> Toggle {
    if visible && key {
        Toggle::Hide
    } else {
        Toggle::Show
    }
}

/// The macOS activation policy of September.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Policy {
    /// A Dock icon and a place in Command-Tab.
    Regular,
    /// No Dock icon and no place in Command-Tab.
    Accessory,
}

/// During setup, and with the float off, September is a normal app. With the
/// float on, September is a floating panel with no Dock icon.
pub fn policy(setup: bool, float: bool) -> Policy {
    if float && !setup {
        Policy::Accessory
    } else {
        Policy::Regular
    }
}

fn panel<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<WebviewWindow<R>> {
    app.get_webview_window(PANEL)
        .ok_or(tauri::Error::WindowNotFound)
}

/// Shows and focuses the panel.
pub fn show_panel<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let panel = panel(app)?;
    panel.show()?;
    #[cfg(target_os = "macos")]
    {
        let ns_window = panel.ns_window()? as usize;
        panel.run_on_main_thread(move || {
            // SAFETY: the closure runs on the main thread, and the pointer is
            // the NSWindow of the panel, which lives as long as the app.
            unsafe {
                september_window_buttons(ns_window as *mut std::ffi::c_void, BUTTONS.0, BUTTONS.1)
            };
        })?;
    }
    panel.set_focus()
}

/// Shows the panel, or hides it when it is the key window.
pub fn toggle_panel<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let window = panel(app)?;
    match panel_toggle(window.is_visible()?, window.is_focused()?) {
        Toggle::Hide => window.hide(),
        Toggle::Show => show_panel(app),
    }
}

#[cfg(target_os = "macos")]
extern "C" {
    fn september_window_float(ns_window: *mut std::ffi::c_void, on: bool);
    fn september_window_buttons(ns_window: *mut std::ffi::c_void, x: f64, y: f64);
}

/// The saved float choice. Only a saved `false` turns the float off.
pub fn float_on(saved: Option<&Value>) -> bool {
    saved.and_then(Value::as_bool).unwrap_or(true)
}

fn saved_setting<R: Runtime>(app: &AppHandle<R>, key: &str) -> Result<Option<Value>, String> {
    match app.try_state::<BackendState>() {
        Some(state) => state
            .repository
            .lock()
            .map_err(|error| error.to_string())?
            .get_setting(key)
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

fn saved_float<R: Runtime>(app: &AppHandle<R>) -> Result<bool, String> {
    Ok(float_on(saved_setting(app, PANEL_FLOAT_SETTING)?.as_ref()))
}

/// Keeps the panel above other apps, an app in full screen, and each Space, or
/// makes it a normal window. Sets the activation policy to match.
fn apply_float<R: Runtime>(app: &AppHandle<R>, setup: bool, float: bool) -> tauri::Result<()> {
    let on = float && !setup;
    #[cfg(target_os = "macos")]
    app.set_activation_policy(match policy(setup, float) {
        Policy::Regular => tauri::ActivationPolicy::Regular,
        Policy::Accessory => tauri::ActivationPolicy::Accessory,
    })?;
    let panel = panel(app)?;
    panel.set_always_on_top(on)?;
    panel.set_visible_on_all_workspaces(on)?;
    #[cfg(target_os = "macos")]
    {
        let ns_window = panel.ns_window()? as usize;
        panel.run_on_main_thread(move || {
            // SAFETY: the closure runs on the main thread, and the pointer is
            // the NSWindow of the panel, which lives as long as the app.
            unsafe { september_window_float(ns_window as *mut std::ffi::c_void, on) };
        })?;
    }
    Ok(())
}

/// The place of the window buttons over the header, in points: the left inset,
/// and the height that the title bar gains.
#[cfg(target_os = "macos")]
const BUTTONS: (f64, f64) = (20.0, 32.0);

/// Makes the panel from its entry in `tauri.conf.json`. The title bar is an
/// overlay, and the window buttons sit at the middle of the 64-point indigo
/// header. Only the builder passes this position to the webview, so the
/// config does not create the panel.
pub fn create_panel(app: &tauri::App) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == PANEL)
        .ok_or(tauri::Error::WindowNotFound)?;
    let builder = WebviewWindowBuilder::from_config(app.handle(), config)?;
    #[cfg(target_os = "macos")]
    let builder = builder.traffic_light_position(tauri::LogicalPosition::new(BUTTONS.0, BUTTONS.1));
    builder.build()?;
    Ok(())
}

/// Makes the panel, applies the saved float choice, and adds the menu bar item
/// and the global key.
pub(crate) fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    create_panel(app)?;
    apply_float(app.handle(), false, saved_float(app.handle())?)?;

    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "show-panel", "Show Panel", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "Quit September", true, None::<&str>)?,
        ],
    )?;
    TrayIconBuilder::with_id("september")
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("September")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show-panel" => {
                let _ = show_panel(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, _, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = toggle_panel(app);
                }
            })
            .build(),
    )?;
    // Another app can own the key. The menu bar item still shows the panel.
    let _ = app.global_shortcut().register(Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::ALT),
        Code::Space,
    ));
    Ok(())
}

#[tauri::command]
pub(crate) fn panel_show(app: AppHandle) -> Result<(), String> {
    show_panel(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn panel_hide(app: AppHandle) -> Result<(), String> {
    panel(&app)
        .and_then(|panel| panel.hide())
        .map_err(|error| error.to_string())
}

#[tauri::command(async)]
pub(crate) fn panel_float(app: AppHandle) -> Result<bool, String> {
    saved_float(&app)
}

/// Saves the float choice and applies it to the panel now.
#[tauri::command(async)]
pub(crate) fn panel_set_float(app: AppHandle, on: bool) -> Result<(), String> {
    let state = app
        .try_state::<BackendState>()
        .ok_or("September is not ready.")?;
    state
        .repository
        .lock()
        .map_err(|error| error.to_string())?
        .put_setting(PANEL_FLOAT_SETTING, &Value::Bool(on))
        .map_err(|error| error.to_string())?;
    apply_float(&app, false, on).map_err(|error| error.to_string())
}

/// With `on`, makes the panel a normal window for setup. The saved float
/// choice does not change. Without it, applies the saved float choice.
#[tauri::command(async)]
pub(crate) fn panel_setup(app: AppHandle, on: bool) -> Result<(), String> {
    let float = saved_float(&app)?;
    apply_float(&app, on, float).map_err(|error| error.to_string())
}

/// Fills the screen with the panel while Present shows, without a new macOS
/// desktop, or gives the panel back its size.
#[tauri::command]
pub(crate) fn panel_present(app: AppHandle, on: bool) -> Result<(), String> {
    panel(&app)
        .and_then(|panel| panel.set_simple_fullscreen(on))
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_global_key_hides_only_a_visible_key_panel() {
        assert_eq!(panel_toggle(true, true), Toggle::Hide);
        assert_eq!(panel_toggle(true, false), Toggle::Show);
        assert_eq!(panel_toggle(false, true), Toggle::Show);
        assert_eq!(panel_toggle(false, false), Toggle::Show);
    }

    #[test]
    fn setup_and_a_normal_window_get_a_dock_icon() {
        assert_eq!(policy(true, true), Policy::Regular);
        assert_eq!(policy(true, false), Policy::Regular);
        assert_eq!(policy(false, true), Policy::Accessory);
        assert_eq!(policy(false, false), Policy::Regular);
    }

    #[test]
    fn the_panel_floats_unless_the_user_turned_it_off() {
        assert!(float_on(None));
        assert!(float_on(Some(&Value::Bool(true))));
        assert!(!float_on(Some(&Value::Bool(false))));
        assert!(float_on(Some(&Value::from("off"))));
    }
}
