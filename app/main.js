const { app, Tray, Menu, nativeImage } = require('electron')
const { createEventServer, PORT } = require('./server')
const { applyEvent, aggregateStatus } = require('./sessions')
const { sendSystemNotification } = require('./notifier')

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

function renderMenu() {
  const entries = Object.values(sessions)
  if (entries.length === 0) {
    return Menu.buildFromTemplate([{ label: '暂无运行中的 Claude Code 会话', enabled: false }])
  }
  const items = entries
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => ({
      label: `${session.projectName} — ${STATUS_LABEL[session.status] ?? session.status}`,
      enabled: false,
    }))
  return Menu.buildFromTemplate(items)
}

function renderTrayTitle() {
  const status = aggregateStatus(sessions)
  return status ? (STATUS_LABEL[status] ?? '●').slice(0, 2) : '●'
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
  tray = new Tray(nativeImage.createEmpty())
  refreshTray()
  createEventServer(handleEvent).listen(PORT, '127.0.0.1')
})

app.on('window-all-closed', (event) => event.preventDefault())
