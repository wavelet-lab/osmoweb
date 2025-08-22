import {
    RadioTechnology,
    GSMBand,
    LTEBand,
    NRBand
} from '@/radio/types';

import type {
    ARFCNConfigInput,
    ARFCNConfig,
    FrequencyResult,
    MobileBand
} from '@/radio/types';

import {
    gsmArfcnToFrequency,
    gsmFrequencyToArfcn,
    detectGSMBandFromFrequency,
    detectGSMBandFromArfcn,
    getGSMBandFrequencyRange,
    getAllGSMBands
} from '@/radio/gsm';

import {
    lteArfcnToFrequency,
    lteFrequencyToArfcn,
    detectLTEBandFromFrequency,
    detectLTEBandFromArfcn,
    getLTEBandFrequencyRange,
    getAllLTEBands
} from '@/radio/lte';

import {
    nrArfcnToFrequency,
    nrFrequencyToArfcn,
    detectNRBandFromFrequency,
    detectNRBandFromArfcn,
    getNRBandFrequencyRange,
    getAllNRBands
} from '@/radio/nr';

/**
 * Detect band from frequency for any technology
 */
function detectBandFromFrequency(frequency: number, technology: RadioTechnology): MobileBand[] {
    switch (technology) {
        case RadioTechnology.GSM:
            return detectGSMBandFromFrequency(frequency);
        case RadioTechnology.LTE:
            return detectLTEBandFromFrequency(frequency);
        case RadioTechnology.NR:
            return detectNRBandFromFrequency(frequency);
        default:
            throw new Error(`Unsupported technology: ${technology}`);
    }
}

/**
 * Detect band from ARFCN for any technology
 */
function detectBandFromArfcn(arfcn: number, technology: RadioTechnology): MobileBand[] {
    switch (technology) {
        case RadioTechnology.GSM:
            return detectGSMBandFromArfcn(arfcn);
        case RadioTechnology.LTE:
            return detectLTEBandFromArfcn(arfcn);
        case RadioTechnology.NR:
            return detectNRBandFromArfcn(arfcn);
        default:
            throw new Error(`Unsupported technology: ${technology}`);
    }
}

/**
 * Auto-detect technology from frequency
 */
function detectTechnologyFromFrequency(frequency: number): RadioTechnology {
    // Try GSM first (most specific ranges)
    try {
        detectGSMBandFromFrequency(frequency);
        return RadioTechnology.GSM;
    } catch {
        // Continue to next technology
    }

    // Try LTE
    try {
        detectLTEBandFromFrequency(frequency);
        return RadioTechnology.LTE;
    } catch {
        // Continue to next technology
    }

    // Try NR
    try {
        detectNRBandFromFrequency(frequency);
        return RadioTechnology.NR;
    } catch {
        throw new Error(`Cannot detect technology for frequency ${frequency} kHz`);
    }
}

/**
 * Universal ARFCN configuration function
 * Priority: ARFCN > frequency
 * 
 * @param input Input parameters with optional ARFCN, frequency, technology, and band
 * @returns Complete ARFCN configuration with all calculated parameters
 */
export function configureARFCN(input: ARFCNConfigInput): ARFCNConfig {
    let { arfcn, frequency, technology, band, channelBandwidth } = input;

    // Auto-detect technology from frequency if not specified
    if (!technology && frequency !== undefined) {
        technology = detectTechnologyFromFrequency(frequency);
    }

    // Default technology if still not specified
    if (!technology) {
        technology = RadioTechnology.LTE;
    }

    // Case 1: ARFCN is provided (priority)
    if (arfcn !== undefined) {
        // Detect band if not provided
        if (!band) {
            const detectedBands = detectBandFromArfcn(arfcn, technology);
            band = detectedBands.length > 0 ? detectedBands[0] : undefined;
        }
        if (!band) {
            throw new Error(`Cannot detect band for ARFCN ${arfcn} with technology ${technology}`);
        }

        // Calculate frequencies based on ARFCN and band
        let frequencies: FrequencyResult;

        switch (technology) {
            case RadioTechnology.GSM:
                frequencies = gsmArfcnToFrequency(arfcn, band as GSMBand);
                break;
            case RadioTechnology.LTE:
                frequencies = lteArfcnToFrequency(arfcn, band as LTEBand);
                break;
            case RadioTechnology.NR:
                frequencies = nrArfcnToFrequency(arfcn, band as NRBand);
                break;
            default:
                throw new Error(`Unsupported technology: ${technology}`);
        }

        return {
            arfcn,
            technology,
            band,
            channelBandwidth,
            uplinkFrequency: frequencies.uplink,
            downlinkFrequency: frequencies.downlink
        };
    }

    // Case 2: Frequency is provided
    if (frequency !== undefined) {
        // Detect band if not provided
        if (!band) {
            const detectedBands = detectBandFromFrequency(frequency, technology);
            band = detectedBands.length > 0 ? detectedBands[0] : undefined;
        }
        if (!band) {
            throw new Error(`Cannot detect band for frequency ${frequency} kHz with technology ${technology}`);
        }

        // Calculate ARFCN based on frequency and band
        let calculatedArfcn: number;

        switch (technology) {
            case RadioTechnology.GSM:
                calculatedArfcn = gsmFrequencyToArfcn(frequency, band as GSMBand);
                break;
            case RadioTechnology.LTE:
                calculatedArfcn = lteFrequencyToArfcn(frequency, band as LTEBand);
                break;
            case RadioTechnology.NR:
                calculatedArfcn = nrFrequencyToArfcn(frequency, band as NRBand);
                break;
            default:
                throw new Error(`Unsupported technology: ${technology}`);
        }

        // Recalculate frequencies for consistency
        let frequencies: FrequencyResult;

        switch (technology) {
            case RadioTechnology.GSM:
                frequencies = gsmArfcnToFrequency(calculatedArfcn, band as GSMBand);
                break;
            case RadioTechnology.LTE:
                frequencies = lteArfcnToFrequency(calculatedArfcn, band as LTEBand);
                break;
            case RadioTechnology.NR:
                frequencies = nrArfcnToFrequency(calculatedArfcn, band as NRBand);
                break;
            default:
                throw new Error(`Unsupported technology: ${technology}`);
        }

        return {
            arfcn: calculatedArfcn,
            technology,
            band,
            channelBandwidth,
            uplinkFrequency: frequencies.uplink,
            downlinkFrequency: frequencies.downlink
        };
    }

    throw new Error('Either ARFCN or frequency must be provided');
}

/**
 * Utility function to get all supported bands for a technology
 */
export function getSupportedBands(technology: RadioTechnology): string[] {
    switch (technology) {
        case RadioTechnology.GSM:
            return getAllGSMBands();
        case RadioTechnology.LTE:
            return getAllLTEBands();
        case RadioTechnology.NR:
            return getAllNRBands();
        default:
            return [];
    }
}

/**
 * Utility function to get frequency range for a band
 */
export function getBandFrequencyRange(technology: RadioTechnology, band: MobileBand): {
    uplinkStart: number;
    uplinkEnd: number;
    downlinkStart: number;
    downlinkEnd: number;
} {
    switch (technology) {
        case RadioTechnology.GSM:
            return getGSMBandFrequencyRange(band as GSMBand);
        case RadioTechnology.LTE:
            return getLTEBandFrequencyRange(band as LTEBand);
        case RadioTechnology.NR:
            return getNRBandFrequencyRange(band as NRBand);
        default:
            throw new Error(`Unsupported technology: ${technology}`);
    }
}
