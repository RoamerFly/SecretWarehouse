use crate::crypto;
use crate::models::*;
use rusqlite::{params, Connection};
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub username: Mutex<Option<String>>,
}

impl DbState {
    pub fn new() -> Result<Self, String> {
        Ok(DbState {
            conn: Mutex::new(Connection::open_in_memory()
                .map_err(|e| format!("创建内存数据库失败: {}", e))?),
            username: Mutex::new(None),
        })
    }

    /// 为指定用户初始化数据库连接
    pub fn init_for_user(&self, username: &str) -> Result<(), String> {
        let db_path = crypto::get_db_path(username);

        // 确保用户数据目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("创建用户数据目录失败: {}", e))?;
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("打开数据库失败: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS secrets (
                id TEXT PRIMARY KEY,
                icon TEXT NOT NULL DEFAULT 'key',
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                encrypted_fields TEXT NOT NULL,
                tags TEXT DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                favorite INTEGER DEFAULT 0
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS secrets_fts USING fts5(
                title,
                content='secrets',
                content_rowid='rowid'
            );

            CREATE TRIGGER IF NOT EXISTS secrets_ai AFTER INSERT ON secrets BEGIN
                INSERT INTO secrets_fts(rowid, title) VALUES (new.rowid, new.title);
            END;

            CREATE TRIGGER IF NOT EXISTS secrets_ad AFTER DELETE ON secrets BEGIN
                INSERT INTO secrets_fts(secrets_fts, rowid, title) VALUES ('delete', old.rowid, old.title);
            END;

            CREATE TRIGGER IF NOT EXISTS secrets_au AFTER UPDATE ON secrets BEGIN
                INSERT INTO secrets_fts(secrets_fts, rowid, title) VALUES ('delete', old.rowid, old.title);
                INSERT INTO secrets_fts(rowid, title) VALUES (new.rowid, new.title);
            END;

            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                fields TEXT NOT NULL DEFAULT '[]',
                tags TEXT DEFAULT '[]',
                icon TEXT NOT NULL DEFAULT 'key',
                created_at INTEGER NOT NULL
            );"
        ).map_err(|e| format!("创建表失败: {}", e))?;

        // 添加 description 列（如果不存在）
        let _ = conn.execute_batch(
            "ALTER TABLE secrets ADD COLUMN description TEXT DEFAULT '';"
        );

        // 添加 sensitive_fields 列（如果不存在）
        let _ = conn.execute_batch(
            "ALTER TABLE secrets ADD COLUMN sensitive_fields TEXT DEFAULT '[]';"
        );

        // 更新连接和用户名
        let mut state_conn = self.conn.lock().map_err(|e| e.to_string())?;
        *state_conn = conn;

        let mut state_username = self.username.lock().map_err(|e| e.to_string())?;
        *state_username = Some(username.to_string());

