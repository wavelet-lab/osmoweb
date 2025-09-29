<script lang="ts">
import { defineComponent } from 'vue';
import { RadioTechnology, GSMBand, LTEBand, NRBand } from '@osmoweb/core/radio';
import type { MobileBand } from '@osmoweb/core/radio';

export { RadioTechnology, GSMBand, LTEBand, NRBand };
export type { MobileBand };

export default defineComponent({
    name: 'BtsConfig',
});

export interface BtsParams {
    technology?: RadioTechnology; // Radio technology: GSM, LTE, NR
    band?: MobileBand; // Mobile band (e.g., GSM - GSM_900, LTE - B3, NR - N78)
    arfcn?: number; // Absolute Radio Frequency Channel Number for downlink: GSM - Arfcn, LTE - Earfcn, NR - Nrarfcn
    uplinkFrequency?: number; // Uplink frequency in kHz
    downlinkFrequency?: number; // Downlink frequency in kHz
};

export interface BtsConfigProps {
    bts?: BtsParams; // Initial BTS configuration
    supportedTechnologies?: Array<RadioTechnology>; // Supported radio technologies
    searchable?: boolean; // Whether dropdowns are searchable
}

</script>

<script setup lang="ts">
import { reactive, computed, watch, onMounted } from 'vue';
import { configureARFCN, getSupportedBands, getBandArfcnRange } from '@osmoweb/core/radio';
import Dropdown, { type DropdownOptionProps } from './Dropdown.vue';

interface Emits {
    (e: 'submit', config: BtsParams): void;
    (e: 'cancel'): void;
}

const props = withDefaults(defineProps<BtsConfigProps>(), {
    modelValue: undefined,
    supportedTechnologies: () => [RadioTechnology.GSM/* , RadioTechnology.LTE, RadioTechnology.NR */],
    searchable: false,
});

const emit = defineEmits<Emits>();

const defaultBtsParams: BtsParams = {
    technology: undefined,
    band: undefined,
    arfcn: undefined,
    uplinkFrequency: undefined,
    downlinkFrequency: undefined
};

const btsParams = reactive<BtsParams>({ ...defaultBtsParams, ...props.bts });

const availableBands = computed((): Array<MobileBand> => {
    return btsParams.technology ? getSupportedBands(btsParams.technology) : [];
});

const availableArfcns = computed((): Array<number> => {
    if (!btsParams.technology || !btsParams.band) return [];
    try {
        const arfcns = getBandArfcnRange(btsParams.technology, btsParams.band);
        if (arfcns) {
            const range: number[] = [];
            for (let arfcn = arfcns.arfcnStart; arfcn <= arfcns.arfcnEnd; ++arfcn) {
                range.push(arfcn);
            }
            return range;
        }
    } catch { /* ignore */ }

    return [];
});

const bandLabel = computed((): string => {
    return btsParams.technology ? `${btsParams.technology} Band` : 'Band';
});

const arfcnLabel = computed((): string => {
    switch (btsParams.technology) {
        case RadioTechnology.GSM:
            return 'ARFCN';
        case RadioTechnology.LTE:
            return 'EARFCN';
        case RadioTechnology.NR:
            return 'NRARFCN';
        default:
            return 'ARFCN';
    }
});

const getFrequency = (arfcn: number): string => {
    if (!btsParams.band) return '';
    try {
        const config = configureARFCN({
            arfcn,
            technology: btsParams.technology,
            band: btsParams.band as MobileBand
        });
        let freq = '';
        if (config.downlinkFrequency) freq += `D ${(config.downlinkFrequency / 1000).toFixed(1)}`;
        if (config.uplinkFrequency) freq += `${freq ? ' / ' : ''}U ${(config.uplinkFrequency / 1000).toFixed(1)}`;
        return freq ? `(${freq} MHz)` : '';
    } catch { /* ignore */ }

    return '';
};

const handleSubmit = () => {
    emit('submit', btsParams);
};

const handleCancel = () => {
    emit('cancel');
};

const resetForm = () => {
    Object.assign(btsParams, { ...defaultBtsParams, ...props.bts });
    updateTechnology();
};

onMounted(() => {
    updateTechnology();
});

const updateTechnology = () => {
    if (!btsParams.technology && props.supportedTechnologies && props.supportedTechnologies.length > 0) {
        btsParams.technology = Array.from(props.supportedTechnologies)[0];
    }
    if (btsParams.technology && (!btsParams.band || !availableBands.value.includes(btsParams.band))) {
        btsParams.band = undefined;
    }
    updateBand();
}

const updateBand = () => {
    if (btsParams.technology && btsParams.band) {
        let needClearArfcn = true;
        if (btsParams.arfcn !== undefined) {
            updateArfcn();
            needClearArfcn = btsParams.uplinkFrequency === undefined && btsParams.downlinkFrequency === undefined;
        }
        if (needClearArfcn) {
            btsParams.arfcn = undefined;
            btsParams.uplinkFrequency = undefined;
            btsParams.downlinkFrequency = undefined;
        }
    } else {
        btsParams.band = undefined;
        btsParams.arfcn = undefined;
        btsParams.uplinkFrequency = undefined;
        btsParams.downlinkFrequency = undefined;
    }
};

