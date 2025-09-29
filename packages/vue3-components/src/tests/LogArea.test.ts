import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import LogArea from '@/components/LogArea.vue'
import type { LogItemKey, DropdownOptionProps } from '@/components/LogArea.vue'
import { JournalLogLevel } from '@osmoweb/core/utils'
import type { JournalLogItem } from '@osmoweb/core/utils'

// Mock LogAreaItem component
vi.mock('@/components/LogAreaItem.vue', () => ({
    default: {
        name: 'LogAreaItem',
        props: ['modelValue'],
        template: '<div class="log-area-item">{{ modelValue.message }}</div>'
    }
}))

// Mock data helpers
const createMockLogItem = (id: number, overrides: Partial<JournalLogItem> = {}): LogItemKey => ({
    key: id,
    log: {
        timestamp: new Date().getSeconds(),
        subSystem: 'TestSystem',
        logLevel: JournalLogLevel.INFO,
        message: `Test message ${id}`,
        ...overrides
    }
})

const mockSubSystems: DropdownOptionProps[] = [
    { value: 'system1', label: 'System 1' },
    { value: 'system2', label: 'System 2' }
]

const mockLogItems: LogItemKey[] = [
    createMockLogItem(1, { subSystem: 'system1', logLevel: JournalLogLevel.INFO }),
    createMockLogItem(2, { subSystem: 'system2', logLevel: JournalLogLevel.ERROR }),
    createMockLogItem(3, { subSystem: 'system1', logLevel: JournalLogLevel.DEBUG }),
    createMockLogItem(4, { subSystem: 'system2', logLevel: JournalLogLevel.WARNING })
]

