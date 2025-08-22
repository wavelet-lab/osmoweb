import { describe, it, expect } from 'vitest';
import {
    gsmArfcnToFrequency,
    gsmFrequencyToArfcn,
    detectGSMBandFromFrequency,
    detectGSMBandFromArfcn,
    getGSMBandFrequencyRange,
    getAllGSMBands
} from '@/radio/gsm';
import { GSMBand } from '@/radio/types';

describe('GSM Functions', () => {
    describe('gsmArfcnToFrequency', () => {
        it('should convert GSM 900 ARFCN to frequency correctly', () => {
            const result = gsmArfcnToFrequency(0, GSMBand.GSM_900);
            expect(result.uplink).toBe(890000); // 890 MHz
            expect(result.downlink).toBe(935000); // 935 MHz
        });

        it('should convert GSM 850 ARFCN to frequency correctly', () => {
            const result = gsmArfcnToFrequency(128, GSMBand.GSM_850);
            expect(result.uplink).toBe(824200); // 824.2 MHz
            expect(result.downlink).toBe(869200); // 869.2 MHz
        });

        it('should convert DCS 1800 ARFCN to frequency correctly', () => {
            const result = gsmArfcnToFrequency(512, GSMBand.DCS_1800);
            expect(result.uplink).toBe(1710200); // 1710.2 MHz
            expect(result.downlink).toBe(1805200); // 1805.2 MHz
        });

        it('should convert PCS 1900 ARFCN to frequency correctly', () => {
            const result = gsmArfcnToFrequency(512, GSMBand.PCS_1900);
            expect(result.uplink).toBe(1850200); // 1850.2 MHz
            expect(result.downlink).toBe(1930200); // 1930.2 MHz
        });

        it('should throw error for ARFCN out of range', () => {
            expect(() => gsmArfcnToFrequency(1000, GSMBand.GSM_900))
                .toThrow('ARFCN 1000 is out of range for band GSM_900');
        });

        it('should handle channel spacing correctly', () => {
            const result1 = gsmArfcnToFrequency(1, GSMBand.GSM_900);
            const result2 = gsmArfcnToFrequency(2, GSMBand.GSM_900);

            expect(result2.uplink - result1.uplink).toBe(200);
            expect(result2.downlink - result1.downlink).toBe(200);
        });
    });

    describe('gsmFrequencyToArfcn', () => {
        it('should convert uplink frequency to ARFCN correctly', () => {
            const arfcn = gsmFrequencyToArfcn(890000, GSMBand.GSM_900); // 890 MHz
            expect(arfcn).toBe(0);
        });

        it('should convert downlink frequency to ARFCN correctly', () => {
            const arfcn = gsmFrequencyToArfcn(935000, GSMBand.GSM_900); // 935 MHz
            expect(arfcn).toBe(0);
        });

        it('should handle frequency with channel spacing', () => {
            const arfcn = gsmFrequencyToArfcn(890400, GSMBand.GSM_900); // 890.4 MHz
            expect(arfcn).toBe(2);
        });

        it('should throw error for frequency out of band', () => {
            expect(() => gsmFrequencyToArfcn(1000000, GSMBand.GSM_900))
                .toThrow('Frequency 1000000 kHz is not in band GSM_900');
        });
    });

    describe('detectGSMBandFromFrequency', () => {
        it('should detect GSM_900 from uplink frequency', () => {
            const band = detectGSMBandFromFrequency(900000); // 900 MHz
            expect(band).toStrictEqual([GSMBand.GSM_900]);
        });

        it('should detect GSM_900 from downlink frequency', () => {
            const band = detectGSMBandFromFrequency(950000); // 950 MHz
            expect(band).toStrictEqual([GSMBand.GSM_900]);
        });

        it('should detect GSM_850 correctly', () => {
            const band = detectGSMBandFromFrequency(830000); // 830 MHz
            expect(band).toStrictEqual([GSMBand.GSM_850]);
        });

        it('should detect DCS_1800 correctly', () => {
            const band = detectGSMBandFromFrequency(1750000); // 1750 MHz
            expect(band).toStrictEqual([GSMBand.DCS_1800]);
        });

        it('should detect PCS_1900 correctly', () => {
            const band = detectGSMBandFromFrequency(1950000); // 1950 MHz
            expect(band).toStrictEqual([GSMBand.PCS_1900]);
        });

        it('should throw error for frequency not in any band', () => {
            expect(() => detectGSMBandFromFrequency(2000000))
                .toThrow('Cannot detect GSM band for frequency 2000000 kHz');
        });
    });

    describe('detectGSMBandFromArfcn', () => {
        it('should detect GSM_900 from ARFCN', () => {
            const band = detectGSMBandFromArfcn(50);
            expect(band).toStrictEqual([GSMBand.GSM_900]);
        });

        it('should detect GSM_850 from ARFCN', () => {
            const band = detectGSMBandFromArfcn(200);
            expect(band).toStrictEqual([GSMBand.GSM_850]);
        });

        it('should detect DCS_1800 and PCS_1900 from ARFCN', () => {
            const band = detectGSMBandFromArfcn(600);
            expect(band).toStrictEqual([GSMBand.DCS_1800, GSMBand.PCS_1900]);
        });

        it('should throw error for ARFCN not in any band', () => {
            expect(() => detectGSMBandFromArfcn(2000))
                .toThrow('Cannot detect GSM band for ARFCN 2000');
        });
    });

    describe('getGSMBandFrequencyRange', () => {
        it('should return correct frequency range for GSM_900', () => {
            const range = getGSMBandFrequencyRange(GSMBand.GSM_900);
            expect(range).toEqual({
                uplinkStart: 890000, // 890 MHz
                uplinkEnd: 915000, // 915 MHz
                downlinkStart: 935000, // 935 MHz
                downlinkEnd: 960000 // 960 MHz
            });
        });

        it('should return correct frequency range for GSM_850', () => {
            const range = getGSMBandFrequencyRange(GSMBand.GSM_850);
            expect(range).toEqual({
                uplinkStart: 824200, // 824.2 MHz
                uplinkEnd: 848800, // 848.8 MHz
                downlinkStart: 869200, // 869.2 MHz
                downlinkEnd: 893800 // 893.8 MHz
            });
        });
    });

    describe('getAllGSMBands', () => {
        it('should return all GSM bands', () => {
            const bands = getAllGSMBands();
            expect(bands).toHaveLength(8);
            expect(bands).toContain('GSM_450');
            expect(bands).toContain('GSM_480');
            expect(bands).toContain('GSM_750');
            expect(bands).toContain('GSM_810');
            expect(bands).toContain('GSM_850');
            expect(bands).toContain('GSM_900');
            expect(bands).toContain('DCS_1800');
            expect(bands).toContain('PCS_1900');
        });
    });
});
