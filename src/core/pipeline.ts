import type { ResolvedConfig, TrackEvent, TrackCallback, ListenerOptions } from '../types'
import { extractElementInfo } from '../extract/element'
import { resolveFiber, extractFiberInfo } from '../extract/fiber'
import { getTrackableElement } from '../filter/filter-engine'
import { createRegistry } from './registry'

export interface Pipeline {
  handleEvent(domEvent: Event): void
  getLastEvent(): TrackEvent | null
  addListener(eventType: string, callback: TrackCallback, options: ListenerOptions): () => void
  getEventTypes(): Set<string>
  clear(): void
}

export function createPipeline(config: ResolvedConfig): Pipeline {
  const registry = createRegistry()
  let lastEvent: TrackEvent | null = null

  return {
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

    addListener(eventType: string, callback: TrackCallback, options: ListenerOptions): () => void {
      return registry.add(eventType, callback, options)
    },

    getEventTypes(): Set<string> {
      return registry.getEventTypes()
    },

    clear(): void {
      registry.clear()
    },
  }
}
