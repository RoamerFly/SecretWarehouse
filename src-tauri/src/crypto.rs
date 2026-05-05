use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, AeadCore, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::Hmac;
use indexmap::IndexMap;
use rand::RngCore;
use sha2::{Sha256, Digest};
use std::sync::Mutex;

/// 全局加密密钥（运行时从密钥文件解密得到）
static MASTER_KEY: Mutex<Option<[u8; 32]>> = Mutex::new(None);

/// 文件路径
const SALT_FILE: &str = "data/salt.key";
const MASTER_KEY_FILE: &str = "data/master.key";
const AUTH_VERIFY_FILE: &str = "data/auth.verify";

/// 检查是否已设置主密码
pub fn is_master_password_set() -> bool {
    std::path::Path::new(MASTER_KEY_FILE).exists()
        && std::path::Path::new(SALT_FILE).exists()
        && std::path::Path::new(AUTH_VERIFY_FILE).exists()
}

/// 从密码派生密钥（用于加密Master Key）
fn derive_key_from_password(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt, 100_000, &mut key)
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

/// 保存文件
fn save_file(path: &str, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    std::fs::write(path, data)
        .map_err(|e| format!("保存文件失败: {}", e))
}

/// 读取文件
fn load_file(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

/// 设置主密码（首次使用）
/// 1. 生成随机盐值
/// 2. 生成随机Master Key
/// 3. 从密码派生加密密钥
/// 4. 用派生密钥加密Master Key，保存到master.key
/// 5. 保存盐值到salt.key
/// 6. 保存验证信息到auth.verify
pub fn set_master_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("密码长度至少8位".to_string());
    }
    if is_master_password_set() {
        return Err("主密码已设置".to_string());
    }

    // 1. 生成随机盐值
    let salt = generate_salt();

    // 2. 生成随机Master Key
    let master_key = generate_master_key();

    // 3. 从密码派生加密密钥
    let derived_key = derive_key_from_password(password, &salt);

    // 4. 用派生密钥加密Master Key
    let encrypted_master_key = encrypt_value(&BASE64.encode(master_key), &derived_key)?;

    // 5. 保存盐值
    save_file(SALT_FILE, &salt)?;

    // 6. 保存加密的Master Key
    save_file(MASTER_KEY_FILE, encrypted_master_key.as_bytes())?;

    // 7. 保存验证信息（用于验证密码是否正确）
    let verify_data = "SecretWarehouse_MasterKey_Verify";
    let encrypted_verify = encrypt_value(verify_data, &derived_key)?;
    save_file(AUTH_VERIFY_FILE, encrypted_verify.as_bytes())?;

    // 8. 设置全局Master Key
    let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
    *global_key = Some(master_key);

    Ok(())
}

/// 验证主密码
/// 1. 读取盐值
/// 2. 从密码派生密钥
/// 3. 尝试解密auth.verify验证密码是否正确
/// 4. 如果正确，解密master.key并设置到全局变量
pub fn verify_master_password(password: &str) -> Result<bool, String> {
    // 1. 读取盐值
    let salt = load_file(SALT_FILE)?;

    // 2. 从密码派生密钥
    let derived_key = derive_key_from_password(password, &salt);

    // 3. 尝试解密验证文件
    let encrypted_verify = String::from_utf8(load_file(AUTH_VERIFY_FILE)?)
        .map_err(|e| format!("读取验证文件失败: {}", e))?;

    match decrypt_value(&encrypted_verify, &derived_key) {
        Ok(verify_data) if verify_data == "SecretWarehouse_MasterKey_Verify" => {
            // 4. 密码正确，解密Master Key
            let encrypted_master_key = String::from_utf8(load_file(MASTER_KEY_FILE)?)
                .map_err(|e| format!("读取密钥文件失败: {}", e))?;

            let master_key_base64 = decrypt_value(&encrypted_master_key, &derived_key)?;
            let master_key_bytes = BASE64.decode(&master_key_base64)
                .map_err(|e| format!("解码Master Key失败: {}", e))?;

            if master_key_bytes.len() != 32 {
                return Err("Master Key长度错误".to_string());
            }

            let mut master_key = [0u8; 32];
            master_key.copy_from_slice(&master_key_bytes);

            // 设置全局Master Key
            let mut global_key = MASTER_KEY.lock().map_err(|e| e.to_string())?;
            *global_key = Some(master_key);

            Ok(true)
        }
        _ => Ok(false),
    }
}

/// 获取当前Master Key
pub fn get_encryption_key() -> [u8; 32] {
    let global_key = MASTER_KEY.lock().expect("获取密钥锁失败");
    global_key.expect("Master Key未初始化，请先验证主密码")
}

/// 清除内存中的密钥（退出时调用）
pub fn clear_encryption_key() {
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
}
