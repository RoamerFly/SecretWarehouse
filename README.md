# SecretWarehouse

<div align="center">

<img src="docs/images/logo.png" alt="SecretWarehouse Logo" width="160">

**安全、高效的本地密码管理器**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

</div>

---

## 项目简介

SecretWarehouse 是一款基于 Tauri + React 构建的跨平台桌面密码管理器，采用多层加密架构保护您的敏感数据。所有数据存储在本地数据库中，无需依赖云端服务，从根源上保护您的隐私。

### 功能概览

| 分类 | 功能 |
|------|------|
| **密码管理** | 创建、编辑、删除密码条目；支持自定义任意数量的字段（用户名、密码、邮箱、API密钥等） |
| **安全保护** | 多层加密保护；主密码验证；密钥文件加密存储；本地存储不上传云端 |
| **分类整理** | 添加多个标签分类；收藏重要条目；支持按标签筛选 |
| **批量操作** | 多选、全选、批量删除 |
| **模板系统** | 内置常用模板快速创建；自定义保存模板复用字段结构 |
| **搜索功能** | 全文搜索标题/描述/标签/字段；实时搜索即输即搜 |
| **界面体验** | 浅色/深色/跟随系统主题；卡片式直观展示；字段拖拽排序；平滑动画效果 |
| **跨平台** | 支持 Windows、macOS、Linux |

### 适用场景

- 管理网站账号密码
- 存储银行卡、信用卡信息
- 记录 API Key、SSH Key 等开发凭证
- 保管重要文档的访问凭据
- 任何需要安全存储的敏感信息

### 与其他密码管理器的区别

| 对比项 | SecretWarehouse | 浏览器内置 | 1Password/LastPass |
|--------|-----------------|-----------|-------------------|
| 数据存储 | 本地 SQLite | 本地/云端 | 云端为主 |
| 开源 | ✅ | ❌ | ❌ |
| 加密方式 | 多层加密架构 | 各不相同 | 各不相同 |
| 跨平台 | ✅ | 仅对应浏览器 | ✅ |
| 价格 | 免费 | 免费 | 订阅制 |

---

## 🔒 安全架构

### 核心设计理念

SecretWarehouse 采用**多层加密架构**，即使攻击者同时获取数据库文件和密钥文件，也无法解密数据。

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层面                              │
│                  用户记忆的主密码 (Password)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    第一层：密钥派生                           │
│                                                              │
│    用户密码 + 盐值 (salt.key)                                │
│              │                                              │
│              ▼                                              │
│    PBKDF2-SHA256 (100,000 次迭代)                           │
│              │                                              │
│              ▼                                              │
│    32字节派生密钥 (Derived Key)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    第二层：密钥解密                           │
│                                                              │
│    派生密钥 (Derived Key) + 加密的Master Key (master.key)    │
│              │                                              │
│              ▼                                              │
│    AES-256-GCM 解密                                         │
│              │                                              │
│              ▼                                              │
│    32字节随机Master Key (明文，仅存于内存)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    第三层：数据加解密                         │
│                                                              │
│    Master Key (明文) + 加密的数据库字段                       │
│              │                                              │
│              ▼                                              │
│    AES-256-GCM 解密                                         │
│              │                                              │
│              ▼                                              │
│    原始数据 (明文)                                           │
└─────────────────────────────────────────────────────────────┘
```

### 文件结构

```
项目根目录/
└── data/
    ├── salt.key          # 盐值文件 (32字节随机数，用于PBKDF2)
    ├── master.key        # 加密的Master Key文件 (用派生密钥加密)
    ├── auth.verify       # 验证文件 (用于验证密码是否正确)
    └── data_main.db      # SQLite数据库 (敏感字段已加密)
```

### 安全特性说明

| 组件 | 说明 | 安全作用 |
|------|------|----------|
| **salt.key** | 32字节随机盐值 | 防止彩虹表攻击，确保相同密码产生不同密钥 |
| **master.key** | 被派生密钥加密的Master Key | 即使拿到此文件，没有密码也无法解密 |
| **auth.verify** | 加密的验证字符串 | 验证密码正确性，不暴露密钥信息 |
| **PBKDF2** | 100,000次迭代 | 大幅增加暴力破解成本 |
| **AES-256-GCM** | 认证加密算法 | 提供机密性和完整性保护 |
| **随机Master Key** | 32字节真随机数 | 即使密码相同，每次生成的密钥也不同 |

### 攻击场景分析

| 攻击场景 | 攻击者拥有 | 能否解密数据 | 原因 |
|----------|-----------|-------------|------|
| 场景1 | 仅数据库文件 | ❌ | 没有Master Key |
| 场景2 | 数据库 + 密钥文件 | ❌ | Master Key被加密，需要密码 |
| 场景3 | 所有文件 + 主密码 | ✅ | 合法用户 |

### 加密算法详情

| 算法 | 用途 | 参数 |
|------|------|------|
| **PBKDF2-SHA256** | 从密码派生密钥 | 100,000 次迭代，32字节输出 |
| **AES-256-GCM** | 加密Master Key和数据 | 256位密钥，96位随机Nonce |
| **CryptoRNG** | 生成随机数 | 操作系统级安全随机数生成器 |

### 密钥派生流程

```
Password (用户输入)
       │
       ▼
   ┌───────────────────────────────┐
   │  PBKDF2-HMAC-SHA256          │
   │  - 迭代次数: 100,000         │
   │  - 盐值: salt.key (32字节)   │
   │  - 输出: 32字节              │
   └───────────────────────────────┘
       │
       ▼
   Derived Key (派生密钥)
