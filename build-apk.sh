#!/bin/bash
# =============================================
# 萌萌的 - APK 构建脚本
# 在电脑上运行此脚本来编译 APK
# =============================================

set -e

echo "📦 构建萌萌的 APK..."

# 1. 安装依赖
echo "📥 1/4 安装依赖..."
npm install

# 2. 构建 Next.js 应用
echo "🔨 2/4 构建 Web 应用..."
npm run build

# 3. 同步到 Capacitor
echo "🔄 3/4 同步到 Android..."
npx cap sync android

# 4. 构建 APK
echo "🔧 4/4 编译 APK..."
cd android
./gradlew assembleRelease

echo ""
echo "✅ APK 构建完成!"
echo "📁 APK 位置: android/app/build/outputs/apk/release/"
echo "   app-release.apk (未签名)"
echo "   app-release-unsigned.apk"
echo ""
echo "💡 如需签名 APK，确保 android/signing.properties 配置正确"
echo "   或在 Android Studio 中打开 android/ 目录手动构建"
