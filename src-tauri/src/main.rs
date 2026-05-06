#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod crypto;
mod db;
mod models;

use db::DbState;
use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

fn main() {
    let db_state = DbState::new().expect("数据库初始化失败");

    // 系统托盘菜单
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "显示窗口"))
        .add_item(CustomMenuItem::new("quick_search", "快速搜索 (Ctrl+Shift+P)"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "退出"));

    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        .with_tooltip("SecretWarehouse - 安全密码管理器");

    tauri::Builder::default()
        .manage(db_state)
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "show" => {
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "quick_search" => {
                            // 触发快速搜索弹窗
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                                let _ = window.emit("show-quick-search", ());
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                }
                SystemTrayEvent::LeftClick { .. } => {
                    // 点击托盘图标显示窗口
                    if let Some(window) = app.get_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                _ => {}
            }
        })
        .setup(|app| {
            // 注册全局快捷键 Ctrl+Shift+P
            let app_handle = app.handle();
            app.global_shortcut_manager()
                .register("CommandOrControl+Shift+P", move || {
                    if let Some(window) = app_handle.get_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                        let _ = window.emit("show-quick-search", ());
                    }
                })?;

            // 窗口关闭时隐藏到托盘而不是退出
            if let Some(window) = app.get_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        window_clone.hide().unwrap();
                    }
                });
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
            commands::search_secrets_quick,
            commands::copy_field_to_clipboard,
            commands::get_secret_field_values,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
