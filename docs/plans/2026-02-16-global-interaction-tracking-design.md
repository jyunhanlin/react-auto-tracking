# React Auto Tracking — Design Document

**Date:** 2026-02-16
**Status:** Approved

## Overview

A vanilla JS library (npm package) that provides global interaction tracking for React applications. It listens to DOM events at the document level, uses React fiber nodes attached to DOM elements to extract component information, and fires callbacks with rich event payloads.

Supports React 16, 17, 18, and 19.

## Public API

```ts
import { init } from 'react-auto-tracking'

const tracker = init(config?)
tracker.on(eventType, callback, options?)    // returns unsubscribe function
tracker.getLastEvent()                       // returns TrackEvent | null
tracker.destroy()                            // cleanup all listeners
```

### Types

```ts
interface TrackerConfig {
  enabled?: boolean; // default: true
  ignoreSelectors?: string[]; // CSS selectors to exclude (highest priority)
  includeSelectors?: string[]; // if set, switches to allowlist mode
  debug?: boolean; // default: false
}

interface Tracker {
  on(eventType: string, callback: TrackCallback, options?: ListenerOptions): () => void;
  getLastEvent(): TrackEvent | null;
  destroy(): void;
}

interface ListenerOptions {
  debounce?: number; // ms
  throttle?: number; // ms
  once?: boolean; // auto-unsubscribe after first fire (default: false)
  selector?: string; // CSS selector — only fire callback when target matches
}

type TrackCallback = (event: TrackEvent) => void;
```

### Event Payload

```ts
interface TrackEvent {
  type: string; // DOM event type
  timestamp: number;

  // Processed data (primary API)
  element: ElementInfo;
  fiber: FiberInfo | null; // null if no fiber found

  // Raw references (advanced usage)
  raw: Event;
  rawFiberNode: object | null;
}

interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  text: string; // innerText, truncated to 100 chars
  href: string | null;
  role: string | null;
  type: string | null; // input type
  dataset: Record<string, string>; // data-* attributes
}

interface FiberInfo {
  componentName: string | null;
  componentStack: string[]; // bottom-up: ['SubmitButton', 'Form', 'App']
  handlers: string[]; // e.g. ['onClick', 'onMouseDown']
}
```

## Architecture

### Event Flow

```
DOM Event (capture phase on document)
  │
  ├─ 1. Filter by event category:
  │     │
  │     ├─ [Pointer: click, touchstart, touchend]
  │     │     ├─ ignoreSelectors → exclude
  │     │     ├─ disabled / aria-disabled="true" → exclude
  │     │     ├─ includeSelectors → allowlist (if configured)
  │     │     └─ interactive detection (if no includeSelectors):
  │     │           self (tag/role) → self (React handler) → ancestor walk (max 10 levels)
  │     │
  │     ├─ [Form: input, change, focus, blur, submit]
  │     │     ├─ ignoreSelectors → exclude
  │     │     └─ disabled / aria-disabled="true" → exclude
  │     │
  │     └─ [Ambient: scroll, keydown, keyup, copy, paste]
  │           └─ ignoreSelectors → exclude
  │
  │     ✗ → skip
  │
  ├─ 2. Resolve Fiber Node from trackable element
  ├─ 3. Extract FiberInfo + ElementInfo
  │
  ├─ 4. Build TrackEvent payload (fiber: null if not found)
  ├─ 5. Call registered callbacks (apply per-listener selector/once)
  └─ 6. Update lastEvent
```

### Module Structure

| Module                             | Responsibility                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `src/core/tracker.ts`              | Main entry, lifecycle management (init, destroy)                                    |
| `src/core/registry.ts`             | Manage on/off listener registration, debounce/throttle/once/selector wrapping       |
| `src/core/pipeline.ts`             | Orchestrate extract → filter → callback flow                                        |
| `src/fiber/resolver.ts`            | Find fiber node from DOM element (React 16-19 support)                              |
| `src/fiber/extractor.ts`           | Extract componentName, handlers, componentStack from fiber                          |
| `src/filter/event-categories.ts`   | EVENT_HANDLER_MAP, event category definitions (Pointer/Form/Ambient)                |
| `src/filter/filter-engine.ts`      | Event category routing, interactive detection, ignore/disabled check, ancestor walk |
| `src/extract/element-extractor.ts` | Extract ElementInfo from DOM element                                                |
| `src/utils/debounce.ts`            | Debounce implementation                                                             |
| `src/utils/throttle.ts`            | Throttle implementation                                                             |
| `src/index.ts`                     | Public API exports                                                                  |

### Fiber Resolution (Cross-Version Support)

React stores fiber references on DOM elements with version-specific key prefixes:

- React 16-17: `__reactInternalInstance$xxxxx`
- React 18-19: `__reactFiber$xxxxx`

Strategy:

- Scan element property keys for matching prefix on first lookup
- Cache the discovered prefix for subsequent lookups
- Walk up parent elements if target has no fiber (max 10 levels)

## Filter Logic

