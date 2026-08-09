import { describe, it, expect } from 'vitest'
import { mapPayloadToEvent, isPriorityStatus } from '../app/mapEvent.js'

const env = { TERM_PROGRAM: 'Apple_Terminal' }

describe('mapPayloadToEvent', () => {
  it('maps SessionStart to running', () => {
    const event = mapPayloadToEvent(
      { hook_event_name: 'SessionStart', session_id: 's1', cwd: '/tmp/proj' },
      env
    )
    expect(event).toMatchObject({ status: 'running', projectName: 'proj', sessionId: 's1' })
  })

  it('maps Notification permission_prompt', () => {
    const event = mapPayloadToEvent(
      {
        hook_event_name: 'Notification',
        session_id: 's1',
        cwd: '/tmp/proj',
        notification_type: 'permission_prompt',
        message: 'Bash needs approval',
      },
      env
    )
    expect(event.status).toBe('permission_prompt')
  })

  it('maps Notification idle_prompt', () => {
    const event = mapPayloadToEvent(
      { hook_event_name: 'Notification', session_id: 's1', cwd: '/tmp/proj', notification_type: 'idle_prompt' },
      env
    )
    expect(event.status).toBe('idle')
  })

  it('maps Stop to completed_turn', () => {
    const event = mapPayloadToEvent({ hook_event_name: 'Stop', session_id: 's1', cwd: '/tmp/proj' }, env)
    expect(event.status).toBe('completed_turn')
  })

  it('maps SessionEnd to ended', () => {
    const event = mapPayloadToEvent({ hook_event_name: 'SessionEnd', session_id: 's1', cwd: '/tmp/proj' }, env)
    expect(event.status).toBe('ended')
  })

  it('ignores PostToolUse without error', () => {
    const event = mapPayloadToEvent(
      { hook_event_name: 'PostToolUse', session_id: 's1', cwd: '/tmp/proj', tool_response: { ok: true } },
      env
    )
    expect(event).toBeNull()
  })

  it('maps PostToolUse with error to tool_error', () => {
    const event = mapPayloadToEvent(
      {
        hook_event_name: 'PostToolUse',
        session_id: 's1',
        cwd: '/tmp/proj',
        tool_name: 'Bash',
        tool_response: { isError: true },
      },
      env
    )
    expect(event.status).toBe('tool_error')
  })

  it('ignores unknown hook events', () => {
    const event = mapPayloadToEvent({ hook_event_name: 'PreCompact', session_id: 's1', cwd: '/tmp/proj' }, env)
    expect(event).toBeNull()
  })

  it('throws on payload missing hook_event_name', () => {
    expect(() => mapPayloadToEvent({ session_id: 's1' }, env)).toThrow()
  })
})

describe('isPriorityStatus', () => {
  it('flags permission_prompt, tool_error and completed_turn as priority', () => {
    expect(isPriorityStatus('permission_prompt')).toBe(true)
    expect(isPriorityStatus('tool_error')).toBe(true)
    expect(isPriorityStatus('completed_turn')).toBe(true)
    expect(isPriorityStatus('running')).toBe(false)
  })
})
