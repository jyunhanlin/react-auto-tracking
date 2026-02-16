# React Auto Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a vanilla JS npm package that provides global interaction tracking for React 16-19 apps via DOM event delegation and fiber node introspection.

**Architecture:** Single module with event registry and category-based filter (Pointer/Form/Ambient). DOM filter handles interactive detection for pointer events, while form/ambient events pass through with minimal checks. Fiber info is enrichment only. Core is pure vanilla JS — no React runtime dependency.

**Tech Stack:** TypeScript, tsdown (bundler), Vitest + jsdom (testing), oxlint + oxc-format (linting/formatting), pnpm, changesets (versioning), GitHub Actions (CI/CD)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsdown.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (empty placeholder)

**Step 1: Initialize pnpm project**

```bash
cd /Users/jhlin/playground/react-auto-tracking
pnpm init
```

**Step 2: Install dev dependencies**

```bash
pnpm add -D typescript tsdown vitest jsdom @vitest/coverage-v8 oxlint @changesets/cli
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create tsdown.config.ts**

```typescript
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
})
```

**Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
```

**Step 6: Update package.json with proper fields**

Set these fields in `package.json`:

```json
{
  "name": "react-auto-tracking",
  "version": "0.0.0",
  "description": "Global user interaction tracking for React.js",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "oxlint src/",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "keywords": ["react", "tracking", "analytics", "interaction", "fiber"]
}
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
coverage/
*.tsbuildinfo
.DS_Store
```

**Step 8: Create empty entry point**

Create `src/index.ts` with a placeholder comment:

```typescript
// react-auto-tracking entry point
```

**Step 9: Initialize changesets**

```bash
pnpm changeset init
```

Then edit `.changeset/config.json` to set `"access": "public"`.

**Step 10: Verify scaffolding works**

```bash
pnpm build && pnpm test && pnpm lint
```

Expected: All pass (empty project, no tests yet).

**Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with tsdown, vitest, oxlint, changesets"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

**Step 1: Create all public and internal type definitions**

Create `src/types.ts`:

```typescript
// === Public Types ===

export interface TrackerConfig {
  readonly enabled?: boolean
  readonly ignoreSelectors?: readonly string[]
  readonly includeSelectors?: readonly string[]
  readonly debug?: boolean
}

export interface Tracker {
  on(eventType: string, callback: TrackCallback, options?: ListenerOptions): () => void
  getLastEvent(): TrackEvent | null
  destroy(): void
}

export interface ListenerOptions {
  readonly debounce?: number
  readonly throttle?: number
  readonly once?: boolean
  readonly selector?: string
}

export interface TrackEvent {
  readonly type: string
  readonly timestamp: number
  readonly element: ElementInfo
  readonly fiber: FiberInfo | null
  readonly raw: Event
  readonly rawFiberNode: object | null
}

export interface ElementInfo {
  readonly tagName: string
  readonly id: string
  readonly className: string
  readonly text: string
  readonly href: string | null
  readonly role: string | null
  readonly type: string | null
  readonly dataset: Readonly<Record<string, string>>
}

export interface FiberInfo {
  readonly componentName: string | null
  readonly componentStack: readonly string[]
  readonly handlers: readonly string[]
}

export type TrackCallback = (event: TrackEvent) => void

// === Internal Types ===

export interface ResolvedConfig {
  readonly enabled: boolean
  readonly ignoreSelectors: readonly string[]
  readonly includeSelectors: readonly string[] | null
  readonly debug: boolean
}

export interface ListenerEntry {
  readonly eventType: string
  readonly callback: TrackCallback
  readonly options: ListenerOptions
}
```

**Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add type definitions for public API and internal types"
```

---

### Task 3: Utility Functions (debounce + throttle)

**Files:**
- Create: `src/utils/debounce.ts`
- Create: `src/utils/throttle.ts`
- Create: `src/utils/debounce.test.ts`
- Create: `src/utils/throttle.test.ts`

**Step 1: Write failing test for debounce**

Create `src/utils/debounce.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.restoreAllTimers() })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('passes arguments to the debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a', 'b')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a', 'b')
  })

  it('cancel stops pending execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/utils/debounce.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement debounce**

Create `src/utils/debounce.ts`:

```typescript
interface DebouncedFn<T extends (...args: unknown[]) => void> {
  (...args: Parameters<T>): void
  cancel(): void
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): DebouncedFn<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, ms)
  }

  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/utils/debounce.test.ts
```

Expected: PASS

**Step 5: Write failing test for throttle**

Create `src/utils/throttle.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { throttle } from './throttle'

describe('throttle', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.restoreAllTimers() })

  it('executes immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('suppresses calls within interval', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('executes trailing call after interval', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled('third')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('passes arguments correctly', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a', 'b')
    expect(fn).toHaveBeenCalledWith('a', 'b')
  })

  it('cancel stops pending trailing call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled.cancel()

    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledOnce()
  })
})
```

**Step 6: Run test to verify it fails**

```bash
pnpm vitest run src/utils/throttle.test.ts
```

Expected: FAIL — module not found.

**Step 7: Implement throttle**

Create `src/utils/throttle.ts`:

```typescript
interface ThrottledFn<T extends (...args: unknown[]) => void> {
  (...args: Parameters<T>): void
  cancel(): void
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): ThrottledFn<T> {
  let lastCallTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now()
    const elapsed = now - lastCallTime

    if (elapsed >= ms) {
      lastCallTime = now
      fn(...args)
    } else {
      lastArgs = args
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          timeoutId = null
          lastCallTime = Date.now()
          if (lastArgs !== null) {
            fn(...lastArgs)
            lastArgs = null
          }
        }, ms - elapsed)
      }
    }
  }

  throttled.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
  }

  return throttled
}
```

**Step 8: Run test to verify it passes**

```bash
pnpm vitest run src/utils/throttle.test.ts
```

Expected: PASS

**Step 9: Commit**

```bash
git add src/utils/
git commit -m "feat: add debounce and throttle utilities with tests"
```

---

### Task 4: Element Extractor

**Files:**
- Create: `src/extract/element-extractor.ts`
- Create: `src/extract/element-extractor.test.ts`

**Step 1: Write failing test**

Create `src/extract/element-extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractElementInfo } from './element-extractor'

describe('extractElementInfo', () => {
  it('extracts basic element info', () => {
    const el = document.createElement('button')
    el.id = 'submit-btn'
    el.className = 'btn primary'
    el.textContent = 'Submit Form'

    const info = extractElementInfo(el)

    expect(info.tagName).toBe('BUTTON')
    expect(info.id).toBe('submit-btn')
    expect(info.className).toBe('btn primary')
    expect(info.text).toBe('Submit Form')
    expect(info.href).toBeNull()
    expect(info.role).toBeNull()
    expect(info.type).toBeNull()
  })

  it('extracts href from anchor element', () => {
    const el = document.createElement('a')
    el.href = 'https://example.com'

    const info = extractElementInfo(el)
    expect(info.href).toBe('https://example.com/')
    expect(info.tagName).toBe('A')
  })

  it('extracts input type', () => {
    const el = document.createElement('input')
    el.type = 'email'

    const info = extractElementInfo(el)
    expect(info.type).toBe('email')
  })

  it('extracts role attribute', () => {
    const el = document.createElement('div')
    el.setAttribute('role', 'button')

    const info = extractElementInfo(el)
    expect(info.role).toBe('button')
  })

  it('extracts dataset', () => {
    const el = document.createElement('div')
    el.dataset.trackId = 'nav-cta'
    el.dataset.trackLabel = 'signup'

    const info = extractElementInfo(el)
    expect(info.dataset).toEqual({ trackId: 'nav-cta', trackLabel: 'signup' })
  })

  it('truncates text to 100 characters', () => {
    const el = document.createElement('p')
    el.textContent = 'a'.repeat(200)

    const info = extractElementInfo(el)
    expect(info.text).toHaveLength(100)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/extract/element-extractor.test.ts
```

Expected: FAIL

**Step 3: Implement element extractor**

Create `src/extract/element-extractor.ts`:

```typescript
import type { ElementInfo } from '../types'

const MAX_TEXT_LENGTH = 100

export function extractElementInfo(element: Element): ElementInfo {
  const text = (element.textContent ?? '').trim()

  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className ?? '',
    text: text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text,
    href: isAnchorElement(element) ? element.href : null,
    role: element.getAttribute('role'),
    type: isInputElement(element) ? element.type : null,
    dataset: { ...(element as HTMLElement).dataset },
  }
}

function isAnchorElement(el: Element): el is HTMLAnchorElement {
  return el.tagName === 'A'
}

function isInputElement(el: Element): el is HTMLInputElement {
  return el.tagName === 'INPUT'
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/extract/element-extractor.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/extract/
git commit -m "feat: add element info extractor with tests"
```

---

### Task 5: Fiber Resolver

**Files:**
- Create: `src/fiber/resolver.ts`
- Create: `src/fiber/resolver.test.ts`

**Step 1: Write failing test**

Create `src/fiber/resolver.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveFiber, resetFiberKeyCache } from './resolver'

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/fiber/resolver.test.ts
```

Expected: FAIL

**Step 3: Implement fiber resolver**

Create `src/fiber/resolver.ts`:

```typescript
const FIBER_PREFIXES = ['__reactFiber$', '__reactInternalInstance$'] as const
const MAX_PARENT_DEPTH = 10

let cachedKey: string | null = null

export function resolveFiber(element: Element): object | null {
  let current: Element | null = element
  let depth = 0

  while (current !== null && depth <= MAX_PARENT_DEPTH) {
    const fiber = getFiberFromElement(current)
    if (fiber !== null) {
      return fiber
    }
    current = current.parentElement
    depth++
  }

  return null
}

function getFiberFromElement(element: Element): object | null {
  if (cachedKey !== null) {
    const fiber = (element as any)[cachedKey]
    if (fiber != null) return fiber as object
    return null
  }

  for (const key of Object.keys(element)) {
    for (const prefix of FIBER_PREFIXES) {
      if (key.startsWith(prefix)) {
        cachedKey = key
        return (element as any)[key] as object
      }
    }
  }

  return null
}

export function resetFiberKeyCache(): void {
  cachedKey = null
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/fiber/resolver.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/fiber/
git commit -m "feat: add fiber resolver with cross-version React support"
```

---

### Task 6: Fiber Extractor

**Files:**
- Create: `src/fiber/extractor.ts`
- Create: `src/fiber/extractor.test.ts`

**Step 1: Write failing test**

Create `src/fiber/extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractFiberInfo } from './extractor'

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/fiber/extractor.test.ts
```

Expected: FAIL

**Step 3: Implement fiber extractor**

Create `src/fiber/extractor.ts`:

```typescript
import type { FiberInfo } from '../types'

const MAX_STACK_DEPTH = 50
const HANDLER_PREFIX = 'on'

interface FiberNode {
  type: unknown
  memoizedProps: Record<string, unknown> | null
  return: FiberNode | null
}

export function extractFiberInfo(rawFiber: object | null): FiberInfo | null {
  if (rawFiber === null) return null

  const fiber = rawFiber as FiberNode
  const handlers = extractHandlers(fiber)
  const { componentName, componentStack } = extractComponentInfo(fiber)

  return {
    componentName,
    componentStack,
    handlers,
  }
}

function extractHandlers(fiber: FiberNode): string[] {
  const props = fiber.memoizedProps
  if (props === null || props === undefined) return []

  return Object.keys(props).filter(
    (key) => key.startsWith(HANDLER_PREFIX) && typeof props[key] === 'function',
  )
}

function extractComponentInfo(fiber: FiberNode): {
  componentName: string | null
  componentStack: string[]
} {
  const stack: string[] = []
  let componentName: string | null = null
  let current: FiberNode | null = fiber.return
  let depth = 0

  while (current !== null && depth < MAX_STACK_DEPTH) {
    const name = getComponentName(current)
    if (name !== null) {
      if (componentName === null) {
        componentName = name
      }
      stack.push(name)
    }
    current = current.return
    depth++
  }

  return { componentName, componentStack: stack }
}

function getComponentName(fiber: FiberNode): string | null {
  const type = fiber.type
  if (typeof type === 'string') return null
  if (typeof type === 'function') {
    return (type as any).displayName ?? type.name ?? null
  }
  return null
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/fiber/extractor.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/fiber/extractor.ts src/fiber/extractor.test.ts
git commit -m "feat: add fiber extractor for component name, stack, and handlers"
```

---

### Task 7: Event Categories + Filter Engine

**Files:**
- Create: `src/filter/event-categories.ts`
- Create: `src/filter/event-categories.test.ts`
- Create: `src/filter/filter-engine.ts`
- Create: `src/filter/filter-engine.test.ts`

**Step 1: Write failing test for event-categories**

Create `src/filter/event-categories.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getEventCategory, getHandlersForEvent, EventCategory } from './event-categories'

describe('getEventCategory', () => {
  it('returns Pointer for click', () => {
    expect(getEventCategory('click')).toBe(EventCategory.Pointer)
  })

  it('returns Pointer for touchstart/touchend', () => {
    expect(getEventCategory('touchstart')).toBe(EventCategory.Pointer)
    expect(getEventCategory('touchend')).toBe(EventCategory.Pointer)
  })

  it('returns Form for input/change/focus/blur/submit', () => {
    for (const type of ['input', 'change', 'focus', 'blur', 'submit']) {
      expect(getEventCategory(type)).toBe(EventCategory.Form)
    }
  })

  it('returns Ambient for scroll/keydown/keyup/copy/paste', () => {
    for (const type of ['scroll', 'keydown', 'keyup', 'copy', 'paste']) {
      expect(getEventCategory(type)).toBe(EventCategory.Ambient)
    }
  })

  it('returns Ambient for unrecognized event types', () => {
    expect(getEventCategory('custom-event')).toBe(EventCategory.Ambient)
  })
})

describe('getHandlersForEvent', () => {
  it('returns onClick handlers for click', () => {
    const handlers = getHandlersForEvent('click')
    expect(handlers).toContain('onClick')
    expect(handlers).toContain('onPointerDown')
  })

  it('returns onChange/onInput for input', () => {
    const handlers = getHandlersForEvent('input')
    expect(handlers).toContain('onChange')
    expect(handlers).toContain('onInput')
  })

  it('returns empty array for unrecognized event types', () => {
    expect(getHandlersForEvent('custom-event')).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/filter/event-categories.test.ts
```

Expected: FAIL

**Step 3: Implement event-categories**

Create `src/filter/event-categories.ts`:

```typescript
export const EventCategory = {
  Pointer: 'pointer',
  Form: 'form',
  Ambient: 'ambient',
} as const

export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory]

const EVENT_HANDLER_MAP: Readonly<Record<string, readonly string[]>> = {
  // Pointer
  click:      ['onClick', 'onMouseDown', 'onMouseUp', 'onPointerDown', 'onPointerUp'],
  touchstart: ['onTouchStart'],
  touchend:   ['onTouchEnd'],

  // Form
  input:      ['onChange', 'onInput'],
  change:     ['onChange'],
  focus:      ['onFocus'],
  blur:       ['onBlur'],
  submit:     ['onSubmit'],

  // Ambient
  scroll:     ['onScroll'],
  keydown:    ['onKeyDown'],
  keyup:      ['onKeyUp'],
  copy:       ['onCopy'],
  paste:      ['onPaste'],
}

const CATEGORY_MAP: Readonly<Record<string, EventCategory>> = {
  click: EventCategory.Pointer,
  touchstart: EventCategory.Pointer,
  touchend: EventCategory.Pointer,

  input: EventCategory.Form,
  change: EventCategory.Form,
  focus: EventCategory.Form,
  blur: EventCategory.Form,
  submit: EventCategory.Form,

  scroll: EventCategory.Ambient,
  keydown: EventCategory.Ambient,
  keyup: EventCategory.Ambient,
  copy: EventCategory.Ambient,
  paste: EventCategory.Ambient,
}

export function getEventCategory(eventType: string): EventCategory {
  return CATEGORY_MAP[eventType] ?? EventCategory.Ambient
}

export function getHandlersForEvent(eventType: string): readonly string[] {
  return EVENT_HANDLER_MAP[eventType] ?? []
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/filter/event-categories.test.ts
```

Expected: PASS

**Step 5: Write failing test for filter-engine**

Create `src/filter/filter-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getTrackableElement, isIgnored, isDisabled } from './filter-engine'

describe('isIgnored', () => {
  it('returns true when element matches ignoreSelector', () => {
    const el = document.createElement('button')
    el.className = 'no-track'
    document.body.appendChild(el)

    expect(isIgnored({ element: el, ignoreSelectors: ['.no-track'] })).toBe(true)
    el.remove()
  })

  it('returns false when element does not match', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)

    expect(isIgnored({ element: el, ignoreSelectors: ['.no-track'] })).toBe(false)
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

describe('getTrackableElement', () => {
  describe('Pointer events', () => {
    it('returns interactive element (button)', () => {
      const el = document.createElement('button')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it('returns element with interactive ARIA role', () => {
      const el = document.createElement('div')
      el.setAttribute('role', 'button')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it('returns summary element as interactive', () => {
      const el = document.createElement('summary')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it('returns details element as interactive', () => {
      const el = document.createElement('details')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it.each([
      'menuitemcheckbox', 'menuitemradio', 'treeitem', 'gridcell', 'textbox', 'searchbox',
    ])('returns element with ARIA role "%s" as interactive', (role) => {
      const el = document.createElement('div')
      el.setAttribute('role', role)
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it('returns element with React handler via fiber', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)
      ;(el as any)['__reactFiber$test'] = {
        type: 'div',
        memoizedProps: { onClick: () => {} },
        return: null,
      }

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(el)
      el.remove()
    })

    it('walks up to find interactive ancestor', () => {
      const button = document.createElement('button')
      const span = document.createElement('span')
      button.appendChild(span)
      document.body.appendChild(button)

      const result = getTrackableElement({ target: span, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBe(button)
      button.remove()
    })

    it('returns null for non-interactive element', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('button')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: ['.no-track'], eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes disabled elements', () => {
      const el = document.createElement('button')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBeNull()
      el.remove()
    })

    it('stops ancestor walk after 10 levels', () => {
      let current = document.createElement('button')
      const root = current
      for (let i = 0; i < 15; i++) {
        const child = document.createElement('div')
        current.appendChild(child)
        current = child
      }
      document.body.appendChild(root)

      const result = getTrackableElement({ target: current, ignoreSelectors: [], eventType: 'click' })
      expect(result).toBeNull()
      root.remove()
    })
  })

  describe('Form events', () => {
    it('returns the target element directly', () => {
      const el = document.createElement('input')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'input' })
      expect(result).toBe(el)
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('input')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: ['.no-track'], eventType: 'change' })
      expect(result).toBeNull()
      el.remove()
    })

    it('excludes disabled elements', () => {
      const el = document.createElement('input')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'focus' })
      expect(result).toBeNull()
      el.remove()
    })
  })

  describe('Ambient events', () => {
    it('returns the target element directly', () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'scroll' })
      expect(result).toBe(el)
      el.remove()
    })

    it('excludes ignored elements', () => {
      const el = document.createElement('div')
      el.className = 'no-track'
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: ['.no-track'], eventType: 'keydown' })
      expect(result).toBeNull()
      el.remove()
    })

    it('does NOT exclude disabled elements', () => {
      const el = document.createElement('div')
      el.setAttribute('disabled', '')
      document.body.appendChild(el)

      const result = getTrackableElement({ target: el, ignoreSelectors: [], eventType: 'scroll' })
      expect(result).toBe(el)
      el.remove()
    })
  })
})
```

**Step 6: Run test to verify it fails**

```bash
pnpm vitest run src/filter/filter-engine.test.ts
```

Expected: FAIL

**Step 7: Implement filter-engine**

Create `src/filter/filter-engine.ts`:

```typescript
import { getEventCategory, getHandlersForEvent, EventCategory } from './event-categories'
import { resolveFiber } from '../fiber/resolver'

const INTERACTIVE_TAGS = new Set([
  'BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA',
  'SUMMARY', 'DETAILS',
])

const INTERACTIVE_ROLES = new Set([
  // Original widget roles
  'button', 'link', 'menuitem', 'tab', 'checkbox', 'radio',
  'combobox', 'listbox', 'option', 'switch', 'slider', 'spinbutton',
  // Composite widget variants
  'menuitemcheckbox', 'menuitemradio', 'treeitem', 'gridcell',
  // Input widget roles
  'textbox', 'searchbox',
])

const MAX_ANCESTOR_DEPTH = 10

interface GetTrackableElementParams {
  readonly target: Element
  readonly ignoreSelectors: readonly string[]
  readonly eventType: string
}

export function getTrackableElement(params: GetTrackableElementParams): HTMLElement | null {
  const { target, ignoreSelectors, eventType } = params

  if (!(target instanceof HTMLElement)) return null

  const category = getEventCategory(eventType)

  switch (category) {
    case EventCategory.Pointer:
      return findPointerTarget(target, ignoreSelectors, eventType)
    case EventCategory.Form:
      return filterFormTarget(target, ignoreSelectors)
    case EventCategory.Ambient:
      return filterAmbientTarget(target, ignoreSelectors)
  }
}

function findPointerTarget(
  target: HTMLElement,
  ignoreSelectors: readonly string[],
  eventType: string,
): HTMLElement | null {
  let current: HTMLElement | null = target
  let depth = 0

  while (current !== null && depth <= MAX_ANCESTOR_DEPTH) {
    if (isIgnored({ element: current, ignoreSelectors })) return null
    if (isDisabled(current)) return null
    if (isInteractiveElement(current, eventType)) return current
    current = current.parentElement
    depth++
  }

  return null
}

function filterFormTarget(
  target: HTMLElement,
  ignoreSelectors: readonly string[],
): HTMLElement | null {
  if (isIgnored({ element: target, ignoreSelectors })) return null
  if (isDisabled(target)) return null
  return target
}

function filterAmbientTarget(
  target: HTMLElement,
  ignoreSelectors: readonly string[],
): HTMLElement | null {
  if (isIgnored({ element: target, ignoreSelectors })) return null
  return target
}

function isInteractiveElement(el: HTMLElement, eventType: string): boolean {
  // 1. Semantic tag
  if (INTERACTIVE_TAGS.has(el.tagName)) return true

  // 2. ARIA role
  const role = el.getAttribute('role')
  if (role !== null && INTERACTIVE_ROLES.has(role)) return true

  // 3. React event handler via fiber
  const handlers = getHandlersForEvent(eventType)
  if (handlers.length > 0) {
    const fiber = resolveFiber(el)
    if (fiber !== null) {
      const props = (fiber as any).memoizedProps
      if (props !== null && props !== undefined) {
        for (const handler of handlers) {
          if (typeof props[handler] === 'function') return true
        }
      }
    }
  }

  return false
}

export function isIgnored(params: {
  readonly element: Element
  readonly ignoreSelectors: readonly string[]
}): boolean {
  return params.ignoreSelectors.some((selector) => params.element.matches(selector))
}

export function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
}
```

**Step 8: Run test to verify it passes**

```bash
pnpm vitest run src/filter/filter-engine.test.ts
```

Expected: PASS

**Step 9: Commit**

```bash
git add src/filter/
git commit -m "feat: add event categories and filter engine with Pointer/Form/Ambient routing"
```

---

### Task 8: Event Registry

**Files:**
- Create: `src/core/registry.ts`
- Create: `src/core/registry.test.ts`

**Step 1: Write failing test**

Create `src/core/registry.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRegistry } from './registry'
import type { TrackEvent } from '../types'

function fakeEvent(type: string = 'click'): TrackEvent {
  return {
    type,
    timestamp: Date.now(),
    element: {
      tagName: 'BUTTON', id: '', className: '', text: '',
      href: null, role: null, type: null, dataset: {},
    },
    fiber: null,
    raw: new Event(type),
    rawFiberNode: null,
  }
}

describe('createRegistry', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.restoreAllTimers() })

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/core/registry.test.ts
```

Expected: FAIL

**Step 3: Implement registry**

Create `src/core/registry.ts`:

```typescript
import type { TrackEvent, TrackCallback, ListenerOptions } from '../types'
import { debounce } from '../utils/debounce'
import { throttle } from '../utils/throttle'

interface RegistryEntry {
  readonly eventType: string
  readonly originalCallback: TrackCallback
  readonly wrappedCallback: TrackCallback & { cancel?: () => void }
  readonly options: ListenerOptions
  readonly unsubscribe: () => void
}

export interface Registry {
  add(eventType: string, callback: TrackCallback, options: ListenerOptions): () => void
  invoke(event: TrackEvent): void
  getEventTypes(): Set<string>
  clear(): void
}

export function createRegistry(): Registry {
  let entries: RegistryEntry[] = []

  function createEntry(
    eventType: string,
    callback: TrackCallback,
    options: ListenerOptions,
  ): RegistryEntry {
    const wrappedCallback = wrapCallback(callback, options)
    const entry: RegistryEntry = {
      eventType,
      originalCallback: callback,
      wrappedCallback,
      options,
      unsubscribe: () => {
        wrappedCallback.cancel?.()
        entries = entries.filter((e) => e !== entry)
      },
    }
    return entry
  }

  return {
    add(eventType: string, callback: TrackCallback, options: ListenerOptions): () => void {
      const entry = createEntry(eventType, callback, options)
      entries = [...entries, entry]
      return entry.unsubscribe
    },

    invoke(event: TrackEvent): void {
      for (const entry of entries) {
        if (entry.eventType !== event.type) continue

        // selector check
        if (entry.options.selector != null) {
          const target = event.raw.target
          if (!(target instanceof Element) || !target.matches(entry.options.selector)) {
            continue
          }
        }

        entry.wrappedCallback(event)

        // once: auto-unsubscribe after first fire
        if (entry.options.once === true) {
          entry.unsubscribe()
        }
      }
    },

    getEventTypes(): Set<string> {
      return new Set(entries.map((e) => e.eventType))
    },

    clear(): void {
      for (const entry of entries) {
        entry.wrappedCallback.cancel?.()
      }
      entries = []
    },
  }
}

function wrapCallback(
  callback: TrackCallback,
  options: ListenerOptions,
): TrackCallback & { cancel?: () => void } {
  if (options.debounce != null) {
    return debounce(callback, options.debounce)
  }
  if (options.throttle != null) {
    return throttle(callback, options.throttle)
  }
  return callback
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/core/registry.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/registry.ts src/core/registry.test.ts
git commit -m "feat: add event registry with debounce/throttle/once/selector support"
```

---

### Task 9: Pipeline (Event Flow Orchestrator)

**Files:**
- Create: `src/core/pipeline.ts`
- Create: `src/core/pipeline.test.ts`

**Step 1: Write failing test**

Create `src/core/pipeline.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/core/pipeline.test.ts
```

Expected: FAIL

**Step 3: Implement pipeline**

Create `src/core/pipeline.ts`:

```typescript
import type { ResolvedConfig, TrackEvent } from '../types'
import { extractElementInfo } from '../extract/element-extractor'
import { resolveFiber } from '../fiber/resolver'
import { extractFiberInfo } from '../fiber/extractor'
import { getTrackableElement } from '../filter/filter-engine'
import { createRegistry, type Registry } from './registry'

export interface Pipeline {
  handleEvent(domEvent: Event): void
  getLastEvent(): TrackEvent | null
  readonly registry: Registry
}

export function createPipeline(config: ResolvedConfig): Pipeline {
  const registry = createRegistry()
  let lastEvent: TrackEvent | null = null

  return {
    registry,

    handleEvent(domEvent: Event): void {
      if (!config.enabled) return

      const target = domEvent.target
      if (!(target instanceof Element)) return

      // Filter: find trackable element based on event category
      const trackableElement = getTrackableElement({
        target,
        ignoreSelectors: config.ignoreSelectors,
        eventType: domEvent.type,
      })
      if (trackableElement === null) return

      // Extract info
      const elementInfo = extractElementInfo(trackableElement)
      const rawFiberNode = resolveFiber(trackableElement)
      const fiberInfo = extractFiberInfo(rawFiberNode)

      // Build payload
      const trackEvent: TrackEvent = {
        type: domEvent.type,
        timestamp: Date.now(),
        element: elementInfo,
        fiber: fiberInfo,
        raw: domEvent,
        rawFiberNode,
      }

      // Invoke callbacks → update lastEvent
      registry.invoke(trackEvent)
      lastEvent = trackEvent
    },

    getLastEvent(): TrackEvent | null {
      return lastEvent
    },
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/core/pipeline.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/pipeline.ts src/core/pipeline.test.ts
git commit -m "feat: add event pipeline with category-based filter engine"
```

---

### Task 10: Tracker (Main Entry Point)

**Files:**
- Create: `src/core/tracker.ts`
- Create: `src/core/tracker.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing test**

Create `src/core/tracker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTracker } from './tracker'
import { resetFiberKeyCache } from '../fiber/resolver'

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/core/tracker.test.ts
```

Expected: FAIL

**Step 3: Implement tracker**

Create `src/core/tracker.ts`:

```typescript
import type { Tracker, TrackerConfig, TrackCallback, ListenerOptions, ResolvedConfig } from '../types'
import { createPipeline } from './pipeline'