### filterEngine.ts

```ts
getTrackableElement({ target, ignoreSelectors, eventType }): HTMLElement | null
isInteractiveElement(el: HTMLElement, eventType: string): boolean
isIgnored({ element, ignoreSelectors }): boolean
isDisabled(el: HTMLElement): boolean
```

**`getTrackableElement`** is the main entry. Filter strategy depends on event category:

### Event Categories

| Category    | Events                                        | Filter strategy                                                |
| ----------- | --------------------------------------------- | -------------------------------------------------------------- |
| **Pointer** | `click`, `touchstart`, `touchend`             | ignoreSelectors + disabled + interactive detection (full)      |
| **Form**    | `input`, `change`, `focus`, `blur`, `submit`  | ignoreSelectors + disabled (browser already constrains target) |
| **Ambient** | `scroll`, `keydown`, `keyup`, `copy`, `paste` | ignoreSelectors only (can fire on any element)                 |

For unrecognized event types, treat as Ambient (ignoreSelectors only).

### Interactive Detection (Pointer events only)

Detection order (per element):
1. Semantic tag → 2. ARIA role → 3. React handler via fiber props

If none match, walk up to parent and repeat (max 10 levels).

```ts
const INTERACTIVE_TAGS = new Set([
  'BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA',
  'SUMMARY', 'DETAILS',
]);

const INTERACTIVE_ROLES = new Set([
  // Original widget roles
  'button', 'link', 'menuitem', 'tab', 'checkbox', 'radio',
  'combobox', 'listbox', 'option', 'switch', 'slider', 'spinbutton',
  // Composite widget variants
  'menuitemcheckbox', 'menuitemradio', 'treeitem', 'gridcell',
  // Input widget roles
  'textbox', 'searchbox',
]);

const MAX_ANCESTOR_DEPTH = 10;
```

React handler check uses `EVENT_HANDLER_MAP` (see below) to match by event type.

**`includeSelectors` override:** if configured, replace interactive detection with allowlist matching (Pointer events only, ignored for Form/Ambient).

### Event-Handler Mapping

React handler detection varies by the DOM event type being tracked:

```ts
const EVENT_HANDLER_MAP: Record<string, string[]> = {
  // Pointer
  click: ['onClick', 'onMouseDown', 'onMouseUp', 'onPointerDown', 'onPointerUp'],
  touchstart: ['onTouchStart'],
  touchend: ['onTouchEnd'],

  // Form
  input: ['onChange', 'onInput'],
  change: ['onChange'],
  focus: ['onFocus'],
  blur: ['onBlur'],
  submit: ['onSubmit'],

  // Ambient
  scroll: ['onScroll'],
  keydown: ['onKeyDown'],
  keyup: ['onKeyUp'],
  copy: ['onCopy'],
  paste: ['onPaste'],
};
```

Handler mapping is used for interactive detection (Pointer) and as enrichment data for FiberInfo.handlers (all categories).

Fiber info is enrichment — attached when available (`fiber: null` if not found), never used as a gate.

## Build & Tooling

| Item            | Choice             |
| --------------- | ------------------ |
| Language        | TypeScript         |
| Bundler         | tsdown             |
| Output          | ESM + CJS + .d.ts  |
| Testing         | Vitest             |
| Linting         | oxlint             |
| Formatting      | oxc-format (oxfmt) |
| Package manager | pnpm               |
| Versioning      | changesets         |
| Min Node        | 18+                |
| Min browser     | ES2020             |

## CI/CD (GitHub Actions)

### CI — PR + push to main

```
pnpm install
  → oxlint
  → oxc-format --check
  → vitest run
  → vitest run --coverage (threshold: 80%)
  → tsdown (build check)
```

### Release — tag push (v\*)

```
pnpm install
  → vitest run
  → tsdown
  → pnpm publish (NPM_TOKEN secret required)
```

Versioning managed via changesets for automated changelog and version bumps.

## Usage Example

```ts
import { init } from 'react-auto-tracking';

const tracker = init({
  enabled: true,
  ignoreSelectors: ['.no-track', '[data-no-track]'],
  debug: false,
});

// Track clicks
tracker.on(
  'click',
  (event) => {
    analytics.send('click', {
      component: event.fiber?.componentName,
      element: event.element.tagName,
      text: event.element.text,
    });
  },
  { debounce: 300 }
);

// Track input changes
tracker.on(
  'input',
  (event) => {
    analytics.send('input', event);
  },
  { throttle: 500 }
);

// Track first interaction only
tracker.on(
  'click',
  (event) => {
    analytics.send('first_interaction', event);
  },
  { once: true }
);

// Track only navigation clicks
tracker.on(
  'click',
  (event) => {
    analytics.send('nav_click', { href: event.element.href });
  },
  { selector: 'nav a' }
);

// Page leave — use last event
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const last = tracker.getLastEvent();
    if (last) navigator.sendBeacon('/api/track', JSON.stringify(last));
  }
});

// Cleanup
tracker.destroy();
```
