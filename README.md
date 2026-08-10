# cc-notify

监控 Claude Code 会话状态（等待审批 / 运行中 / 已完成一轮 / 工具出错 / 会话结束），通过 macOS 菜单栏图标 + 系统通知提醒，不用一直守在终端里。支持同时监控多个并行会话。

## 工作原理

1. Claude Code 触发官方 hook 事件（`SessionStart`、`UserPromptSubmit`、`Notification`、`PostToolUse`、`Stop`、`SessionEnd`），执行 `hooks/notify.js`。
2. `notify.js` 把事件映射成简化状态，POST 到本地 `127.0.0.1:47823`，由常驻的菜单栏程序（`app/main.js`，Electron）接收并更新 tray 图标/下拉菜单。
3. 关键状态（等待审批 / 已完成一轮 / 工具出错）会额外弹一条系统通知；点击通知，或在下拉菜单里点击对应会话项，都会把对应终端 App（Terminal / iTerm / Warp / VS Code，按会话启动时的 `$TERM_PROGRAM` 判断）带到前台——不做精确到窗口/tab 的跳转。识别不出终端 App 的会话项不可点击。
4. 如果菜单栏程序没在运行，`notify.js` 会直接兜底发一条系统通知，保证不会完全错过提醒。

## 安装

```bash
cd cc-notify
npm run setup   # 自动安装依赖 + 生成 LaunchAgent，让菜单栏程序登录时自动启动
```

`npm run setup` 内部会先检查依赖是否已安装，缺失时自动执行 `npm install`，再生成并加载 LaunchAgent，并校验加载是否成功。

安装后菜单栏会出现 Clawd 图标（cc-notify 的吉祥物），点击图标可以看到当前所有 Claude Code 会话及其状态。

如果菜单栏右侧图标太多，系统可能把新图标挤到不可见的区域（尤其是带摄像头刘海的机型）。此时可以按 `Control+Option+Command+C` 直接呼出会话列表菜单，不依赖图标是否可见；更彻底的办法是腾出菜单栏空间（拖动/隐藏其他图标，或用 [Ice](https://github.com/jordanbaird/Ice) 等菜单栏管理工具）。

卸载：`launchctl unload ~/Library/LaunchAgents/com.cc-notify.app.plist && rm ~/Library/LaunchAgents/com.cc-notify.app.plist`

## 在 Claude Code 里启用插件

### 永久安装（推荐）

注册为本地 marketplace 并安装，这样以后启动 `claude` 不需要任何额外参数，hooks 会一直自动注册：

```bash
claude plugin marketplace add /path/to/cc-notify
claude plugin install cc-notify@cc-notify
```

用 `claude plugin list` 确认 `cc-notify@cc-notify` 状态是 `enabled`。

卸载：`claude plugin uninstall cc-notify@cc-notify && claude plugin marketplace remove cc-notify`

### 临时加载（单次会话，不推荐长期用）

```bash
claude --plugin-dir /path/to/cc-notify
```

注意：这种方式只在当次会话生效，忘记带这个参数启动 `claude` 时 hooks 不会注册，也就完全收不到通知——这是常见的"突然收不到通知"原因，跟插件代码本身无关。

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
