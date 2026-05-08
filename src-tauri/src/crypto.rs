use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, AeadCore, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::Hmac;
use indexmap::IndexMap;
use rand::RngCore;
use sha2::Sha256;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// 当前登录的用户名
static CURRENT_USERNAME: Mutex<Option<String>> = Mutex::new(None);

/// 全局加密密钥（运行时从密钥文件解密得到）
static MASTER_KEY: Mutex<Option<[u8; 32]>> = Mutex::new(None);

/// 获取用户数据目录
fn get_user_data_dir(username: &str) -> PathBuf {
    Path::new("data").join(username)
}

/// 获取用户文件路径
fn get_user_file_path(username: &str, filename: &str) -> PathBuf {
    get_user_data_dir(username).join(filename)
}

/// 文件路径常量（相对于用户目录）
const SALT_FILE: &str = "salt.key";
const MASTER_KEY_FILE: &str = "master.key";
const AUTH_VERIFY_FILE: &str = "auth.verify";
const RECOVERY_KEY_FILE: &str = "recovery.key";
const RECOVERY_SALT_FILE: &str = "recovery_salt.key";

/// 检查用户是否存在
pub fn user_exists(username: &str) -> bool {
    get_user_file_path(username, MASTER_KEY_FILE).exists()
        && get_user_file_path(username, SALT_FILE).exists()
        && get_user_file_path(username, AUTH_VERIFY_FILE).exists()
}

/// 检查用户目录是否存在（可能有部分文件）
fn user_dir_exists(username: &str) -> bool {
    get_user_data_dir(username).exists()
}

/// 清除用户数据目录（用于重建用户或清理残留数据）
pub fn cleanup_user_data(username: &str) -> Result<(), String> {
    let user_dir = get_user_data_dir(username);
    if user_dir.exists() {
        std::fs::remove_dir_all(&user_dir)
            .map_err(|e| format!("清除用户数据失败: {}", e))?;
    }
    // 同时清除内存中的会话状态
    if get_current_username() == Some(username.to_string()) {
        clear_encryption_key();
    }
    Ok(())
}

/// 获取所有已存在的用户名
pub fn get_all_usernames() -> Vec<String> {
    let mut usernames = Vec::new();
    if let Ok(entries) = std::fs::read_dir("data") {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                if let Some(name) = entry.file_name().to_str() {
                    // 检查该目录是否包含有效的用户数据
                    if user_exists(name) {
                        usernames.push(name.to_string());
                    }
                }
            }
        }
    }
    usernames.sort();
    usernames
}

/// 从密码派生密钥（用于加密Master Key）
fn derive_key_from_password(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt, 100_000, &mut key)
        .expect("PBKDF2 derivation failed");
    key
}

/// 从恢复码派生密钥
fn derive_key_from_recovery_code(recovery_code: &str, salt: &[u8]) -> [u8; 32] {
    // 移除格式字符（如 -）
    let clean_code: String = recovery_code.chars().filter(|c| c.is_alphanumeric()).collect();
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(clean_code.to_uppercase().as_bytes(), salt, 100_000, &mut key)
        .expect("PBKDF2 derivation failed");
    key
}

/// 生成随机盐值
fn generate_salt() -> [u8; 32] {
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);
    salt
}

/// 生成随机Master Key
fn generate_master_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}

/// 生成12位随机恢复码（格式：XXXX-XXXX-XXXX）
pub fn generate_recovery_code() -> String {
    // 使用易辨认的字符（排除 0/O, 1/I/L 等易混淆字符）
    const CHARS: &[u8] = b"23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    let mut code = String::with_capacity(14);
    let mut rng = OsRng;

    for i in 0..12 {
        if i > 0 && i % 4 == 0 {
            code.push('-');
        }
        let idx = (rng.next_u32() as usize) % CHARS.len();
        code.push(CHARS[idx] as char);
    }

    code
}

/// 保存文件
fn save_file(path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    std::fs::write(path, data)
        .map_err(|e| format!("保存文件失败: {}", e))
}

