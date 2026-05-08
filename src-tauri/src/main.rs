#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod crypto;
mod db;
mod models;

use db::DbState;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// 显示主窗口
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

use crypto::is_session_active;

fn create_quick_search_window(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    let url = if cfg!(debug_assertions) {
        WebviewUrl::External("http://localhost:1420#quick-search".parse().unwrap())
    } else {
        WebviewUrl::App("index.html#quick-search".into())
    };

    // 默认位置（屏幕左上角附近），实际位置由前端根据用户设置动态调整
    WebviewWindowBuilder::new(app, "quick-search", url)
        .title("快速搜索")
        .inner_size(480.0, 400.0)
        .resizable(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .position(0.0, 0.0)
        .build()
}

fn show_quick_search_window(app: &tauri::AppHandle) {
    // 检查是否有活动会话
    if !is_session_active() {
        // 未登录，显示主窗口让用户登录
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
        return;
    }

    if let Some(window) = app.get_webview_window("quick-search") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("focus-input", ());
    } else {
        // 窗口不存在，重新创建
        if let Err(e) = create_quick_search_window(app) {
            eprintln!("Failed to create quick search window: {}", e);
        }
    }
}

fn main() {
    let db_state = DbState::new().expect("数据库初始化失败");

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 第二个实例启动时，显示主窗口
            show_main_window(app);
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(db_state)
        .setup(|app| {
            // 创建系统托盘菜单
            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let quick_search_item =
                MenuItemBuilder::with_id("quick_search", "快速搜索 (Ctrl+Shift+P)").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&quick_search_item)
                .separator()
                .item(&PredefinedMenuItem::close_window(app, Some("关闭窗口"))?)
                .item(&quit_item)
                .build()?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("SecretWarehouse - 安全密码管理器")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quick_search" => {
                        show_quick_search_window(app);
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        // 左键点击显示主窗口
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 创建快速搜索窗口（初始隐藏）
            create_quick_search_window(app.handle())?;

            // 窗口关闭时隐藏到托盘而不是退出
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });

                // 确保主窗口在启动时显示并获得焦点
                let _ = window.show();
                let _ = window.set_focus();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_secret,
            commands::get_secret,
            commands::list_secrets,
            commands::get_total_secrets_count,
            commands::get_favorites_count,
            commands::update_secret,
            commands::delete_secret,
            commands::delete_secrets,
            commands::search_secrets,
            commands::get_all_tags,
            commands::get_tag_counts,
            commands::generate_password,
            commands::generate_test_data,
            commands::create_template,
            commands::get_template,
            commands::list_templates,
            commands::update_template,
            commands::delete_template,
            commands::export_database,
            commands::import_database,
            commands::get_all_usernames,
            commands::is_master_password_set,
            commands::set_master_password,
            commands::verify_master_password,
            commands::clear_encryption_key,
            commands::has_recovery_key,
            commands::unlock_with_recovery_code,
            commands::reset_password_with_recovery,
            commands::export_user_data,
            commands::import_user_data,
            commands::change_password,
            commands::has_security_questions,
            commands::set_security_questions,
            commands::get_security_questions,
            commands::reset_password_with_security_questions,
            commands::delete_security_questions,
            commands::search_secrets_quick,
            commands::copy_field_to_clipboard,
            commands::get_secret_field_values,
            commands::hide_quick_search_window,
            commands::check_active_session,
            commands::set_quick_search_position,
            commands::get_screen_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
