#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON_BIN="$PLUGIN_ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
PLIST_LABEL="com.cc-notify.app"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_LABEL.plist"

if [ ! -x "$ELECTRON_BIN" ]; then
  echo "未找到 Electron 可执行文件，请先在 $PLUGIN_ROOT 下运行: npm install" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$ELECTRON_BIN</string>
    <string>$PLUGIN_ROOT/app/main.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$PLUGIN_ROOT/.cc-notify.log</string>
  <key>StandardErrorPath</key>
  <string>$PLUGIN_ROOT/.cc-notify.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "已安装并启动 cc-notify 菜单栏程序（LaunchAgent: $PLIST_PATH）"
echo "卸载方法: launchctl unload $PLIST_PATH && rm $PLIST_PATH"