        Ok(())
    }

    pub fn create_secret(&self, req: CreateSecretRequest) -> Result<SecretEntry, String> {
        let key = crypto::get_encryption_key();
        let encrypted_fields = crypto::encrypt_fields(&req.fields, &key)?;
        let now = chrono::Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_default();
        let sensitive_fields_json = serde_json::to_string(&req.sensitive_fields).unwrap_or_default();

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO secrets (id, icon, title, description, encrypted_fields, sensitive_fields, tags, created_at, updated_at, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)",
            params![id, req.icon, req.title, req.description, encrypted_fields, sensitive_fields_json, tags_json, now, now],
        ).map_err(|e| format!("插入失败: {}", e))?;

        Ok(SecretEntry {
            id,
            icon: req.icon,
            title: req.title,
            description: req.description,
            fields: req.fields,
            sensitive_fields: req.sensitive_fields,
            tags: req.tags,
            created_at: now,
            updated_at: now,
            favorite: false,
        })
    }

    pub fn get_secret(&self, id: &str) -> Result<SecretEntry, String> {
        let key = crypto::get_encryption_key();
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT id, icon, title, description, encrypted_fields, sensitive_fields, tags, created_at, updated_at, favorite FROM secrets WHERE id = ?1",
            params![id],
            |row| {
                let id: String = row.get(0)?;
                let icon: String = row.get(1)?;
                let title: String = row.get(2)?;
                let description: String = row.get(3).unwrap_or_default();
                let encrypted_fields: String = row.get(4)?;
                let sensitive_fields_json: String = row.get(5).unwrap_or_else(|_| "[]".to_string());
                let tags_json: String = row.get(6)?;
                let created_at: i64 = row.get(7)?;
                let updated_at: i64 = row.get(8)?;
                let favorite: bool = row.get::<_, i64>(9)? != 0;

                let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                    .unwrap_or_else(|e| {
                        eprintln!("解密失败 (id: {}): {}", id, e);
                        Default::default()
                    });
                let sensitive_fields: Vec<String> = serde_json::from_str(&sensitive_fields_json).unwrap_or_default();
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                Ok(SecretEntry {
                    id,
                    icon,
                    title,
                    description,
                    fields,
                    sensitive_fields,
                    tags,
                    created_at,
                    updated_at,
                    favorite,
                })
            },
        ).map_err(|e| format!("查询失败: {}", e))
    }

    pub fn list_secrets(&self, req: ListSecretsRequest) -> Result<Vec<SecretEntry>, String> {
        let key = crypto::get_encryption_key();
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut query = String::from(
            "SELECT id, icon, title, description, encrypted_fields, sensitive_fields, tags, created_at, updated_at, favorite FROM secrets WHERE 1=1",
        );
        let mut params_vec: Vec<String> = Vec::new();

        // 按标签筛选 - 使用 JSON LIKE 查询
        if let Some(ref tag) = req.tag {
            query.push_str(" AND tags LIKE ?");
            params_vec.push(format!("%\"{}\"%", tag));
        }
        if let Some(fav) = req.favorite {
            query.push_str(" AND favorite = ?");
            params_vec.push(if fav { "1".to_string() } else { "0".to_string() });
        }

        query.push_str(" ORDER BY updated_at DESC");

        if let Some(limit) = req.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }
        if let Some(offset) = req.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }

        let params_ref: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params_ref.as_slice(), |row| {
                let id: String = row.get(0)?;
                let icon: String = row.get(1)?;
                let title: String = row.get(2)?;
                let description: String = row.get(3).unwrap_or_default();
                let encrypted_fields: String = row.get(4)?;
                let sensitive_fields_json: String = row.get(5).unwrap_or_else(|_| "[]".to_string());
                let tags_json: String = row.get(6)?;
                let created_at: i64 = row.get(7)?;
                let updated_at: i64 = row.get(8)?;
                let favorite: bool = row.get::<_, i64>(9)? != 0;

                let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                    .unwrap_or_else(|e| {
                        eprintln!("解密失败 (id: {}): {}", id, e);
                        Default::default()
                    });
                let sensitive_fields: Vec<String> = serde_json::from_str(&sensitive_fields_json).unwrap_or_default();
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                Ok(SecretEntry {
                    id,
                    icon,
                    title,
                    description,
                    fields,
                    sensitive_fields,
                    tags,
                    created_at,
                    updated_at,
                    favorite,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }

    pub fn get_total_count(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM secrets",
            [],
            |row| row.get(0),
        ).map_err(|e| format!("查询总数失败: {}", e))?;
        Ok(count)
    }

    pub fn get_favorites_count(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM secrets WHERE favorite = 1",
            [],
            |row| row.get(0),
        ).map_err(|e| format!("查询收藏数量失败: {}", e))?;
        Ok(count)
    }

    pub fn update_secret(&self, req: UpdateSecretRequest) -> Result<SecretEntry, String> {
        let key = crypto::get_encryption_key();

        // 先获取现有条目（在获取锁之前）
        let existing = self.get_secret(&req.id)?;

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();

        let title = req.title.unwrap_or(existing.title);
        let description = req.description.unwrap_or(existing.description);
        let fields = req.fields.unwrap_or(existing.fields);
        let sensitive_fields = req.sensitive_fields.unwrap_or(existing.sensitive_fields);
        let tags = req.tags.unwrap_or(existing.tags);
        let icon = req.icon.unwrap_or(existing.icon);
        let favorite = req.favorite.unwrap_or(existing.favorite);

        let encrypted_fields = crypto::encrypt_fields(&fields, &key)?;
        let sensitive_fields_json = serde_json::to_string(&sensitive_fields).unwrap_or_default();
        let tags_json = serde_json::to_string(&tags).unwrap_or_default();

        conn.execute(
            "UPDATE secrets SET title = ?1, description = ?2, encrypted_fields = ?3, sensitive_fields = ?4, tags = ?5, icon = ?6, updated_at = ?7, favorite = ?8 WHERE id = ?9",
            params![title, description, encrypted_fields, sensitive_fields_json, tags_json, icon, now, if favorite { 1 } else { 0 }, req.id],
        ).map_err(|e| format!("更新失败: {}", e))?;

        Ok(SecretEntry {
            id: req.id,
            icon,
            title,
            description,
            fields,
            sensitive_fields,
            tags,
            created_at: existing.created_at,
            updated_at: now,
            favorite,
        })
    }

    pub fn delete_secret(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let affected = conn
            .execute("DELETE FROM secrets WHERE id = ?1", params![id])
            .map_err(|e| format!("删除失败: {}", e))?;
        Ok(affected > 0)
    }

    pub fn get_all_tags(&self) -> Result<Vec<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare("SELECT tags FROM secrets")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            let tags_json: String = row.get(0)?;
            Ok(tags_json)
        }).map_err(|e| e.to_string())?;

        let mut all_tags: Vec<String> = Vec::new();
        for row in rows {
            let tags_json = row.map_err(|e| e.to_string())?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            for tag in tags {
                if !all_tags.contains(&tag) {
                    all_tags.push(tag);
                }
            }
        }

        all_tags.sort();
        Ok(all_tags)
    }

    pub fn get_tag_counts(&self) -> Result<std::collections::HashMap<String, i32>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare("SELECT tags FROM secrets")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            let tags_json: String = row.get(0)?;
            Ok(tags_json)
        }).map_err(|e| e.to_string())?;

        let mut tag_counts: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
        for row in rows {
            let tags_json = row.map_err(|e| e.to_string())?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            for tag in tags {
                *tag_counts.entry(tag).or_insert(0) += 1;
            }
        }

        Ok(tag_counts)
    }

    pub fn search_secrets(&self, query: &str) -> Result<Vec<SecretEntry>, String> {
        let key = crypto::get_encryption_key();
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // 获取所有记录，在 Rust 中进行模糊匹配
        // 因为字段是加密的，无法在 SQL 中搜索
        let sql = "
            SELECT id, icon, title, description, encrypted_fields, sensitive_fields, tags, created_at, updated_at, favorite
            FROM secrets
            ORDER BY updated_at DESC
        ";

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let icon: String = row.get(1)?;
            let title: String = row.get(2)?;
            let description: String = row.get(3).unwrap_or_default();
            let encrypted_fields: String = row.get(4)?;
            let sensitive_fields_json: String = row.get(5).unwrap_or_else(|_| "[]".to_string());
            let tags_json: String = row.get(6)?;
            let created_at: i64 = row.get(7)?;
            let updated_at: i64 = row.get(8)?;
            let favorite: bool = row.get::<_, i64>(9)? != 0;

            let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                .unwrap_or_else(|e| {
                    eprintln!("解密失败 (id: {}): {}", id, e);
                    Default::default()
                });
            let sensitive_fields: Vec<String> = serde_json::from_str(&sensitive_fields_json).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(SecretEntry {
                id,
                icon,
                title,
                description,
                fields,
                sensitive_fields,
                tags,
                created_at,
                updated_at,
                favorite,
            })
        }).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        for row in rows {
            let entry = row.map_err(|e| e.to_string())?;

            // 检查标题
            if entry.title.to_lowercase().contains(&query_lower) {
                results.push(entry);
                continue;
            }

            // 检查描述
            if entry.description.to_lowercase().contains(&query_lower) {
                results.push(entry);
                continue;
            }

            // 检查标签
            if entry.tags.iter().any(|t| t.to_lowercase().contains(&query_lower)) {
                results.push(entry);
                continue;
            }

            // 检查字段（键和值）
            if entry.fields.iter().any(|(k, v)| {
                k.to_lowercase().contains(&query_lower) || v.to_lowercase().contains(&query_lower)
            }) {
                results.push(entry);
                continue;
            }
        }

        Ok(results)
    }

    pub fn delete_secrets(&self, ids: &[String]) -> Result<usize, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut count = 0;
        for id in ids {
            let affected = conn.execute("DELETE FROM secrets WHERE id = ?1", params![id])
                .map_err(|e| format!("删除失败: {}", e))?;
            count += affected;
        }
        Ok(count)
    }

    // 模板相关方法
    pub fn create_template(&self, req: CreateTemplateRequest) -> Result<Template, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();
        let fields_json = serde_json::to_string(&req.fields).unwrap_or_default();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_default();

        conn.execute(
            "INSERT INTO templates (id, name, description, fields, tags, icon, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, req.name, req.description, fields_json, tags_json, req.icon, now],
        ).map_err(|e| format!("插入模板失败: {}", e))?;

        Ok(Template {
            id,
            name: req.name,
            description: req.description,
            fields: req.fields,
            tags: req.tags,
            icon: req.icon,
            created_at: now,
        })
    }

    pub fn get_template(&self, id: &str) -> Result<Template, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT id, name, description, fields, tags, icon, created_at FROM templates WHERE id = ?1",
            params![id],
            |row| {
                let id: String = row.get(0)?;
                let name: String = row.get(1)?;
                let description: String = row.get(2).unwrap_or_default();
                let fields_json: String = row.get(3)?;
                let tags_json: String = row.get(4)?;
                let icon: String = row.get(5)?;
                let created_at: i64 = row.get(6)?;

                let fields: Vec<String> = serde_json::from_str(&fields_json).unwrap_or_default();
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                Ok(Template {
                    id,
                    name,
                    description,
                    fields,
                    tags,
                    icon,
                    created_at,
                })
            },
        ).map_err(|e| format!("查询模板失败: {}", e))
    }

    pub fn list_templates(&self) -> Result<Vec<Template>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare(
            "SELECT id, name, description, fields, tags, icon, created_at FROM templates ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let description: String = row.get(2).unwrap_or_default();
            let fields_json: String = row.get(3)?;
            let tags_json: String = row.get(4)?;
            let icon: String = row.get(5)?;
            let created_at: i64 = row.get(6)?;

            let fields: Vec<String> = serde_json::from_str(&fields_json).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(Template {
                id,
                name,
                description,
                fields,
                tags,
                icon,
                created_at,
            })
        }).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }

    pub fn update_template(&self, req: UpdateTemplateRequest) -> Result<Template, String> {
        let existing = self.get_template(&req.id)?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let name = req.name.unwrap_or(existing.name);
        let description = req.description.unwrap_or(existing.description);
        let fields = req.fields.unwrap_or(existing.fields);
        let tags = req.tags.unwrap_or(existing.tags);
        let icon = req.icon.unwrap_or(existing.icon);

        let fields_json = serde_json::to_string(&fields).unwrap_or_default();
        let tags_json = serde_json::to_string(&tags).unwrap_or_default();

        conn.execute(
            "UPDATE templates SET name = ?1, description = ?2, fields = ?3, tags = ?4, icon = ?5 WHERE id = ?6",
            params![name, description, fields_json, tags_json, icon, req.id],
        ).map_err(|e| format!("更新模板失败: {}", e))?;

        Ok(Template {
            id: req.id,
            name,
            description,
            fields,
            tags,
            icon,
            created_at: existing.created_at,
        })
    }

    pub fn delete_template(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let affected = conn.execute("DELETE FROM templates WHERE id = ?1", params![id])
            .map_err(|e| format!("删除模板失败: {}", e))?;
        Ok(affected > 0)
    }
}
