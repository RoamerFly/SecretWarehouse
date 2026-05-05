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
| 🔒 **安全** | 多层加密架构，即使拿到所有文件没有密码也无法解密 |
| 🎯 **简单** | 三步上手：下载、安装、设置密码 |
| 🚀 **好用** | 直观的卡片界面，支持搜索、标签、收藏 |
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

### 2. 设置主密码

首次启动需要设置主密码（至少8位）。

> ⚠️ **请牢记密码，忘记后将无法恢复数据！**

### 3. 开始使用

点击「+」创建你的第一个密码条目。

---

## 🎯 功能特性

| 功能 | 说明 |
|------|------|
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

---

## 🔒 安全架构

采用**多层加密**，攻击者即使同时获取数据库和密钥文件，没有密码也无法解密。

```
用户密码 → PBKDF2派生 → 解密密钥文件 → 解密数据
```

| 组件 | 说明 |
|------|------|
| `salt.key` | 随机盐值，防止彩虹表攻击 |
| `master.key` | 加密的Master Key，需要密码才能解密 |
| `data_main.db` | 加密的数据库 |

**加密算法：** AES-256-GCM + PBKDF2-SHA256 (100,000次迭代)

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
│   └── stores/             # 状态管理
├── src-tauri/              # 后端 (Rust)
│   └── src/
│       ├── crypto.rs       # 加密模块
│       ├── db.rs           # 数据库
│       └── commands.rs     # 命令处理
└── data/                   # 运行时数据 (不提交)
    ├── salt.key            # 盐值
    ├── master.key          # 加密的密钥
    └── data_main.db        # 数据库
```

---

## 📝 开发计划

- [x] 主密码保护
- [x] 多层加密架构
- [x] 数据导入导出
- [x] 密码生成器
- [x] 设置功能
- [ ] 自动锁定
- [ ] 密码强度检测
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
