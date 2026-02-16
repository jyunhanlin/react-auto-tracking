import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRegistry } from './registry'
import type { TrackEvent } from '../types'

function fakeEvent(type: string = 'click'): TrackEvent {
  return {
    type,
    timestamp: Date.now(),
    element: {
      tagName: 'BUTTON',
      id: '',
      className: '',
      text: '',
      href: null,
      role: null,
      type: null,
      dataset: {},
    },
    fiber: null,
    raw: new Event(type),
    rawFiberNode: null,
  }
}

describe('createRegistry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers and invokes callback for matching event type', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, {})
    registry.invoke(fakeEvent('click'))

    expect(cb).toHaveBeenCalledOnce()
  })

  it('does not invoke callback for non-matching event type', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, {})
    registry.invoke(fakeEvent('input'))

    expect(cb).not.toHaveBeenCalled()
  })

  it('unsubscribe function removes listener', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    const unsub = registry.add('click', cb, {})
    unsub()
    registry.invoke(fakeEvent('click'))

    expect(cb).not.toHaveBeenCalled()
  })

  it('applies debounce option', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, { debounce: 100 })
    registry.invoke(fakeEvent())
    registry.invoke(fakeEvent())
    registry.invoke(fakeEvent())

    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(cb).toHaveBeenCalledOnce()
  })

  it('applies throttle option', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, { throttle: 100 })
    registry.invoke(fakeEvent())
    registry.invoke(fakeEvent())
    registry.invoke(fakeEvent())

    expect(cb).toHaveBeenCalledOnce()
  })

  it('supports multiple listeners for same event type', () => {
    const registry = createRegistry()
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    registry.add('click', cb1, {})
    registry.add('click', cb2, {})
    registry.invoke(fakeEvent('click'))

    expect(cb1).toHaveBeenCalledOnce()
    expect(cb2).toHaveBeenCalledOnce()
  })

  it('getEventTypes returns registered types', () => {
    const registry = createRegistry()
    registry.add('click', vi.fn(), {})
    registry.add('input', vi.fn(), {})

    expect(registry.getEventTypes()).toEqual(new Set(['click', 'input']))
  })

  it('applies once option — auto-unsubscribes after first fire', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, { once: true })
    registry.invoke(fakeEvent('click'))
    registry.invoke(fakeEvent('click'))

    expect(cb).toHaveBeenCalledOnce()
  })

  it('applies selector option — only fires when target matches', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, { selector: 'nav a' })

    const navLink = document.createElement('a')
    const nav = document.createElement('nav')
    nav.appendChild(navLink)
    document.body.appendChild(nav)

    const matchingEvent = fakeEvent('click')
    Object.defineProperty(matchingEvent, 'raw', {
      value: { target: navLink },
    })
    registry.invoke(matchingEvent)
    expect(cb).toHaveBeenCalledOnce()

    const div = document.createElement('div')
    document.body.appendChild(div)
    const nonMatchingEvent = fakeEvent('click')
    Object.defineProperty(nonMatchingEvent, 'raw', {
      value: { target: div },
    })
    registry.invoke(nonMatchingEvent)
    expect(cb).toHaveBeenCalledOnce() // still 1 — not called again

    nav.remove()
    div.remove()
  })

  it('clear removes all listeners', () => {
    const registry = createRegistry()
    const cb = vi.fn()

    registry.add('click', cb, {})
    registry.clear()
    registry.invoke(fakeEvent('click'))

    expect(cb).not.toHaveBeenCalled()
  })
})
