const path = require('path')
const { execFile } = require('child_process')
const { app, Tray, Menu, nativeImage } = require('electron')
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

const STATUS_GLYPH = {
  permission_prompt: '⚠️',
  tool_error: '❗',
  idle: '💤',
  completed_turn: '✅',
  running: '🔵',
  notification: '🔔',
}

const NOTIFY_STATUSES = new Set(['permission_prompt', 'completed_turn', 'tool_error'])

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

function renderTrayTitle() {
  const status = aggregateStatus(sessions)
  return status ? STATUS_GLYPH[status] ?? '●' : '●'
}

function refreshTray() {
  tray.setTitle(renderTrayTitle())
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
})

app.on('window-all-closed', (event) => event.preventDefault())
