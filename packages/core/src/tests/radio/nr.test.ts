import {
    nrArfcnToFrequency,
    nrFrequencyToArfcn,
    detectNRBandFromFrequency,
    detectNRBandFromArfcn,
    getNRBandFrequencyRange,
    getAllNRBands
} from '@/radio/nr';
import { NRBand } from '@/radio/types';

describe('NR Functions', () => {
    describe('nrArfcnToFrequency', () => {
        it('should convert NR Band N1 ARFCN to frequency correctly', () => {
            const result = nrArfcnToFrequency(422000, NRBand.N1);
            expect(result.uplink).toBe(1920000); // 1920 MHz
            expect(result.downlink).toBe(2110000); // 2110 MHz
        });

        it('should convert NR Band N3 ARFCN to frequency correctly', () => {
            const result = nrArfcnToFrequency(361000, NRBand.N3);
            expect(result.uplink).toBe(1710000); // 1710 MHz
            expect(result.downlink).toBe(1805000); // 1805 MHz
        });

        it('should convert NR Band N78 ARFCN to frequency correctly (sub-6GHz)', () => {
            const result = nrArfcnToFrequency(632628, NRBand.N78);
            expect(result.uplink).toBe(3489420); // 3489.42 MHz
            expect(result.downlink).toBe(3489420); // 3489.42 MHz - TDD uses same frequency
        });

        it('should convert NR Band N257 ARFCN to frequency correctly (mmWave)', () => {
            const result = nrArfcnToFrequency(2054166, NRBand.N257);
            expect(result.uplink).toBe(26500000); // 26.5 GHz
            expect(result.downlink).toBe(26500000); // 26.5 GHz - TDD uses same frequency
        });

        it('should handle TDD bands correctly', () => {
            const result = nrArfcnToFrequency(524000, NRBand.N38);
            expect(result.uplink).toBe(2570000); // 2570 MHz
            expect(result.downlink).toBe(2570000); // 2570 MHz - TDD uses same frequency
        });

        it('should throw error for ARFCN out of range', () => {
            expect(() => nrArfcnToFrequency(999999, NRBand.N1))
                .toThrow('ARFCN 999999 is out of range for band N1');
        });

        it('should handle 15 kHz channel spacing for sub-6GHz', () => {
            const result1 = nrArfcnToFrequency(422000, NRBand.N1);
            const result2 = nrArfcnToFrequency(422001, NRBand.N1);

            expect(result2.uplink - result1.uplink).toBe(15); // 15 kHz step
            expect(result2.downlink - result1.downlink).toBe(15); // 15 kHz step
        });

        it('should handle 60 kHz channel spacing for mmWave', () => {
            const result1 = nrArfcnToFrequency(2054166, NRBand.N257);
            const result2 = nrArfcnToFrequency(2054167, NRBand.N257);

            expect(result2.uplink - result1.uplink).toBe(60); // 60 kHz step
            expect(result2.downlink - result1.downlink).toBe(60); // 60 kHz step
        });
    });

    describe('nrFrequencyToArfcn', () => {
        it('should convert uplink frequency to ARFCN correctly', () => {
            const arfcn = nrFrequencyToArfcn(1920000, NRBand.N1); // 1920 MHz
            expect(arfcn).toBe(422000);
        });

        it('should convert downlink frequency to ARFCN correctly', () => {
            const arfcn = nrFrequencyToArfcn(2110000, NRBand.N1); // 2120 MHz
            expect(arfcn).toBe(422000);
        });

        it('should handle TDD frequency conversion', () => {
            const arfcn = nrFrequencyToArfcn(2570000, NRBand.N38); // 2570 MHz
            expect(arfcn).toBe(524000);
        });

        it('should handle mmWave frequency conversion', () => {
            const arfcn = nrFrequencyToArfcn(26500000, NRBand.N257); // 26.5 GHz
            expect(arfcn).toBe(2054166);
        });

        it('should handle frequency with channel spacing (sub-6GHz)', () => {
            const arfcn = nrFrequencyToArfcn(1920015, NRBand.N1); // 1930.015 MHz
            expect(arfcn).toBe(422001);
        });

        it('should handle frequency with channel spacing (mmWave)', () => {
            const arfcn = nrFrequencyToArfcn(26500060, NRBand.N257); // 26500.06 MHz
            expect(arfcn).toBe(2054167);
        });

        it('should throw error for frequency out of band', () => {
            expect(() => nrFrequencyToArfcn(5000000, NRBand.N1)) // 5000 MHz
                .toThrow('Frequency 5000000 kHz is not in band N1');
        });
    });

    describe('detectNRBandFromFrequency', () => {
        it('should detect Bands N1, N2 and N25 from uplink frequency', () => {
            const band = detectNRBandFromFrequency(1950000); // 1950 MHz
            expect(band).toStrictEqual([NRBand.N1, NRBand.N2, NRBand.N25]);
        });

        it('should detect Bands N1 and N66 from downlink frequency', () => {
            const band = detectNRBandFromFrequency(2140000); // 2140 MHz
            expect(band).toStrictEqual([NRBand.N1, NRBand.N66]);
        });

        it('should detect Bands N3 and N66 correctly', () => {
            const band = detectNRBandFromFrequency(1750000); // 1750 MHz
            expect(band).toStrictEqual([NRBand.N3, NRBand.N66]);
        });

        it('should detect Bands N77 and N78 correctly', () => {
            const band = detectNRBandFromFrequency(3500000); // 3500 MHz
            expect(band).toStrictEqual([NRBand.N77, NRBand.N78]);
        });

        it('should detect mmWave Bands N257 and N261 correctly', () => {
            const band = detectNRBandFromFrequency(28000000); // 28 GHz
            expect(band).toStrictEqual([NRBand.N257, NRBand.N261]);
        });

        it('should detect TDD Bands N7, N38 and N41 correctly', () => {
            const band = detectNRBandFromFrequency(2570000); // 2570 MHz
            expect(band).toStrictEqual([NRBand.N7, NRBand.N38, NRBand.N41]);
        });

        it('should throw error for frequency not in any band', () => {
            expect(() => detectNRBandFromFrequency(1000000)) // 1000 MHz
                .toThrow('Cannot detect NR band for frequency 1000000 kHz');
        });
    });

    describe('detectNRBandFromArfcn', () => {
        it('should detect Band N1 from ARFCN', () => {
            const band = detectNRBandFromArfcn(422100);
            expect(band).toStrictEqual([NRBand.N1]);
        });

        it('should detect Band N3 from ARFCN', () => {
            const band = detectNRBandFromArfcn(361500);
            expect(band).toStrictEqual([NRBand.N3]);
        });

        it('should detect Band N78 from ARFCN', () => {
            const band = detectNRBandFromArfcn(632000);
            expect(band).toStrictEqual([NRBand.N78]);
        });

        it('should detect mmWave Bands N257 and N258 from ARFCN', () => {
            const band = detectNRBandFromArfcn(2054200);
            expect(band).toStrictEqual([NRBand.N257, NRBand.N258]);
        });

        it('should throw error for ARFCN not in any band', () => {
            expect(() => detectNRBandFromArfcn(999999))
                .toThrow('Cannot detect NR band for ARFCN 999999');
        });
    });

    describe('getNRBandFrequencyRange', () => {
        it('should return correct frequency range for Band N1', () => {
            const range = getNRBandFrequencyRange(NRBand.N1);
            expect(range).toEqual({
                uplinkStart: 1920000, // kHz
                uplinkEnd: 1980000, // kHz
                downlinkStart: 2110000, // kHz
                downlinkEnd: 2170000 // kHz
            });
        });

        it('should return correct frequency range for TDD Band N78', () => {
            const range = getNRBandFrequencyRange(NRBand.N78);
            expect(range).toEqual({
                uplinkStart: 3300000, // kHz
                uplinkEnd: 3800000, // kHz
                downlinkStart: 3300000, // kHz
                downlinkEnd: 3800000 // kHz
            });
        });

        it('should return correct frequency range for mmWave Band N257', () => {
            const range = getNRBandFrequencyRange(NRBand.N257);
            expect(range).toEqual({
                uplinkStart: 26500000, // kHz
                uplinkEnd: 29500000, // kHz
                downlinkStart: 26500000, // kHz
                downlinkEnd: 29500000 // kHz
            });
        });
    });

    describe('getAllNRBands', () => {
        it('should return all NR bands', () => {
            const bands = getAllNRBands();
            expect(bands).toContain('N1');
            expect(bands).toContain('N3');
            expect(bands).toContain('N78');
            expect(bands).toContain('N257');
            expect(bands).toHaveLength(23);
        });
    });
});
