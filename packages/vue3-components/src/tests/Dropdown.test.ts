import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import Dropdown from '@/components/Dropdown.vue';

const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C', disabled: true }
];

// Helper to find elements in document.body (Teleport)
function findInBody(selector: string): HTMLElement | null {
    return document.body.querySelector(selector);
}

describe('Dropdown.vue', () => {
    let wrapper: VueWrapper<any>;

    beforeEach(() => {
        // Clean up body before each test for Teleport
        document.body.innerHTML = '';
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        document.body.innerHTML = '';
    });

    describe('Component Rendering', () => {
        it('renders with default props', () => {
            wrapper = mount(Dropdown);
            expect(wrapper.find('.dropdown-trigger').exists()).toBe(true);
            expect(wrapper.text()).toContain('Select option');
        });

        it('renders options and selects one', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            expect(panel!.textContent).toContain('Option A');
        });

        it('renders disabled option', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            expect(panel!.textContent).toContain('Option C');
        });
    });

    describe('Multiple Selection', () => {
        it('supports multiple selection', async () => {
            wrapper = mount(Dropdown, {
                props: { options, multiple: true, modelValue: ['a'] }
            });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
        });
    });

    describe('Searchable Dropdown', () => {
        it('filters options when searchable', async () => {
            wrapper = mount(Dropdown, {
                props: { options, searchable: true }
            });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const input = findInBody('.dropdown-search-input') as HTMLInputElement;
            expect(input).not.toBeNull();
            input.value = 'B';
            input.dispatchEvent(new Event('input'));
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel!.textContent).toContain('Option B');
        });

        it('shows no-results slot when search yields nothing', async () => {
            wrapper = mount(Dropdown, {
                props: { options, searchable: true },
                slots: { 'no-results': '<span class="custom-no-results"></span>' }
            });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const input = findInBody('.dropdown-search-input') as HTMLInputElement;
            expect(input).not.toBeNull();
            input.value = 'ZZZ';
            input.dispatchEvent(new Event('input'));
            await nextTick();
            expect(findInBody('.custom-no-results')).not.toBeNull();
        });
    });

    describe('Clearable Dropdown', () => {
        it('shows clear button and clears selection', async () => {
            wrapper = mount(Dropdown, {
                props: { options, clearable: true, modelValue: 'a' }
            });
            await nextTick();
            const clearBtn = wrapper.find('.dropdown-clear');
            expect(clearBtn.exists()).toBe(true);
            await clearBtn.trigger('click');
            expect(wrapper.emitted().clear).toBeTruthy();
            expect(wrapper.emitted()['update:modelValue']?.[0]).toEqual([null]);
        });
    });

    describe('Disabled and Loading States', () => {
        it('disables dropdown', async () => {
            wrapper = mount(Dropdown, {
                props: { disabled: true }
            });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            expect(findInBody('.dropdown-panel')).toBeNull();
        });

        it('shows loading state', () => {
            wrapper = mount(Dropdown, {
                props: { loading: true }
            });
            expect(wrapper.text()).toContain('Loading...');
        });
    });

    describe('Event Emissions', () => {
        it('emits open and close events', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            expect(wrapper.emitted().open).toBeTruthy();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            document.body.click();
            await nextTick();
            expect(wrapper.emitted().close).toBeTruthy();
        });

        it('emits search event', async () => {
            wrapper = mount(Dropdown, { props: { options, searchable: true } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const input = findInBody('.dropdown-search-input') as HTMLInputElement;
            expect(input).not.toBeNull();
            input.value = 'A';
            input.dispatchEvent(new Event('input'));
            await nextTick();
            expect(wrapper.emitted().search).toBeTruthy();
            const searchEmits = wrapper.emitted().search as Array<[string]> | undefined;
            expect(searchEmits?.[0]?.[0]).toBe('A');
        });
    });

    describe('Slots', () => {
        it('supports custom slots', async () => {
            wrapper = mount(Dropdown, {
                props: { options },
                slots: {
                    prefix: '<span class="custom-prefix">P</span>',
                    suffix: '<span class="custom-suffix">S</span>',
                    display: '<span class="custom-display">Display</span>',
                    arrow: '<span class="custom-arrow"></span>',
                    'clear-icon': '<span class="custom-clear"></span>',
                    'no-results': '<span class="custom-no-results"></span>',
                    empty: '<span class="custom-empty"></span>',
                    footer: '<span class="custom-footer"></span>'
                }
            });
            expect(wrapper.find('.custom-prefix').exists()).toBe(true);
            expect(wrapper.find('.custom-suffix').exists()).toBe(true);
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            expect(wrapper.find('.custom-clear').exists()).toBe(false);
            expect(findInBody('.custom-footer')).not.toBeNull();
        });

        it('shows empty slot when no options', async () => {
            wrapper = mount(Dropdown, {
                props: { options: [] },
                slots: { empty: '<span class="custom-empty"></span>' }
            });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            expect(findInBody('.dropdown-empty .custom-empty')).not.toBeNull();
        });
    });

    describe('Keyboard Navigation', () => {
        it('closes on Escape key', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await nextTick();
            expect(wrapper.emitted().close).toBeTruthy();
        });

        it('opens on Enter key', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('keydown', { key: 'Enter' });
            await nextTick();
            expect(wrapper.emitted().open).toBeTruthy();
        });
    });

    describe('Placement', () => {
        it('placement class is applied', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            expect(panel!.classList.contains('dropdown-panel--bottom')).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('handles empty options array', async () => {
            wrapper = mount(Dropdown, { props: { options: [] } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            expect(panel!.textContent).toContain('No options');
        });

        it('handles undefined options prop', async () => {
            wrapper = mount(Dropdown);
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
        });

        it('does not emit select for disabled option', async () => {
            wrapper = mount(Dropdown, { props: { options } });
            await wrapper.find('.dropdown-trigger').trigger('click');
            await nextTick();
            const panel = findInBody('.dropdown-panel');
            expect(panel).not.toBeNull();
            const disabledOption = Array.from(panel!.querySelectorAll('.dropdown-option'))
                .find(el => el.textContent?.includes('Option C'));
            expect(disabledOption).not.toBeNull();
            disabledOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await nextTick();
            expect(wrapper.emitted()['update:modelValue']).toBeUndefined();
        });
    });
});