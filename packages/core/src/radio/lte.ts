import { LTEBand } from '@/radio/types';
import type { FrequencyResult } from '@/radio/types';

/**
 * LTE band configuration
 */
interface LTEBandConfig {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
    arfcnStart: number;
    arfcnEnd: number;
}

/**
 * LTE band configurations
 */
const LTE_BANDS: Record<LTEBand, LTEBandConfig> = {
    [LTEBand.B1]: {
        uplinkStart: 1920000,   // 1920 MHz
        uplinkEnd: 1980000,     // 1980 MHz
        downlinkStart: 2110000, // 2110 MHz
        downlinkEnd: 2170000,   // 2170 MHz
        arfcnStart: 0,
        arfcnEnd: 599
    },
    [LTEBand.B2]: {
        uplinkStart: 1850000,   // 1850 MHz
        uplinkEnd: 1910000,     // 1910 MHz
        downlinkStart: 1930000, // 1930 MHz
        downlinkEnd: 1990000,   // 1990 MHz
        arfcnStart: 600,
        arfcnEnd: 1199
    },
    [LTEBand.B3]: {
        uplinkStart: 1710000,   // 1710 MHz
        uplinkEnd: 1785000,     // 1785 MHz
        downlinkStart: 1805000, // 1805 MHz
        downlinkEnd: 1880000,   // 1880 MHz
        arfcnStart: 1200,
        arfcnEnd: 1949
    },
    [LTEBand.B4]: {
        uplinkStart: 1710000,   // 1710 MHz
        uplinkEnd: 1755000,     // 1755 MHz
        downlinkStart: 2110000, // 2110 MHz
        downlinkEnd: 2155000,   // 2155 MHz
        arfcnStart: 1950,
        arfcnEnd: 2399
    },
    [LTEBand.B5]: {
        uplinkStart: 824000,    // 824 MHz
        uplinkEnd: 849000,      // 849 MHz
        downlinkStart: 869000,  // 869 MHz
        downlinkEnd: 894000,    // 894 MHz
        arfcnStart: 2400,
        arfcnEnd: 2649
    },
    [LTEBand.B7]: {
        uplinkStart: 2500000,   // 2500 MHz
        uplinkEnd: 2570000,     // 2570 MHz
        downlinkStart: 2620000, // 2620 MHz
        downlinkEnd: 2690000,   // 2690 MHz
        arfcnStart: 2750,
        arfcnEnd: 3449
    },
    [LTEBand.B8]: {
        uplinkStart: 880000,    // 880 MHz
        uplinkEnd: 915000,      // 915 MHz
        downlinkStart: 925000,  // 925 MHz
        downlinkEnd: 960000,    // 960 MHz
        arfcnStart: 3450,
        arfcnEnd: 3799
    },
    [LTEBand.B12]: {
        uplinkStart: 699000,    // 699 MHz
        uplinkEnd: 716000,      // 716 MHz
        downlinkStart: 729000,  // 729 MHz
        downlinkEnd: 746000,    // 746 MHz
        arfcnStart: 5010,
        arfcnEnd: 5179
    },
    [LTEBand.B13]: {
        uplinkStart: 777000,    // 777 MHz
        uplinkEnd: 787000,      // 787 MHz
        downlinkStart: 746000,  // 746 MHz
        downlinkEnd: 756000,    // 756 MHz
        arfcnStart: 5180,
        arfcnEnd: 5279
    },
    [LTEBand.B17]: {
        uplinkStart: 704000,    // 704 MHz
        uplinkEnd: 716000,      // 716 MHz
        downlinkStart: 734000,  // 734 MHz
        downlinkEnd: 746000,    // 746 MHz
        arfcnStart: 5730,
        arfcnEnd: 5849
    },
    [LTEBand.B18]: {
        uplinkStart: 815000,    // 815 MHz
        uplinkEnd: 830000,      // 830 MHz
        downlinkStart: 860000,  // 860 MHz
        downlinkEnd: 875000,    // 875 MHz
        arfcnStart: 5850,
        arfcnEnd: 5999
    },
    [LTEBand.B19]: {
        uplinkStart: 830000,    // 830 MHz
        uplinkEnd: 845000,      // 845 MHz
        downlinkStart: 875000,  // 875 MHz
        downlinkEnd: 890000,    // 890 MHz
        arfcnStart: 6000,
        arfcnEnd: 6149
    },
    [LTEBand.B20]: {
        uplinkStart: 832000,    // 832 MHz
        uplinkEnd: 862000,      // 862 MHz
        downlinkStart: 791000,  // 791 MHz
        downlinkEnd: 821000,    // 821 MHz
        arfcnStart: 6150,
        arfcnEnd: 6449
    },
    [LTEBand.B21]: {
        uplinkStart: 1447900,   // 1447.9 MHz
        uplinkEnd: 1462900,     // 1462.9 MHz
        downlinkStart: 1495900, // 1495.9 MHz
        downlinkEnd: 1510900,   // 1510.9 MHz
        arfcnStart: 6450,
        arfcnEnd: 6599
    },
    [LTEBand.B25]: {
        uplinkStart: 1850000,   // 1850 MHz
        uplinkEnd: 1915000,     // 1915 MHz
        downlinkStart: 1930000, // 1930 MHz
        downlinkEnd: 1995000,   // 1995 MHz
        arfcnStart: 8040,
        arfcnEnd: 8689
    },
    [LTEBand.B26]: {
        uplinkStart: 814000,    // 814 MHz
        uplinkEnd: 849000,      // 849 MHz
        downlinkStart: 859000,  // 859 MHz
        downlinkEnd: 894000,    // 894 MHz
        arfcnStart: 8690,
        arfcnEnd: 9039
    },
    [LTEBand.B28]: {
        uplinkStart: 703000,    // 703 MHz
        uplinkEnd: 748000,      // 748 MHz
        downlinkStart: 758000,  // 758 MHz
        downlinkEnd: 803000,    // 803 MHz
        arfcnStart: 9210,
        arfcnEnd: 9659
    },
    [LTEBand.B32]: {
        uplinkStart: 1452000,   // 1452 MHz
        uplinkEnd: 1496000,     // 1496 MHz
        downlinkStart: 1452000, // 1452 MHz
        downlinkEnd: 1496000,   // 1496 MHz
        arfcnStart: 9770,
        arfcnEnd: 10359
    },
    [LTEBand.B34]: {
        uplinkStart: 2010000,   // 2010 MHz
        uplinkEnd: 2025000,     // 2025 MHz
        downlinkStart: 2010000, // 2010 MHz
        downlinkEnd: 2025000,   // 2025 MHz
        arfcnStart: 36200,
        arfcnEnd: 36349
    },
    [LTEBand.B38]: {
        uplinkStart: 2570000,   // 2570 MHz
        uplinkEnd: 2620000,     // 2620 MHz
        downlinkStart: 2570000, // 2570 MHz
        downlinkEnd: 2620000,   // 2620 MHz
        arfcnStart: 37750,
        arfcnEnd: 38249
    },
    [LTEBand.B39]: {
        uplinkStart: 1880000,   // 1880 MHz
        uplinkEnd: 1920000,     // 1920 MHz
        downlinkStart: 1880000, // 1880 MHz
        downlinkEnd: 1920000,   // 1920 MHz
        arfcnStart: 38250,
        arfcnEnd: 38649
    },
    [LTEBand.B40]: {
        uplinkStart: 2300000,   // 2300 MHz
        uplinkEnd: 2400000,     // 2400 MHz
        downlinkStart: 2300000, // 2300 MHz
        downlinkEnd: 2400000,   // 2400 MHz
        arfcnStart: 38650,
        arfcnEnd: 39649
    },
    [LTEBand.B41]: {
        uplinkStart: 2496000,   // 2496 MHz
        uplinkEnd: 2690000,     // 2690 MHz
        downlinkStart: 2496000, // 2496 MHz
        downlinkEnd: 2690000,   // 2690 MHz
        arfcnStart: 39650,
        arfcnEnd: 41589
    },
    [LTEBand.B42]: {
        uplinkStart: 3400000,   // 3400 MHz
        uplinkEnd: 3600000,     // 3600 MHz
        downlinkStart: 3400000, // 3400 MHz
        downlinkEnd: 3600000,   // 3600 MHz
        arfcnStart: 41590,
        arfcnEnd: 43589
    },
    [LTEBand.B43]: {
        uplinkStart: 3600000,   // 3600 MHz
        uplinkEnd: 3800000,     // 3800 MHz
        downlinkStart: 3600000, // 3600 MHz
        downlinkEnd: 3800000,   // 3800 MHz
        arfcnStart: 43590,
        arfcnEnd: 45589
    },
    [LTEBand.B46]: {
        uplinkStart: 5150000,   // 5150 MHz
        uplinkEnd: 5925000,     // 5925 MHz
        downlinkStart: 5150000, // 5150 MHz
        downlinkEnd: 5925000,   // 5925 MHz
        arfcnStart: 46590,
        arfcnEnd: 54339
    },
    [LTEBand.B48]: {
        uplinkStart: 3550000,   // 3550 MHz
        uplinkEnd: 3700000,     // 3700 MHz
        downlinkStart: 3550000, // 3550 MHz
        downlinkEnd: 3700000,   // 3700 MHz
        arfcnStart: 55240,
        arfcnEnd: 56739
    }
};

