const path = require('path')
const { execFile } = require('child_process')
const { app, Tray, Menu, nativeImage, globalShortcut } = require('electron')
const { createEventServer, PORT } = require('./server')
const { applyEvent, aggregateStatus } = require('./sessions')
const { sendSystemNotification } = require('./notifier')
const { BUNDLE_ID_BY_TERM_PROGRAM } = require('./terminalBundles')

let sessions = {}
let tray = null

const STATUS_LABEL = {
  permission_prompt: '⚠️ 等待审批',
  tool_error: '❗ 工具出错',
  idle: '💤 空闲',
  completed_turn: '✅ 已完成',
  running: '🔵 运行中',
  notification: '🔔 通知',
}

const NOTIFY_STATUSES = new Set(['permission_prompt', 'completed_turn', 'tool_error'])
const MENU_SHORTCUT = 'Control+Option+Command+C'

function focusTerminalApp(termProgram) {
  const bundleId = BUNDLE_ID_BY_TERM_PROGRAM[termProgram]
  if (!bundleId) return
  execFile('open', ['-b', bundleId], (error) => {
    if (error) console.error('无法唤起终端 App:', error)
  })
}

function renderMenu() {
  const entries = Object.values(sessions)
  if (entries.length === 0) {
    return Menu.buildFromTemplate([{ label: '暂无运行中的 Claude Code 会话', enabled: false }])
  }
  const items = entries
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => {
      const bundleId = BUNDLE_ID_BY_TERM_PROGRAM[session.termProgram]
      return {
        label: `${session.projectName} — ${STATUS_LABEL[session.status] ?? session.status}`,
        enabled: Boolean(bundleId),
        click: bundleId ? () => focusTerminalApp(session.termProgram) : undefined,
      }
    })
  return Menu.buildFromTemplate(items)
}

function renderTrayTooltip() {
  const status = aggregateStatus(sessions)
  return status ? `cc-notify · ${STATUS_LABEL[status] ?? status}` : 'cc-notify'
}

function refreshTray() {
  tray.setToolTip(renderTrayTooltip())
  tray.setContextMenu(renderMenu())
}

function handleEvent(event) {
  const previousStatus = sessions[event.sessionId]?.status
  sessions = applyEvent(sessions, event)
  refreshTray()

  if (NOTIFY_STATUSES.has(event.status) && previousStatus !== event.status) {
    sendSystemNotification({
      title: `${event.projectName} · ${event.label}`,
      message: event.message || event.label,
      termProgram: event.termProgram,
    })
  }
}

app.whenReady().then(() => {
  app.dock?.hide()
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray-icon.png'))
  tray = new Tray(icon)
  refreshTray()
  createEventServer(handleEvent).listen(PORT, '127.0.0.1')

  // 菜单栏图标可能因空间不足被系统挤出可见区域（尤其是带摄像头刘海的机型），
  // 保留一个全局快捷键作为兜底入口，不依赖图标本身是否可见。
  globalShortcut.register(MENU_SHORTCUT, () => tray.popUpContextMenu())
})

app.on('window-all-closed', (event) => event.preventDefault())
app.on('will-quit', () => globalShortcut.unregisterAll())
