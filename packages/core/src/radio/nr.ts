import { NRBand } from '@/radio/types';
import type { FrequencyResult } from '@/radio/types';

/**
 * NR band configuration
 */
interface NRBandConfig {
    uplinkStart: number; // in kHz
    uplinkEnd: number; // in kHz
    downlinkStart: number; // in kHz
    downlinkEnd: number; // in kHz
    arfcnStart: number;
    arfcnEnd: number;
    stepSize: number; // in kHz
}

/**
 * NR band configurations
 */
const NR_BANDS: Record<NRBand, NRBandConfig> = {
    [NRBand.N1]: {
        uplinkStart: 1920000, // 1920 MHz
        uplinkEnd: 1980000, // 1980 MHz
        downlinkStart: 2110000, // 2110 MHz
        downlinkEnd: 2170000, // 2170 MHz
        arfcnStart: 422000,
        arfcnEnd: 434000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N2]: {
        uplinkStart: 1850000, // 1850 MHz
        uplinkEnd: 1910000, // 1910 MHz
        downlinkStart: 1930000, // 1930 MHz
        downlinkEnd: 1990000, // 1990 MHz
        arfcnStart: 370000,
        arfcnEnd: 382000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N3]: {
        uplinkStart: 1710000, // 1710 MHz
        uplinkEnd: 1785000, // 1785 MHz
        downlinkStart: 1805000, // 1805 MHz
        downlinkEnd: 1880000, // 1880 MHz
        arfcnStart: 361000,
        arfcnEnd: 366000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N5]: {
        uplinkStart: 824000, // 824 MHz
        uplinkEnd: 849000, // 849 MHz
        downlinkStart: 869000, // 869 MHz
        downlinkEnd: 894000, // 894 MHz
        arfcnStart: 164800,
        arfcnEnd: 169800,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N7]: {
        uplinkStart: 2500000, // 2500 MHz
        uplinkEnd: 2570000, // 2570 MHz
        downlinkStart: 2620000, // 2620 MHz
        downlinkEnd: 2690000, // 2690 MHz
        arfcnStart: 524000,
        arfcnEnd: 538000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N8]: {
        uplinkStart: 880000, // 880 MHz
        uplinkEnd: 915000, // 915 MHz
        downlinkStart: 925000, // 925 MHz
        downlinkEnd: 960000, // 960 MHz
        arfcnStart: 176000,
        arfcnEnd: 183000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N12]: {
        uplinkStart: 699000, // 699 MHz
        uplinkEnd: 716000, // 716 MHz
        downlinkStart: 729000, // 729 MHz
        downlinkEnd: 746000, // 746 MHz
        arfcnStart: 139800,
        arfcnEnd: 143200,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N20]: {
        uplinkStart: 832000, // 832 MHz
        uplinkEnd: 862000, // 862 MHz
        downlinkStart: 791000, // 791 MHz
        downlinkEnd: 821000, // 821 MHz
        arfcnStart: 158200,
        arfcnEnd: 164200,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N25]: {
        uplinkStart: 1850000, // 1850 MHz
        uplinkEnd: 1915000, // 1915 MHz
        downlinkStart: 1930000, // 1930 MHz
        downlinkEnd: 1995000, // 1995 MHz
        arfcnStart: 370000,
        arfcnEnd: 383000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N28]: {
        uplinkStart: 703000, // 703 MHz
        uplinkEnd: 748000, // 748 MHz
        downlinkStart: 758000, // 758 MHz
        downlinkEnd: 803000, // 803 MHz
        arfcnStart: 140600,
        arfcnEnd: 149600,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N38]: {
        uplinkStart: 2570000, // 2570 MHz
        uplinkEnd: 2620000, // 2620 MHz
        downlinkStart: 2570000, // 2570 MHz (TDD)
        downlinkEnd: 2620000, // 2620 MHz (TDD)
        arfcnStart: 524000,
        arfcnEnd: 527333,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N40]: {
        uplinkStart: 2300000, // 2300 MHz
        uplinkEnd: 2400000, // 2400 MHz
        downlinkStart: 2300000, // 2300 MHz (TDD)
        downlinkEnd: 2400000, // 2400 MHz (TDD)
        arfcnStart: 460000,
        arfcnEnd: 480000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N41]: {
        uplinkStart: 2496000, // 2496 MHz
        uplinkEnd: 2690000, // 2690 MHz
        downlinkStart: 2496000, // 2496 MHz (TDD)
        downlinkEnd: 2690000, // 2690 MHz (TDD)
        arfcnStart: 499200,
        arfcnEnd: 537999,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N48]: {
        uplinkStart: 3550000, // 3550 MHz
        uplinkEnd: 3700000, // 3700 MHz
        downlinkStart: 3550000, // 3550 MHz (TDD)
        downlinkEnd: 3700000, // 3700 MHz (TDD)
        arfcnStart: 636667,
        arfcnEnd: 646666,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N66]: {
        uplinkStart: 1710000, // 1710 MHz
        uplinkEnd: 1780000, // 1780 MHz
        downlinkStart: 2110000, // 2110 MHz
        downlinkEnd: 2200000, // 2200 MHz
        arfcnStart: 342000,
        arfcnEnd: 356000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N71]: {
        uplinkStart: 663000, // 663 MHz
        uplinkEnd: 698000, // 698 MHz
        downlinkStart: 617000, // 617 MHz
        downlinkEnd: 652000, // 652 MHz
        arfcnStart: 123400,
        arfcnEnd: 130400,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N77]: {
        uplinkStart: 3300000, // 3300 MHz
        uplinkEnd: 4200000, // 4200 MHz
        downlinkStart: 3300000, // 3300 MHz (TDD)
        downlinkEnd: 4200000, // 4200 MHz (TDD)
        arfcnStart: 653334,
        arfcnEnd: 680000,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N78]: {
        uplinkStart: 3300000, // 3300 MHz
        uplinkEnd: 3800000, // 3800 MHz
        downlinkStart: 3300000, // 3300 MHz (TDD)
        downlinkEnd: 3800000, // 3800 MHz (TDD)
        arfcnStart: 620000,
        arfcnEnd: 653333,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N79]: {
        uplinkStart: 4400000, // 4400 MHz
        uplinkEnd: 5000000, // 5000 MHz
        downlinkStart: 4400000, // 4400 MHz (TDD)
        downlinkEnd: 5000000, // 5000 MHz (TDD)
        arfcnStart: 693334,
        arfcnEnd: 733333,
        stepSize: 15 // 15 kHz
    },
    [NRBand.N257]: {
        uplinkStart: 26500000, // 26.5 GHz
        uplinkEnd: 29500000, // 29.5 GHz
        downlinkStart: 26500000, // 26.5 GHz (TDD)
        downlinkEnd: 29500000, // 29.5 GHz (TDD)
        arfcnStart: 2054166,
        arfcnEnd: 2104165,
        stepSize: 60 // 60 kHz
    },
    [NRBand.N258]: {
        uplinkStart: 24250000, // 24.25 GHz
        uplinkEnd: 27500000, // 27.5 GHz
        downlinkStart: 24250000, // 24.25 GHz (TDD)
        downlinkEnd: 27500000, // 27.5 GHz (TDD)
        arfcnStart: 2016667,
        arfcnEnd: 2070832,
        stepSize: 60 // 60 kHz
    },
    [NRBand.N260]: {
        uplinkStart: 37000000, // 37 GHz
        uplinkEnd: 40000000, // 40 GHz
        downlinkStart: 37000000, // 37 GHz (TDD)
        downlinkEnd: 40000000, // 40 GHz (TDD)
        arfcnStart: 2229166,
        arfcnEnd: 2279165,
        stepSize: 60 // 60 kHz
    },
    [NRBand.N261]: {
        uplinkStart: 27500000, // 27.5 GHz
        uplinkEnd: 28350000, // 28.35 GHz
        downlinkStart: 27500000, // 27.5 GHz (TDD)
        downlinkEnd: 28350000, // 28.35 GHz (TDD)
        arfcnStart: 2070833,
        arfcnEnd: 2084999,
        stepSize: 60 // 60 kHz
    }
};

