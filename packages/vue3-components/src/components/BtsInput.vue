<script lang="ts">
import { defineComponent } from 'vue';
import { RadioTechnology, GSMBand, LTEBand, NRBand } from '@osmoweb/core/radio';
import type { BtsParams } from './BtsConfig.vue';
import type { SizeType } from '@websdr/vue3-components';
export type { SizeType };

export { RadioTechnology, GSMBand, LTEBand, NRBand };
export type { BtsParams };

export type BtsState = 'not-configured' | 'configured' | 'connected' | 'disconnected';

export default defineComponent({
    name: 'BtsInput',
});

export interface BtsInputProps {
    bts?: BtsParams; // Initial BTS configuration
    supportedTechnologies?: Array<RadioTechnology>; // Supported radio technologies
    placeholder?: string; // Placeholder text for the input
    size?: SizeType; // Size of the input
    btsState?: BtsState; // Current state of the BTS
    disabled?: boolean; // Whether the input is disabled
    searchable?: boolean; // Whether dropdowns are searchable
}

</script>

<script setup lang="ts">
import { computed, watch, reactive } from 'vue';
import { configureARFCN } from '@osmoweb/core/radio';
import BtsConfig from './BtsConfig.vue';
import { Dropdown } from '@websdr/vue3-components';
import type { StatusType } from '@websdr/vue3-components';

interface Emits {
    (e: 'update', config: BtsParams): void;
    (e: 'cancel'): void;
}

const props = withDefaults(defineProps<BtsInputProps>(), {
    bts: undefined,
    placeholder: 'Click to configure BTS',
    disabled: false,
    searchable: false,
    size: 'medium',
});

const emit = defineEmits<Emits>();

const btsConfig = reactive<BtsParams>({ ...props.bts });

watch(() => props.bts, (newBts) => {
    Object.assign(btsConfig, newBts);
}, { deep: true });

const arfcnLabel = computed((): string => {
    switch (props.bts?.technology) {
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

const displayText = computed(() => {
    if (!props.bts) return props.placeholder;

    const bts = props.bts;
    let text: string;

    if (bts.technology && bts.band && bts.arfcn) {
        text = 'BTS: ';
        try {
            const config = configureARFCN({
                arfcn: bts.arfcn,
                technology: bts.technology,
                band: bts.band,
            });

            const decimalPlaces = bts.technology === RadioTechnology.NR ? 3 : 1;
            const uplink = config.uplinkFrequency ? (config.uplinkFrequency / 1000).toFixed(decimalPlaces) : 'N/A';
            const downlink = config.downlinkFrequency ? (config.downlinkFrequency / 1000).toFixed(decimalPlaces) : 'N/A';

            text += `${arfcnLabel.value} ${bts.arfcn} (D ${downlink} / U ${uplink} MHz)`;
        } catch {
            text += `${arfcnLabel.value} ${bts.arfcn}`;
        }
    } else {
        text = 'BTS not configured';
    }

    return text;
});

const dropdownStatus = computed((): StatusType => {
    if (!props.btsState || props.btsState == 'not-configured') return 'error';
    if (props.btsState === 'connected') return 'success';
    if (props.btsState === 'disconnected') return 'warning';
    return 'undefined';
});

const handleSubmit = (closeDropdown: () => void, config: BtsParams) => {
    emit('update', config);
    closeDropdown();
};

const handleCancel = (closeDropdown: () => void) => {
    emit('cancel');
    closeDropdown();
};

</script>

<template>
    <Dropdown :size="props.size" :status="dropdownStatus" :placeholder="props.placeholder" :disabled="props.disabled"
        max-height="none">
        <template #display>
            <div class="bts-input-text">
                {{ displayText }}
            </div>
        </template>
        <template #content="{ close }">
            <BtsConfig :bts="btsConfig" :supported-technologies="supportedTechnologies" :searchable="props.searchable"
                @submit="(config) => handleSubmit(close, config)" @cancel="() => handleCancel(close)" />
        </template>
    </Dropdown>
</template>

<style scoped src="@/styles/bts-input.scss" />
