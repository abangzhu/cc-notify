import { describe, it, expect } from 'vitest'
import { applyEvent, aggregateStatus } from '../app/sessions.js'

function makeEvent(overrides) {
  return {
    sessionId: 's1',
    cwd: '/tmp/proj',
    projectName: 'proj',
    status: 'running',
    label: '运行中',
    message: '',
    ...overrides,
  }
}

describe('applyEvent', () => {
  it('adds a new session', () => {
    const sessions = applyEvent({}, makeEvent({}))
    expect(sessions.s1.status).toBe('running')
  })

  it('updates an existing session immutably', () => {
    const before = applyEvent({}, makeEvent({}))
    const after = applyEvent(before, makeEvent({ status: 'completed_turn', label: '已完成一轮' }))
    expect(before.s1.status).toBe('running')
    expect(after.s1.status).toBe('completed_turn')
    expect(after).not.toBe(before)
  })

  it('removes the session on ended status', () => {
    const before = applyEvent({}, makeEvent({}))
    const after = applyEvent(before, makeEvent({ status: 'ended', label: '会话结束' }))
    expect(after.s1).toBeUndefined()
  })

  it('keeps other sessions untouched when one is removed', () => {
    const withTwo = applyEvent(
      applyEvent({}, makeEvent({ sessionId: 's1' })),
      makeEvent({ sessionId: 's2' })
    )
    const after = applyEvent(withTwo, makeEvent({ sessionId: 's1', status: 'ended' }))
    expect(after.s1).toBeUndefined()
    expect(after.s2).toBeDefined()
  })
})

describe('aggregateStatus', () => {
  it('returns null when there are no sessions', () => {
    expect(aggregateStatus({})).toBeNull()
  })

  it('prioritizes permission_prompt over running', () => {
    const sessions = applyEvent(
      applyEvent({}, makeEvent({ sessionId: 's1', status: 'running' })),
      makeEvent({ sessionId: 's2', status: 'permission_prompt' })
    )
    expect(aggregateStatus(sessions)).toBe('permission_prompt')
  })

  it('prioritizes tool_error over completed_turn', () => {
    const sessions = applyEvent(
      applyEvent({}, makeEvent({ sessionId: 's1', status: 'completed_turn' })),
      makeEvent({ sessionId: 's2', status: 'tool_error' })
    )
    expect(aggregateStatus(sessions)).toBe('tool_error')
  })
})
