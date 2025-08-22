import { GSMBand } from '@/radio/types';
import type { FrequencyResult } from '@/radio/types';

/**
 * GSM band configuration
 */
interface GSMBandConfig {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
    arfcnStart: number;
    arfcnEnd: number;
    channelSpacing: number;
}

/**
 * GSM band configurations
 */
const GSM_BANDS: Record<GSMBand, GSMBandConfig> = {
    [GSMBand.GSM_450]: {
        uplinkStart: 450600,    // 450.6 MHz
        uplinkEnd: 457400,      // 457.4 MHz
        downlinkStart: 460600,  // 460.6 MHz
        downlinkEnd: 467400,    // 467.4 MHz
        arfcnStart: 259,
        arfcnEnd: 293,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.GSM_480]: {
        uplinkStart: 479000,    // 479 MHz
        uplinkEnd: 485800,      // 485.8 MHz
        downlinkStart: 489000,  // 489 MHz
        downlinkEnd: 495800,    // 495.8 MHz
        arfcnStart: 306,
        arfcnEnd: 340,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.GSM_750]: {
        uplinkStart: 747200,    // 747.2 MHz
        uplinkEnd: 762200,      // 762.2 MHz
        downlinkStart: 777200,  // 777.2 MHz
        downlinkEnd: 792200,    // 792.2 MHz
        arfcnStart: 438,
        arfcnEnd: 511,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.GSM_810]: {
        uplinkStart: 806200,    // 806.2 MHz
        uplinkEnd: 813600,      // 813.6 MHz
        downlinkStart: 851200,  // 851.2 MHz
        downlinkEnd: 858600,    // 858.6 MHz
        arfcnStart: 512,
        arfcnEnd: 549,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.GSM_850]: {
        uplinkStart: 824200,    // 824.2 MHz
        uplinkEnd: 848800,      // 848.8 MHz
        downlinkStart: 869200,  // 869.2 MHz
        downlinkEnd: 893800,    // 893.8 MHz
        arfcnStart: 128,
        arfcnEnd: 251,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.GSM_900]: {
        uplinkStart: 890000,    // 890 MHz
        uplinkEnd: 915000,      // 915 MHz
        downlinkStart: 935000,  // 935 MHz
        downlinkEnd: 960000,    // 960 MHz
        arfcnStart: 0,          // Doesn't include ARFCN for Extended Range GSM 900 (940-1023)
        arfcnEnd: 124,          // Doesn't include ARFCN for Extended Range GSM 900 (940-1023)
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.DCS_1800]: {
        uplinkStart: 1710200,   // 1710.2 MHz
        uplinkEnd: 1784800,     // 1784.8 MHz
        downlinkStart: 1805200, // 1805.2 MHz
        downlinkEnd: 1879800,   // 1879.8 MHz
        arfcnStart: 512,
        arfcnEnd: 885,
        channelSpacing: 200     // 0.2 MHz
    },
    [GSMBand.PCS_1900]: {
        uplinkStart: 1850200,   // 1850.2 MHz
        uplinkEnd: 1909800,     // 1909.8 MHz
        downlinkStart: 1930200, // 1930.2 MHz
        downlinkEnd: 1989800,   // 1989.8 MHz
        arfcnStart: 512,
        arfcnEnd: 810,
        channelSpacing: 200     // 0.2 MHz
    }
};

/**
 * Convert GSM ARFCN to frequency
 */
export function gsmArfcnToFrequency(arfcn: number, band: GSMBand): FrequencyResult {
    const config = GSM_BANDS[band];

    if (arfcn < config.arfcnStart || arfcn > config.arfcnEnd) {
        throw new Error(`ARFCN ${arfcn} is out of range for band ${band}`);
    }

    const channelIndex = arfcn - config.arfcnStart;
    const uplinkFreq = config.uplinkStart + (channelIndex * config.channelSpacing);
    const downlinkFreq = config.downlinkStart + (channelIndex * config.channelSpacing);

    return { uplink: uplinkFreq, downlink: downlinkFreq };
}

/**
 * Convert GSM frequency to ARFCN
 */
export function gsmFrequencyToArfcn(frequency: number, band: GSMBand): number {
    const config = GSM_BANDS[band];

    // Check if frequency is in uplink or downlink range
    let baseFreq: number;
    if (frequency >= config.uplinkStart && frequency <= config.uplinkEnd) {
        baseFreq = config.uplinkStart;
    } else if (frequency >= config.downlinkStart && frequency <= config.downlinkEnd) {
        baseFreq = config.downlinkStart;
    } else {
        throw new Error(`Frequency ${frequency} kHz is not in band ${band}`);
    }

    const channelIndex = Math.round((frequency - baseFreq) / config.channelSpacing);
    return config.arfcnStart + channelIndex;
}

/**
 * Detect GSM band(s) from frequency
 * Returns an array of bands that contain the given frequency
 */
export function detectGSMBandFromFrequency(frequency: number): GSMBand[] {
    const matchingBands: GSMBand[] = [];

    for (const [band, config] of Object.entries(GSM_BANDS)) {
        if ((frequency >= config.uplinkStart && frequency <= config.uplinkEnd) ||
            (frequency >= config.downlinkStart && frequency <= config.downlinkEnd)) {
            matchingBands.push(band as GSMBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect GSM band for frequency ${frequency} kHz`);
    }

    return matchingBands;
}

/**
 * Detect GSM band(s) from ARFCN
 * Returns an array of bands that contain the given ARFCN
 */
export function detectGSMBandFromArfcn(arfcn: number): GSMBand[] {
    const matchingBands: GSMBand[] = [];

    for (const [band, config] of Object.entries(GSM_BANDS)) {
        if (arfcn >= config.arfcnStart && arfcn <= config.arfcnEnd) {
            matchingBands.push(band as GSMBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect GSM band for ARFCN ${arfcn}`);
    }

    return matchingBands;
}

/**
 * Get GSM band frequency range
 */
export function getGSMBandFrequencyRange(band: GSMBand): {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
} {
    const config = GSM_BANDS[band];
    return {
        uplinkStart: config.uplinkStart,
        uplinkEnd: config.uplinkEnd,
        downlinkStart: config.downlinkStart,
        downlinkEnd: config.downlinkEnd
    };
}

/**
 * Get all GSM bands
 */
export function getAllGSMBands(): string[] {
    return Object.values(GSMBand);
}
