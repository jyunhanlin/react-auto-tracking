import { describe, it, expect, beforeEach } from 'vitest'
import { findTrackableElement, isIgnored, isDisabled } from './filter-engine'
import { resetFiberKeyCache } from '../extract/fiber'

describe('isIgnored', () => {
  it('returns true when element matches ignoreSelector', () => {
    const el = document.createElement('button')
    el.className = 'no-track'
    document.body.appendChild(el)

    expect(isIgnored(el, ['.no-track'])).toBe(true)
    el.remove()
  })

  it('returns false when element does not match', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)

    expect(isIgnored(el, ['.no-track'])).toBe(false)
    el.remove()
  })

  it('returns false for invalid CSS selector', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)

    expect(isIgnored(el, ['[invalid'])).toBe(false)
    el.remove()
  })
})

describe('isDisabled', () => {
  it('returns true for disabled attribute', () => {
    const el = document.createElement('button')
    el.setAttribute('disabled', '')
    expect(isDisabled(el)).toBe(true)
  })

  it('returns true for aria-disabled="true"', () => {
    const el = document.createElement('div')
    el.setAttribute('aria-disabled', 'true')
    expect(isDisabled(el)).toBe(true)
  })

  it('returns false for enabled elements', () => {
    const el = document.createElement('button')
    expect(isDisabled(el)).toBe(false)
  })
})

describe('findTrackableElement', () => {
  beforeEach(() => {
    resetFiberKeyCache()
  })

  function find(params: {
    target: Element
    ignoreSelectors?: readonly string[]
    eventType: string
  }) {
    return findTrackableElement({
      target: params.target,
      ignoreSelectors: params.ignoreSelectors ?? [],
      eventType: params.eventType,
    })
  }

  describe('Pointer events', () => {
    it('returns interactive element (button)', () => {
      const el = document.createElement('button')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it('returns element with interactive ARIA role', () => {
      const el = document.createElement('div')
      el.setAttribute('role', 'button')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it('returns summary element as interactive', () => {
      const el = document.createElement('summary')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it('returns details element as interactive', () => {
      const el = document.createElement('details')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it.each(['menuitemcheckbox', 'menuitemradio', 'treeitem', 'gridcell', 'textbox', 'searchbox'])(
      'returns element with ARIA role "%s" as interactive',
      (role) => {
        const el = document.createElement('div')
        el.setAttribute('role', role)
        document.body.appendChild(el)

        const result = find({ target: el, eventType: 'click' })
        expect(result?.element).toBe(el)
        el.remove()
      },
    )

    it('returns element with React handler via fiber and extracts FiberInfo', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)
      ;(el as any)['__reactFiber$test'] = {
        type: 'div',
        memoizedProps: { onClick: () => {} },
        return: {
          type: function MyButton() {},
          memoizedProps: { variant: 'primary' },
          return: null,
        },
      }

      const result = find({ target: el, eventType: 'click' })
      expect(result?.element).toBe(el)
      expect(result?.fiber?.componentName).toBe('MyButton')
      expect(result?.fiber?.props).toEqual({ onClick: expect.any(Function) })
      el.remove()
    })

    it('walks up to find interactive ancestor', () => {
      const button = document.createElement('button')
      const span = document.createElement('span')
      button.appendChild(span)
      document.body.appendChild(button)

      const result = find({ target: span, eventType: 'click' })
      expect(result?.element).toBe(button)
      button.remove()
    })

    it('walks up from SVG child to find interactive ancestor', () => {
      const button = document.createElement('button')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      svg.appendChild(path)
      button.appendChild(svg)
      document.body.appendChild(button)

      const result = find({ target: path, eventType: 'click' })
      expect(result?.element).toBe(button)
      button.remove()
    })

    it('returns null for non-interactive element', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('button')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = find({ target: el, ignoreSelectors: ['.no-track'], eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes disabled elements', () => {
      const el = document.createElement('button')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('stops ancestor walk after 10 levels', () => {
      let current: HTMLElement = document.createElement('button')
      const root = current
      for (let i = 0; i < 15; i++) {
        const child = document.createElement('div')
        current.appendChild(child)
        current = child
      }
      document.body.appendChild(root)

      const result = find({ target: current, eventType: 'click' })
      expect(result).toBeNull()
      root.remove()
    })
  })

  describe('Form events', () => {
    it('returns the target element directly', () => {
      const el = document.createElement('input')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'input' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('input')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = find({ target: el, ignoreSelectors: ['.no-track'], eventType: 'change' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes disabled elements', () => {
      const el = document.createElement('input')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'focus' })
      expect(result).toBeNull()
      el.remove()
    })
  })

  describe('Ambient events', () => {
    it('returns the target element directly', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'scroll' })
      expect(result?.element).toBe(el)
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('div')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = find({ target: el, ignoreSelectors: ['.no-track'], eventType: 'keydown' })
      expect(result).toBeNull()
      el.remove()
    })

    it('does NOT exclude disabled elements', () => {
      const el = document.createElement('div')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = find({ target: el, eventType: 'scroll' })
      expect(result?.element).toBe(el)
      el.remove()
    })
  })
})
