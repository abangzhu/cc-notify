# cc-notify

监控 Claude Code 会话状态（等待审批 / 运行中 / 已完成一轮 / 工具出错 / 会话结束），通过 macOS 菜单栏图标 + 系统通知提醒，不用一直守在终端里。支持同时监控多个并行会话。

## 工作原理

1. Claude Code 触发官方 hook 事件（`SessionStart`、`UserPromptSubmit`、`Notification`、`PostToolUse`、`Stop`、`SessionEnd`），执行 `hooks/notify.js`。
2. `notify.js` 把事件映射成简化状态，POST 到本地 `127.0.0.1:47823`，由常驻的菜单栏程序（`app/main.js`，Electron）接收并更新 tray 图标/下拉菜单。
3. 关键状态（等待审批 / 已完成一轮 / 工具出错）会额外弹一条系统通知；点击通知会把对应终端 App（Terminal / iTerm / Warp / VS Code，按会话启动时的 `$TERM_PROGRAM` 判断）带到前台——不做精确到窗口/tab 的跳转。
4. 如果菜单栏程序没在运行，`notify.js` 会直接兜底发一条系统通知，保证不会完全错过提醒。

## 安装

```bash
cd cc-notify
npm install
./scripts/install.sh   # 生成 LaunchAgent，让菜单栏程序登录时自动启动
```

安装后菜单栏会出现一个状态图标（●），点击可以看到当前所有 Claude Code 会话及其状态。

卸载：`launchctl unload ~/Library/LaunchAgents/com.cc-notify.app.plist && rm ~/Library/LaunchAgents/com.cc-notify.app.plist`

## 在 Claude Code 里启用插件

本地测试（无需发布到 marketplace）：

```bash
claude --plugin-dir /path/to/cc-notify
```

验证插件清单/hooks 配置：

```bash
claude plugin validate /path/to/cc-notify
```

## 已知限制

- hook 只能在 Claude Code 进程存活并主动触发时运行；如果 CLI 进程被强制杀死或崩溃，是收不到任何事件的，这类"硬中断"无法覆盖。
- "工具执行出错"的检测依赖 `PostToolUse` payload 里的 `tool_response` 是否带错误标记，属于尽力而为，不保证覆盖所有异常场景。
- 终端跳转只做到"激活对应的终端 App"，不做具体窗口/标签页级别的定位。

## 开发

```bash
npm run dev    # 本地启动菜单栏程序（不依赖真实 Claude Code 会话，可用 curl 手动 POST 事件测试）
npm test       # 跑单元测试
```

手动模拟一次事件：

```bash
curl -X POST http://127.0.0.1:47823/event \
  -H 'content-type: application/json' \
  -d '{"sessionId":"s1","cwd":"/tmp/demo","projectName":"demo","status":"permission_prompt","label":"等待权限审批","message":"Bash 需要授权"}'
```
