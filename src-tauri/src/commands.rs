use crate::crypto;
use crate::db::DbState;
use crate::models::*;
use indexmap::IndexMap;
use rand::Rng;
use tauri::{Manager, State};

#[tauri::command]
pub fn create_secret(
    state: State<'_, DbState>,
    title: String,
    description: Option<String>,
    fields: IndexMap<String, String>,
    sensitive_fields: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
) -> Result<SecretEntry, String> {
    let req = CreateSecretRequest {
        title,
        description: description.unwrap_or_default(),
        fields,
        sensitive_fields: sensitive_fields.unwrap_or_default(),
        tags: tags.unwrap_or_default(),
        icon: icon.unwrap_or_else(|| "key".to_string()),
    };
    state.create_secret(req)
}

#[tauri::command]
pub fn get_secret(state: State<'_, DbState>, id: String) -> Result<SecretEntry, String> {
    state.get_secret(&id)
}

#[tauri::command]
pub fn list_secrets(
    state: State<'_, DbState>,
    tag: Option<String>,
    favorite: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<SecretEntry>, String> {
    let req = ListSecretsRequest {
        tag,
        favorite,
        limit,
        offset,
    };
    state.list_secrets(req)
}

#[tauri::command]
pub fn get_total_secrets_count(state: State<'_, DbState>) -> Result<i64, String> {
    state.get_total_count()
}

#[tauri::command]
pub fn get_favorites_count(state: State<'_, DbState>) -> Result<i64, String> {
    state.get_favorites_count()
}

#[tauri::command]
pub fn update_secret(
    state: State<'_, DbState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    fields: Option<IndexMap<String, String>>,
    sensitive_fields: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
    favorite: Option<bool>,
) -> Result<SecretEntry, String> {
    let req = UpdateSecretRequest {
        id,
        title,
        description,
        fields,
        sensitive_fields,
        tags,
        icon,
        favorite,
    };
    state.update_secret(req)
}

#[tauri::command]
pub fn delete_secret(state: State<'_, DbState>, id: String) -> Result<bool, String> {
    state.delete_secret(&id)
}

#[tauri::command]
pub fn search_secrets(state: State<'_, DbState>, query: String) -> Result<Vec<SecretEntry>, String> {
    state.search_secrets(&query)
}

#[tauri::command]
pub fn get_all_tags(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    state.get_all_tags()
}

#[tauri::command]
pub fn get_tag_counts(state: State<'_, DbState>) -> Result<std::collections::HashMap<String, i32>, String> {
    state.get_tag_counts()
}

#[tauri::command]
pub fn generate_password(
    length: Option<usize>,
    use_upper: Option<bool>,
    use_lower: Option<bool>,
    use_digits: Option<bool>,
    use_symbols: Option<bool>,
) -> Result<String, String> {
    let len = length.unwrap_or(16);
    let use_upper = use_upper.unwrap_or(true);
    let use_lower = use_lower.unwrap_or(true);
    let use_digits = use_digits.unwrap_or(true);
    let use_symbols = use_symbols.unwrap_or(true);

    let mut charset = String::new();
    if use_upper { charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ"); }
    if use_lower { charset.push_str("abcdefghijklmnopqrstuvwxyz"); }
    if use_digits { charset.push_str("0123456789"); }
    if use_symbols { charset.push_str("!@#$%^&*()-_=+[]{}|;:,.<>?"); }

    if charset.is_empty() {
        return Err("至少选择一种字符类型".to_string());
    }

    let chars: Vec<char> = charset.chars().collect();
    let mut rng = rand::thread_rng();
    let password: String = (0..len)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect();

    Ok(password)
}

#[tauri::command]
pub fn generate_test_data(state: State<'_, DbState>, count: i32) -> Result<i32, String> {
    use rand::seq::SliceRandom;

    let mut rng = rand::thread_rng();

    let titles = [
        "GitHub", "Gmail", "淘宝", "京东", "微信", "支付宝", "百度", "微博",
        "知乎", "B站", "网易云音乐", "QQ", "抖音", "美团", "饿了么", "滴滴",
        "银行账户", "公司邮箱", "VPN账号", "服务器SSH", "数据库", "AWS控制台",
        "阿里云", "腾讯云", "Cloudflare", "Docker Hub", "npm", "PyPI",
        "Apple ID", "微软账号", "谷歌账号", "亚马逊", "Netflix", "Spotify",
        "Steam", "Epic Games", "PlayStation", "Xbox", "Nintendo",
    ];

    let descriptions = [
        "个人账号，日常使用",
        "工作账号，注意安全",
        "重要账户，定期更换密码",
        "测试账号",
        "备用账号",
        "家庭共享账号",
        "开发者账号，用于发布应用",
        "云服务账号，存储项目数据",
        "娱乐账号，订阅服务",
        "游戏账号，绑定支付方式",
    ];

    let tags_pool = [
        "工作", "个人", "社交", "购物", "娱乐", "开发", "云服务",
        "游戏", "金融", "邮箱", "工具", "学习",
    ];

    let icons = ["key", "globe", "credit-card", "lock", "shield", "mail", "server", "terminal"];

    let user_names = ["admin", "user", "test", "demo", "root", "dev", "guest", "john", "mary", "alex"];
    let domains = ["gmail.com", "qq.com", "163.com", "outlook.com", "hotmail.com", "company.com"];

    let mut generated = 0;
    let count = count.clamp(1, 100);

    for i in 0..count {
        let title = titles.choose(&mut rng).unwrap().to_string();
        let title = format!("{} {}", title, i + 1);

        let description = if rng.gen_bool(0.7) {
            descriptions.choose(&mut rng).unwrap().to_string()
        } else {
            String::new()
        };

        let mut fields = IndexMap::new();

        // 用户名
        let username = format!(
            "{}{}@{}",
            user_names.choose(&mut rng).unwrap(),
            rng.gen_range(100..999),
            domains.choose(&mut rng).unwrap()
        );
        fields.insert("用户名".to_string(), username);

        // 密码
        let pwd_len = rng.gen_range(12..24);
        let password: String = (0..pwd_len)
            .map(|_| {
                let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                chars[rng.gen_range(0..chars.len())] as char
            })
            .collect();
        fields.insert("密码".to_string(), password.clone());

        // 随机添加额外字段
        if rng.gen_bool(0.5) {
            fields.insert("备注".to_string(), format!("这是{}的备注信息", title));
        }
        if rng.gen_bool(0.3) {
            fields.insert("API密钥".to_string(), format!("sk-{}", password));
        }
        if rng.gen_bool(0.2) {
            fields.insert("手机号".to_string(), format!("1{:010}", rng.gen_range(0..9999999999u64)));
        }

        // 随机标签 (1-3个)
        let num_tags = rng.gen_range(1..=3);
        let selected_tags: Vec<String> = tags_pool
            .choose_multiple(&mut rng, num_tags)
            .map(|t| t.to_string())
            .collect();

        // 敏感字段列表
        let mut sensitive_fields = vec!["密码".to_string()];
        if fields.contains_key("API密钥") {
            sensitive_fields.push("API密钥".to_string());
        }

        let icon = icons.choose(&mut rng).unwrap().to_string();

        let req = CreateSecretRequest {
            title,
            description,
            fields,
            sensitive_fields,
            tags: selected_tags,
            icon,
        };

        if state.create_secret(req).is_ok() {
            generated += 1;
        }
    }

    Ok(generated)
}

#[tauri::command]
pub fn delete_secrets(state: State<'_, DbState>, ids: Vec<String>) -> Result<usize, String> {
    state.delete_secrets(&ids)
}

#[tauri::command]
pub fn create_template(
    state: State<'_, DbState>,
    name: String,
    description: Option<String>,
    fields: Vec<String>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
) -> Result<Template, String> {
    let req = CreateTemplateRequest {
        name,
        description: description.unwrap_or_default(),
        fields,
        tags: tags.unwrap_or_default(),
        icon: icon.unwrap_or_else(|| "key".to_string()),
    };
    state.create_template(req)
}

#[tauri::command]
pub fn get_template(state: State<'_, DbState>, id: String) -> Result<Template, String> {
    state.get_template(&id)
}

#[tauri::command]
pub fn list_templates(state: State<'_, DbState>) -> Result<Vec<Template>, String> {
    state.list_templates()
}

#[tauri::command]
pub fn update_template(
    state: State<'_, DbState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    fields: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
) -> Result<Template, String> {
    let req = UpdateTemplateRequest {
        id,
        name,
        description,
        fields,
        tags,
        icon,
    };
    state.update_template(req)
}

#[tauri::command]
pub fn delete_template(state: State<'_, DbState>, id: String) -> Result<bool, String> {
    state.delete_template(&id)
}

#[tauri::command]
pub fn export_database(username: String, path: String) -> Result<(), String> {
    use std::path::Path;

    let db_path = crypto::get_db_path(&username);

    // 确保导出目录存在
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建导出目录失败: {}", e))?;
    }
    std::fs::copy(&db_path, &path)
        .map_err(|e| format!("导出数据库失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn import_database(state: State<'_, DbState>, username: String, path: String, mode: String) -> Result<usize, String> {
    let db_path = crypto::get_db_path(&username);

    // Verify the import file is a valid SQLite database
    let import_conn = rusqlite::Connection::open(&path)
        .map_err(|e| format!("无法打开导入文件: {}", e))?;

    // Check if it has the expected tables
    let table_exists: bool = import_conn.query_row(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='secrets'",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("验证数据库格式失败: {}", e))?;

    if !table_exists {
        return Err("导入文件不是有效的数据库格式".to_string());
    }

    if mode == "overwrite" {
        // Overwrite mode: replace entire database
        drop(import_conn);
        let mut conn = state.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        *conn = rusqlite::Connection::open_in_memory()
            .map_err(|e| format!("创建临时连接失败: {}", e))?;
        std::fs::copy(&path, &db_path)
            .map_err(|e| format!("复制数据库文件失败: {}", e))?;
        *conn = rusqlite::Connection::open(&db_path)
            .map_err(|e| format!("重新打开数据库失败: {}", e))?;

        // Count imported entries
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM secrets", [], |row| row.get(0))
            .map_err(|e| format!("获取条目数量失败: {}", e))?;
        Ok(count as usize)
    } else {
        // Incremental mode: merge data, skip existing IDs
        let mut count = 0;

        // Get all secrets from import file
        let imported_secrets: Vec<(String, String, String, String, String, String, i64, i64, i64)> = {
            let mut stmt = import_conn.prepare(
                "SELECT id, icon, title, description, encrypted_fields, tags, created_at, updated_at, favorite FROM secrets"
            ).map_err(|e| format!("查询导入数据失败: {}", e))?;

            let result = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, i64>(6)?,
                    row.get::<_, i64>(7)?,
                    row.get::<_, i64>(8)?,
                ))
            }).map_err(|e| format!("读取导入数据失败: {}", e))?;

            result.collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("收集导入数据失败: {}", e))?
        };

        drop(import_conn);

        let conn = state.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;

        for (id, icon, title, description, encrypted_fields, tags, created_at, updated_at, favorite) in imported_secrets {
            // Check if ID already exists
            let exists: bool = conn.query_row(
                "SELECT COUNT(*) > 0 FROM secrets WHERE id = ?1",
                [&id],
                |row| row.get(0)
            ).unwrap_or(false);

            if !exists {
                // Insert new entry
                conn.execute(
                    "INSERT INTO secrets (id, icon, title, description, encrypted_fields, tags, created_at, updated_at, favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    rusqlite::params![id, icon, title, description, encrypted_fields, tags, created_at, updated_at, favorite]
                ).map_err(|e| format!("插入数据失败: {}", e))?;
                count += 1;
            }
        }

        Ok(count)
    }
}