/**
 * Convert LTE ARFCN to frequency
 */
export function lteArfcnToFrequency(arfcn: number, band: LTEBand): FrequencyResult {
    const config = LTE_BANDS[band];

    if (arfcn < config.arfcnStart || arfcn > config.arfcnEnd) {
        throw new Error(`ARFCN ${arfcn} is out of range for band ${band}`);
    }

    // LTE ARFCN calculation: F = (ARFCN - offset) * 0.1 + F_start
    const channelIndex = arfcn - config.arfcnStart;
    const uplinkFreq = config.uplinkStart + (channelIndex * 100);
    const downlinkFreq = config.downlinkStart + (channelIndex * 100);

    return { uplink: uplinkFreq, downlink: downlinkFreq };
}

/**
 * Convert LTE frequency to ARFCN
 */
export function lteFrequencyToArfcn(frequency: number, band: LTEBand): number {
    const config = LTE_BANDS[band];

    // Check if frequency is in uplink or downlink range
    let baseFreq: number;
    if (frequency >= config.uplinkStart && frequency <= config.uplinkEnd) {
        baseFreq = config.uplinkStart;
    } else if (frequency >= config.downlinkStart && frequency <= config.downlinkEnd) {
        baseFreq = config.downlinkStart;
    } else {
        throw new Error(`Frequency ${frequency} kHz is not in band ${band}`);
    }

    const channelIndex = Math.round((frequency - baseFreq) / 100);
    return config.arfcnStart + channelIndex;
}

