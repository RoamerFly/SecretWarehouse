use crate::db::DbState;
use crate::models::*;
use rand::Rng;
use tauri::State;

#[tauri::command]
pub fn create_secret(
    state: State<'_, DbState>,
    title: String,
    fields: std::collections::HashMap<String, String>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
) -> Result<SecretEntry, String> {
    let req = CreateSecretRequest {
        title,
        fields,
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
    fields: Option<std::collections::HashMap<String, String>>,
    tags: Option<Vec<String>>,
    icon: Option<String>,
    favorite: Option<bool>,
) -> Result<SecretEntry, String> {
    let req = UpdateSecretRequest {
        id,
        title,
        fields,
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
