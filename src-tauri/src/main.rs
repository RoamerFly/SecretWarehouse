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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
