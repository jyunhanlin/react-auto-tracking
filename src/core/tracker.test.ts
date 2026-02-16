import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTracker } from './tracker'
import { resetFiberKeyCache } from '../extract/fiber'

describe('createTracker', () => {
  beforeEach(() => {
    resetFiberKeyCache()
  })

  afterEach(() => {
    // Clean up any lingering listeners
  })

  it('creates a tracker with default config', () => {
    const tracker = createTracker()
    expect(tracker).toBeDefined()
    expect(tracker.on).toBeTypeOf('function')
    expect(tracker.getLastEvent).toBeTypeOf('function')
    expect(tracker.destroy).toBeTypeOf('function')
    tracker.destroy()
  })

  it('on() returns unsubscribe function', () => {
    const tracker = createTracker()
    const unsub = tracker.on('click', vi.fn())
    expect(unsub).toBeTypeOf('function')
    unsub()
    tracker.destroy()
  })

  it('getLastEvent returns null initially', () => {
    const tracker = createTracker()
    expect(tracker.getLastEvent()).toBeNull()
    tracker.destroy()
  })

  it('attaches capture listener on document for registered event types', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const tracker = createTracker()

    tracker.on('click', vi.fn())
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), true)

    tracker.destroy()
    addSpy.mockRestore()
  })

  it('removes capture listener on destroy', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const tracker = createTracker()

    tracker.on('click', vi.fn())
    tracker.destroy()

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
    removeSpy.mockRestore()
  })

  it('tracks click on interactive element with fiber', () => {
    const tracker = createTracker()
    const cb = vi.fn()

    tracker.on('click', cb)

    const button = document.createElement('button')
    button.textContent = 'Click'
    document.body.appendChild(button)
    ;(button as any)['__reactFiber$test'] = {
      type: 'button',
      memoizedProps: { onClick: () => {} },
      return: { type: function App() {}, memoizedProps: {}, return: null },
    }

    button.click()

    expect(cb).toHaveBeenCalledOnce()
    expect(tracker.getLastEvent()?.type).toBe('click')

    button.remove()
    tracker.destroy()
  })

  it('respects enabled: false config', () => {
    const tracker = createTracker({ enabled: false })
    const cb = vi.fn()

    tracker.on('click', cb)

    const button = document.createElement('button')
    document.body.appendChild(button)
    button.click()

    expect(cb).not.toHaveBeenCalled()

    button.remove()
    tracker.destroy()
  })

  it('destroy prevents further tracking', () => {
    const tracker = createTracker()
    const cb = vi.fn()

    tracker.on('click', cb)
    tracker.destroy()

    const button = document.createElement('button')
    document.body.appendChild(button)
    button.click()

    expect(cb).not.toHaveBeenCalled()
    button.remove()
  })

  it('supports multiple listeners for same event type', () => {
    const tracker = createTracker()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const cb3 = vi.fn()

    tracker.on('click', cb1)
    tracker.on('click', cb2)
    tracker.on('click', cb3)

    const button = document.createElement('button')
    document.body.appendChild(button)

    button.click()

    expect(cb1).toHaveBeenCalledOnce()
    expect(cb2).toHaveBeenCalledOnce()
    expect(cb3).toHaveBeenCalledOnce()

    button.remove()
    tracker.destroy()
  })

  it('unsubscribing one listener does not affect others', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const tracker = createTracker()
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    const unsub1 = tracker.on('click', cb1)
    tracker.on('click', cb2)

    // only one DOM listener should be added
    const addCalls = addSpy.mock.calls.filter(([type]) => type === 'click')
    expect(addCalls).toHaveLength(1)

    // unsubscribe cb1, cb2 is still registered → DOM listener stays
    unsub1()
    const removeCalls = removeSpy.mock.calls.filter(([type]) => type === 'click')
    expect(removeCalls).toHaveLength(0)

    const button = document.createElement('button')
    document.body.appendChild(button)
    button.click()

    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledOnce()

    button.remove()
    tracker.destroy()
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('removes DOM listener only when last callback for that type unsubscribes', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const tracker = createTracker()

    const unsub1 = tracker.on('click', vi.fn())
    const unsub2 = tracker.on('click', vi.fn())

    unsub1()
    // still one click listener in registry → DOM listener stays
    expect(removeSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(0)

    unsub2()
    // no more click listeners → DOM listener removed
    expect(removeSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1)

    removeSpy.mockRestore()
    tracker.destroy()
  })

  it('logs events when debug is true', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const tracker = createTracker({ debug: true })

    tracker.on('click', vi.fn())

    const button = document.createElement('button')
    document.body.appendChild(button)
    ;(button as any)['__reactFiber$test'] = {
      type: 'button',
      memoizedProps: { onClick: () => {} },
      return: null,
    }

    button.click()

    expect(consoleSpy).toHaveBeenCalled()

    button.remove()
    tracker.destroy()
    consoleSpy.mockRestore()
  })
})