/**
 * Convert NR ARFCN to frequency
 */
export function nrArfcnToFrequency(arfcn: number, band: NRBand): FrequencyResult {
    const config = NR_BANDS[band];

    if (arfcn < config.arfcnStart || arfcn > config.arfcnEnd) {
        throw new Error(`ARFCN ${arfcn} is out of range for band ${band}`);
    }

    let uplinkFreq: number;
    let downlinkFreq: number;

    // Standard calculation for other bands
    const arfcnOffset = arfcn - config.arfcnStart;
    uplinkFreq = config.uplinkStart + (arfcnOffset * config.stepSize);
    downlinkFreq = config.downlinkStart + (arfcnOffset * config.stepSize);

    return { uplink: uplinkFreq, downlink: downlinkFreq };
}

/**
 * Convert NR frequency to ARFCN
 */
export function nrFrequencyToArfcn(frequency: number, band: NRBand): number {
    const config = NR_BANDS[band];

    // Check if frequency is in uplink or downlink range
    let baseFreq: number;
    let arfcnOffset: number;

    if (frequency >= config.uplinkStart && frequency <= config.uplinkEnd) {
        baseFreq = config.uplinkStart;
    } else if (frequency >= config.downlinkStart && frequency <= config.downlinkEnd) {
        baseFreq = config.downlinkStart;
    } else {
        throw new Error(`Frequency ${frequency} kHz is not in band ${band}`);
    }

    const frequencyOffset = frequency - baseFreq;
    arfcnOffset = Math.round(frequencyOffset / config.stepSize);

    return config.arfcnStart + arfcnOffset;
}

/**
 * Detect NR bands from frequency
 */
export function detectNRBandFromFrequency(frequency: number): NRBand[] {
    const matchingBands: NRBand[] = [];

    for (const [band, config] of Object.entries(NR_BANDS)) {
        if ((frequency >= config.uplinkStart && frequency <= config.uplinkEnd) ||
            (frequency >= config.downlinkStart && frequency <= config.downlinkEnd)) {
            matchingBands.push(band as NRBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect NR band for frequency ${frequency} kHz`);
    }

    return matchingBands;
}

/**
 * Detect NR bands from ARFCN
 */
export function detectNRBandFromArfcn(arfcn: number): NRBand[] {
    const matchingBands: NRBand[] = [];

    for (const [band, config] of Object.entries(NR_BANDS)) {
        if (arfcn >= config.arfcnStart && arfcn <= config.arfcnEnd) {
            matchingBands.push(band as NRBand);
        }
    }

    if (matchingBands.length === 0) {
        throw new Error(`Cannot detect NR band for ARFCN ${arfcn}`);
    }

    return matchingBands;
}

/**
 * Get NR band frequency range
 */
export function getNRBandFrequencyRange(band: NRBand): {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
} {
    const config = NR_BANDS[band];
    return {
        uplinkStart: config.uplinkStart,
        uplinkEnd: config.uplinkEnd,
        downlinkStart: config.downlinkStart,
        downlinkEnd: config.downlinkEnd
    };
}

/**
 * Get all NR bands
 */
export function getAllNRBands(): string[] {
    return Object.values(NRBand);
}
