import {
    RadioTechnology,
    GSMBand,
    LTEBand,
    NRBand,
    type ARFCNConfigInput,
    type ARFCNConfig,
    type FrequencyResult
} from '@/radio/types';

describe('Types and Enums', () => {
    describe('RadioTechnology enum', () => {
        it('should have correct values', () => {
            expect(RadioTechnology.GSM).toBe('GSM');
            expect(RadioTechnology.LTE).toBe('LTE');
            expect(RadioTechnology.NR).toBe('NR');
        });

        it('should have all expected technologies', () => {
            const technologies = Object.values(RadioTechnology);
            expect(technologies).toContain('GSM');
            expect(technologies).toContain('LTE');
            expect(technologies).toContain('NR');
            expect(technologies).toHaveLength(3);
        });
    });

    describe('GSMBand enum', () => {
        it('should have correct values', () => {
            expect(GSMBand.GSM_850).toBe('GSM_850');
            expect(GSMBand.GSM_900).toBe('GSM_900');
            expect(GSMBand.DCS_1800).toBe('DCS_1800');
            expect(GSMBand.PCS_1900).toBe('PCS_1900');
        });

        it('should have all expected GSM bands', () => {
            const bands = Object.values(GSMBand);
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

    describe('LTEBand enum', () => {
        it('should have correct values for major bands', () => {
            expect(LTEBand.B1).toBe('B1');
            expect(LTEBand.B3).toBe('B3');
            expect(LTEBand.B7).toBe('B7');
            expect(LTEBand.B38).toBe('B38');
        });

        it('should have all expected LTE bands', () => {
            const bands = Object.values(LTEBand);
            expect(bands).toHaveLength(27);
            expect(bands).toContain('B1');
            expect(bands).toContain('B20');
            expect(bands).toContain('B38');
            expect(bands).toContain('B48');
        });
    });

    describe('NRBand enum', () => {
        it('should have correct values for major bands', () => {
            expect(NRBand.N1).toBe('N1');
            expect(NRBand.N3).toBe('N3');
            expect(NRBand.N78).toBe('N78');
            expect(NRBand.N257).toBe('N257');
        });

        it('should have all expected NR bands', () => {
            const bands = Object.values(NRBand);
            expect(bands).toHaveLength(23);
            expect(bands).toContain('N1');
            expect(bands).toContain('N78');
            expect(bands).toContain('N257');
            expect(bands).toContain('N261');
        });

        it('should include mmWave bands', () => {
            const bands = Object.values(NRBand);
            expect(bands).toContain('N257');
            expect(bands).toContain('N258');
            expect(bands).toContain('N260');
            expect(bands).toContain('N261');
        });
    });

    describe('ARFCNConfigInput interface', () => {
        it('should accept minimal configuration', () => {
            const config: ARFCNConfigInput = {
                frequency: 900
            };
            expect(config.frequency).toBe(900);
        });

        it('should accept full configuration', () => {
            const config: ARFCNConfigInput = {
                arfcn: 100,
                frequency: 1950000, // 1950 MHz
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                channelBandwidth: 20000 // 20 MHz
            };
            expect(config.arfcn).toBe(100);
            expect(config.frequency).toBe(1950000);
            expect(config.technology).toBe(RadioTechnology.LTE);
            expect(config.band).toBe(LTEBand.B1);
            expect(config.channelBandwidth).toBe(20000);
        });

        it('should accept configuration with only ARFCN', () => {
            const config: ARFCNConfigInput = {
                arfcn: 50,
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900
            };
            expect(config.arfcn).toBe(50);
            expect(config.technology).toBe(RadioTechnology.GSM);
            expect(config.band).toBe(GSMBand.GSM_900);
        });
    });

    describe('ARFCNConfig interface', () => {
        it('should require all mandatory fields', () => {
            const config: ARFCNConfig = {
                arfcn: 100,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                uplinkFrequency: 1950000, // 1950 MHz
                downlinkFrequency: 2140000 // 2140 MHz
            };
            expect(config.arfcn).toBe(100);
            expect(config.technology).toBe(RadioTechnology.LTE);
            expect(config.band).toBe(LTEBand.B1);
            expect(config.uplinkFrequency).toBe(1950000); // 1950 MHz
            expect(config.downlinkFrequency).toBe(2140000); // 2140 MHz
        });

        it('should accept optional channelBandwidth', () => {
            const config: ARFCNConfig = {
                arfcn: 100,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                channelBandwidth: 20,
                uplinkFrequency: 1950000, // 1950 MHz
                downlinkFrequency: 2140000 // 2140 MHz
            };
            expect(config.channelBandwidth).toBe(20);
        });

        it('should handle different band types', () => {
            const gsmConfig: ARFCNConfig = {
                arfcn: 50,
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900,
                uplinkFrequency: 900000, // 900 MHz
                downlinkFrequency: 945000 // 945 MHz
            };

            const lteConfig: ARFCNConfig = {
                arfcn: 100,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                uplinkFrequency: 1950000, // 1950 MHz
                downlinkFrequency: 2140000 // 2140 MHz
            };

            const nrConfig: ARFCNConfig = {
                arfcn: 422000,
                technology: RadioTechnology.NR,
                band: NRBand.N1,
                uplinkFrequency: 1920000,
                downlinkFrequency: 2110000
            };

            expect(gsmConfig.band).toBe(GSMBand.GSM_900);
            expect(lteConfig.band).toBe(LTEBand.B1);
            expect(nrConfig.band).toBe(NRBand.N1);
        });
    });

    describe('FrequencyResult interface', () => {
        it('should have uplink and downlink frequencies', () => {
            const result: FrequencyResult = {
                uplink: 1950000,
                downlink: 2140000
            };
            expect(result.uplink).toBe(1950000);
            expect(result.downlink).toBe(2140000);
        });

        it('should handle TDD bands with same uplink/downlink', () => {
            const result: FrequencyResult = {
                uplink: 2570000,
                downlink: 2570000
            };
            expect(result.uplink).toBe(result.downlink);
        });
    });

    describe('Type compatibility', () => {
        it('should allow GSM band in ARFCNConfig', () => {
            const config: ARFCNConfig = {
                arfcn: 50,
                technology: RadioTechnology.GSM,
                band: GSMBand.GSM_900,
                uplinkFrequency: 900000,
                downlinkFrequency: 945000
            };
            expect(typeof config.band).toBe('string');
        });

        it('should allow LTE band in ARFCNConfig', () => {
            const config: ARFCNConfig = {
                arfcn: 100,
                technology: RadioTechnology.LTE,
                band: LTEBand.B1,
                uplinkFrequency: 1950000,
                downlinkFrequency: 2140000
            };
            expect(typeof config.band).toBe('string');
        });

        it('should allow NR band in ARFCNConfig', () => {
            const config: ARFCNConfig = {
                arfcn: 422000,
                technology: RadioTechnology.NR,
                band: NRBand.N1,
                uplinkFrequency: 1930000,
                downlinkFrequency: 2120000
            };
            expect(typeof config.band).toBe('string');
        });
    });
});