```

### 数据加密格式

加密后的数据格式：`Base64(Nonce + Ciphertext + GCM_Tag)`

- **Nonce**: 12字节随机数，每次加密不同
- **Ciphertext**: 加密后的数据
- **GCM_Tag**: 16字节认证标签，确保数据完整性

---

## 📸 页面总览

### 主界面

<div align="center">

![主界面](docs/images/main.png)

*主界面 - 左侧导航栏 + 右侧卡片列表*

</div>

### 新建/编辑条目

<div align="center">

![新建条目](docs/images/create-entry.png)

*新建条目 - 支持自定义字段、标签、图标*

</div>

### 模板选择

<div align="center">

![模板选择](docs/images/template-select.png)

*模板选择 - 快速创建常见类型的密码条目*

</div>

### 条目详情

<div align="center">

![条目详情](docs/images/entry-detail.png)

*条目详情 - 查看和管理密码字段*

</div>

---

## ✨ 功能特性

### 🔐 核心功能

| 功能 | 说明 |
|------|------|
| **密码存储** | 多层加密保护所有敏感字段 |
| **主密码保护** | 启动时需要输入主密码验证身份 |
| **条目管理** | 创建、编辑、删除、搜索密码条目 |
| **字段自定义** | 支持任意数量的自定义字段（用户名、密码、API密钥等） |
| **敏感字段遮蔽** | 手动设置字段为敏感状态，显示时自动遮蔽 |
| **标签分类** | 为条目添加多个标签，支持按标签筛选 |
| **收藏功能** | 标记重要条目为收藏，快速访问 |
| **批量操作** | 支持多选、全选、批量删除 |
| **数据导入导出** | 支持数据库备份和恢复 |

### 📋 模板系统

| 功能 | 说明 |
|------|------|
| **预设模板** | 从模板快速创建常见类型的条目 |
| **自定义模板** | 将当前配置保存为模板，复用字段结构 |
| **模板管理** | 创建、编辑、删除模板 |

### 🎨 界面特性

| 功能 | 说明 |
|------|------|
| **深色模式** | 支持浅色/深色/跟随系统三种主题 |
| **响应式布局** | 自适应不同窗口大小 |
| **卡片视图** | 直观的卡片式展示 |
| **拖拽排序** | 字段支持拖拽交换顺序 |
| **平滑动画** | 丰富的交互动画效果 |
| **自定义设置** | 字体大小、卡片大小、间距可调 |

### 🔍 搜索功能

| 功能 | 说明 |
|------|------|
| **全文搜索** | 搜索标题、描述、标签、字段内容 |
| **实时搜索** | 输入即搜索，无需回车 |
| **标签筛选** | 点击标签快速筛选相关条目 |

### ⚙️ 设置功能

| 功能 | 说明 |
|------|------|
| **主题切换** | 浅色/深色/跟随系统 |
| **窗口大小** | 预设分辨率或自定义尺寸 |
| **字体大小** | 10-38px 可调 |
| **卡片大小** | 24-88px 可调 |
| **间距设置** | 4-84px 可调 |
| **数据管理** | 导出数据库、覆盖导入、增量导入 |

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | [Tauri](https://tauri.app/) v1.x |
| **前端** | React 18 + TypeScript |
| **状态管理** | Zustand |
| **样式** | Tailwind CSS |
| **图标** | Lucide React |
| **后端** | Rust |
| **数据库** | SQLite (rusqlite) |
| **加密算法** | AES-256-GCM + PBKDF2-SHA256 |
| **构建工具** | Vite |

---

## 📦 环境配置

### 基础环境

在运行构建脚本之前，请确保已安装以下工具：

#### 1. Node.js (v18 或更高版本)

```bash
# 检查版本
node --version
npm --version
```

**Windows：**
前往 [Node.js 中文网](https://nodejs.org/zh-cn/download/) 下载 Windows 安装程序 (.msi)，直接安装即可。

**Linux/macOS：**
```bash
# 推荐使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. Rust 工具链

