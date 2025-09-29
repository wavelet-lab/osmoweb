<script lang="ts">
import { defineComponent } from 'vue';
import type { DropdownOptionProps } from '@/components/Dropdown.vue';

export type { DropdownOptionProps };

export default defineComponent({
    name: 'LogArea',
});

export interface LogItemKey {
    key: number,                        // unique key for the log item
    log: JournalLogItem,                // the actual log item
}

export interface LogAreaProps {
    modelValue?: Array<LogItemKey>,     // optional, array of log items with unique keys
    subSystems?: Array<DropdownOptionProps>, // optional, array of available subsystem filter options
    autoscroll?: boolean,               // optional, auto-scroll to bottom on new items
    rowHeight?: number,                 // optional, fixed row height in px for each item
    virtualBuffer?: number,             // optional, extra rows above/below viewport
}

</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { JournalLogLevel, containsAnySubstr } from '@osmoweb/core/utils'
import type { JournalLogItem } from '@osmoweb/core/utils'
import LogAreaItem from '@/components/LogAreaItem.vue';
import List from '@/components/List.vue';
import Dropdown from '@/components/Dropdown.vue';

// Props
const props = withDefaults(defineProps<LogAreaProps>(), {
    modelValue: () => [],
    subSystems: () => [],
    autoscroll: false,
    rowHeight: 25,
    virtualBuffer: 5,
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: Array<LogItemKey>]
}>()

// Level options
const levelOptions: Array<DropdownOptionProps<JournalLogLevel>> = Object.values(JournalLogLevel).map(level => ({ value: level, caption: String(level) }));

// Refs
const listRef = ref<typeof List | null>(null);
const logItems = ref<Array<LogItemKey>>(props.modelValue || []);

// Filter state
const subSysFilter = ref<Array<string>>([]);
const levelFilter = ref<Array<JournalLogLevel>>([]);
const searchFilter = ref('');

// Sync model changes
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        logItems.value = [...newValue];
    }
}, { deep: true });

// Clear all log items (callable from parent via component ref)
function clearAll() {
    logItems.value = [];
    emit('update:modelValue', logItems.value);
}

// Add a single log item (callable from parent via component ref)
function addLogItem(item: JournalLogItem | LogItemKey) {
    // Type guard to check if the passed value already has a key
    const isKey = (obj: any): obj is LogItemKey =>
        obj && typeof obj === 'object' && 'key' in obj && typeof obj.key === 'number' && 'log' in obj;

    const newItem: LogItemKey = isKey(item)
        ? item
        : {
            key: Date.now(),
            log: item as JournalLogItem,
        };

    logItems.value.push(newItem);
    emit('update:modelValue', logItems.value);
}

// Expose the function so parent components can call it via template ref
defineExpose({ clearAll, addLogItem });

// Filtering - cached computation
const logItemsFiltered: ComputedRef<Array<LogItemKey>> = computed(() => {
    const subsys = subSysFilter.value;
    const level = levelFilter.value;
    const search = searchFilter.value?.toLowerCase().trim();

    if (!subsys.length && !level.length && !search) {
        return logItems.value;
    }

    return logItems.value.filter((logitem: LogItemKey) => {
        const log = logitem.log;
        return (
            (!subsys.length || log?.subSystem && containsAnySubstr(log.subSystem, subsys)) &&
            (!level.length || log?.logLevel && level.includes(JournalLogLevel[log.logLevel])) &&
            (!search || log?.message && log.message.toLowerCase().includes(search))
        );
    });
});

// Determine empty state message
const emptyStateMessage = computed(() => {
    if (logItems.value.length === 0) {
        return 'No log entries available';
    }
    if (logItemsFiltered.value.length === 0) {
        return 'No log entries match the current filters';
    }
    return '';
});
</script>

<template>
    <div class="log-area">
        <div class="filter">
            <div class="subsystem-container">
                <label class="label">SubSystem:</label>
                <Dropdown class="dropdown" v-model="subSysFilter" placeholder="Select subsystem"
                    :options="props.subSystems" aria-label="Filter by subsystem" size="medium" clearable multiple />
            </div>

            <div class="level-container">
                <label class="label">Level:</label>
                <Dropdown class="dropdown" v-model="levelFilter" placeholder="Select severity level"
                    :options="levelOptions" aria-label="Filter by severity level" size="medium" clearable multiple />
            </div>

            <div class="search-container">
                <label class="label">Search:</label>
                <input v-model="searchFilter" class="input" type="text" placeholder="Search in messages..."
                    aria-label="Search in log messages" />
            </div>

            <div class="clear-container">
                <button class="button is-danger" title="Clear log" @click="clearAll" aria-label="Clear all log entries">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5 7.5H19L18 21H6L5 7.5Z" />
                        <path d="M15.5 9.5L15 19" />
                        <path d="M12 9.5V19" />
                        <path d="M8.5 9.5L9 19" />
                        <path
                            d="M16 5H19C20.1046 5 21 5.89543 21 7V7.5H3V7C3 5.89543 3.89543 5 5 5H8M16 5L15 3H9L8 5M16 5H8" />
                    </svg>
                </button>
            </div>
        </div>

        <div class="logarea">
            <List v-if="logItemsFiltered.length > 0" :items="logItemsFiltered" :auto-scroll="props.autoscroll"
                :item-height="props.rowHeight" :virtual-buffer="props.virtualBuffer" class="log-list" ref="listRef">
                <template #default="{ item }">
                    <LogAreaItem :model-value="item.log" />
                </template>
            </List>

            <div v-if="emptyStateMessage" class="empty-state">
                {{ emptyStateMessage }}
            </div>
        </div>
    </div>
</template>

<style lang="scss" src="@/styles/log-area.scss" />