export function createTracker(config?: TrackerConfig): Tracker {
  const resolved = resolveConfig(config)
  const pipeline = createPipeline(resolved)
  const domListeners = new Map<string, (event: Event) => void>()
  let destroyed = false

  function ensureDomListener(eventType: string): void {
    if (domListeners.has(eventType)) return

    const handler = (event: Event): void => {
      pipeline.handleEvent(event)

      if (resolved.debug) {
        const lastEvent = pipeline.getLastEvent()
        if (lastEvent?.raw === event) {
          console.debug('[react-auto-tracking]', lastEvent)
        }
      }
    }

    document.addEventListener(eventType, handler, true)
    domListeners.set(eventType, handler)
  }

  function removeDomListener(eventType: string): void {
    const handler = domListeners.get(eventType)
    if (handler === undefined) return

    // Only remove if no more listeners for this type
    if (!pipeline.registry.getEventTypes().has(eventType)) {
      document.removeEventListener(eventType, handler, true)
      domListeners.delete(eventType)
    }
  }

  return {
    on(eventType: string, callback: TrackCallback, options?: ListenerOptions): () => void {
      if (destroyed) return () => {}

      ensureDomListener(eventType)
      const unsub = pipeline.registry.add(eventType, callback, options ?? {})

      return () => {
        unsub()
        removeDomListener(eventType)
      }
    },

    getLastEvent() {
      return pipeline.getLastEvent()
    },

    destroy(): void {
      if (destroyed) return
      destroyed = true

      pipeline.registry.clear()

      for (const [eventType, handler] of domListeners) {
        document.removeEventListener(eventType, handler, true)
      }
      domListeners.clear()
    },
  }
}

