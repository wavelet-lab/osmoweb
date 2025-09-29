import { vi } from 'vitest'

// Global mocks for browser APIs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}))

global.requestAnimationFrame = vi.fn((cb) => {
    cb(0)
    return 1
})

global.cancelAnimationFrame = vi.fn()

// Mock IntersectionObserver if needed
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}))

// Ensure document is available
if (typeof document === 'undefined') {
    // This shouldn't be necessary with happy-dom, but just in case
    global.document = {} as Document
}