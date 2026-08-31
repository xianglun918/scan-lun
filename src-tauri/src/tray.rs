use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

pub const MAIN_LABEL: &str = "main";
pub const PROMPT_LABEL: &str = "prompt";

const TRAY_ICON: &[u8] = include_bytes!("../icons/tray-icon.png");

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "打开 scan-lun", true, None::<&str>)?;
    let fill = MenuItem::with_id(app, "fill", "立即填写", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &fill, &quit])?;

    let tray_icon = Image::from_bytes(TRAY_ICON)?;
    let builder = TrayIconBuilder::with_id("main-tray")
        .icon(tray_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "fill" => show_prompt(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(&tray.app_handle());
            }
        });

    #[cfg(target_os = "macos")]
    let builder = builder.icon_as_template(true);

    builder.build(app)?;

    Ok(())
}

/// 尝试显示已有窗口；如果窗口已被销毁（例如 prompt 窗被用户关闭后），
/// 则按 tauri.conf.json 中的配置重新创建，避免后续弹窗/托盘点击无效。
fn show_or_create(
    app: &AppHandle,
    label: &str,
    create: impl FnOnce(&AppHandle) -> tauri::Result<tauri::WebviewWindow>,
) {
    let win = match app.get_webview_window(label) {
        Some(win) => {
            if let Err(e) = win.show() {
                eprintln!("[scan-lun] failed to show window '{}': {}", label, e);
                return;
            }
            win
        }
        None => match create(app) {
            Ok(win) => win,
            Err(e) => {
                eprintln!("[scan-lun] failed to create window '{}': {}", label, e);
                return;
            }
        },
    };

    let _ = win.unminimize();
    let _ = win.set_focus();
}

fn show_main(app: &AppHandle) {
    show_or_create(app, MAIN_LABEL, |app| {
        tauri::WebviewWindowBuilder::new(app, MAIN_LABEL, tauri::WebviewUrl::App("index.html".into()))
            .title("scan-lun")
            .inner_size(800.0, 600.0)
            .min_inner_size(480.0, 400.0)
            .build()
    });
}

pub fn show_prompt(app: &AppHandle) {
    show_or_create(app, PROMPT_LABEL, |app| {
        tauri::WebviewWindowBuilder::new(
            app,
            PROMPT_LABEL,
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("每日三省")
        .inner_size(480.0, 560.0)
        .resizable(false)
        .maximizable(false)
        .always_on_top(true)
        .build()
    });
}
