import { vi } from 'vitest'

// Mock ResizeObserver as a real constructor/class so `new ResizeObserver()` works
class MockResizeObserver {
    callback?: ResizeObserverCallback
    constructor(cb?: ResizeObserverCallback) { this.callback = cb }
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    trigger(entries: ResizeObserverEntry[]) { this.callback?.(entries, this as unknown as ResizeObserver) }
}
; (globalThis as any).ResizeObserver = MockResizeObserver

// Mock IntersectionObserver as a real constructor/class
class MockIntersectionObserver {
    callback?: IntersectionObserverCallback
    constructor(cb?: IntersectionObserverCallback) { this.callback = cb }
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn().mockReturnValue([])
    trigger(entries: IntersectionObserverEntry[]) { this.callback?.(entries, this as unknown as IntersectionObserver) }
}
; (globalThis as any).IntersectionObserver = MockIntersectionObserver

    // requestAnimationFrame / cancelAnimationFrame
    ; (globalThis as any).requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
        cb(0)
        return 1
    })
    ; (globalThis as any).cancelAnimationFrame = vi.fn()

// Ensure document is available (fallback)
if (typeof document === 'undefined') {
    ; (globalThis as any).document = {} as Document
}