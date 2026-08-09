const notifier = require('node-notifier')

const BUNDLE_ID_BY_TERM_PROGRAM = {
  Apple_Terminal: 'com.apple.Terminal',
  'iTerm.app': 'com.googlecode.iterm2',
  WarpTerminal: 'dev.warp.Warp-Stable',
  vscode: 'com.microsoft.VSCode',
}

function sendSystemNotification({ title, message, termProgram }) {
  const activate = BUNDLE_ID_BY_TERM_PROGRAM[termProgram]
  return new Promise((resolve) => {
    notifier.notify({ title, message, sound: true, ...(activate ? { activate } : {}) }, () => resolve())
  })
}

module.exports = { sendSystemNotification }
