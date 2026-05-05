# SecretWarehouse - Windows 构建脚本
# 使用方法: PowerShell 中运行 .\build_windows.ps1

# 设置 UTF-8 编码
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SecretWarehouse - Windows 构建脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 项目根目录
$ProjectDir = $PSScriptRoot
$DistDir = Join-Path $ProjectDir "windows_dist"

# 清理旧的 dist 目录
Write-Host ""
Write-Host "[1/4] 清理旧的构建产物..." -ForegroundColor Yellow
if (Test-Path $DistDir) {
    Remove-Item -Recurse -Force $DistDir
}
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

# 构建前端
Write-Host ""
Write-Host "[2/4] 构建前端资源..." -ForegroundColor Yellow
Set-Location $ProjectDir
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "前端构建失败!" -ForegroundColor Red
    exit 1
}

# 构建 Tauri 应用
Write-Host ""
Write-Host "[3/4] 构建 Windows 应用..." -ForegroundColor Yellow
Set-Location (Join-Path $ProjectDir "src-tauri")
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rust 构建失败!" -ForegroundColor Red
    exit 1
}

# 复制构建产物
Write-Host ""
Write-Host "[4/4] 复制构建产物到 $DistDir..." -ForegroundColor Yellow

# 复制可执行文件
$ExePath = Join-Path $ProjectDir "src-tauri\target\release\secret-warehouse.exe"
if (Test-Path $ExePath) {
    Copy-Item $ExePath $DistDir
    Write-Host "  ✓ 可执行文件: secret-warehouse.exe" -ForegroundColor Green
}

# 复制 bundle 包
$BundleDir = Join-Path $ProjectDir "src-tauri\target\release\bundle"
if (Test-Path $BundleDir) {
    # MSI 安装包
    $MsiDir = Join-Path $BundleDir "msi"
    if (Test-Path $MsiDir) {
        Copy-Item -Recurse $MsiDir $DistDir
        Write-Host "  ✓ MSI 安装包: windows_dist\msi\" -ForegroundColor Green
    }

    # NSIS 安装包
    $NsisDir = Join-Path $BundleDir "nsis"
    if (Test-Path $NsisDir) {
        Copy-Item -Recurse $NsisDir $DistDir
        Write-Host "  ✓ NSIS 安装包: windows_dist\nsis\" -ForegroundColor Green
    }
}

# 复制配置文件
$ConfigPath = Join-Path $ProjectDir "src-tauri\tauri.conf.json"
if (Test-Path $ConfigPath) {
    Copy-Item $ConfigPath $DistDir
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Windows 构建完成!" -ForegroundColor Green
Write-Host "  输出目录: $DistDir" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Get-ChildItem $DistDir | Format-Table Name, Length, LastWriteTime -AutoSize
