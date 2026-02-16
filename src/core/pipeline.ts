import type { ResolvedConfig, TrackEvent } from '../types'
import { extractElementInfo } from '../extract/element'
import { resolveFiber, extractFiberInfo } from '../extract/fiber'
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
