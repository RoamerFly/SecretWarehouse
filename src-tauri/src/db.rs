use crate::crypto;
use crate::models::*;
use rusqlite::{params, Connection};
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new() -> Result<Self, String> {
        let conn = Connection::open("secret_warehouse.db")
            .map_err(|e| format!("打开数据库失败: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS secrets (
                id TEXT PRIMARY KEY,
                icon TEXT NOT NULL DEFAULT 'key',
                title TEXT NOT NULL,
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
            END;"
        ).map_err(|e| format!("创建表失败: {}", e))?;

        Ok(DbState {
            conn: Mutex::new(conn),
        })
    }

    pub fn create_secret(&self, req: CreateSecretRequest) -> Result<SecretEntry, String> {
        let key = crypto::get_encryption_key();
        let encrypted_fields = crypto::encrypt_fields(&req.fields, &key)?;
        let now = chrono::Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_default();

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO secrets (id, icon, title, encrypted_fields, tags, created_at, updated_at, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)",
            params![id, req.icon, req.title, encrypted_fields, tags_json, now, now],
        ).map_err(|e| format!("插入失败: {}", e))?;

        Ok(SecretEntry {
            id,
            icon: req.icon,
            title: req.title,
            fields: req.fields,
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
            "SELECT id, icon, title, encrypted_fields, tags, created_at, updated_at, favorite FROM secrets WHERE id = ?1",
            params![id],
            |row| {
                let id: String = row.get(0)?;
                let icon: String = row.get(1)?;
                let title: String = row.get(2)?;
                let encrypted_fields: String = row.get(3)?;
                let tags_json: String = row.get(4)?;
                let created_at: i64 = row.get(5)?;
                let updated_at: i64 = row.get(6)?;
                let favorite: bool = row.get::<_, i64>(7)? != 0;

                let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                    .unwrap_or_else(|e| {
                        eprintln!("解密失败 (id: {}): {}", id, e);
                        Default::default()
                    });
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                Ok(SecretEntry {
                    id,
                    icon,
                    title,
                    fields,
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
            "SELECT id, icon, title, encrypted_fields, tags, created_at, updated_at, favorite FROM secrets WHERE 1=1",
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
                let encrypted_fields: String = row.get(3)?;
                let tags_json: String = row.get(4)?;
                let created_at: i64 = row.get(5)?;
                let updated_at: i64 = row.get(6)?;
                let favorite: bool = row.get::<_, i64>(7)? != 0;

                let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                    .unwrap_or_else(|e| {
                        eprintln!("解密失败 (id: {}): {}", id, e);
                        Default::default()
                    });
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                Ok(SecretEntry {
                    id,
                    icon,
                    title,
                    fields,
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

    pub fn update_secret(&self, req: UpdateSecretRequest) -> Result<SecretEntry, String> {
        let key = crypto::get_encryption_key();

        // 先获取现有条目（在获取锁之前）
        let existing = self.get_secret(&req.id)?;

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();

        let title = req.title.unwrap_or(existing.title);
        let fields = req.fields.unwrap_or(existing.fields);
        let tags = req.tags.unwrap_or(existing.tags);
        let icon = req.icon.unwrap_or(existing.icon);
        let favorite = req.favorite.unwrap_or(existing.favorite);

        let encrypted_fields = crypto::encrypt_fields(&fields, &key)?;
        let tags_json = serde_json::to_string(&tags).unwrap_or_default();

        conn.execute(
            "UPDATE secrets SET title = ?1, encrypted_fields = ?2, tags = ?3, icon = ?4, updated_at = ?5, favorite = ?6 WHERE id = ?7",
            params![title, encrypted_fields, tags_json, icon, now, if favorite { 1 } else { 0 }, req.id],
        ).map_err(|e| format!("更新失败: {}", e))?;

        Ok(SecretEntry {
            id: req.id,
            icon,
            title,
            fields,
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

    pub fn search_secrets(&self, query: &str) -> Result<Vec<SecretEntry>, String> {
        let key = crypto::get_encryption_key();
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // 模糊匹配：标题或标签包含搜索词
        let pattern = format!("%{}%", query);
        let sql = "
            SELECT id, icon, title, encrypted_fields, tags, created_at, updated_at, favorite
            FROM secrets
            WHERE title LIKE ?1 OR tags LIKE ?1
            ORDER BY updated_at DESC
        ";

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![pattern], |row| {
            let id: String = row.get(0)?;
            let icon: String = row.get(1)?;
            let title: String = row.get(2)?;
            let encrypted_fields: String = row.get(3)?;
            let tags_json: String = row.get(4)?;
            let created_at: i64 = row.get(5)?;
            let updated_at: i64 = row.get(6)?;
            let favorite: bool = row.get::<_, i64>(7)? != 0;

            let fields = crypto::decrypt_fields(&encrypted_fields, &key)
                .unwrap_or_else(|e| {
                    eprintln!("解密失败 (id: {}): {}", id, e);
                    Default::default()
                });
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(SecretEntry {
                id,
                icon,
                title,
                fields,
                tags,
                created_at,
                updated_at,
                favorite,
            })
        }).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }
}