/**
 * Detect LTE bands from frequency
 */
export function detectLTEBandFromFrequency(frequency: number): LTEBand[] {
    const matchingBands: LTEBand[] = [];

    for (const [band, config] of Object.entries(LTE_BANDS)) {
        if ((frequency >= config.uplinkStart && frequency <= config.uplinkEnd) ||
            (frequency >= config.downlinkStart && frequency <= config.downlinkEnd)) {
            matchingBands.push(band as LTEBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect LTE band for frequency ${frequency} kHz`);
    }

    return matchingBands;
}

/**
 * Detect LTE bands from ARFCN
 */
export function detectLTEBandFromArfcn(arfcn: number): LTEBand[] {
    const matchingBands: LTEBand[] = [];

    for (const [band, config] of Object.entries(LTE_BANDS)) {
        if (arfcn >= config.arfcnStart && arfcn <= config.arfcnEnd) {
            matchingBands.push(band as LTEBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect LTE band for ARFCN ${arfcn}`);
    }

    return matchingBands;
}

/**
 * Get LTE band frequency range
 */
export function getLTEBandFrequencyRange(band: LTEBand): {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
} {
    const config = LTE_BANDS[band];
    return {
        uplinkStart: config.uplinkStart,
        uplinkEnd: config.uplinkEnd,
        downlinkStart: config.downlinkStart,
        downlinkEnd: config.downlinkEnd
    };
}

/**
 * Get all LTE bands
 */
export function getAllLTEBands(): string[] {
    return Object.values(LTEBand);
}
