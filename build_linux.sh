#!/bin/bash
set -e

echo "=========================================="
echo "  SecretWarehouse - Linux 构建脚本"
echo "=========================================="

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist_linux"

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
echo "[3/4] 构建 Linux 应用..."
cd "$PROJECT_DIR/src-tauri"
cargo build --release

# 复制构建产物
echo ""
echo "[4/4] 整理构建产物..."

# 复制可执行文件到 dist 根目录
if [ -f "$PROJECT_DIR/src-tauri/target/release/secret-warehouse" ]; then
    cp "$PROJECT_DIR/src-tauri/target/release/secret-warehouse" "$DIST_DIR/"
    chmod +x "$DIST_DIR/secret-warehouse"
    echo "  ✓ 可执行文件: secret-warehouse"
fi

# 复制配置文件到 env 目录
cp "$PROJECT_DIR/src-tauri/tauri.conf.json" "$DIST_DIR/env/" 2>/dev/null || true

# 复制 bundle 包 (如果存在)
BUNDLE_DIR="$PROJECT_DIR/src-tauri/target/release/bundle"
if [ -d "$BUNDLE_DIR" ]; then
    # DEB 包
    if [ -d "$BUNDLE_DIR/deb" ]; then
        cp -r "$BUNDLE_DIR/deb" "$DIST_DIR/env/"
        echo "  ✓ DEB 包: env/deb/"
    fi

    # AppImage
    if [ -d "$BUNDLE_DIR/appimage" ]; then
        cp -r "$BUNDLE_DIR/appimage" "$DIST_DIR/env/"
        echo "  ✓ AppImage: env/appimage/"
    fi

    # RPM 包
    if [ -d "$BUNDLE_DIR/rpm" ]; then
        cp -r "$BUNDLE_DIR/rpm" "$DIST_DIR/env/"
        echo "  ✓ RPM 包: env/rpm/"
    fi
fi

echo ""
echo "=========================================="
echo "  Linux 构建完成!"
echo "  输出目录: $DIST_DIR"
echo "=========================================="
echo ""
echo "目录结构:"
find "$DIST_DIR" -type f | head -20
echo ""
ls -la "$DIST_DIR"
