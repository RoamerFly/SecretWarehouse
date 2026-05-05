#!/bin/bash
set -e

echo "=========================================="
echo "  SecretWarehouse - macOS 构建脚本"
echo "=========================================="

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist_macos"

# 清理旧的构建产物
echo ""
echo "[1/4] 清理旧的构建产物..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/env"

# 构建前端
echo ""
echo "[2/4] 构建前端资源..."
cd "$PROJECT_DIR"
npm run build

# 构建 Tauri 应用
echo ""
echo "[3/4] 构建 macOS 应用..."
cd "$PROJECT_DIR/src-tauri"
cargo build --release

# 复制构建产物
echo ""
echo "[4/4] 整理构建产物..."

# 复制配置文件到 env 目录
cp "$PROJECT_DIR/src-tauri/tauri.conf.json" "$DIST_DIR/env/" 2>/dev/null || true

# 复制 bundle 包
BUNDLE_DIR="$PROJECT_DIR/src-tauri/target/release/bundle"
if [ -d "$BUNDLE_DIR" ]; then
    # macOS 应用包 - 放到 dist 根目录，双击即可运行
    if [ -d "$BUNDLE_DIR/macos" ]; then
        cp -r "$BUNDLE_DIR/macos"/*.app "$DIST_DIR/" 2>/dev/null || true
        echo "  ✓ 应用包: SecretWarehouse.app (双击运行)"
    fi

    # DMG 镜像 - 放到 env 目录，用于分发
    if [ -d "$BUNDLE_DIR/dmg" ]; then
        cp -r "$BUNDLE_DIR/dmg" "$DIST_DIR/env/"
        echo "  ✓ DMG 镜像: env/dmg/"
    fi
fi

echo ""
echo "=========================================="
echo "  macOS 构建完成!"
echo "  输出目录: $DIST_DIR"
echo "=========================================="
echo ""
echo "目录结构:"
find "$DIST_DIR" -type f | head -20
echo ""
ls -la "$DIST_DIR"
