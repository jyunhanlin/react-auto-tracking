import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPipeline } from './pipeline'
import { resetFiberKeyCache } from '../fiber/resolver'
import type { ResolvedConfig } from '../types'

function makeConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    enabled: true,
    ignoreSelectors: [],
    includeSelectors: null,
    debug: false,
    ...overrides,
  }
}

describe('createPipeline', () => {
  beforeEach(() => { resetFiberKeyCache() })

  it('processes a click on interactive element with fiber', () => {
    const config = makeConfig()
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('click', callback, {})

    const button = document.createElement('button')
    button.textContent = 'Submit'
    document.body.appendChild(button)

    const fakeComponent = function SubmitButton() {}
    const fiberNode = {
      type: 'button',
      memoizedProps: { onClick: () => {}, children: 'Submit' },
      return: {
        type: fakeComponent,
        memoizedProps: {},
        return: null,
      },
    }
    ;(button as any)['__reactFiber$test'] = fiberNode

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: button })
    pipeline.handleEvent(event)

    expect(callback).toHaveBeenCalledOnce()
    const trackEvent = callback.mock.calls[0][0]
    expect(trackEvent.type).toBe('click')
    expect(trackEvent.element.tagName).toBe('BUTTON')
    expect(trackEvent.fiber?.componentName).toBe('SubmitButton')
    expect(trackEvent.fiber?.handlers).toContain('onClick')

    button.remove()
  })

  it('skips non-interactive element for pointer events', () => {
    const config = makeConfig()
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('click', callback, {})

    const div = document.createElement('div')
    document.body.appendChild(div)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: div })
    pipeline.handleEvent(event)

    expect(callback).not.toHaveBeenCalled()
    div.remove()
  })

  it('passes form events directly (no interactive detection)', () => {
    const config = makeConfig()
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('input', callback, {})

    const input = document.createElement('input')
    document.body.appendChild(input)

    const event = new Event('input', { bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    pipeline.handleEvent(event)

    expect(callback).toHaveBeenCalledOnce()
    input.remove()
  })

  it('passes ambient events directly (no interactive detection)', () => {
    const config = makeConfig()
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('scroll', callback, {})

    const div = document.createElement('div')
    document.body.appendChild(div)

    const event = new Event('scroll', { bubbles: true })
    Object.defineProperty(event, 'target', { value: div })
    pipeline.handleEvent(event)

    expect(callback).toHaveBeenCalledOnce()
    div.remove()
  })

  it('skips element matching ignoreSelectors', () => {
    const config = makeConfig({ ignoreSelectors: ['.no-track'] })
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('click', callback, {})

    const button = document.createElement('button')
    button.className = 'no-track'
    document.body.appendChild(button)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: button })
    pipeline.handleEvent(event)

    expect(callback).not.toHaveBeenCalled()
    button.remove()
  })

  it('updates lastEvent after successful tracking', () => {
    const config = makeConfig()
    const pipeline = createPipeline(config)

    pipeline.registry.add('click', () => {}, {})

    const button = document.createElement('button')
    document.body.appendChild(button)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: button })
    pipeline.handleEvent(event)

    expect(pipeline.getLastEvent()).not.toBeNull()
    expect(pipeline.getLastEvent()?.type).toBe('click')

    button.remove()
  })

  it('does nothing when disabled', () => {
    const config = makeConfig({ enabled: false })
    const pipeline = createPipeline(config)
    const callback = vi.fn()

    pipeline.registry.add('click', callback, {})

    const button = document.createElement('button')
    document.body.appendChild(button)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: button })
    pipeline.handleEvent(event)

    expect(callback).not.toHaveBeenCalled()
    button.remove()
  })
})
