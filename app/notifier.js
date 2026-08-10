const path = require('path')
const notifier = require('node-notifier')
const { BUNDLE_ID_BY_TERM_PROGRAM } = require('./terminalBundles')
const { focusTerminalApp } = require('./focusTerminal')

const CONTENT_IMAGE_PATH = path.join(__dirname, 'assets', 'tray-icon@2x.png')

// terminal-notifier 自带的 `-activate <bundleId>` 点击激活机制对部分终端(例如 Ghostty)
// 不可靠，改成监听点击事件后自己用 `open -b` 唤起，跟菜单栏点击走同一条路径。
let pendingTermProgram = null
notifier.on('click', () => {
  if (pendingTermProgram) focusTerminalApp(pendingTermProgram)
})

function sendSystemNotification({ title, message, termProgram }) {
  const bundleId = BUNDLE_ID_BY_TERM_PROGRAM[termProgram]
  pendingTermProgram = termProgram
  return new Promise((resolve) => {
    notifier.notify(
      {
        title,
        message,
        sound: true,
        contentImage: CONTENT_IMAGE_PATH,
        ...(bundleId ? { activate: bundleId } : {}),
      },
      () => resolve()
    )
  })
}

module.exports = { sendSystemNotification }
