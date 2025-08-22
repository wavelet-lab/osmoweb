// Re-export types and enums
export {
  RadioTechnology,
  GSMBand,
  LTEBand,
  NRBand
} from './types';

export type {
  ARFCNConfigInput,
  ARFCNConfig,
  FrequencyResult
} from './types';

// Re-export main ARFCN functions
export {
  configureARFCN,
  getSupportedBands,
  getBandFrequencyRange
} from './arfcn';

// Re-export GSM functions
export {
  gsmArfcnToFrequency,
  gsmFrequencyToArfcn,
  detectGSMBandFromFrequency,
  detectGSMBandFromArfcn,
  getGSMBandFrequencyRange,
  getAllGSMBands
} from './gsm';

// Re-export LTE functions
export {
  lteArfcnToFrequency,
  lteFrequencyToArfcn,
  detectLTEBandFromFrequency,
  detectLTEBandFromArfcn,
  getLTEBandFrequencyRange,
  getAllLTEBands
} from './lte';

// Re-export NR functions
export {
  nrArfcnToFrequency,
  nrFrequencyToArfcn,
  detectNRBandFromFrequency,
  detectNRBandFromArfcn,
  getNRBandFrequencyRange,
  getAllNRBands
} from './nr';