const updateArfcn = () => {
    if (btsParams.technology && btsParams.band && btsParams.arfcn !== undefined) {
        try {
            const config = configureARFCN({
                arfcn: btsParams.arfcn,
                technology: btsParams.technology,
                band: btsParams.band as MobileBand
            });
            btsParams.uplinkFrequency = config.uplinkFrequency;
            btsParams.downlinkFrequency = config.downlinkFrequency;
        } catch {
            btsParams.uplinkFrequency = undefined;
            btsParams.downlinkFrequency = undefined;
        }
    } else {
        btsParams.uplinkFrequency = undefined;
        btsParams.downlinkFrequency = undefined;
    }
};

// Initialize form with provided config
watch(() => props.bts, (newConfig) => {
    if (newConfig) {
        Object.assign(btsParams, { ...newConfig });
        updateTechnology();
    }
}, { immediate: true });

// Watch for changes in technology, band, and arfcn to update dependent fields
watch(() => btsParams.technology, updateTechnology);
watch(() => btsParams.band, updateBand);
watch(() => btsParams.arfcn, updateArfcn);

const technologyOptions = computed(() =>
    Array.from(new Set(props.supportedTechnologies ?? [])).map(tech => ({
        value: tech,
        label: tech
    })) as Array<DropdownOptionProps>
);

const bandOptions = computed(() =>
    availableBands.value.map(band => ({
        value: band,
        label: band.replace('_', ' ')
    })) as Array<DropdownOptionProps>
);

const arfcnOptions = computed(() => {
    const arfcns = availableArfcns.value.map(arfcn => ({
        value: arfcn,
        label: `${arfcn} ${getFrequency(arfcn)}`
    })) as Array<DropdownOptionProps>;
    return arfcns;
});

const techVisible = computed(() => technologyOptions.value.length > 1);
const technologyList = computed(() => technologyOptions.value.map(o => o.label).join(', '));
const stepBand = computed(() => techVisible.value ? 2 : 1);
const stepArfcn = computed(() => techVisible.value ? 3 : 2);

</script>

<template>
    <div class="bts-config" role="region" aria-label="BTS configuration">
        <form @submit.prevent="handleSubmit" class="bts-config-form" aria-label="BTS configuration form">
            <div class="form-section">
                <div class="form-group tech" v-if="techVisible">
                    <label class="label" for="technology"><span class="step-badge">1</span> Mobile Technology:</label>
                    <Dropdown class="dropdown" v-model="btsParams.technology" :options="technologyOptions"
                        placeholder="Select Mobile Technology" :searchable="false"
                        :disabled="technologyOptions.length === 0" aria-label="Select mobile technology">
                        <template #header>
                            <div class="bts-dropdown-header">
                                Select Technology
                            </div>
                        </template>
                    </Dropdown>
                </div>

                <div class="form-group band">
                    <label class="label" for="band"><span class="step-badge">{{ stepBand }}</span> {{ bandLabel
                        }}:</label>
                    <Dropdown class="dropdown" v-model="btsParams.band" :options="bandOptions"
                        :placeholder="`Select ${bandLabel}`" :searchable="props.searchable"
                        :disabled="bandOptions.length === 0" :aria-label="`Select ${bandLabel}`">
                        <template #header>
                            <div class="bts-dropdown-header">
                                {{ `Select ${bandLabel}` }}
                            </div>
                        </template>
                    </Dropdown>
                </div>

                <div class="form-group arfcn">
                    <label class="label" for="arfcn"><span class="step-badge">{{ stepArfcn }}</span> {{ arfcnLabel
                    }}:</label>
                    <Dropdown class="dropdown" v-model="btsParams.arfcn" :options="arfcnOptions"
                        :placeholder="`Select ${arfcnLabel}`" :searchable="props.searchable"
                        :disabled="arfcnOptions.length === 0" :aria-label="`Select ${arfcnLabel}`">
                        <template #header>
                            <div class="bts-dropdown-header">
                                {{ `Select ${arfcnLabel}` }}
                            </div>
                        </template>
                    </Dropdown>
                </div>

                <aside class="info-column" aria-hidden="true" aria-label="BTS setup steps">
                    <div class="info-card">
                        <h4>BTS Setup Steps</h4>
                        <p class="muted">Follow the steps:</p>
                        <ol class="muted">
                            <li v-if="techVisible">Select mobile technology (e.g.,
                                {{ technologyList }}).
                            </li>
                            <li>Select the appropriate band for the chosen technology.</li>
                            <li>Pick an ARFCN from the available options for the selected band.</li>
                        </ol>
                        <p class="muted">Frequency preview shown after selecting ARFCN.</p>
                    </div>
                </aside>
            </div>

            <div class="form-actions">
                <button class="button is-primary" type="submit" aria-label="Save or update BTS">
                    {{ props.bts?.arfcn !== undefined ? 'Update BTS' : 'Save BTS' }}
                </button>
                <button class="button" type="button" @click="resetForm" aria-label="Reset BTS form">
                    Reset
                </button>
                <button class="button is-danger" type="button" @click="handleCancel"
                    aria-label="Cancel BTS configuration">
                    Cancel
                </button>
            </div>
        </form>
    </div>
</template>

<style scoped src="@/styles/bts-config.scss" />