**Linux/macOS：**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Windows：**
下载 [rustup-init.exe](https://rustup.rs/) 安装，然后执行：
```powershell
rustup toolchain install stable-x86_64-pc-windows-msvc
rustup default stable-x86_64-pc-windows-msvc
```

验证安装：
```bash
rustc --version
cargo --version
```

#### 3. 平台特定依赖

**Linux (Ubuntu/Debian)：**
```bash
sudo apt install -y build-essential libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev
```

**Linux (Fedora)：**
```bash
sudo dnf install -y gcc gcc-c++ openssl-devel gtk3-devel webkit2gtk4.0-devel
```

**macOS：**
```bash
xcode-select --install
```

**Windows：**
安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选 "C++ build tools"

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://gitcode.com/roverfly/SecretWarehouse.git
cd SecretWarehouse/SecretWarehouse
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式运行

```bash
npm run tauri dev
```

### 4. 首次使用

1. 启动应用后，会显示主密码设置界面
2. 设置一个至少8位的主密码
3. **请牢记此密码，忘记后将无法恢复数据**
4. 系统会自动生成加密密钥并保存到 `data/` 目录

### 5. 构建可执行文件

使用提供的构建脚本：

**Linux：**
```bash
./build_linux.sh
# 输出目录: dist_linux/
```

**macOS：**
```bash
./build_mac.sh
# 输出目录: dist_macos/
```

**Windows (PowerShell)：**
```powershell
.\build_windows.ps1
# 输出目录: dist_windows\
```

---

## 📁 项目结构

```
SecretWarehouse/
├── src/                          # 前端源代码
│   ├── components/               # React 组件
│   │   ├── MasterPassword.tsx    # 主密码界面
│   │   ├── SearchBar.tsx         # 搜索栏
│   │   ├── SecretCard.tsx        # 密码卡片
│   │   ├── SecretDetail.tsx      # 条目详情
│   │   ├── SecretForm.tsx        # 新建/编辑表单
│   │   ├── SecretList.tsx        # 卡片列表
│   │   ├── Settings.tsx          # 设置界面
│   │   ├── Sidebar.tsx           # 侧边栏导航
│   │   ├── TemplateForm.tsx      # 模板表单
│   │   └── TemplateList.tsx      # 模板列表
│   ├── stores/                   # 状态管理
│   │   └── useStore.ts           # Zustand store
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/                    # 工具函数
│   │   └── sensitive.ts          # 敏感字段处理
│   ├── App.tsx                   # 应用入口
│   └── index.css                 # 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 应用入口
│   │   ├── commands.rs           # Tauri 命令
│   │   ├── crypto.rs             # 加密模块 (核心安全代码)
│   │   ├── db.rs                 # 数据库操作
│   │   └── models.rs             # 数据模型
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── data/                         # 运行时生成 (不提交到Git)
│   ├── salt.key                  # 盐值文件
│   ├── master.key                # 加密的Master Key
│   ├── auth.verify               # 验证文件
│   └── data_main.db              # 数据库文件
├── dist_linux/                   # Linux 构建输出
├── dist_macos/                   # macOS 构建输出
├── dist_windows/                 # Windows 构建输出
├── build_linux.sh                # Linux 构建脚本
├── build_mac.sh                  # macOS 构建脚本
├── build_windows.ps1             # Windows 构建脚本
├── package.json                  # Node.js 依赖
└── README.md                     # 项目说明
```

---

## ⚠️ 重要安全提示

### 密码安全

1. **主密码是唯一钥匙** - 忘记主密码将永久丢失所有数据
2. **建议使用强密码** - 至少12位，包含大小写字母、数字和特殊字符
3. **定期备份** - 使用设置中的导出功能备份数据库

### 文件安全

1. **data/ 目录包含敏感文件** - 包括加密密钥和数据库
2. **不要分享密钥文件** - 即使加密后也不建议分享
3. **安全存储备份** - 将备份存储在安全的位置

### 安全限制

1. **内存安全** - 解密后的Master Key在应用运行期间存在于内存中
2. **无自动锁定** - 当前版本不支持自动锁定功能
3. **本地存储** - 数据仅存储在本地，丢失设备可能导致数据丢失

---

## 🖼️ 图片资源

请将以下截图放置到 `docs/images/` 目录：

| 文件名 | 说明 |
|--------|------|
| `logo.png` | 项目 Logo (建议 256x256) |
| `main.png` | 主界面截图 |
| `create-entry.png` | 新建条目界面 |
| `template-select.png` | 模板选择界面 |
| `entry-detail.png` | 条目详情界面 |

创建目录并添加图片：

```bash
mkdir -p docs/images
# 将截图复制到该目录
```

---

## 📝 开发计划

- [x] 实现主密码功能
- [x] 实现多层加密架构
- [x] 添加导入/导出功能
- [x] 添加密码生成器
- [x] 实现设置功能
- [ ] 添加密码强度检测
- [ ] 实现自动锁定功能
- [ ] 支持TOTP两步验证
- [ ] 添加云同步支持 (可选)
- [ ] 实现浏览器扩展集成

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 🙏 致谢

- [Tauri](https://tauri.app/) - 构建跨平台桌面应用的框架
- [React](https://react.dev/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Lucide](https://lucide.dev/) - 图标库
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理

---

<div align="center">

**如果这个项目对你有帮助，请给个 Star ⭐**

</div>
