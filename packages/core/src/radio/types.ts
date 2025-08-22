/**
 * Radio technology types
 */
export enum RadioTechnology {
    GSM = 'GSM',
    LTE = 'LTE',
    NR = 'NR'
}

/**
 * GSM frequency bands according to 3GPP TS 45.005
 * https://www.3gpp.org/ftp/Specs/archive/45_series/45.005/
 * But supported by OsmoBTS
 * https://downloads.osmocom.org/docs/osmo-bts/master/osmobts-sysmo-vty-reference.pdf
 */
export enum GSMBand {
    GSM_450 = 'GSM_450',    // 450 MHz (Doesn't used in public networks)
    GSM_480 = 'GSM_480',    // 480 MHz (Doesn't used in public networks)
    GSM_750 = 'GSM_750',    // 750 MHz (Doesn't used in public networks)
    GSM_810 = 'GSM_810',    // 810 MHz (Doesn't used in public networks)
    GSM_850 = 'GSM_850',    // 850 MHz (Americas)
    GSM_900 = 'GSM_900',    // 900 MHz (Global)
    DCS_1800 = 'DCS_1800',  // 1800 MHz (Global)
    PCS_1900 = 'PCS_1900'   // 1900 MHz (Americas)
}

/**
 * LTE frequency bands according to 3GPP TS 36.101
 * https://www.3gpp.org/ftp/Specs/archive/36_series/36.101/
 */
export enum LTEBand {
    B1 = 'B1',     // 2100 MHz (Global)
    B2 = 'B2',     // 1900 MHz PCS (Americas)
    B3 = 'B3',     // 1800 MHz DCS (Global)
    B4 = 'B4',     // 1700/2100 MHz AWS (Americas)
    B5 = 'B5',     // 850 MHz (Americas, Asia-Pacific)
    B7 = 'B7',     // 2600 MHz (Global)
    B8 = 'B8',     // 900 MHz (Global)
    B12 = 'B12',   // 700 MHz (Americas)
    B13 = 'B13',   // 700 MHz (Americas)
    B17 = 'B17',   // 700 MHz (Americas)
    B18 = 'B18',   // 800 MHz (Japan)
    B19 = 'B19',   // 800 MHz (Japan)
    B20 = 'B20',   // 800 MHz DD (Europe)
    B21 = 'B21',   // 1500 MHz (Japan)
    B25 = 'B25',   // 1900 MHz (Americas)
    B26 = 'B26',   // 850 MHz (Americas)
    B28 = 'B28',   // 700 MHz (Asia-Pacific)
    B32 = 'B32',   // 1500 MHz (Europe)
    B34 = 'B34',   // 2000 MHz TDD (Global)
    B38 = 'B38',   // 2600 MHz TDD (Global)
    B39 = 'B39',   // 1900 MHz TDD (Asia)
    B40 = 'B40',   // 2300 MHz TDD (Global)
    B41 = 'B41',   // 2500 MHz TDD (Global)
    B42 = 'B42',   // 3500 MHz TDD (Global)
    B43 = 'B43',   // 3700 MHz TDD (Global)
    B46 = 'B46',   // 5200 MHz TDD (Global)
    B48 = 'B48'    // 3600 MHz TDD (Global)
}

/**
 * NR frequency bands according to 3GPP TS 38.101
 * https://www.3gpp.org/ftp/Specs/archive/38_series/38.101/
 */
export enum NRBand {
    N1 = 'N1',     // 2100 MHz (Global)
    N2 = 'N2',     // 1900 MHz PCS (Americas)
    N3 = 'N3',     // 1800 MHz DCS (Global)
    N5 = 'N5',     // 850 MHz (Americas, Asia-Pacific)
    N7 = 'N7',     // 2600 MHz (Global)
    N8 = 'N8',     // 900 MHz (Global)
    N12 = 'N12',   // 700 MHz (Americas)
    N20 = 'N20',   // 800 MHz DD (Europe)
    N25 = 'N25',   // 1900 MHz (Americas)
    N28 = 'N28',   // 700 MHz (Asia-Pacific)
    N38 = 'N38',   // 2600 MHz TDD (Global)
    N40 = 'N40',   // 2300 MHz TDD (Global)
    N41 = 'N41',   // 2500 MHz TDD (Global)
    N48 = 'N48',   // 3600 MHz TDD (Global)
    N66 = 'N66',   // 1700/2100 MHz AWS (Americas)
    N71 = 'N71',   // 600 MHz (Americas)
    N77 = 'N77',   // 3700 MHz TDD (Global)
    N78 = 'N78',   // 3500 MHz TDD (Global)
    N79 = 'N79',   // 4700 MHz TDD (Asia-Pacific)
    N257 = 'N257', // 28 GHz mmWave (Global)
    N258 = 'N258', // 26 GHz mmWave (Global)
    N260 = 'N260', // 39 GHz mmWave (Global)
    N261 = 'N261'  // 28 GHz mmWave (Global)
}

/**
 * Mobile band
 */
export type MobileBand = GSMBand | LTEBand | NRBand;

/**
 * Complete ARFCN configuration output
 */
export interface ARFCNConfig {
    arfcn: number;
    technology: RadioTechnology;
    band: MobileBand;
    channelBandwidth?: number | undefined;  // in kHz, for LTE/NR
    uplinkFrequency?: number;   // in kHz
    downlinkFrequency?: number; // in kHz
}

/**
 * Input parameters for ARFCN configuration
 */
// export type ARFCNConfigInput = Partial<ARFCNConfig>;
export interface ARFCNConfigInput {
    arfcn?: number;
    frequency?: number; // in kHz
    technology?: RadioTechnology;
    band?: MobileBand;
    channelBandwidth?: number; // in kHz, for LTE/NR
}

/**
 * Frequency result interface
 */
export interface FrequencyResult {
    uplink: number;     // in kHz
    downlink: number;   // in kHz
}
