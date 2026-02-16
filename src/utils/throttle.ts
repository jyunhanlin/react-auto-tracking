// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ThrottledFn<T extends (...args: any[]) => void> {
  (...args: Parameters<T>): void
  cancel(): void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): ThrottledFn<T> {
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