/// 读取文件
fn load_file(path: &Path) -> Result<Vec<u8>, String> {
    std::fs::read(path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

/// 检查用户是否已设置主密码
pub fn is_master_password_set(username: &str) -> bool {
    user_exists(username)
}

/// 为用户创建主密码（首次使用）
/// 返回恢复码，用户必须备份
pub fn set_master_password(username: &str, password: &str) -> Result<String, String> {
    // 检查是否已有完整的用户数据
    if is_master_password_set(username) {
        return Err("主密码已设置".to_string());
    }

    // 如果存在残留的用户目录（不完整数据），先清理
    if user_dir_exists(username) {
        cleanup_user_data(username)?;
    }

    // 1. 生成随机盐值
    let salt = generate_salt();

    // 2. 生成随机Master Key
    let master_key = generate_master_key();

    // 3. 从密码派生加密密钥
    let derived_key = derive_key_from_password(password, &salt);

    // 4. 用派生密钥加密Master Key
    let encrypted_master_key = encrypt_value(&BASE64.encode(master_key), &derived_key)?;

    // 5. 生成恢复码
    let recovery_code = generate_recovery_code();

    // 6. 生成恢复码盐值并派生密钥
    let recovery_salt = generate_salt();
    let recovery_key = derive_key_from_recovery_code(&recovery_code, &recovery_salt);

    // 7. 用恢复码密钥加密Master Key
    let encrypted_recovery_master_key = encrypt_value(&BASE64.encode(master_key), &recovery_key)?;

    // 8. 保存所有文件
    save_file(&get_user_file_path(username, SALT_FILE), &salt)?;
    save_file(&get_user_file_path(username, MASTER_KEY_FILE), encrypted_master_key.as_bytes())?;
    save_file(&get_user_file_path(username, RECOVERY_SALT_FILE), &recovery_salt)?;
    save_file(&get_user_file_path(username, RECOVERY_KEY_FILE), encrypted_recovery_master_key.as_bytes())?;

    // 9. 保存验证信息（用于验证密码是否正确）
    let verify_data = "SecretWarehouse_MasterKey_Verify";
    let encrypted_verify = encrypt_value(verify_data, &derived_key)?;
    save_file(&get_user_file_path(username, AUTH_VERIFY_FILE), encrypted_verify.as_bytes())?;

    // 10. 设置当前用户名和全局Master Key
    let mut current_user = CURRENT_USERNAME.lock().map_err(|e| e.to_string())?;
    *current_user = Some(username.to_string());

    let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
    *global_key = Some(master_key);

    Ok(recovery_code)
}

/// 验证用户主密码
pub fn verify_master_password(username: &str, password: &str) -> Result<bool, String> {
    // 1. 读取盐值
    let salt = load_file(&get_user_file_path(username, SALT_FILE))?;

    // 2. 从密码派生密钥
    let derived_key = derive_key_from_password(password, &salt);

    // 3. 尝试解密验证文件
    let encrypted_verify = String::from_utf8(load_file(&get_user_file_path(username, AUTH_VERIFY_FILE))?)
        .map_err(|e| format!("读取验证文件失败: {}", e))?;

    match decrypt_value(&encrypted_verify, &derived_key) {
        Ok(verify_data) if verify_data == "SecretWarehouse_MasterKey_Verify" => {
            // 4. 密码正确，解密Master Key
            let encrypted_master_key = String::from_utf8(load_file(&get_user_file_path(username, MASTER_KEY_FILE))?)
                .map_err(|e| format!("读取密钥文件失败: {}", e))?;

            let master_key_base64 = decrypt_value(&encrypted_master_key, &derived_key)?;
            let master_key_bytes = BASE64.decode(&master_key_base64)
                .map_err(|e| format!("解码Master Key失败: {}", e))?;

            if master_key_bytes.len() != 32 {
                return Err("Master Key长度错误".to_string());
            }

            let mut master_key = [0u8; 32];
            master_key.copy_from_slice(&master_key_bytes);

            // 设置当前用户名和全局Master Key
            let mut current_user = CURRENT_USERNAME.lock().map_err(|e| e.to_string())?;
            *current_user = Some(username.to_string());

            let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
            *global_key = Some(master_key);

            Ok(true)
        }
        _ => Ok(false),
    }
}

/// 验证密码并获取 Master Key（不设置全局状态，用于修改密码）
pub fn verify_and_get_master_key(username: &str, password: &str) -> Result<[u8; 32], String> {
    // 1. 读取盐值
    let salt = load_file(&get_user_file_path(username, SALT_FILE))?;

    // 2. 从密码派生密钥
    let derived_key = derive_key_from_password(password, &salt);

    // 3. 尝试解密验证文件
    let encrypted_verify = String::from_utf8(load_file(&get_user_file_path(username, AUTH_VERIFY_FILE))?)
        .map_err(|e| format!("读取验证文件失败: {}", e))?;

    match decrypt_value(&encrypted_verify, &derived_key) {
        Ok(verify_data) if verify_data == "SecretWarehouse_MasterKey_Verify" => {
            // 4. 密码正确，解密Master Key
            let encrypted_master_key = String::from_utf8(load_file(&get_user_file_path(username, MASTER_KEY_FILE))?)
                .map_err(|e| format!("读取密钥文件失败: {}", e))?;

            let master_key_base64 = decrypt_value(&encrypted_master_key, &derived_key)?;
            let master_key_bytes = BASE64.decode(&master_key_base64)
                .map_err(|e| format!("解码Master Key失败: {}", e))?;

            if master_key_bytes.len() != 32 {
                return Err("Master Key长度错误".to_string());
            }

            let mut master_key = [0u8; 32];
            master_key.copy_from_slice(&master_key_bytes);

            Ok(master_key)
        }
        _ => Err("密码错误".to_string()),
    }
}

/// 使用恢复码解锁并重置密码
/// 返回 Master Key 以便设置新密码
pub fn unlock_with_recovery_code(username: &str, recovery_code: &str) -> Result<[u8; 32], String> {
    // 1. 读取恢复码盐值
    let recovery_salt = load_file(&get_user_file_path(username, RECOVERY_SALT_FILE))?;

    // 2. 从恢复码派生密钥
    let recovery_key = derive_key_from_recovery_code(recovery_code, &recovery_salt);

    // 3. 尝试解密恢复密钥文件
    let encrypted_recovery_key = String::from_utf8(load_file(&get_user_file_path(username, RECOVERY_KEY_FILE))?)
        .map_err(|e| format!("读取恢复密钥文件失败: {}", e))?;

    match decrypt_value(&encrypted_recovery_key, &recovery_key) {
        Ok(master_key_base64) => {
            let master_key_bytes = BASE64.decode(&master_key_base64)
                .map_err(|e| format!("解码Master Key失败: {}", e))?;

            if master_key_bytes.len() != 32 {
                return Err("Master Key长度错误".to_string());
            }

            let mut master_key = [0u8; 32];
            master_key.copy_from_slice(&master_key_bytes);

            Ok(master_key)
        }
        Err(_) => Err("恢复码错误".to_string()),
    }
}

/// 使用Master Key设置新密码
pub fn reset_password_with_master_key(username: &str, master_key: [u8; 32], new_password: &str) -> Result<(), String> {
    // 1. 生成新的盐值
    let salt = generate_salt();

    // 2. 从新密码派生密钥
    let derived_key = derive_key_from_password(new_password, &salt);

    // 3. 用新派生密钥加密Master Key
    let encrypted_master_key = encrypt_value(&BASE64.encode(master_key), &derived_key)?;

    // 4. 生成新的恢复码
    let recovery_code = generate_recovery_code();
    let recovery_salt = generate_salt();
    let recovery_key = derive_key_from_recovery_code(&recovery_code, &recovery_salt);
    let encrypted_recovery_master_key = encrypt_value(&BASE64.encode(master_key), &recovery_key)?;

    // 5. 更新验证信息
    let verify_data = "SecretWarehouse_MasterKey_Verify";
    let encrypted_verify = encrypt_value(verify_data, &derived_key)?;

    // 6. 保存所有文件
    save_file(&get_user_file_path(username, SALT_FILE), &salt)?;
    save_file(&get_user_file_path(username, MASTER_KEY_FILE), encrypted_master_key.as_bytes())?;
    save_file(&get_user_file_path(username, RECOVERY_SALT_FILE), &recovery_salt)?;
    save_file(&get_user_file_path(username, RECOVERY_KEY_FILE), encrypted_recovery_master_key.as_bytes())?;
    save_file(&get_user_file_path(username, AUTH_VERIFY_FILE), encrypted_verify.as_bytes())?;

    // 7. 设置当前用户名和全局Master Key
    let mut current_user = CURRENT_USERNAME.lock().map_err(|e| e.to_string())?;
    *current_user = Some(username.to_string());

    let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
    *global_key = Some(master_key);

    Ok(())
}

/// 获取当前用户名
pub fn get_current_username() -> Option<String> {
    CURRENT_USERNAME.lock().ok()?.clone()
}

/// 获取当前Master Key
pub fn get_encryption_key() -> [u8; 32] {
    let global_key = MASTER_KEY.lock().expect("获取密钥锁失败");
    global_key.expect("Master Key未初始化，请先验证主密码")
}

/// 检查是否已初始化Master Key
pub fn is_session_active() -> bool {
    MASTER_KEY.lock().map(|key| key.is_some()).unwrap_or(false)
}

/// 清除内存中的密钥（退出时调用）
pub fn clear_encryption_key() {
    let mut current_user = CURRENT_USERNAME.lock().expect("获取用户名锁失败");
    *current_user = None;

    let mut global_key = MASTER_KEY.lock().expect("获取密钥锁失败");
    *global_key = None;
}

/// 加密单个值，返回 base64(nonce + ciphertext)
pub fn encrypt_value(plaintext: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    // 拼接 nonce + ciphertext，然后 base64 编码
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(combined))
}

/// 解密单个值，输入 base64(nonce + ciphertext)
pub fn decrypt_value(encoded: &str, key: &[u8; 32]) -> Result<String, String> {
    let combined = BASE64
        .decode(encoded)
        .map_err(|e| format!("base64 解码失败: {}", e))?;

    if combined.len() < 12 {
        return Err("密文数据太短".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new(key.into());

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("解密失败: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 解码失败: {}", e))
}

/// 加密整个 IndexMap<String, String>
pub fn encrypt_fields(
    fields: &IndexMap<String, String>,
    key: &[u8; 32],
) -> Result<String, String> {
    let json = serde_json::to_string(fields).map_err(|e| e.to_string())?;
    encrypt_value(&json, key)
}

/// 解密到 IndexMap<String, String>
pub fn decrypt_fields(
    encrypted: &str,
    key: &[u8; 32],
) -> Result<IndexMap<String, String>, String> {
    let json = decrypt_value(encrypted, key)?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

/// 检查指定用户是否有恢复密钥文件
pub fn has_recovery_key(username: &str) -> bool {
    get_user_file_path(username, RECOVERY_KEY_FILE).exists()
        && get_user_file_path(username, RECOVERY_SALT_FILE).exists()
}

// ============ 密保问题相关 ============

/// 密保问题文件路径常量
const SQ_QUESTIONS_FILE: &str = "sq_questions.json";  // 明文存储问题
const SQ_ENCRYPTED_KEY_FILE: &str = "sq_encrypted.key";  // 加密的 Master Key
const SQ_SALT_FILE: &str = "sq_salt.key";  // 盐值

/// 密保问题数据结构（明文存储）
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SecurityQuestionsData {
    pub questions: Vec<String>,
}

/// 标准化答案：转小写、去除首尾空格
fn normalize_answer(answer: &str) -> String {
    answer.trim().to_lowercase()
}

/// 从密保答案派生密钥
fn derive_key_from_security_answers(answers: &[String], salt: &[u8]) -> [u8; 32] {
    // 组合所有答案，用 | 分隔
    let combined = answers.join("|");
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(combined.as_bytes(), salt, 100_000, &mut key)
        .expect("PBKDF2 derivation failed");
    key
}

/// 检查用户是否设置了密保问题
pub fn has_security_questions(username: &str) -> bool {
    get_user_file_path(username, SQ_QUESTIONS_FILE).exists()
        && get_user_file_path(username, SQ_ENCRYPTED_KEY_FILE).exists()
        && get_user_file_path(username, SQ_SALT_FILE).exists()
}

/// 设置密保问题（登录后调用，需要 Master Key）
pub fn set_security_questions(
    username: &str,
    questions: Vec<String>,
    answers: Vec<String>,
) -> Result<(), String> {
    if questions.is_empty() || questions.len() != answers.len() {
        return Err("问题和答案数量不匹配".to_string());
    }

    if questions.len() < 2 {
        return Err("至少需要设置2个密保问题".to_string());
    }

    // 获取当前 Master Key
    let master_key = get_encryption_key();

    // 构建问题数据（只存储问题，不存储答案）
    let questions_data = SecurityQuestionsData {
        questions,
    };

    // 问题明文存储（忘记密码时需要查看）
    let questions_json = serde_json::to_string(&questions_data)
        .map_err(|e| format!("序列化密保问题失败: {}", e))?;

    // 生成盐值
    let salt = generate_salt();

    // 标准化答案并派生密钥
    let normalized_answers: Vec<String> = answers.iter().map(|a| normalize_answer(a)).collect();
    let derived_key = derive_key_from_security_answers(&normalized_answers, &salt);

    // 用派生密钥加密 Master Key
    let encrypted_master_key = encrypt_value(&BASE64.encode(master_key), &derived_key)?;

    // 保存文件
    save_file(&get_user_file_path(username, SQ_QUESTIONS_FILE), questions_json.as_bytes())?;
    save_file(&get_user_file_path(username, SQ_ENCRYPTED_KEY_FILE), encrypted_master_key.as_bytes())?;
    save_file(&get_user_file_path(username, SQ_SALT_FILE), &salt)?;

    Ok(())
}

/// 获取密保问题列表（忘记密码时调用，问题明文存储可直接读取）
pub fn get_security_questions(username: &str) -> Result<Vec<String>, String> {
    if !has_security_questions(username) {
        return Err("未设置密保问题".to_string());
    }

    // 读取问题数据（明文）
    let questions_json = String::from_utf8(load_file(&get_user_file_path(username, SQ_QUESTIONS_FILE))?)
        .map_err(|e| format!("读取密保问题文件失败: {}", e))?;

    let questions_data: SecurityQuestionsData = serde_json::from_str(&questions_json)
        .map_err(|e| format!("解析密保问题失败: {}", e))?;

    Ok(questions_data.questions)
}

/// 验证密保答案并获取 Master Key
pub fn verify_security_questions(
    username: &str,
    answers: Vec<String>,
) -> Result<[u8; 32], String> {
    if !has_security_questions(username) {
        return Err("未设置密保问题".to_string());
    }

    // 读取盐值
    let salt = load_file(&get_user_file_path(username, SQ_SALT_FILE))?;

    // 标准化答案
    let normalized_answers: Vec<String> = answers.iter().map(|a| normalize_answer(a)).collect();

    // 派生密钥
    let derived_key = derive_key_from_security_answers(&normalized_answers, &salt);

    // 尝试解密 Master Key
    let encrypted_master_key = String::from_utf8(load_file(&get_user_file_path(username, SQ_ENCRYPTED_KEY_FILE))?)
        .map_err(|e| format!("读取密保密钥文件失败: {}", e))?;

    match decrypt_value(&encrypted_master_key, &derived_key) {
        Ok(master_key_base64) => {
            let master_key_bytes = BASE64.decode(&master_key_base64)
                .map_err(|e| format!("解码Master Key失败: {}", e))?;

            if master_key_bytes.len() != 32 {
                return Err("Master Key长度错误".to_string());
            }

            let mut master_key = [0u8; 32];
            master_key.copy_from_slice(&master_key_bytes);

            // 设置当前会话
            let mut current_user = CURRENT_USERNAME.lock().map_err(|e| e.to_string())?;
            *current_user = Some(username.to_string());

            let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
            *global_key = Some(master_key);

            Ok(master_key)
        }
        Err(_) => Err("密保答案错误".to_string()),
    }
}

/// 使用密保验证后的 Master Key 重置密码
pub fn reset_password_with_security_questions(
    username: &str,
    master_key: [u8; 32],
    new_password: &str,
) -> Result<(), String> {
    // 复用现有的密码重置逻辑
    reset_password_with_master_key(username, master_key, new_password)
}

/// 删除密保问题
pub fn delete_security_questions(username: &str) -> Result<(), String> {
    let files = [
        SQ_QUESTIONS_FILE,
        SQ_ENCRYPTED_KEY_FILE,
        SQ_SALT_FILE,
    ];

    for file in &files {
        let path = get_user_file_path(username, file);
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| format!("删除文件 {} 失败: {}", file, e))?;
        }
    }

    Ok(())
}

/// 获取数据库路径
pub fn get_db_path(username: &str) -> PathBuf {
    get_user_data_dir(username).join(format!("data_{}.db", username))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = [0u8; 32]; // 测试用密钥
        let plaintext = "hello world";
        let encrypted = encrypt_value(plaintext, &key).unwrap();
        let decrypted = decrypt_value(&encrypted, &key).unwrap();
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_fields() {
        let key = [0u8; 32]; // 测试用密钥
        let mut fields = IndexMap::new();
        fields.insert("password".to_string(), "super_secret_123".to_string());
        fields.insert("username".to_string(), "admin".to_string());

        let encrypted = encrypt_fields(&fields, &key).unwrap();
        let decrypted = decrypt_fields(&encrypted, &key).unwrap();
        assert_eq!(fields, decrypted);
    }

    #[test]
    fn test_recovery_code() {
        let code = generate_recovery_code();
        assert_eq!(code.len(), 14); // XXXX-XXXX-XXXX
        assert!(code.contains('-'));
    }
}