// ============ 用户和密码管理相关命令 ============

#[tauri::command]
pub fn get_all_usernames() -> Result<Vec<String>, String> {
    Ok(crypto::get_all_usernames())
}

#[tauri::command]
pub fn is_master_password_set(username: String) -> Result<bool, String> {
    Ok(crypto::is_master_password_set(&username))
}

#[tauri::command]
pub fn set_master_password(state: State<'_, DbState>, username: String, password: String) -> Result<String, String> {
    // 创建用户主密码和加密密钥
    let recovery_code = crypto::set_master_password(&username, &password)?;

    // 初始化用户数据库
    state.init_for_user(&username)?;

    Ok(recovery_code)
}

#[tauri::command]
pub fn verify_master_password(state: State<'_, DbState>, username: String, password: String) -> Result<bool, String> {
    let success = crypto::verify_master_password(&username, &password)?;
    if success {
        // 初始化用户数据库
        state.init_for_user(&username)?;
    }
    Ok(success)
}

#[tauri::command]
pub fn clear_encryption_key() {
    crypto::clear_encryption_key();
}

#[tauri::command]
pub fn has_recovery_key(username: String) -> Result<bool, String> {
    Ok(crypto::has_recovery_key(&username))
}

#[tauri::command]
pub fn unlock_with_recovery_code(username: String, recovery_code: String) -> Result<bool, String> {
    match crypto::unlock_with_recovery_code(&username, &recovery_code) {
        Ok(_) => Ok(true),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn reset_password_with_recovery(state: State<'_, DbState>, username: String, recovery_code: String, new_password: String) -> Result<(), String> {
    let master_key = crypto::unlock_with_recovery_code(&username, &recovery_code)?;
    crypto::reset_password_with_master_key(&username, master_key, &new_password)?;

    // 初始化用户数据库
    state.init_for_user(&username)?;

    Ok(())
}

// ============ 用户数据导出/导入 ============

/// 导出用户数据为ZIP压缩包
/// 包含：数据库、加密密钥文件（不包含密码和恢复码明文）
#[tauri::command]
pub fn export_user_data(username: String, output_path: String) -> Result<String, String> {
    use std::io::Write;
    use std::path::Path;
    use zip::write::FileOptions;

    let user_dir = Path::new("data").join(&username);

    // 需要导出的文件列表（不包含恢复码明文）
    let files_to_export = [
        format!("data_{}.db", username),
        "salt.key".to_string(),
        "master.key".to_string(),
        "auth.verify".to_string(),
        "recovery.key".to_string(),
        "recovery_salt.key".to_string(),
    ];

    // 创建ZIP文件
    let file = std::fs::File::create(&output_path)
        .map_err(|e| format!("创建ZIP文件失败: {}", e))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o600);

    let mut files_added = 0;

    for filename in &files_to_export {
        let file_path = user_dir.join(filename);
        if file_path.exists() {
            let content = std::fs::read(&file_path)
                .map_err(|e| format!("读取文件 {} 失败: {}", filename, e))?;

            zip.start_file(filename, options)
                .map_err(|e| format!("创建ZIP条目失败: {}", e))?;

            zip.write_all(&content)
                .map_err(|e| format!("写入ZIP条目失败: {}", e))?;

            files_added += 1;
        }
    }

    if files_added == 0 {
        return Err("没有找到可导出的用户数据".to_string());
    }

    zip.finish()
        .map_err(|e| format!("完成ZIP文件失败: {}", e))?;

    Ok(output_path)
}

/// 从ZIP压缩包导入用户数据
#[tauri::command]
pub fn import_user_data(state: State<'_, DbState>, username: String, zip_path: String) -> Result<String, String> {
    use std::io::Read;
    use std::path::Path;

    let user_dir = Path::new("data").join(&username);

    // 创建用户数据目录
    std::fs::create_dir_all(&user_dir)
        .map_err(|e| format!("创建用户目录失败: {}", e))?;

    // 打开ZIP文件
    let file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("打开ZIP文件失败: {}", e))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("读取ZIP文件失败: {}", e))?;

    // 验证必要的文件是否存在
    let required_files = ["salt.key", "master.key", "auth.verify"];
    for required in &required_files {
        if archive.by_name(required).is_err() {
            return Err(format!("ZIP文件缺少必要文件: {}", required));
        }
    }

    // 解压文件
    let mut files_imported = 0;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("读取ZIP条目失败: {}", e))?;

        let outpath = match file.enclosed_name() {
            Some(path) => user_dir.join(path),
            None => continue,
        };

        // 防止路径遍历攻击
        if !outpath.starts_with(&user_dir) {
            continue;
        }

        let mut contents = Vec::new();
        file.read_to_end(&mut contents)
            .map_err(|e| format!("读取ZIP内容失败: {}", e))?;

        std::fs::write(&outpath, contents)
            .map_err(|e| format!("写入文件失败: {}", e))?;

        files_imported += 1;
    }

    if files_imported == 0 {
        return Err("ZIP文件为空或无法读取".to_string());
    }

    // 尝试初始化数据库连接
    let db_path = crypto::get_db_path(&username);
    if db_path.exists() {
        state.init_for_user(&username)?;
    }

    Ok(format!("成功导入 {} 个文件", files_imported))
}

