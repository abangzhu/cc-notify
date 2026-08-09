const path = require('path')
const notifier = require('node-notifier')
const { BUNDLE_ID_BY_TERM_PROGRAM } = require('./terminalBundles')

const CONTENT_IMAGE_PATH = path.join(__dirname, 'assets', 'tray-icon@2x.png')

function sendSystemNotification({ title, message, termProgram }) {
  const bundleId = BUNDLE_ID_BY_TERM_PROGRAM[termProgram]
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
