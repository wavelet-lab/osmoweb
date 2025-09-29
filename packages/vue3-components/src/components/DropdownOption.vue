<script lang="ts">
export interface DropdownOptionProps<T = any> {
    value: T;                 // value associated with this option
    label?: string;           // optional, display label for this option
    disabled?: boolean;       // optional, whether this option is disabled
    selected?: boolean;       // optional, whether this option is selected
    icon?: string;            // optional, icon for this option
    description?: string;     // optional, description for this option
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

interface Emits {
    (e: 'select', value: any): void;
}

const props = withDefaults(defineProps<DropdownOptionProps>(), {
    disabled: false,
    selected: false
});
const emit = defineEmits<Emits>();

const displayLabel = computed(() => props.label || String(props.value));

const onClick = () => {
    if (!props.disabled) emit('select', props.value);
}
</script>

<template>
    <div class="dropdown-option" :class="{
        'dropdown-option--selected': selected,
        'dropdown-option--disabled': disabled
    }" @click.stop="onClick">
        <div class="dropdown-option-check">
            <slot v-if="selected" name="check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
            </slot>
        </div>

        <!-- Icon -->
        <div v-if="icon || $slots.icon" class="dropdown-option-icon">
            <slot name="icon">
                <i :class="icon"></i>
            </slot>
        </div>

        <!-- Content -->
        <div class="dropdown-option-content">
            <div class="dropdown-option-label">
                <slot name="label">{{ displayLabel }}</slot>
            </div>
            <div v-if="description || $slots.description" class="dropdown-option-description">
                <slot name="description">{{ description }}</slot>
            </div>
        </div>
    </div>
</template>

<style scoped src="@/styles/dropdown-option.scss" />