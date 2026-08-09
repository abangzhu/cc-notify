#!/usr/bin/env node
const { mapPayloadToEvent, isPriorityStatus } = require('../app/mapEvent')
const { sendSystemNotification } = require('../app/notifier')

const SERVER_URL = 'http://127.0.0.1:47823/event'
const FETCH_TIMEOUT_MS = 300

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      raw += chunk
    })
    process.stdin.on('end', () => resolve(raw))
    process.stdin.on('error', reject)
  })
}

async function reportToApp(event) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const raw = await readStdin()
  if (!raw.trim()) return

  const payload = JSON.parse(raw)
  const event = mapPayloadToEvent(payload, process.env)
  if (!event) return

  const delivered = await reportToApp(event)
  if (!delivered && isPriorityStatus(event.status)) {
    await sendSystemNotification({
      title: `${event.projectName} · ${event.label}`,
      message: event.message || event.label,
      termProgram: event.termProgram,
    })
  }
}

main()
  .catch(() => {})
  .finally(() => process.exit(0))