function resolveConfig(config?: TrackerConfig): ResolvedConfig {
  return {
    enabled: config?.enabled ?? true,
    ignoreSelectors: config?.ignoreSelectors ?? [],
    includeSelectors: config?.includeSelectors ?? null,
    debug: config?.debug ?? false,
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/core/tracker.test.ts
```

Expected: PASS

**Step 5: Wire up public API in index.ts**

Update `src/index.ts`:

```typescript
export { createTracker as init } from './core/tracker'
export type {
  Tracker,
  TrackerConfig,
  TrackEvent,
  ElementInfo,
  FiberInfo,
  ListenerOptions,
  TrackCallback,
} from './types'
```

**Step 6: Verify full build**

```bash
pnpm build && pnpm test && pnpm typecheck
```

Expected: All pass.

**Step 7: Commit**

```bash
git add src/core/tracker.ts src/core/tracker.test.ts src/index.ts
git commit -m "feat: add tracker entry point and wire up public API exports"
```

---

### Task 11: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

**Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Test Coverage
        run: pnpm test:coverage

      - name: Build
        run: pnpm build
```

**Step 2: Create Release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Publish
        run: pnpm publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows for CI and release"
```

---

### Task 12: Final Verification & Coverage Check

**Step 1: Run full test suite with coverage**

```bash
pnpm test:coverage
```

Expected: All tests pass, 80%+ coverage on branches/functions/lines/statements.

**Step 2: Run build**

```bash
pnpm build
```

Expected: dist/ contains `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`.

**Step 3: Run lint**

```bash
pnpm lint
```

Expected: No errors.

**Step 4: Verify package exports work**

```bash
node -e "const pkg = require('./dist/index.cjs'); console.log(typeof pkg.init)"
```

Expected: `function`

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build clean, 80%+ coverage"
```