// ============ 快速搜索相关命令 ============

/// 快速搜索结果的精简结构
#[derive(serde::Serialize)]
pub struct QuickSearchResult {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub fields: Vec<FieldPreview>,
}

#[derive(serde::Serialize)]
pub struct FieldPreview {
    pub name: String,
    pub value: String,
}

/// 快速搜索密码条目（用于全局快捷键弹窗）
#[tauri::command]
pub fn search_secrets_quick(state: State<'_, DbState>, query: String, show_plaintext: bool) -> Result<Vec<QuickSearchResult>, String> {
    let secrets = state.search_secrets(&query)?;

    let results: Vec<QuickSearchResult> = secrets
        .into_iter()
        .map(|s| {
            // 字段已经在查询时解密，直接使用
            let fields: Vec<FieldPreview> = s.fields
                .into_iter()
                .map(|(name, value)| FieldPreview {
                    name,
                    value: if show_plaintext { value } else { "***".to_string() },
                })
                .collect();

            QuickSearchResult {
                id: s.id,
                title: s.title,
                description: s.description,
                icon: s.icon,
                fields,
            }
        })
        .collect();

    Ok(results)
}

/// 获取条目字段明文值（用于快速搜索显示明文）
#[tauri::command]
pub fn get_secret_field_values(state: State<'_, DbState>, secret_id: String) -> Result<Vec<FieldPreview>, String> {
    let secret = state.get_secret(&secret_id)?;

    let fields: Vec<FieldPreview> = secret.fields
        .into_iter()
        .map(|(name, value)| FieldPreview { name, value })
        .collect();

    Ok(fields)
}

