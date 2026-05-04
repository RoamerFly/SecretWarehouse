#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod crypto;
mod db;
mod models;

use db::DbState;

fn main() {
    let db_state = DbState::new().expect("数据库初始化失败");

    tauri::Builder::default()
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            commands::create_secret,
            commands::get_secret,
            commands::list_secrets,
            commands::update_secret,
            commands::delete_secret,
            commands::search_secrets,
            commands::get_all_tags,
            commands::generate_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
