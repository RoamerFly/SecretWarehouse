use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretEntry {
    pub id: String,
    pub title: String,
    pub fields: HashMap<String, String>,
    pub tags: Vec<String>,
    pub icon: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub favorite: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateSecretRequest {
    pub title: String,
    pub fields: HashMap<String, String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_icon")]
    pub icon: String,
}

fn default_icon() -> String {
    "key".to_string()
}

#[derive(Debug, Deserialize)]
pub struct UpdateSecretRequest {
    pub id: String,
    pub title: Option<String>,
    pub fields: Option<HashMap<String, String>>,
    pub tags: Option<Vec<String>>,
    pub icon: Option<String>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListSecretsRequest {
    pub tag: Option<String>,
    pub favorite: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub query: String,
}

#[derive(Debug, Deserialize)]
pub struct GeneratePasswordRequest {
    pub length: Option<usize>,
    pub use_upper: Option<bool>,
    pub use_lower: Option<bool>,
    pub use_digits: Option<bool>,
    pub use_symbols: Option<bool>,
}
