import {
    lteArfcnToFrequency,
    lteFrequencyToArfcn,
    detectLTEBandFromFrequency,
    detectLTEBandFromArfcn,
    getLTEBandFrequencyRange,
    getAllLTEBands
} from '@/radio/lte';
import { LTEBand } from '@/radio/types';

describe('LTE Functions', () => {
    describe('lteArfcnToFrequency', () => {
        it('should convert LTE Band 1 ARFCN to frequency correctly', () => {
            const result = lteArfcnToFrequency(0, LTEBand.B1);
            expect(result.uplink).toBe(1920000); // 1920 MHz
            expect(result.downlink).toBe(2110000); // 2110 MHz
        });

        it('should convert LTE Band 3 ARFCN to frequency correctly', () => {
            const result = lteArfcnToFrequency(1200, LTEBand.B3);
            expect(result.uplink).toBe(1710000); // 1710 MHz
            expect(result.downlink).toBe(1805000); // 1805 MHz
        });

        it('should convert LTE Band 7 ARFCN to frequency correctly', () => {
            const result = lteArfcnToFrequency(2750, LTEBand.B7);
            expect(result.uplink).toBe(2500000); // 2500 MHz
            expect(result.downlink).toBe(2620000); // 2620 MHz
        });

        it('should handle TDD bands correctly (Band 38)', () => {
            const result = lteArfcnToFrequency(37750, LTEBand.B38);
            expect(result.uplink).toBe(2570000); // 2570 MHz
            expect(result.downlink).toBe(2570000); // 2570 MHz TDD uses same frequency
        });

        it('should throw error for ARFCN out of range', () => {
            expect(() => lteArfcnToFrequency(10000, LTEBand.B1))
                .toThrow('ARFCN 10000 is out of range for band B1');
        });

        it('should handle channel spacing correctly', () => {
            const result1 = lteArfcnToFrequency(0, LTEBand.B1);
            const result2 = lteArfcnToFrequency(1, LTEBand.B1);

            expect(result2.uplink - result1.uplink).toBeCloseTo(100);
            expect(result2.downlink - result1.downlink).toBeCloseTo(100);
        });
    });

    describe('lteFrequencyToArfcn', () => {
        it('should convert uplink frequency to ARFCN correctly', () => {
            const arfcn = lteFrequencyToArfcn(1920000, LTEBand.B1);
            expect(arfcn).toBe(0);
        });

        it('should convert downlink frequency to ARFCN correctly', () => {
            const arfcn = lteFrequencyToArfcn(2110000, LTEBand.B1);
            expect(arfcn).toBe(0);
        });

        it('should handle frequency with channel spacing', () => {
            const arfcn = lteFrequencyToArfcn(1920200, LTEBand.B1);
            expect(arfcn).toBe(2);
        });

        it('should handle TDD frequency conversion', () => {
            const arfcn = lteFrequencyToArfcn(2570000, LTEBand.B38);
            expect(arfcn).toBe(37750);
        });

        it('should throw error for frequency out of band', () => {
            expect(() => lteFrequencyToArfcn(3000000, LTEBand.B1))
                .toThrow('Frequency 3000000 kHz is not in band B1');
        });
    });

    describe('detectLTEBandFromFrequency', () => {
        it('should detect Bands 1, 2 and 25 from uplink frequency', () => {
            const band = detectLTEBandFromFrequency(1950000);
            expect(band).toStrictEqual([LTEBand.B1, LTEBand.B2, LTEBand.B25]);
        });

        it('should detect Bands 1 and 4 from downlink frequency', () => {
            const band = detectLTEBandFromFrequency(2140000);
            expect(band).toStrictEqual([LTEBand.B1, LTEBand.B4]);
        });

        it('should detect Bands 3 and 4 correctly', () => {
            const band = detectLTEBandFromFrequency(1750000);
            expect(band).toStrictEqual([LTEBand.B3, LTEBand.B4]);
        });

        it('should detect Bands 7 and 41 correctly', () => {
            const band = detectLTEBandFromFrequency(2550000);
            expect(band).toStrictEqual([LTEBand.B7, LTEBand.B41]);
        });

        it('should detect TDD Band 38 and 41 correctly', () => {
            const band = detectLTEBandFromFrequency(2590000);
            expect(band).toStrictEqual([LTEBand.B38, LTEBand.B41]);
        });

        it('should throw error for frequency not in any band', () => {
            expect(() => detectLTEBandFromFrequency(1000000))
                .toThrow('Cannot detect LTE band for frequency 1000000 kHz');
        });
    });

    describe('detectLTEBandFromArfcn', () => {
        it('should detect Band 1 from ARFCN', () => {
            const band = detectLTEBandFromArfcn(100);
            expect(band).toStrictEqual([LTEBand.B1]);
        });

        it('should detect Band 3 from ARFCN', () => {
            const band = detectLTEBandFromArfcn(1300);
            expect(band).toStrictEqual([LTEBand.B3]);
        });

        it('should detect TDD Band 38 from ARFCN', () => {
            const band = detectLTEBandFromArfcn(37800);
            expect(band).toStrictEqual([LTEBand.B38]);
        });

        it('should throw error for ARFCN not in any band', () => {
            expect(() => detectLTEBandFromArfcn(99999))
                .toThrow('Cannot detect LTE band for ARFCN 99999');
        });
    });

    describe('getLTEBandFrequencyRange', () => {
        it('should return correct frequency range for Band 1', () => {
            const range = getLTEBandFrequencyRange(LTEBand.B1);
            expect(range).toEqual({
                uplinkStart: 1920000, // 1920 MHz
                uplinkEnd: 1980000, // 1980 MHz
                downlinkStart: 2110000, // 2110 MHz
                downlinkEnd: 2170000 // 2170 MHz
            });
        });

        it('should return correct frequency range for TDD Band 38', () => {
            const range = getLTEBandFrequencyRange(LTEBand.B38);
            expect(range).toEqual({
                uplinkStart: 2570000, // 2570 MHz
                uplinkEnd: 2620000, // 2620 MHz
                downlinkStart: 2570000, // 2570 MHz
                downlinkEnd: 2620000 // 2620 MHz
            });
        });
    });

    describe('getAllLTEBands', () => {
        it('should return all LTE bands', () => {
            const bands = getAllLTEBands();
            expect(bands).toHaveLength(27);
            expect(bands).toContain('B1');
            expect(bands).toContain('B3');
            expect(bands).toContain('B7');
            expect(bands).toContain('B38');
        });
    });
});
