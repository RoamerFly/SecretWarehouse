# SecretWarehouse

<div align="center">

<img src="docs/images/logo.png" alt="SecretWarehouse Logo" width="160">

**安全 · 简单 · 好用的本地密码管理器**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

[快速开始](#-快速开始) · [界面预览](#-界面预览) · [功能特性](#-功能特性) · [安全架构](#-安全架构) · [开发计划](#-开发计划)

</div>

---

## ✨ 为什么选择 SecretWarehouse

| 特性 | 说明 |
|------|------|
| 🔒 **安全** | 多层加密架构，即使拿到数据也无法解密 |
| 🎯 **简单** | 三步上手：下载、安装、设置密码 |
| 🚀 **好用** | 直观的卡片界面，支持搜索、标签、收藏 |
| 👥 **多用户** | 支持多人共用，数据完全隔离 |
| 💻 **跨平台** | Windows / macOS / Linux 全平台支持 |
| 🆓 **免费** | 完全开源，永久免费 |

---

## 🖼️ 界面预览

<div align="center">

![主界面](docs/images/main.png)

*简洁直观的主界面 - 侧边栏 + 卡片列表*

</div>

<div align="center">

![新建条目](docs/images/create-entry.png)

*支持自定义字段、标签、图标*

</div>

---

## 🚀 快速开始

### 1. 下载安装

前往 [Releases](#) 下载对应平台的安装包：

| 平台 | 安装方式 |
|------|----------|
| **Windows** | 下载 `.exe` 双击安装 |
| **macOS** | 下载 `.dmg` 拖入应用程序 |
| **Linux** | 下载 `.AppImage` 或 `.deb` |

### 2. 创建账户

首次启动需要：
1. 输入用户名（用于区分不同用户的数据）
2. 设置主密码（无长度限制，建议8位以上）
3. **务必保存恢复码**（忘记密码时唯一恢复方式）

### 3. 开始使用

点击「+」创建你的第一个密码条目。

---

## 🎯 功能特性

| 功能 | 说明 |
|------|------|
| **多用户支持** | 多人共用程序，数据完全隔离 |
| **密码管理** | 创建、编辑、删除密码条目 |
| **自定义字段** | 任意添加用户名、密码、邮箱、API Key 等 |
| **敏感字段遮蔽** | 敏感内容自动隐藏，点击显示 |
| **标签分类** | 为条目添加标签，快速筛选 |
| **收藏功能** | 标记重要条目，快速访问 |
| **全文搜索** | 搜索标题、描述、标签、字段 |
| **模板系统** | 保存常用模板，快速创建 |
| **批量操作** | 多选、全选、批量删除 |
| **深色模式** | 浅色/深色/跟随系统 |
| **数据导入导出** | 备份和恢复数据库 |
| **用户数据迁移** | ZIP打包导出/导入，含密钥文件 |
| **恢复码机制** | 忘记密码时可恢复数据 |
| **密码强度检测** | 一键扫描所有密码字段，显示强度 |
| **用户菜单** | 点击锁图标退出登录/切换用户 |

---

## 🔒 安全架构

### 加密流程

```
创建账户:
用户密码 + 随机盐值 → PBKDF2 (100,000次) → 派生密钥
                                                    ↓
随机Master Key ← AES-256-GCM加密 ← 派生密钥
    ↓
保存到 master.key

恢复码:
随机恢复码 + 恢复盐值 → PBKDF2 (100,000次) → 恢复密钥
                                                    ↓
Master Key ← AES-256-GCM加密 ← 恢复密钥
    ↓
保存到 recovery.key
```

### 解密流程

```
解锁账户:
用户密码 + 盐值 → PBKDF2 → 派生密钥 → 解密 master.key → Master Key
                                                              ↓
                                          数据库字段 ← AES-256-GCM解密 ← Master Key

恢复密码:
恢复码 + 恢复盐值 → PBKDF2 → 恢复密钥 → 解密 recovery.key → Master Key
                                                                    ↓
                                                  新密码 + 新盐值 → 重新加密Master Key
                                                                    ↓
                                                            生成新的恢复码
```

### 数据目录结构

```
data/
├── 用户A/
│   ├── data_用户A.db       # 加密数据库
│   ├── salt.key            # 密码派生盐值
│   ├── master.key          # 加密的Master Key（用密码派生密钥加密）
│   ├── auth.verify         # 密码验证文件
│   ├── recovery.key        # 加密的Master Key（用恢复码派生密钥加密）
│   └── recovery_salt.key   # 恢复码派生盐值
├── 用户B/
│   ├── data_用户B.db
│   └── ...
└── 用户C/
    └── ...
```

### 安全特性

| 特性 | 说明 |
|------|------|
| **多层加密** | 密码→派生密钥→Master Key→数据，缺一不可 |
| **随机盐值** | 每个用户独立盐值，防止彩虹表攻击 |
| **恢复码** | 独立于密码的恢复机制，使用后自动更换 |
| **数据隔离** | 不同用户数据存储在不同目录，互不可见 |
| **内存保护** | 退出时清除内存中的密钥 |

### 加密算法

| 用途 | 算法 |
|------|------|
| 密钥派生 | PBKDF2-SHA256 (100,000次迭代) |
| 数据加密 | AES-256-GCM |
| 随机数 | 操作系统安全随机数生成器 |

---

## 👥 多用户支持

### 用户隔离机制

每个用户的数据完全隔离：
- 独立的数据库文件
- 独立的加密密钥
- 独立的恢复码

### 用户数据迁移

**导出用户数据（ZIP格式）**：
1. 登录源用户账户
2. 进入设置 → 数据 → 导出用户数据
3. 选择保存位置，文件名格式：`SecretWarehouse_{用户名}_{日期}.zip`

**ZIP包含内容**：
- `data_{username}.db` - 加密数据库
- `salt.key` - 密码派生盐值
- `master.key` - 加密的Master Key
- `auth.verify` - 密码验证文件
- `recovery.key` - 恢复码加密的Master Key
- `recovery_salt.key` - 恢复码盐值

**导入用户数据（ZIP格式）**：
1. 登录目标用户账户
2. 进入设置 → 数据 → 导入用户数据
3. 选择之前导出的ZIP文件
4. 使用原用户的密码解锁数据

**注意**：
- ZIP文件不包含密码和恢复码明文，安全性有保障
- 导入后需用原密码解锁，可通过恢复码重置密码
- 支持跨平台迁移（Windows/macOS/Linux）

### 数据库导入导出

除ZIP格式外，还支持单独导出数据库：

| 功能 | 说明 |
|------|------|
| **导出数据库** | 仅导出.db文件，需配合密钥文件使用 |
| **覆盖导入** | 替换当前所有数据 |
| **增量导入** | 合并数据，跳过重复项 |

---

## 📦 环境配置

### 前置要求

| 工具 | 版本 | 下载 |
|------|------|------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust | 最新 | [rustup.rs](https://rustup.rs/) |

### 平台依赖

**Linux (Ubuntu/Debian)：**
```bash
sudo apt install -y build-essential libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev
```

**macOS：**
```bash
xcode-select --install
```

**Windows：**
安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

---

## 🛠️ 从源码构建

```bash
# 克隆项目
git clone https://gitcode.com/roverfly/SecretWarehouse.git
cd SecretWarehouse/SecretWarehouse

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建可执行文件
./build_linux.sh    # Linux
./build_mac.sh      # macOS
.\build_windows.ps1 # Windows
```

---

## 📁 项目结构

```
SecretWarehouse/
├── src/                    # 前端 (React + TypeScript)
│   ├── components/         # 组件
│   │   ├── MasterPassword.tsx  # 登录/注册界面
│   │   ├── Sidebar.tsx         # 侧边栏
│   │   └── ...
│   └── stores/             # 状态管理 (Zustand)
├── src-tauri/              # 后端 (Rust)
│   └── src/
│       ├── crypto.rs       # 加密模块
│       ├── db.rs           # 数据库
│       ├── commands.rs     # Tauri命令
│       └── models.rs       # 数据模型
└── data/                   # 运行时数据 (不提交)
    └── {username}/         # 用户数据目录
        ├── data_{username}.db
        ├── salt.key
        ├── master.key
        ├── auth.verify
        ├── recovery.key
        └── recovery_salt.key
```

---

## 📝 开发计划

- [x] 主密码保护
- [x] 多层加密架构
- [x] 恢复码机制
- [x] 多用户支持
- [x] 数据导入导出
- [x] 用户数据迁移（ZIP格式）
- [x] 密码生成器
- [x] 设置功能
- [x] 跨平台兼容（Windows/macOS/Linux）
- [x] 密码强度检测
- [x] 用户菜单（退出/切换用户）
- [ ] 自动锁定
- [ ] TOTP两步验证
- [ ] 浏览器扩展

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT](LICENSE)  License

---

<div align="center">

**如果对你有帮助，请给个 ⭐ Star**

</div>
