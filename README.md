# react-auto-tracking

Global user interaction tracking for React apps (16–19). Captures clicks, form events, and ambient events via DOM event delegation with automatic React fiber introspection.

## Features

- **Zero-config** — works with any React 16–19 app, no provider or HOC needed
- **Fiber introspection** — automatically resolves the nearest React component name and props
- **Smart filtering** — only tracks interactive elements (buttons, links, ARIA roles, elements with React handlers)
- **Three event categories** — Pointer (click), Form (input/change/focus/blur), Ambient (scroll/keydown/keyup)
- **Listener options** — debounce, throttle, once, CSS selector filtering
- **Tree-shakeable** — ESM + CJS, zero runtime dependencies

## Install

```bash
npm install react-auto-tracking
```

## Quick Start

```ts
import { init } from 'react-auto-tracking'

const tracker = init()

// Track all clicks on interactive elements
const unsubscribe = tracker.on('click', (event) => {
  console.log(event.targetElement.tagName)   // 'BUTTON'
  console.log(event.fiber?.componentName)    // 'SubmitButton'
  console.log(event.fiber?.props)            // { variant: 'primary', onClick: [Function] }
})

// Clean up
unsubscribe()     // remove this listener
tracker.destroy() // remove all listeners and DOM bindings
```

## API

### `init(config?): Tracker`

Creates a tracker instance.

```ts
const tracker = init({
  enabled: true,           // toggle tracking on/off
  ignoreSelectors: ['.no-track', '[data-private]'],
  debug: false,            // log events to console.debug
})
```

### `tracker.on(eventType, callback, options?): unsubscribe`

Register a listener for a DOM event type. Returns an unsubscribe function.

```ts
// Basic
tracker.on('click', (event) => { ... })

// With options
tracker.on('scroll', handler, { throttle: 200 })
tracker.on('input', handler, { debounce: 300 })
tracker.on('click', handler, { once: true })
tracker.on('click', handler, { selector: 'nav a' })
```

Multiple listeners can be registered for the same event type — each fires independently, similar to `addEventListener`.

### `tracker.getLastEvent(): TrackEvent | null`

Returns the most recent tracked event, or `null` if none. Useful with `visibilitychange` or `beforeunload` to capture the last interaction before the user leaves:

```ts
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const last = tracker.getLastEvent()
    if (last) {
      navigator.sendBeacon('/analytics', JSON.stringify({
        component: last.fiber?.componentName,
        element: last.targetElement.tagName,
      }))
    }
  }
})
```

### `tracker.destroy()`

Removes all listeners and DOM event bindings. The tracker instance is inert after this call.

## TrackEvent

Each callback receives a `TrackEvent`:

```ts
interface TrackEvent {
  nativeEvent: Event     // original DOM event
  targetElement: Element // resolved trackable element (may differ from nativeEvent.target)
  fiber: FiberInfo | null
}

interface FiberInfo {
  componentName: string | null              // nearest React component
  props: Readonly<Record<string, unknown>>  // component props (original types, not stringified)
}
```

The library intentionally keeps `TrackEvent` minimal — use `nativeEvent` and `targetElement` to extract any DOM information you need, and `fiber.props` to access rich, typed data from React components (avoiding the `[object Object]` problem of HTML `data-*` attributes).

## Event Categories

| Category | Events | Behavior |
|----------|--------|----------|
| **Pointer** | `click` | Walks DOM ancestors to find interactive element (button, link, ARIA role, React handler) |
| **Form** | `input`, `change`, `focus`, `blur`, `submit` | Tracks target directly, skips disabled elements |
| **Ambient** | `scroll`, `keydown`, `keyup`, `resize`, `popstate`, `hashchange` | Tracks target directly, does not skip disabled |

## How It Works

1. **DOM delegation** — attaches a single capture-phase listener per event type on `document`
2. **Filtering** — determines if the target (or ancestor) is interactive based on HTML semantics, ARIA roles, or React fiber props
3. **Fiber resolution** — finds the nearest React component and extracts its name and props
4. **Dispatch** — invokes all registered callbacks with the `TrackEvent`

Capture phase (`addEventListener(..., true)`) ensures events are caught even if `stopPropagation()` is called downstream.

## Development

```bash
pnpm install
pnpm test            # run tests
pnpm test:watch      # watch mode
pnpm test:coverage   # coverage report (80% threshold)
pnpm lint            # oxlint
pnpm format          # oxfmt (write)
pnpm format:check    # oxfmt (check only)
pnpm typecheck       # tsc --noEmit
pnpm build           # ESM + CJS + .d.ts via tsdown
```

## License

MIT