/// 复制字段值到剪贴板
#[tauri::command]
pub fn copy_field_to_clipboard(
    state: State<'_, DbState>,
    app_handle: tauri::AppHandle,
    secret_id: String,
    field_name: String,
    clear_seconds: u64,
) -> Result<String, String> {
    // 获取条目
    let secret = state.get_secret(&secret_id)?;

    // 字段已经在查询时解密，直接获取
    let value = secret.fields.get(&field_name)
        .ok_or_else(|| format!("字段 '{}' 不存在", field_name))?;

    // 复制到剪贴板
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("无法访问剪贴板: {}", e))?;

    clipboard.set_text(value)
        .map_err(|e| format!("复制失败: {}", e))?;

    // 如果设置了清除时间，启动定时器
    if clear_seconds > 0 {
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(clear_seconds));
            // 清除剪贴板
            if let Ok(mut clipboard) = Clipboard::new() {
                let _ = clipboard.set_text("");
                // 发送事件通知前端
                let _ = app_handle_clone.emit_all("clipboard-cleared", ());
            }
        });
    }

    Ok(format!("已复制 '{}'", field_name))
}

/// 隐藏快速搜索窗口
#[tauri::command]
pub fn hide_quick_search_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_window("quick-search") {
        window.hide().map_err(|e| format!("隐藏窗口失败: {}", e))?;
    }
    Ok(())
}

/// 检查是否有活动会话
#[tauri::command]
pub fn check_active_session() -> bool {
    crypto::is_session_active()
}

/// 设置快速搜索窗口位置
#[tauri::command]
pub fn set_quick_search_position(app_handle: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app_handle.get_window("quick-search") {
        // 使用 LogicalPosition 以匹配 get_screen_size 返回的逻辑尺寸
        let position = tauri::LogicalPosition::new(x, y);
        window.set_position(position).map_err(|e| format!("设置窗口位置失败: {}", e))?;
    }
    Ok(())
}

/// 获取屏幕尺寸
#[tauri::command]
pub fn get_screen_size(app_handle: tauri::AppHandle) -> Result<(f64, f64), String> {
    if let Some(window) = app_handle.get_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            return Ok((size.width as f64 / scale, size.height as f64 / scale));
        }
    }
    Ok((1920.0, 1080.0)) // 默认值
}
