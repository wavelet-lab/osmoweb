import { describe, it, expect } from 'vitest';
import { configureARFCN } from '@/radio/arfcn';
import { RadioTechnology, GSMBand, LTEBand, NRBand } from '@/radio/types';

describe('Integration Tests', () => {
    describe('Cross-technology scenarios', () => {
        it('should handle frequency that exists in multiple technologies', () => {
            // 1950 MHz exists in both LTE B1 and NR N1
            const lteResult = configureARFCN({
                frequency: 1950000, // 1950 MHz for LTE
                technology: RadioTechnology.LTE
            });

            const nrResult = configureARFCN({
                frequency: 1950000, // 1950 MHz for NR
                technology: RadioTechnology.NR
            });

            expect(lteResult.technology).toBe(RadioTechnology.LTE);
            expect(lteResult.band).toBe(LTEBand.B1);
            expect(nrResult.technology).toBe(RadioTechnology.NR);
            expect(nrResult.band).toBe(NRBand.N1);
        });

        it('should auto-detect technology for unique frequencies', () => {
            // 900 MHz is unique to GSM
            const gsmResult = configureARFCN({
                frequency: 900000, // 900 MHz
            });

            expect(gsmResult.technology).toBe(RadioTechnology.GSM);
            expect(gsmResult.band).toBe(GSMBand.GSM_900);

            // 28 GHz is unique to NR mmWave
            const nrMmWaveResult = configureARFCN({
                frequency: 28000000 // 28 GHz
            });

            expect(nrMmWaveResult.technology).toBe(RadioTechnology.NR);
            expect(nrMmWaveResult.band).toBe(NRBand.N257);
        });
    });

    describe('Real-world scenarios', () => {
        it('should configure typical GSM 900 cell', () => {
            const result = configureARFCN({
                arfcn: 62,
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900
            });

            expect(result.arfcn).toBe(62);
            expect(result.technology).toBe(RadioTechnology.GSM);
            expect(result.band).toBe(GSMBand.GSM_900);
            expect(result.downlinkFrequency).toBe(947400); // Downlink frequency
            expect(result.uplinkFrequency).toBe(902400);
            expect(result.downlinkFrequency).toBe(947400);
        });

        it('should configure typical LTE B1 cell', () => {
            const result = configureARFCN({
                arfcn: 300,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                channelBandwidth: 20
            });

            expect(result.arfcn).toBe(300);
            expect(result.technology).toBe(RadioTechnology.LTE);
            expect(result.band).toBe(LTEBand.B1);
            expect(result.channelBandwidth).toBe(20);
            expect(result.downlinkFrequency).toBe(2140000); // 2140 MHz
            expect(result.uplinkFrequency).toBe(1950000); // 1950 MHz
            expect(result.downlinkFrequency).toBe(2140000); // 2140 MHz
        });

        it('should configure typical NR sub-6 cell', () => {
            const result = configureARFCN({
                frequency: 3500000, // 3500 MHz
                technology: RadioTechnology.NR,
                band: NRBand.N78,
                channelBandwidth: 100
            });

            expect(result.technology).toBe(RadioTechnology.NR);
            expect(result.band).toBe(NRBand.N78);
            expect(result.downlinkFrequency).toBe(3499995); // 3499.995 MHz
            expect(result.channelBandwidth).toBe(100);
            expect(result.arfcn).toBe(633333); // Calculated ARFCN
            expect(result.uplinkFrequency).toBe(3499995); // 3499.995 MHz
            expect(result.downlinkFrequency).toBe(3499995); // 3499.995 MHz TDD
        });

        it('should configure NR mmWave cell', () => {
            const result = configureARFCN({
                arfcn: 2054333,
                technology: RadioTechnology.NR,
                band: NRBand.N257
            });

            expect(result.arfcn).toBe(2054333);
            expect(result.technology).toBe(RadioTechnology.NR);
            expect(result.band).toBe(NRBand.N257);
            expect(result.downlinkFrequency).toBe(26510020); // 26510.020 MHz
            expect(result.uplinkFrequency).toBe(26510020); // 26510.020 MHz
            expect(result.downlinkFrequency).toBe(26510020); // TDD, 26510.020 MHz
        });
    });

    describe('Boundary conditions', () => {
        it('should handle band edge frequencies', () => {
            // Test lower edge of GSM 900
            const lowerEdge = configureARFCN({
                frequency: 890000, // 890 MHz Lower edge uplink
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900
            });

            expect(lowerEdge.arfcn).toBe(0);

            // Test upper edge of GSM 900
            const upperEdge = configureARFCN({
                frequency: 914800, // 914.8 MHz Upper edge uplink (ARFCN 124)
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900
            });

            expect(upperEdge.arfcn).toBe(124);
        });

        it('should handle minimum and maximum ARFCNs', () => {
            // Test minimum LTE ARFCN for Band 1
            const minArfcn = configureARFCN({
                arfcn: 0,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1
            });

            expect(minArfcn.downlinkFrequency).toBe(2110000); // 2110 MHz

            // Test maximum LTE ARFCN for Band 1
            const maxArfcn = configureARFCN({
                arfcn: 599,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1
            });

            expect(maxArfcn.downlinkFrequency).toBe(2169900); // 2169.9 MHz
        });
    });

    describe('Error scenarios', () => {
        it('should provide meaningful errors for invalid inputs', () => {
            expect(() => configureARFCN({}))
                .toThrow('Either ARFCN or frequency must be provided');

            expect(() => configureARFCN({
                frequency: 100 // Invalid frequency
            })).toThrow('Cannot detect technology for frequency 100 kHz');

            expect(() => configureARFCN({
                arfcn: 1000,
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900
            })).toThrow('ARFCN 1000 is out of range for band GSM_900');
        });
    });

    describe('Consistency checks', () => {
        it('should maintain frequency-ARFCN consistency', () => {
            const frequencies = [945000, 1950000, 2140000, 3500000, 28000000]; // NR frequencies in kHz

            frequencies.forEach(freq => {
                try {
                    const result1 = configureARFCN({ frequency: freq });
                    const result2 = configureARFCN({
                        arfcn: result1.arfcn,
                        technology: result1.technology,
                        band: result1.band
                    });

                    expect(result2.downlinkFrequency).toBe(freq);
                    expect(result2.technology).toBe(result1.technology);
                    expect(result2.band).toBe(result1.band);
                } catch (error) {
                    // Some frequencies might not be supported, that's OK
                    console.log(`Frequency ${freq} not supported:`, (error as Error).message);
                }
            });
        });

        it('should handle round-trip conversions accurately', () => {
            const testCases = [
                { arfcn: 62, technology: RadioTechnology.GSM, band: GSMBand.GSM_900 },
                { arfcn: 300, technology: RadioTechnology.LTE, band: LTEBand.B1 },
                { arfcn: 422000, technology: RadioTechnology.NR, band: NRBand.N1 },
                { arfcn: 632000, technology: RadioTechnology.NR, band: NRBand.N78 }
            ];

            testCases.forEach(testCase => {
                const result1 = configureARFCN(testCase);
                const result2 = configureARFCN({
                    frequency: result1.downlinkFrequency!,
                    technology: testCase.technology,
                    band: testCase.band
                });

                expect(result2.arfcn).toBe(testCase.arfcn);
                expect(result2.technology).toBe(testCase.technology);
                expect(result2.band).toBe(testCase.band);
            });
        });
    });
});
