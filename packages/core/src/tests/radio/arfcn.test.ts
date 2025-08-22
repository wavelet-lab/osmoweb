import { describe, it, expect } from 'vitest';
import {
    configureARFCN,
    getSupportedBands,
    getBandFrequencyRange
} from '@/radio/arfcn';
import { RadioTechnology, GSMBand, LTEBand, NRBand, type MobileBand } from '@/radio/types';

describe('ARFCN Configuration Functions', () => {
    describe('configureARFCN', () => {
        describe('ARFCN priority', () => {
            it('should prioritize ARFCN when both ARFCN and frequency are provided', () => {
                const result = configureARFCN({
                    arfcn: 100,
                    frequency: 2000, // Different from what ARFCN 100 would give
                    technology: RadioTechnology.LTE,
                    band: LTEBand.B1
                });

                expect(result.arfcn).toBe(100);
                expect(result.downlinkFrequency).not.toBe(2000);
                expect(result.technology).toBe(RadioTechnology.LTE);
                expect(result.band).toBe(LTEBand.B1);
            });
        });

        describe('GSM configuration', () => {
            it('should configure GSM from ARFCN', () => {
                const result = configureARFCN({
                    arfcn: 50,
                    technology: RadioTechnology.GSM,
                    band: GSMBand.GSM_900
                });

                expect(result.arfcn).toBe(50);
                expect(result.technology).toBe(RadioTechnology.GSM);
                expect(result.band).toBe(GSMBand.GSM_900);
                expect(result.downlinkFrequency).toBe(945000); // Downlink frequency
                expect(result.uplinkFrequency).toBe(900000);
                expect(result.downlinkFrequency).toBe(945000);
            });

            it('should configure GSM from frequency', () => {
                const result = configureARFCN({
                    frequency: 900000, // 900 MHz
                    technology: RadioTechnology.GSM,
                    band: GSMBand.GSM_900
                });

                expect(result.downlinkFrequency).toBe(945000);
                expect(result.technology).toBe(RadioTechnology.GSM);
                expect(result.band).toBe(GSMBand.GSM_900);
                expect(result.arfcn).toBe(50);
            });

            it('should auto-detect GSM band from frequency', () => {
                const result = configureARFCN({
                    frequency: 900000, // 900 MHz
                    technology: RadioTechnology.GSM
                });

                expect(result.band).toBe(GSMBand.GSM_900);
                expect(result.technology).toBe(RadioTechnology.GSM);
            });

            it('should auto-detect GSM band from ARFCN', () => {
                const result = configureARFCN({
                    arfcn: 200,
                    technology: RadioTechnology.GSM
                });

                expect(result.band).toBe(GSMBand.GSM_850);
                expect(result.technology).toBe(RadioTechnology.GSM);
            });
        });

        describe('LTE configuration', () => {
            it('should configure LTE from ARFCN', () => {
                const result = configureARFCN({
                    arfcn: 100,
                    technology: RadioTechnology.LTE,
                    band: LTEBand.B1
                });

                expect(result.arfcn).toBe(100);
                expect(result.technology).toBe(RadioTechnology.LTE);
                expect(result.band).toBe(LTEBand.B1);
                expect(result.downlinkFrequency).toBe(2120000); // 2120 MHz
                expect(result.uplinkFrequency).toBe(1930000); // 1930 MHz
                expect(result.downlinkFrequency).toBe(2120000); // 2120 MHz
            });

            it('should configure LTE from frequency', () => {
                const result = configureARFCN({
                    frequency: 1950000, // 1950 MHz (uplink)
                    technology: RadioTechnology.LTE,
                    band: LTEBand.B1
                });

                expect(result.downlinkFrequency).toBe(2140000); // 2140 MHz
                expect(result.technology).toBe(RadioTechnology.LTE);
                expect(result.band).toBe(LTEBand.B1);
                expect(result.arfcn).toBe(300);
            });

            it('should auto-detect LTE band from frequency', () => {
                const result = configureARFCN({
                    frequency: 1950000, // 1950 MHz
                    technology: RadioTechnology.LTE
                });

                expect(result.band).toBe(LTEBand.B1);
                expect(result.technology).toBe(RadioTechnology.LTE);
            });

            it('should handle LTE TDD bands', () => {
                const result = configureARFCN({
                    frequency: 2570000, // 2570 MHz
                    technology: RadioTechnology.LTE,
                    band: LTEBand.B38
                });

                expect(result.band).toBe(LTEBand.B38);
                expect(result.uplinkFrequency).toBe(2570000); // 2570 MHz
                expect(result.downlinkFrequency).toBe(2570000); // TDD uses same frequency
            });
        });

        describe('NR configuration', () => {
            it('should configure NR from ARFCN', () => {
                const result = configureARFCN({
                    arfcn: 422000,
                    technology: RadioTechnology.NR,
                    band: NRBand.N1
                });

                expect(result.arfcn).toBe(422000);
                expect(result.technology).toBe(RadioTechnology.NR);
                expect(result.band).toBe(NRBand.N1);
                expect(result.downlinkFrequency).toBe(2110000); // 2110 MHz
                expect(result.uplinkFrequency).toBe(1920000); // 1920 MHz
                expect(result.downlinkFrequency).toBe(2110000); // 2110 MHz
            });

            it('should configure NR from frequency', () => {
                const result = configureARFCN({
                    frequency: 1950000, // 1950 MHz (uplink)
                    technology: RadioTechnology.NR,
                    band: NRBand.N1
                });

                expect(result.downlinkFrequency).toBe(2140000); // 2140 MHz
                expect(result.technology).toBe(RadioTechnology.NR);
                expect(result.band).toBe(NRBand.N1);
                expect(result.arfcn).toBe(424000);
            });

            it('should auto-detect NR band from frequency', () => {
                const result = configureARFCN({
                    frequency: 3500000, // 3500 MHz
                    technology: RadioTechnology.NR
                });

                expect(result.band).toBe(NRBand.N77);
                expect(result.technology).toBe(RadioTechnology.NR);
            });

            it('should handle NR mmWave bands', () => {
                const result = configureARFCN({
                    frequency: 28000000, // 28 GHz
                    technology: RadioTechnology.NR,
                    band: NRBand.N257
                });

                expect(result.band).toBe(NRBand.N257);
                expect(result.uplinkFrequency).toBe(28000000); // 28 GHz
                expect(result.downlinkFrequency).toBe(28000000); // 28 GHz TDD uses same frequency
            });

            it('should handle channel bandwidth', () => {
                const result = configureARFCN({
                    frequency: 3500000, // 3500 MHz
                    technology: RadioTechnology.NR,
                    band: NRBand.N78,
                    channelBandwidth: 100
                });

                expect(result.channelBandwidth).toBe(100);
            });
        });

        describe('Technology auto-detection', () => {
            it('should auto-detect GSM technology from frequency', () => {
                const result = configureARFCN({
                    frequency: 900000 // 900 MHz
                });

                expect(result.technology).toBe(RadioTechnology.GSM);
                expect(result.band).toBe(GSMBand.GSM_900);
            });

            it('should auto-detect LTE technology from frequency', () => {
                const result = configureARFCN({
                    frequency: 2140000 // 2140 MHz
                });

                expect(result.technology).toBe(RadioTechnology.LTE);
                expect(result.band).toBe(LTEBand.B1);
            });

            it('should prefer NR over LTE for overlapping frequencies when NR is specified', () => {
                const result = configureARFCN({
                    frequency: 1950000, // 1950 MHz
                    technology: RadioTechnology.NR
                });

                expect(result.technology).toBe(RadioTechnology.NR);
                expect(result.band).toBe(NRBand.N1);
            });
        });

        describe('Error handling', () => {
            it('should throw error when no frequency or ARFCN provided', () => {
                expect(() => configureARFCN({
                    technology: RadioTechnology.GSM
                })).toThrow('Either ARFCN or frequency must be provided');
            });

            it('should throw error for invalid frequency', () => {
                expect(() => configureARFCN({
                    frequency: 100
                })).toThrow('Cannot detect technology for frequency 100 kHz');
            });

            it('should throw error for ARFCN out of range', () => {
                expect(() => configureARFCN({
                    arfcn: 10000,
                    technology: RadioTechnology.GSM,
                    band: GSMBand.GSM_900
                })).toThrow('ARFCN 10000 is out of range for band GSM_900');
            });
        });
    });

    describe('getSupportedBands', () => {
        it('should return GSM bands for GSM technology', () => {
            const bands = getSupportedBands(RadioTechnology.GSM);
            expect(bands).toHaveLength(8);
            expect(bands).toContain('GSM_900');
            expect(bands).toContain('GSM_850');
        });

        it('should return LTE bands for LTE technology', () => {
            const bands = getSupportedBands(RadioTechnology.LTE);
            expect(bands).toHaveLength(27);
            expect(bands).toContain('B1');
            expect(bands).toContain('B3');
        });

        it('should return NR bands for NR technology', () => {
            const bands = getSupportedBands(RadioTechnology.NR);
            expect(bands).toHaveLength(23);
            expect(bands).toContain('N1');
            expect(bands).toContain('N78');
        });
    });

    describe('getBandFrequencyRange', () => {
        it('should return GSM band frequency range', () => {
            const range = getBandFrequencyRange(RadioTechnology.GSM, 'GSM_900' as MobileBand);
            expect(range).toEqual({
                uplinkStart: 890000, // 890 MHz
                uplinkEnd: 915000, // 915 MHz
                downlinkStart: 935000, // 935 MHz
                downlinkEnd: 960000 // 960 MHz
            });
        });

        it('should return LTE band frequency range', () => {
            const range = getBandFrequencyRange(RadioTechnology.LTE, 'B1' as MobileBand);
            expect(range).toEqual({
                uplinkStart: 1920000, // 1920 MHz
                uplinkEnd: 1980000, // 1980 MHz
                downlinkStart: 2110000, // 2110 MHz
                downlinkEnd: 2170000 // 2170 MHz
            });
        });

        it('should return NR band frequency range', () => {
            const range = getBandFrequencyRange(RadioTechnology.NR, 'N78' as MobileBand);
            expect(range).toEqual({
                uplinkStart: 3300000, // 3300 MHz
                uplinkEnd: 3800000, // 3800 MHz
                downlinkStart: 3300000, // 3300 MHz
                downlinkEnd: 3800000 // 3800 MHz
            });
        });

        it('should throw error for unsupported technology', () => {
            expect(() => getBandFrequencyRange('UNKNOWN' as RadioTechnology, 'TEST' as MobileBand))
                .toThrow('Unsupported technology: UNKNOWN');
        });
    });
});
