import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

// Mock the entire @osmoweb/core/radio module
vi.mock('@osmoweb/core/radio', () => ({
    RadioTechnology: { GSM: 'GSM', LTE: 'LTE', NR: 'NR' },
    GSMBand: { GSM_900: 'GSM_900', DCS_1800: 'DCS_1800' },
    LTEBand: { B3: 'B3', B7: 'B7' },
    NRBand: { N41: 'N41', N78: 'N78' },
    configureARFCN: vi.fn(({ arfcn, technology, band }): {
        arfcn: number;
        technology: string;
        band: string;
        uplinkFrequency: number | undefined;
        downlinkFrequency: number | undefined
    } => {
        if (technology === 'GSM' && band === 'GSM_900') {
            return {
                arfcn,
                technology,
                band,
                uplinkFrequency: 890000 + (arfcn * 200),
                downlinkFrequency: 935000 + (arfcn * 200)
            };
        }
        else if (technology === 'LTE' && band === 'B3') {
            return {
                arfcn,
                technology,
                band,
                uplinkFrequency: 1710000 + ((arfcn - 1200) * 100),
                downlinkFrequency: 1805000 + ((arfcn - 1200) * 100)
            };
        }
        return {
            arfcn,
            technology,
            band,
            uplinkFrequency: undefined,
            downlinkFrequency: undefined
        };
    }),
    getSupportedBands: vi.fn((technology) => {
        switch (technology) {
            case 'GSM':
                return ['GSM_900', 'DCS_1800'];
            case 'LTE':
                return ['B3', 'B7'];
            case 'NR':
                return ['N41', 'N78'];
            default:
                return [];
        }
    }),
    getBandArfcnRange: vi.fn((technology, band) => {
        if (technology === 'GSM' && band === 'GSM_900') {
            return { arfcnStart: 0, arfcnEnd: 124 };
        }
        if (technology === 'GSM' && band === 'DCS_1800') {
            return { arfcnStart: 512, arfcnEnd: 885 };
        }
        if (technology === 'LTE' && band === 'B3') {
            return { arfcnStart: 1200, arfcnEnd: 1949 };
        }
        if (technology === 'LTE' && band === 'B7') {
            return { arfcnStart: 2750, arfcnEnd: 3449 };
        }
        return undefined;
    }),
}));

import BtsConfig from '@/components/BtsConfig.vue';
import type { BtsParams } from '@/components/BtsConfig.vue';
import type { RadioTechnology, MobileBand } from '@osmoweb/core/radio';
import * as radio from '@osmoweb/core/radio';
const mockedRadio = vi.mocked(radio);

const mockGetSupportedBands = mockedRadio.getSupportedBands;
const mockGetBandArfcnRange = mockedRadio.getBandArfcnRange;
const mockConfigureARFCN = mockedRadio.configureARFCN;

