function upsertSession(sessions, event) {
  return {
    ...sessions,
    [event.sessionId]: {
      ...sessions[event.sessionId],
      ...event,
      updatedAt: Date.now(),
    },
  }
}

function removeSession(sessions, sessionId) {
  const { [sessionId]: _removed, ...rest } = sessions
  return rest
}

function applyEvent(sessions, event) {
  if (event.status === 'ended') return removeSession(sessions, event.sessionId)
  return upsertSession(sessions, event)
}

const STATUS_PRIORITY = ['permission_prompt', 'tool_error', 'idle', 'completed_turn', 'running', 'notification']

function aggregateStatus(sessions) {
  const statuses = new Set(Object.values(sessions).map((session) => session.status))
  return STATUS_PRIORITY.find((status) => statuses.has(status)) ?? null
}

module.exports = { upsertSession, removeSession, applyEvent, aggregateStatus }
