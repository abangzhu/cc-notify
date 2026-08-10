const { execFile } = require('child_process')
const { BUNDLE_ID_BY_TERM_PROGRAM } = require('./terminalBundles')

function focusTerminalApp(termProgram) {
  const bundleId = BUNDLE_ID_BY_TERM_PROGRAM[termProgram]
  if (!bundleId) return
  execFile('open', ['-b', bundleId], (error) => {
    if (error) console.error('无法唤起终端 App:', error)
  })
}

module.exports = { focusTerminalApp }
