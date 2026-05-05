use crate::db::DbState;
use crate::models::*;
use indexmap::IndexMap;
use rand::Rng;
use tauri::State;

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
pub fn generate_test_data(state: State<'_, DbState>) -> Result<i32, String> {
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

    let mut count = 0;

    for i in 0..100 {
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
            count += 1;
        }
    }

    Ok(count)
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
pub fn export_database(path: String) -> Result<(), String> {
    std::fs::copy("secret_warehouse.db", &path)
        .map_err(|e| format!("导出数据库失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn import_database(state: State<'_, DbState>, path: String) -> Result<(), String> {
    // Verify the import file is a valid SQLite database
    let test_conn = rusqlite::Connection::open(&path)
        .map_err(|e| format!("无法打开导入文件: {}", e))?;

    // Check if it has the expected tables
    let table_exists: bool = test_conn.query_row(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='secrets'",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("验证数据库格式失败: {}", e))?;

    if !table_exists {
        return Err("导入文件不是有效的数据库格式".to_string());
    }
    drop(test_conn);

    // Close current connection by locking the mutex
    let mut conn = state.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;

    // Copy the imported file over the current database
    *conn = rusqlite::Connection::open_in_memory()
        .map_err(|e| format!("创建临时连接失败: {}", e))?;

    // Copy the imported file
    std::fs::copy(&path, "secret_warehouse.db")
        .map_err(|e| format!("复制数据库文件失败: {}", e))?;

    // Reopen the database
    *conn = rusqlite::Connection::open("secret_warehouse.db")
        .map_err(|e| format!("重新打开数据库失败: {}", e))?;

    Ok(())
}
