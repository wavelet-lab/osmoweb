// Re-export radio functions and types
export {
  RadioTechnology,
  GSMBand,
  LTEBand,
  NRBand
} from './types';

export type {
  MobileBand,
  ARFCNConfigInput,
  ARFCNConfig,
  FrequencyResult
} from './types';

// Re-export main ARFCN functions
export {
  configureARFCN,
  getSupportedBands,
  getBandArfcnRange,
  getBandFrequencyRange
} from './arfcn';

// Re-export GSM functions
export {
  gsmArfcnToFrequency,
  gsmFrequencyToArfcn,
  detectGSMBandFromFrequency,
  detectGSMBandFromArfcn,
  getGSMBandArfcnRange,
  getGSMBandFrequencyRange,
  getAllGSMBands
} from './gsm';

// Re-export LTE functions
export {
  lteArfcnToFrequency,
  lteFrequencyToArfcn,
  detectLTEBandFromFrequency,
  detectLTEBandFromArfcn,
  getLTEBandArfcnRange,
  getLTEBandFrequencyRange,
  getAllLTEBands
} from './lte';

// Re-export NR functions
export {
  nrArfcnToFrequency,
  nrFrequencyToArfcn,
  detectNRBandFromFrequency,
  detectNRBandFromArfcn,
  getNRBandArfcnRange,
  getNRBandFrequencyRange,
  getAllNRBands
} from './nr';