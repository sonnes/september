use september_desktop_lib::window;
use std::{env, fs, process::Command, thread, time::Duration};
use tauri::{Manager, PhysicalPosition, PhysicalSize};

const WINDOWS: [(&str, u32, u32, i32, i32); 1] = [("panel", 480, 640, 260, 120)];

fn main() {
    if env::var_os("SEPTEMBER_WINDOW_TEST").is_none() {
        println!("Set SEPTEMBER_WINDOW_TEST=1 to run the native window test.");
        return;
    }
    let args: Vec<String> = env::args().collect();
    if args.len() == 1 {
        for close in ["quit", "close"] {
            let identifier = format!("app.september.window-test-{}", uuid::Uuid::new_v4());
            let expected = env::temp_dir().join(format!("{identifier}.json"));
            for phase in ["save", "restore"] {
                let status = Command::new(&args[0])
                    .args([phase, &identifier, close])
                    .arg(&expected)
                    .status()
                    .unwrap();
                assert!(status.success(), "{close}: {phase} failed");
            }
            let actual = expected.with_extension("actual.json");
            let saved = fs::read_to_string(&expected).unwrap();
            let reopened = fs::read_to_string(&actual).unwrap();
            fs::remove_file(expected).unwrap();
            fs::remove_file(actual).unwrap();
            assert_eq!(saved, reopened, "{close}: window geometry changed");
        }
        return;
    }

    let report = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        report(info);
        std::process::exit(1);
    }));
    let mut context = tauri::generate_context!();
    context.config_mut().identifier = args[2].clone();
    let app = september_desktop_lib::builder()
        .setup(|_| Ok(()))
        .build(context)
        .unwrap();
    let handle = app.handle().clone();
    let state_dir = handle.path().app_config_dir().unwrap();
    let restore = args[1] == "restore";
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(700));
        if !restore {
            window::show_panel(&handle).unwrap();
            for (label, width, height, x, y) in WINDOWS {
                let window = handle.get_webview_window(label).unwrap();
                window.set_size(PhysicalSize::new(width, height)).unwrap();
                window.set_position(PhysicalPosition::new(x, y)).unwrap();
            }
            thread::sleep(Duration::from_millis(700));
        }
        let geometry: Vec<_> = WINDOWS
            .iter()
            .map(|(label, ..)| {
                let window = handle.get_webview_window(label).unwrap();
                let size = window.inner_size().unwrap();
                let position = window.outer_position().unwrap();
                serde_json::json!([label, size.width, size.height, position.x, position.y])
            })
            .collect();
        let output = if restore {
            std::path::PathBuf::from(&args[4]).with_extension("actual.json")
        } else {
            std::path::PathBuf::from(&args[4])
        };
        if args[3] == "close" && !restore {
            let panel = handle.get_webview_window("panel").unwrap();
            panel.close().unwrap();
            thread::sleep(Duration::from_millis(500));
            let panel = handle.get_webview_window("panel");
            let hidden = panel.is_some_and(|panel| !panel.is_visible().unwrap());
            if !hidden {
                eprintln!("close: the panel must stay open and hidden");
                std::process::exit(1);
            }
        }
        fs::write(output, serde_json::to_vec(&geometry).unwrap()).unwrap();
        handle.exit(0);
    });
    let code = app.run_return(|_, _| {});
    if restore && state_dir.exists() {
        fs::remove_dir_all(state_dir).unwrap();
    }
    std::process::exit(code);
}
