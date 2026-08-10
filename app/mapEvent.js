const { z } = require('zod')

const hookPayloadSchema = z
  .object({
    hook_event_name: z.string(),
    session_id: z.string().optional(),
    cwd: z.string().optional(),
    notification_type: z.string().optional(),
    message: z.string().optional(),
    title: z.string().optional(),
    tool_name: z.string().optional(),
    tool_response: z.unknown().optional(),
  })
  .passthrough()

const PRIORITY_STATUSES = new Set(['permission_prompt', 'tool_error', 'completed_turn'])

function projectNameFromCwd(cwd) {
  if (!cwd) return 'unknown'
  const segments = cwd.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? 'unknown'
}

function toolResponseIsError(toolResponse) {
  if (!toolResponse || typeof toolResponse !== 'object') return false
  return Boolean(toolResponse.isError || toolResponse.is_error || toolResponse.error)
}

function statusForNotification(payload) {
  const type = payload.notification_type ?? ''
  const text = `${payload.title ?? ''} ${payload.message ?? ''}`.toLowerCase()
  if (type === 'permission_prompt' || text.includes('permission')) return 'permission_prompt'
  if (type === 'idle_prompt' || text.includes('idle') || text.includes('waiting')) return 'idle'
  return 'notification'
}

function mapPayloadToEvent(payload, env = {}) {
  const validated = hookPayloadSchema.parse(payload)
  const sessionId = validated.session_id ?? 'unknown'
  const cwd = validated.cwd ?? env.PWD ?? 'unknown'
  const base = {
    sessionId,
    cwd,
    projectName: projectNameFromCwd(cwd),
    termProgram: env.TERM_PROGRAM,
    message: validated.message ?? validated.title ?? '',
  }

  switch (validated.hook_event_name) {
    case 'SessionStart':
      return { ...base, status: 'running', label: '会话开始' }
    case 'UserPromptSubmit':
      return { ...base, status: 'running', label: '运行中' }
    case 'Notification': {
      const status = statusForNotification(validated)
      if (status === 'permission_prompt') return { ...base, status, label: '等待权限审批' }
      if (status === 'idle') return { ...base, status, label: '空闲等待输入' }
      return { ...base, status, label: validated.title ?? '通知' }
    }
    case 'PostToolUse':
      if (toolResponseIsError(validated.tool_response)) {
        return { ...base, status: 'tool_error', label: `工具执行出错：${validated.tool_name ?? ''}` }
      }
      return { ...base, status: 'running', label: '工具执行完成' }
    case 'Stop':
      return { ...base, status: 'completed_turn', label: '已完成一轮' }
    case 'SessionEnd':
      return { ...base, status: 'ended', label: '会话结束' }
    default:
      return null
  }
}

function isPriorityStatus(status) {
  return PRIORITY_STATUSES.has(status)
}

module.exports = { hookPayloadSchema, mapPayloadToEvent, isPriorityStatus, projectNameFromCwd }
