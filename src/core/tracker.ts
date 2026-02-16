import type {
  Tracker,
  TrackerConfig,
  TrackCallback,
  ListenerOptions,
  ResolvedConfig,
} from '../types'
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
    if (!pipeline.getEventTypes().has(eventType)) {
      document.removeEventListener(eventType, handler, true)
      domListeners.delete(eventType)
    }
  }

  return {
    on(eventType: string, callback: TrackCallback, options?: ListenerOptions): () => void {
      if (destroyed) return () => {}

      ensureDomListener(eventType)
      const unsub = pipeline.addListener(eventType, callback, options ?? {})

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

      pipeline.clear()

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