describe('BtsConfig', () => {
    let wrapper: VueWrapper<any>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
    });

    describe('Component Rendering', () => {
        it('renders with default props', () => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });

            expect(wrapper.find('.bts-config').exists()).toBe(true);
            expect(wrapper.find('form.bts-config-form').exists()).toBe(true);
        });

        it('renders with existing BTS configuration', () => {
            const existingBts: BtsParams = {
                technology: 'GSM' as RadioTechnology,
                band: 'GSM_900' as MobileBand,
                arfcn: 50
            };

            wrapper = mount(BtsConfig, {
                props: {
                    bts: existingBts,
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });

            expect(wrapper.vm.btsParams.technology).toBe('GSM');
            expect(wrapper.vm.btsParams.band).toBe('GSM_900');
            expect(wrapper.vm.btsParams.arfcn).toBe(50);
        });
    });

    describe('Computed Properties', () => {
        beforeEach(() => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });
        });

        it('computes bandLabel correctly', async () => {
            wrapper.vm.btsParams.technology = 'GSM';
            await nextTick();
            expect(wrapper.vm.bandLabel).toBe('GSM Band');

            wrapper.vm.btsParams.technology = undefined;
            await nextTick();
            expect(wrapper.vm.bandLabel).toBe('GSM Band');
        });

        it('computes arfcnLabel correctly', async () => {
            wrapper.vm.btsParams.technology = 'GSM';
            await nextTick();
            expect(wrapper.vm.arfcnLabel).toBe('ARFCN');

            wrapper.vm.btsParams.technology = 'LTE';
            await nextTick();
            expect(wrapper.vm.arfcnLabel).toBe('EARFCN');

            wrapper.vm.btsParams.technology = 'NR';
            await nextTick();
            expect(wrapper.vm.arfcnLabel).toBe('NRARFCN');
        });

        it('computes availableBands correctly', async () => {
            wrapper.vm.btsParams.technology = 'GSM';
            await nextTick();
            expect(mockGetSupportedBands).toHaveBeenCalledWith('GSM');
            expect(wrapper.vm.availableBands).toEqual(['GSM_900', 'DCS_1800']);

            wrapper.vm.btsParams.technology = undefined; // Default to GSM
            await nextTick();
            expect(wrapper.vm.availableBands).toEqual(['GSM_900', 'DCS_1800']);
        });

        it('computes availableArfcns correctly', async () => {
            wrapper.vm.btsParams.technology = 'GSM';
            wrapper.vm.btsParams.band = 'GSM_900';
            await nextTick();

            expect(mockGetBandArfcnRange).toHaveBeenCalledWith('GSM', 'GSM_900');
            expect(wrapper.vm.availableArfcns).toHaveLength(125);
            expect(wrapper.vm.availableArfcns[0]).toBe(0);
            expect(wrapper.vm.availableArfcns[124]).toBe(124);
        });

        it('handles getBandArfcnRange error gracefully', async () => {
            mockGetBandArfcnRange.mockImplementation(() => {
                throw new Error('Invalid band');
            });

            wrapper.vm.btsParams.technology = 'GSM';
            wrapper.vm.btsParams.band = 'INVALID_BAND';
            await nextTick();

            expect(wrapper.vm.availableArfcns).toEqual([]);
        });
    });

    describe('Data Management', () => {
        beforeEach(() => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });
        });

        it('initializes with GSM technology when no props provided', async () => {
            await nextTick();
            expect(wrapper.vm.btsParams.technology).toBe('GSM');
        });

        it('clears ARFCN when band changes', async () => {
            wrapper.vm.btsParams.technology = 'GSM';
            wrapper.vm.btsParams.band = 'GSM_900';
            wrapper.vm.btsParams.arfcn = 50;
            await nextTick();

            wrapper.vm.btsParams.band = 'DCS_1800';
            await nextTick();

            expect(wrapper.vm.btsParams.arfcn).toBeUndefined();
            expect(wrapper.vm.btsParams.downlinkFrequency).toBeUndefined();
            expect(wrapper.vm.btsParams.uplinkFrequency).toBeUndefined();
        });
    });

    describe('Event Emissions', () => {
        beforeEach(() => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });
        });

        it('emits submit event with form data when handleSubmit is called', async () => {
            Object.assign(wrapper.vm.btsParams, {
                technology: 'GSM',
                band: 'GSM_900',
                arfcn: 50
            });
            await nextTick();

            wrapper.vm.handleSubmit();

            expect(wrapper.emitted('submit')).toBeTruthy();
            expect(wrapper.emitted('submit')?.[0]).toEqual([{
                technology: 'GSM',
                band: 'GSM_900',
                arfcn: 50,
                downlinkFrequency: 945000,
                uplinkFrequency: 900000,
            }]);
        });

        it('resets form when resetForm is called', async () => {
            const initialBts: BtsParams = {
                technology: 'GSM' as RadioTechnology,
                band: 'GSM_900' as MobileBand,
                arfcn: 50
            };

            await wrapper.setProps({ bts: initialBts });
            await nextTick();

            // Change values
            wrapper.vm.btsParams.technology = 'LTE';
            wrapper.vm.btsParams.band = 'B3';
            wrapper.vm.btsParams.arfcn = 999;
            await nextTick();

            // Reset
            wrapper.vm.resetForm();
            await nextTick();

            expect(wrapper.vm.btsParams.technology).toBe('GSM');
            expect(wrapper.vm.btsParams.band).toBe('GSM_900');
            expect(wrapper.vm.btsParams.arfcn).toBe(50);
        });
    });

    describe('Frequency Display', () => {
        beforeEach(() => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });
        });

        it('displays frequency information correctly', () => {
            wrapper.vm.btsParams.band = 'GSM_900';
            wrapper.vm.btsParams.technology = 'GSM';

            const frequency = wrapper.vm.getFrequency(50);

            expect(mockConfigureARFCN).toHaveBeenCalledWith({
                arfcn: 50,
                technology: 'GSM',
                band: 'GSM_900'
            });
            expect(frequency).toBe('(D 945.0 / U 900.0 MHz)');
        });

        it('handles configureARFCN error gracefully', () => {
            mockConfigureARFCN.mockImplementation(() => {
                throw new Error('Invalid ARFCN');
            });

            wrapper.vm.btsParams.band = 'GSM_900';
            const frequency = wrapper.vm.getFrequency(50);

            expect(frequency).toBe('');
        });

        it('returns empty string when no band selected', () => {
            wrapper.vm.btsParams.band = undefined;
            const frequency = wrapper.vm.getFrequency(50);

            expect(frequency).toBe('');
        });

        it('formats frequency with downlink only', () => {
            mockConfigureARFCN.mockReturnValue({
                arfcn: 50,
                technology: 'GSM' as RadioTechnology,
                band: 'GSM_900' as MobileBand,
                downlinkFrequency: 900000,
                uplinkFrequency: undefined,
            });

            wrapper.vm.btsParams.band = 'GSM_900';
            wrapper.vm.btsParams.technology = 'GSM';

            const frequency = wrapper.vm.getFrequency(50);
            expect(frequency).toBe('(D 900.0 MHz)');
        });

        it('formats frequency with uplink only', () => {
            mockConfigureARFCN.mockReturnValue({
                arfcn: 50,
                technology: 'GSM' as RadioTechnology,
                band: 'GSM_900' as MobileBand,
                downlinkFrequency: undefined,
                uplinkFrequency: 945000
            });

            wrapper.vm.btsParams.band = 'GSM_900';
            wrapper.vm.btsParams.technology = 'GSM';

            const frequency = wrapper.vm.getFrequency(50);
            expect(frequency).toBe('(U 945.0 MHz)');
        });
    });

    describe('Props Watching', () => {
        it('updates form when bts prop changes', async () => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM', 'LTE'] as RadioTechnology[]
                }
            });

            const newBts: BtsParams = {
                technology: 'LTE' as RadioTechnology,
                band: 'B3' as MobileBand,
                arfcn: 1500
            };

            await wrapper.setProps({ bts: newBts });
            await nextTick();

            expect(wrapper.vm.btsParams.technology).toBe('LTE');
            expect(wrapper.vm.btsParams.band).toBe('B3');
            expect(wrapper.vm.btsParams.arfcn).toBe(1500);
        });

        it('initializes with first supported technology when multiple available', async () => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['LTE', 'NR'] as RadioTechnology[]
                }
            });

            await nextTick();
            expect(wrapper.vm.btsParams.technology).toBe('LTE');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty supported technologies', () => {
            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: []
                }
            });

            // Component should still render
            expect(wrapper.find('.bts-config').exists()).toBe(true);
        });

        it('handles undefined supportedTechnologies prop', () => {
            wrapper = mount(BtsConfig, {
                props: {}
            });

            // Should use default GSM technology
            expect(wrapper.vm.btsParams.technology).toBe('GSM');
        });

        it('handles getBandArfcnRange returning undefined', async () => {
            mockGetBandArfcnRange.mockReturnValue(undefined);

            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM'] as RadioTechnology[]
                }
            });

            wrapper.vm.btsParams.technology = 'GSM';
            wrapper.vm.btsParams.band = 'GSM_900';
            await nextTick();

            expect(wrapper.vm.availableArfcns).toEqual([]);
        });

        it('handles getBandArfcnRange returning undefined', async () => {
            mockGetBandArfcnRange.mockReturnValue(undefined);

            wrapper = mount(BtsConfig, {
                props: {
                    supportedTechnologies: ['GSM'] as RadioTechnology[]
                }
            });

            wrapper.vm.btsParams.technology = 'GSM';
            wrapper.vm.btsParams.band = 'GSM_900';
            await nextTick();

            expect(wrapper.vm.availableArfcns).toEqual([]);
        });
    });
});