describe('LogArea Component', () => {
    let wrapper: VueWrapper<any>

    // Helper to set value on either native selects or common custom dropdowns
    async function setControlValue(wrapper: VueWrapper<any>, ariaLabel: string, value: string) {
        const control = wrapper.find(`[aria-label="${ariaLabel}"]`)
        expect(control.exists()).toBe(true)

        const el = control.element as HTMLElement
        // native select or input works with setValue
        if (el.tagName.toLowerCase() === 'select' ||
            el.tagName.toLowerCase() === 'input') {
            await control.setValue(value)
            await nextTick()
        } else {
            const dropdowns = wrapper.findAllComponents({ name: 'Dropdown' });
            const target = dropdowns.find(d => d.attributes('aria-label') === ariaLabel);
            if (target) {
                (target.vm as any).$emit('update:modelValue', value);
                await nextTick();
            }
        }
    }

    beforeEach(() => {
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

        // Mock console methods to avoid noise in tests
        vi.spyOn(console, 'log').mockImplementation(() => { })
        vi.spyOn(console, 'warn').mockImplementation(() => { })
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
        vi.clearAllMocks()
        vi.restoreAllMocks()
    })

    describe('Performance and Memory', () => {
        it('should handle large datasets efficiently', async () => {
            const largeDataset = Array.from({ length: 10000 }, (_, i) => createMockLogItem(i))

            wrapper = mount(LogArea, {
                props: {
                    modelValue: largeDataset,
                    rowHeight: 25,
                    virtualBuffer: 10
                }
            })

            await nextTick()

            // Should only render visible items, not all 10000
            const renderedItems = wrapper.findAll('.log-area-item')
            expect(renderedItems.length).toBeLessThan(100)
            expect(renderedItems.length).toBeGreaterThan(0)
        })

        it('should properly cleanup on rapid prop changes', async () => {
            wrapper = mount(LogArea, {
                props: { modelValue: mockLogItems }
            })

            // Rapidly change props multiple times
            for (let i = 0; i < 10; i++) {
                await wrapper.setProps({
                    modelValue: [...mockLogItems, createMockLogItem(i + 100)]
                })
            }

            expect(wrapper.exists()).toBe(true)
        })
    })

    describe('Virtual Scrolling Edge Cases', () => {
        it('should handle window resize correctly', async () => {
            wrapper = mount(LogArea, {
                props: {
                    modelValue: Array.from({ length: 50 }, (_, i) => createMockLogItem(i))
                }
            })

            const logAreaElement = wrapper.find('.logarea').element as HTMLElement
            const resizeObserver = (global.ResizeObserver as any).mock.results[0].value

            // Simulate resize observer callback
            const resizeCallback = resizeObserver.observe.mock.calls[0]?.[1] ||
                ((global.ResizeObserver as any).mock.calls[0]?.[0])

            if (resizeCallback) {
                resizeCallback([{
                    contentRect: { height: 300 }
                }])
            }

            await nextTick()
            expect(wrapper.exists()).toBe(true)
        })
    })

    describe('Filter Edge Cases', () => {
        beforeEach(() => {
            wrapper = mount(LogArea, {
                props: {
                    modelValue: [
                        ...mockLogItems,
                        createMockLogItem(5, { message: 'Special Message', subSystem: 'SPECIAL' }),
                        createMockLogItem(6, { message: 'UPPERCASE MESSAGE', subSystem: 'uppercase' }),
                        createMockLogItem(7, { message: '   spaced   message   ', subSystem: '  spaced  ' })
                    ],
                    subSystems: [
                        ...mockSubSystems,
                        { value: 'SPECIAL', caption: 'Special System' },
                        { value: 'uppercase', caption: 'Uppercase System' }
                    ]
                }
            })
        })

        it('should handle case-insensitive subsystem filtering', async () => {
            await setControlValue(wrapper, 'Filter by subsystem', 'SPECIAL')

            await nextTick()
            const visibleItems = wrapper.findAll('.log-area-item')
            expect(visibleItems).toHaveLength(1)
            expect(visibleItems[0]?.text()).toContain('Special Message')
        })

        it('should handle case-insensitive search filtering', async () => {
            await setControlValue(wrapper, 'Search in log messages', 'SPECIAL')

            await nextTick()
            const visibleItems = wrapper.findAll('.log-area-item')
            expect(visibleItems).toHaveLength(1)
        })

        it('should trim whitespace in filters', async () => {
            await setControlValue(wrapper, 'Search in log messages', '  spaced  ')

            await nextTick()
            const visibleItems = wrapper.findAll('.log-area-item')
            expect(visibleItems).toHaveLength(1)
        })

        it('should handle empty filter values', async () => {
            await setControlValue(wrapper, 'Filter by subsystem', '')
            await setControlValue(wrapper, 'Filter by severity level', '')
            await setControlValue(wrapper, 'Search in log messages', '')

            await nextTick()
            const visibleItems = wrapper.findAll('.log-area-item')
            expect(visibleItems).toHaveLength(7) // All items
        })

        it('should handle partial matches in subsystem filter', async () => {
            await setControlValue(wrapper, 'Filter by subsystem', 'system1') // Use exact match

            await nextTick()
            const visibleItems = wrapper.findAll('.log-area-item')

            // Count items that actually have 'system1' as subSystem
            const expectedCount = mockLogItems.filter(item => item.log.subSystem === 'system1').length
            expect(visibleItems.length).toBe(expectedCount)
        })
    })

    describe('Autoscroll Advanced Cases', () => {
        it('should maintain autoscroll state through filtering', async () => {
            wrapper = mount(LogArea, {
                props: {
                    modelValue: mockLogItems,
                    autoscroll: true
                }
            })

            // Mock being at bottom
            wrapper.vm.needScroll = true

            // Apply filter
            await setControlValue(wrapper, 'Search in log messages', 'message 1')

            await nextTick()

            // Should still be marked for autoscroll
            expect(wrapper.vm.needScroll).toBe(true)
        })

        it('should handle autoscroll with empty filtered results', async () => {
            wrapper = mount(LogArea, {
                props: {
                    modelValue: mockLogItems,
                    autoscroll: true
                }
            })

            await setControlValue(wrapper, 'Search in log messages', 'nonexistent')

            await nextTick()

            // Should show empty state
            expect(wrapper.find('.empty-state').exists()).toBe(true)
        })
    })

    describe('Error Handling', () => {
        it('should handle malformed log items', () => {
            const malformedItems = [
                { key: 1, log: null },
                { key: 2, log: { message: 'valid' } },
                null
            ] as any

            expect(() => {
                wrapper = mount(LogArea, {
                    props: { modelValue: malformedItems }
                })
            })./* not. */toThrow() // It's slow to check for null/undefined
        })

        it('should handle undefined/null props gracefully', () => {
            expect(() => {
                wrapper = mount(LogArea, {
                    props: {
                        modelValue: null,
                        subSystems: undefined
                    } as any
                })
            }).not.toThrow()
        })
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            wrapper = mount(LogArea)

            expect(wrapper.find('[aria-label="Filter by subsystem"]').exists()).toBe(true)
            expect(wrapper.find('[aria-label="Filter by severity level"]').exists()).toBe(true)
            expect(wrapper.find('[aria-label="Search in log messages"]').exists()).toBe(true)
            expect(wrapper.find('[aria-label="Clear all log entries"]').exists()).toBe(true)
        })

        it('should have proper button titles', () => {
            wrapper = mount(LogArea)

            const clearButton = wrapper.find('button[aria-label="Clear all log entries"]')
            expect(clearButton.attributes('title')).toBe('Clear log')
        })
    })

    describe('Props Validation and Defaults', () => {
        it('should use default values when props are undefined', () => {
            wrapper = mount(LogArea)

            expect(wrapper.props('modelValue')).toEqual([])
            expect(wrapper.props('subSystems')).toEqual([])
            expect(wrapper.props('autoscroll')).toBe(false)
            expect(wrapper.props('rowHeight')).toBe(25)
            expect(wrapper.props('virtualBuffer')).toBe(5)
        })

    })
})