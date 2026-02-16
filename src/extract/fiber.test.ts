import { describe, it, expect, beforeEach } from 'vitest'
import { resolveFiber, resetFiberKeyCache, extractFiberInfo } from './fiber'

// === resolveFiber ===

describe('resolveFiber', () => {
  beforeEach(() => {
    resetFiberKeyCache()
  })

  it('returns null for element without fiber', () => {
    const el = document.createElement('div')
    expect(resolveFiber(el)).toBeNull()
  })

  it('finds fiber with __reactFiber$ prefix (React 18+)', () => {
    const el = document.createElement('div')
    const fakeFiber = { type: 'div', memoizedProps: {} }
    ;(el as any)['__reactFiber$abc123'] = fakeFiber

    expect(resolveFiber(el)).toBe(fakeFiber)
  })

  it('finds fiber with __reactInternalInstance$ prefix (React 16-17)', () => {
    const el = document.createElement('div')
    const fakeFiber = { type: 'div', memoizedProps: {} }
    ;(el as any)['__reactInternalInstance$xyz789'] = fakeFiber

    expect(resolveFiber(el)).toBe(fakeFiber)
  })

  it('caches the discovered key prefix', () => {
    const el1 = document.createElement('div')
    const fiber1 = { type: 'div', memoizedProps: {} }
    ;(el1 as any)['__reactFiber$abc'] = fiber1

    const el2 = document.createElement('span')
    const fiber2 = { type: 'span', memoizedProps: {} }
    ;(el2 as any)['__reactFiber$abc'] = fiber2

    resolveFiber(el1)
    expect(resolveFiber(el2)).toBe(fiber2)
  })

  it('walks up parent elements when target has no fiber', () => {
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)

    const fakeFiber = { type: 'div', memoizedProps: {} }
    ;(parent as any)['__reactFiber$abc'] = fakeFiber

    expect(resolveFiber(child)).toBe(fakeFiber)
  })

  it('stops walking after max depth (10 levels)', () => {
    let current = document.createElement('div')
    const root = current
    for (let i = 0; i < 15; i++) {
      const child = document.createElement('div')
      current.appendChild(child)
      current = child
    }

    const fakeFiber = { type: 'div', memoizedProps: {} }
    ;(root as any)['__reactFiber$abc'] = fakeFiber

    // child is 15 levels deep, should not find fiber (max 10)
    expect(resolveFiber(current)).toBeNull()
  })
})

// === extractFiberInfo ===

// Helper to create a fake fiber node structure
function createFiber(overrides: Record<string, unknown> = {}) {
  return {
    type: 'div',
    memoizedProps: {},
    return: null,
    ...overrides,
  }
}

describe('extractFiberInfo', () => {
  it('returns null for null fiber', () => {
    expect(extractFiberInfo(null)).toBeNull()
  })

  it('extracts component name from function component', () => {
    const fiber = createFiber({
      return: createFiber({
        type: function MyButton() {},
      }),
    })

    const info = extractFiberInfo(fiber)
    expect(info?.componentName).toBe('MyButton')
  })

  it('extracts component name from class component', () => {
    class MyComponent {}
    const fiber = createFiber({
      return: createFiber({
        type: MyComponent,
      }),
    })

    const info = extractFiberInfo(fiber)
    expect(info?.componentName).toBe('MyComponent')
  })

  it('extracts displayName when available', () => {
    const Component = () => {}
    Component.displayName = 'CustomName'

    const fiber = createFiber({
      return: createFiber({ type: Component }),
    })

    const info = extractFiberInfo(fiber)
    expect(info?.componentName).toBe('CustomName')
  })

  it('extracts event handlers from memoizedProps', () => {
    const fiber = createFiber({
      memoizedProps: {
        onClick: () => {},
        onMouseDown: () => {},
        className: 'btn',
        children: 'Click me',
      },
    })

    const info = extractFiberInfo(fiber)
    expect(info?.handlers).toEqual(['onClick', 'onMouseDown'])
  })

  it('builds component stack from fiber tree', () => {
    const appFiber = createFiber({
      type: function App() {},
      return: null,
    })
    const formFiber = createFiber({
      type: function Form() {},
      return: appFiber,
    })
    const buttonFiber = createFiber({
      type: function SubmitButton() {},
      return: formFiber,
    })
    const hostFiber = createFiber({
      type: 'button',
      return: buttonFiber,
    })

    const info = extractFiberInfo(hostFiber)
    expect(info?.componentStack).toEqual(['SubmitButton', 'Form', 'App'])
  })

  it('skips non-component fiber nodes in stack', () => {
    const appFiber = createFiber({
      type: function App() {},
      return: null,
    })
    // host element fiber (string type) should be skipped
    const divFiber = createFiber({
      type: 'div',
      return: appFiber,
    })
    const btnFiber = createFiber({
      type: function Button() {},
      return: divFiber,
    })

    const info = extractFiberInfo(btnFiber)
    expect(info?.componentStack).toEqual(['App'])
  })
})
