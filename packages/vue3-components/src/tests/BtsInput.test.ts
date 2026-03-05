import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, defineComponent } from 'vue'
import BtsInput from '@/components/BtsInput.vue'

// Mock radio helper
vi.mock('@osmoweb/core/radio', () => ({
    configureARFCN: vi.fn(),
    RadioTechnology: { GSM: 'GSM', LTE: 'LTE', NR: 'NR' },
    GSMBand: {},
    LTEBand: {},
    NRBand: {}
}))
import { configureARFCN } from '@osmoweb/core/radio'

describe('BtsInput.vue', () => {
    const DropdownStub = defineComponent({
        name: 'Dropdown',
        props: ['status', 'size', 'placeholder', 'disabled', 'maxHeight'],
        // use template string instead of JSX so TS doesn't require TSX
        template: `
            <div>
                <span class="dd-status">{{ status }}</span>
                <slot name="display"></slot>
                <div class="content">
                    <!-- expose close() prop to content slot -->
                    <slot name="content" v-bind="{ close: () => {} }"></slot>
                </div>
            </div>
        `
    })

    const BtsConfigStub = defineComponent({
        name: 'BtsConfig',
        props: ['bts', 'supportedTechnologies', 'searchable'],
        template: `<div class="bts-config-stub"></div>`
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders placeholder and error status when bts prop is not provided', async () => {
        const wrapper = mount(BtsInput, {
            global: { stubs: { Dropdown: DropdownStub, BtsConfig: BtsConfigStub } }
        })
        await nextTick()
        expect(wrapper.text()).toContain('Click to configure BTS')
        const status = wrapper.find('.dd-status')
        expect(status.exists()).toBe(true)
        expect(status.text()).toBe('error')
    })

    it('renders configured frequencies when configureARFCN returns frequencies', async () => {
        (configureARFCN as any).mockReturnValue({
            uplinkFrequency: 890000, // Hz
            downlinkFrequency: 935000
        })
        const bts: any = { technology: 'GSM', band: 'some', arfcn: 100 }
        const wrapper = mount(BtsInput, {
            props: { bts },
            global: { stubs: { Dropdown: DropdownStub, BtsConfig: BtsConfigStub } }
        })
        await nextTick()
        expect(wrapper.text()).toContain('D 935.0 / U 890.0 MHz')
    })

    it('falls back to ARFCN text when configureARFCN throws', async () => {
        (configureARFCN as any).mockImplementation(() => { throw new Error('bad'); })
        const bts: any = { technology: 'GSM', band: 'some', arfcn: 42 }
        const wrapper = mount(BtsInput, {
            props: { bts },
            global: { stubs: { Dropdown: DropdownStub, BtsConfig: BtsConfigStub } }
        })
        await nextTick()
        expect(wrapper.text()).toContain('ARFCN 42')
    })

    it('maps btsState to dropdown status', async () => {
        const map: Record<string, string> = {
            undefined: 'error',
            'not-configured': 'error',
            connected: 'success',
            disconnected: 'warning'
        }
        for (const [state, expected] of Object.entries(map)) {
            const props: any = {}
            if (state !== 'undefined') props.btsState = state
            const wrapper = mount(BtsInput, {
                props,
                global: { stubs: { Dropdown: DropdownStub, BtsConfig: BtsConfigStub } }
            })
            await nextTick()
            expect(wrapper.find('.dd-status').text()).toBe(expected)
            wrapper.unmount()
        }
    })

    it('emits update and cancel when BtsConfig triggers submit/cancel', async () => {
        const wrapper = mount(BtsInput, {
            props: { bts: undefined },
            global: { stubs: { Dropdown: DropdownStub, BtsConfig: BtsConfigStub } }
        })
        await nextTick()
        const btsConfigStub = wrapper.findComponent(BtsConfigStub)
        // simulate submit
        const newConfig = { technology: 'LTE', band: 'x', arfcn: 7 }
        await (btsConfigStub.vm as any).$emit('submit', newConfig)
        await nextTick()
        expect(wrapper.emitted()).toHaveProperty('update')
        expect(((wrapper.emitted()!['update'] as any)[0] as any)[0]).toEqual(newConfig)

        // simulate cancel
        await (btsConfigStub.vm as any).$emit('cancel')
        await nextTick()
        expect(wrapper.emitted()).toHaveProperty('cancel')
    })
})