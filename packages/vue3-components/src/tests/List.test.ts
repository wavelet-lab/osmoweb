import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextTick, h } from 'vue';
import List from '@/components/List.vue';

describe('List.vue - virtual scrolling & autoScroll', () => {
    // Save originals to restore after tests
    const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    const originalResizeObserver = (globalThis as any).ResizeObserver;

    beforeEach(() => {
        // Provide a stable container height for tests
        const originalClientHeightGetter = originalClientHeight && originalClientHeight.get;
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
            configurable: true,
            get(this: HTMLElement) {
                try {
                    if (this.classList && (this.classList.contains('list') || this.classList.contains('list-window') || this.classList.contains('list-spacer'))) {
                        return 200; // container
                    }
                    if (this.classList && this.classList.contains('test-item')) {
                        return 20; // individual item
                    }
                } catch { /* ignore */ }
                return originalClientHeightGetter ? originalClientHeightGetter.call(this) : 0;
            },
        });

        // Ensure getBoundingClientRect reports height for mounts that rely on it
        const originalGBCR = Element.prototype.getBoundingClientRect;
        (Element.prototype as any).getBoundingClientRect = function () {
            try {
                if (this instanceof Element) {
                    // direct test item
                    if (this.classList && this.classList.contains('test-item')) {
                        return { width: 0, height: 20, top: 0, left: 0, right: 0, bottom: 20, x: 0, y: 0, toJSON() { } };
                    }
                    // wrapper/placeholder that contains test items (component may measure wrapper nodes)
                    if (this.querySelector && this.querySelector('.test-item')) {
                        return { width: 0, height: 20, top: 0, left: 0, right: 0, bottom: 20, x: 0, y: 0, toJSON() { } };
                    }
                    // real list container / spacer / window
                    if (this.classList && (this.classList.contains('list') || this.classList.contains('list-window') || this.classList.contains('list-spacer'))) {
                        return { width: 0, height: 200, top: 0, left: 0, right: 0, bottom: 200, x: 0, y: 0, toJSON() { } };
                    }
                }
            } catch { /* ignore */ }
            // fallback
            return originalGBCR ? originalGBCR.call(this) : { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() { } };
        };

        // ResizeObserver mock — call callback when observe() is called so component recalculates size
        (globalThis as any).ResizeObserver = class {
            constructor(public cb: () => void) { this.cb = cb; }
            observe() { try { this.cb(); } catch { /* ignore */ } }
            disconnect() { }
        };
    });

    afterEach(() => {
        // restore globals
        if (originalClientHeight) {
            Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
        } else {
            try { delete (HTMLElement.prototype as any).clientHeight; } catch { /* ignore */ }
        }
        (globalThis as any).ResizeObserver = originalResizeObserver;

        // restore getBoundingClientRect if modified
        try { delete (Element.prototype as any).getBoundingClientRect; } catch { /* ignore */ }
    });

    it('renders a buffered window of items based on itemHeight and container height', async () => {
        const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
        const wrapper = mount(List, {
            props: {
                items,
                itemHeight: 20,
                virtualBuffer: 5,
                autoScroll: false,
            },
            slots: {
                default: ({ item, index }: any) => h('div', { class: 'test-item', 'data-index': index }, item),
            },
            attachTo: document.body,
        });

        // allow component measurement + RO callbacks to run
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 0));

        // prefer real DOM query (component may render into a nested node)
        const rendered = document.body.querySelectorAll('.test-item');
        expect(rendered.length).toBe(20);
    });

    it('auto-scrolls to bottom when new items appended if not paused', async () => {
        const items = ['a', 'b'];
        const wrapper = mount(List, {
            props: {
                items,
                itemHeight: 20,
                virtualBuffer: 2,
                autoScroll: true,
            },
            slots: {
                default: ({ item, index }: any) => h('div', { class: 'test-item', 'data-index': index }, item),
            },
            attachTo: document.body,
        });

        await nextTick();

        const root = wrapper.element as HTMLElement;

        // Ensure root has a writable scrollTop property for the test
        Object.defineProperty(root, 'scrollTop', { configurable: true, writable: true, value: 0 });

        // initial totalHeight = 2 * 20 = 40, container = 200 => maxScrollTop = 0 (already at bottom)
        // Append a new item
        await wrapper.setProps({ items: [...items, 'c'] });
        await nextTick();

        // After append, component should programmatically set scrollTop to maxScrollTop (0)
        expect(root.scrollTop).toBe(0);
    });

    it('pauses auto-scroll when user scrolls away and resumes when scrolled back to bottom', async () => {
        const items = ['x', 'y'];
        const wrapper = mount(List, {
            props: {
                items,
                itemHeight: 20,
                virtualBuffer: 2,
                autoScroll: true,
            },
            slots: {
                default: ({ item, index }: any) => h('div', { class: 'test-item', 'data-index': index }, item),
            },
            attachTo: document.body,
        });

        // allow measurement
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 0));

        // pick the actual scrollable node from the document (the component's root has .list)
        const scrollEl = (document.querySelector('.list') as HTMLElement) || (wrapper.element as HTMLElement);

        // make scrollTop writable
        Object.defineProperty(scrollEl, 'scrollTop', { configurable: true, writable: true, value: 0 });

        // Simulate user scrolling away from bottom
        scrollEl.scrollTop = 10;
        scrollEl.dispatchEvent(new Event('scroll'));
        await nextTick();

        // Now append items; since auto-scroll is paused by user, scrollTop should not be forced to bottom
        await wrapper.setProps({ items: [...items, 'z'] });
        await nextTick();
        expect(scrollEl.scrollTop).toBe(10);

        // Simulate user scrolling back to bottom
        const totalHeight = (wrapper.props('items') as any).length * 20;
        const maxScrollTop = Math.max(0, totalHeight - (scrollEl.clientHeight || 200));
        scrollEl.scrollTop = maxScrollTop;
        scrollEl.dispatchEvent(new Event('scroll'));
        await nextTick();

        // Append another item; since now at bottom, component should auto-scroll to new bottom
        await wrapper.setProps({ items: [...(wrapper.props('items') as any), 'more'] });
        await nextTick();

        const newTotalHeight = (wrapper.props('items') as any).length * 20;
        const expectedMax = Math.max(0, newTotalHeight - (scrollEl.clientHeight || 200));
        expect(scrollEl.scrollTop).toBe(expectedMax);
    });
});
