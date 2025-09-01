<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'LogArea',
});

export interface LogItemKey {
    key: number,
    log: JournalLogItem,
}

export interface SelectOption {
    value: string,
    caption: string,
}
</script>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue'
import type { ComputedRef } from 'vue'
import { JournalLogLevel } from '@osmoweb/core/utils'
import type { JournalLogItem } from '@osmoweb/core/utils'
import LogAreaItem from '@/components/LogAreaItem.vue';

// Props
const props = withDefaults(defineProps<{
    modelValue?: Array<LogItemKey>,
    subSystems?: Array<SelectOption>,
    autoscroll?: boolean,
    rowHeight?: number,        // fixed row height in px for each item
    virtualBuffer?: number,    // extra rows above/below viewport
}>(), {
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
const levelOptions: Array<SelectOption> = [
    { value: '', caption: 'ALL' },
    ...Object.values(JournalLogLevel).map(level => ({ value: level, caption: level })),
]

// Refs
const logAreaRef = ref<HTMLDivElement>()
const logItems = ref<Array<LogItemKey>>(props.modelValue || []);

// Filter state
const subSysFilter = ref('');
const levelFilter = ref('');
const searchFilter = ref('');

// Virtual scroll state
const containerHeight = ref(0);
const scrollTop = ref(0);
const needScroll = ref(props.autoscroll);
const scrollToBottomProcess = ref(false);
let rafId: number | undefined = undefined;

// Internal variables
let scrollTimer: string | number | NodeJS.Timeout | undefined = undefined;
let resizeObserver: ResizeObserver | undefined = undefined;


// Sync model changes
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        logItems.value = [...newValue];
        if (props.autoscroll && needScroll.value) {
            scheduleScrollToBottom();
        }
    }
}, { deep: true });

// Scroll to bottom
async function scrollToBottom() {
    if (!logAreaRef.value) return;
    scrollToBottomProcess.value = true;
    await nextTick();
    try {
        logAreaRef.value.scrollTop = logAreaRef.value.scrollHeight;
    } catch (error) {
        console.warn('Failed to scroll to bottom:', error);
    } finally {
        scrollToBottomProcess.value = false;
    }
}

function scheduleScrollToBottom() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
        scrollToBottom();
        scrollTimer = undefined;
    }, 50);
}

// Throttled scroll handler using requestAnimationFrame
function onScroll(event: Event) {
    if (rafId !== undefined) return; // already scheduled

    rafId = requestAnimationFrame(() => {
        const logArea = event.target as HTMLDivElement;
        if (!logArea) {
            rafId = undefined;
            return;
        }

        scrollTop.value = logArea.scrollTop;

        // update "is at bottom" flag for autoscroll
        const threshold = 2;
        needScroll.value = (logArea.scrollTop + logArea.clientHeight >= logArea.scrollHeight - threshold);

        rafId = undefined;
    });
}

// Clear
function onClear() {
    logItems.value = [];
    emit('update:modelValue', logItems.value);
}

// Filtering - cached computation
const logItemsFiltered: ComputedRef<Array<LogItemKey>> = computed(() => {
    const subsys = subSysFilter.value?.toLowerCase().trim();
    const level = levelFilter.value;
    const search = searchFilter.value?.toLowerCase().trim();

    if (!subsys && !level && !search) {
        return logItems.value;
    }

    return logItems.value.filter((logitem: LogItemKey) => {
        const log = logitem.log;
        return (
            (!subsys || log?.subSystem && log.subSystem.toLowerCase().includes(subsys)) &&
            (!level || log?.logLevel && JournalLogLevel[log.logLevel] === level) &&
            (!search || log?.message && log.message.toLowerCase().includes(search))
        );
    });
});

// Pre-compute constants for performance
const rowHeight = computed(() => props.rowHeight || 25);
const totalCount = computed(() => logItemsFiltered.value.length);
const totalHeight = computed(() => totalCount.value * rowHeight.value);

// Calculate visible window parameters
const visibleRowsCount = computed(() => {
    if (containerHeight.value <= 0) return 10; // fallback
    return Math.ceil(containerHeight.value / rowHeight.value);
});

const bufferRowsCount = computed(() => props.virtualBuffer);
const windowRowsCount = computed(() => visibleRowsCount.value + bufferRowsCount.value * 2);
const windowHeight = computed(() => windowRowsCount.value * rowHeight.value);

// Check if scrolling is needed
const needsScrolling = computed(() => {
    if (containerHeight.value <= 0) return false;
    return totalCount.value > visibleRowsCount.value;
});

// Calculate start index based on scroll position
const startIndex = computed(() => {
    if (!needsScrolling.value || containerHeight.value <= 0) return 0;

    // Simple calculation: which row should be at the top based on scroll position
    const itemsBeforeView = Math.floor(scrollTop.value / rowHeight.value);
    const startWithBuffer = Math.max(0, itemsBeforeView - bufferRowsCount.value);

    // Make sure we don't go beyond available items
    return Math.min(startWithBuffer, Math.max(0, totalCount.value - windowRowsCount.value));
});

const endIndex = computed(() => {
    return Math.min(totalCount.value, startIndex.value + windowRowsCount.value);
});

const visibleItems = computed(() => {
    return logItemsFiltered.value.slice(startIndex.value, endIndex.value);
    // .filter(item => item && item.key && item.log); // Uncomment to filter out invalid items
});

// Create scrollable area height - fixed calculation
const scrollableAreaHeight = computed(() => {
    if (!needsScrolling.value) {
        // No scrolling needed - height equals container or content, whichever is larger
        return Math.max(containerHeight.value, totalHeight.value);
    }

    // Need scrolling - total height of all items
    return totalHeight.value;
});

// Force recalculation of virtual scroll when container size changes significantly
function recalculateVirtualScroll() {
    if (!logAreaRef.value) return;

    nextTick(() => {
        if (!logAreaRef.value) return;

        // Force update of current scroll position
        scrollTop.value = logAreaRef.value.scrollTop;

        // Check if current scroll position is still valid
        const maxScrollTop = Math.max(0, totalHeight.value - containerHeight.value);
        if (scrollTop.value > maxScrollTop) {
            logAreaRef.value.scrollTop = maxScrollTop;
            scrollTop.value = maxScrollTop;
        }

        // If we were at bottom and autoscroll is enabled, stay at bottom
        if (needScroll.value && props.autoscroll) {
            scheduleScrollToBottom();
        }
    });
}

// Initialize container size and observe changes
onMounted(() => {
    if (logAreaRef.value) {
        // Wait for next tick to ensure proper rendering
        nextTick(() => {
            if (!logAreaRef.value) return;

            // Initialize sizes
            containerHeight.value = logAreaRef.value.clientHeight;
            scrollTop.value = logAreaRef.value.scrollTop;

            console.log('LogArea initialized:', {
                containerHeight: containerHeight.value,
                scrollTop: scrollTop.value,
                totalCount: totalCount.value
            });

            // If autoscroll is enabled and we should be at bottom, scroll there
            if (props.autoscroll && needScroll.value) {
                scheduleScrollToBottom();
            }
        });

        // observe size changes
        resizeObserver = new ResizeObserver((entries) => {
            if (!logAreaRef.value) return;

            const oldHeight = containerHeight.value;

            for (const entry of entries) {
                const newHeight = entry.contentRect.height;
                if (Math.abs(newHeight - containerHeight.value) > 1) {
                    containerHeight.value = newHeight;
                    console.log('Container height changed:', oldHeight, '->', newHeight);
                }
            }

            // If container height changed significantly, recalculate
            if (Math.abs(oldHeight - containerHeight.value) > 1) {
                recalculateVirtualScroll();
            }
        });
        resizeObserver.observe(logAreaRef.value);
    }
});

// Auto-scroll when new items arrive
watch(totalCount, () => {
    if (props.autoscroll && needScroll.value) {
        scheduleScrollToBottom();
    }
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

// Cleanup
onUnmounted(() => {
    if (scrollTimer) {
        clearTimeout(scrollTimer);
    }
    if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
    }
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = undefined;
    }
});
</script>

<template>
    <div class="log-area">
        <div class="filter">
            <div class="subsystem-container">
                <label>SubSystem:</label>
                <select v-model="subSysFilter" class="select" aria-label="Filter by subsystem">
                    <option value="">ALL</option>
                    <option v-for="option in props.subSystems" :key="option.value" :value="option.value">
                        {{ option.caption }}
                    </option>
                </select>
            </div>

            <div class="level-container">
                <label>Level:</label>
                <select v-model="levelFilter" class="select" aria-label="Filter by log level">
                    <option v-for="option in levelOptions" :key="option.value" :value="option.value">
                        {{ option.caption }}
                    </option>
                </select>
            </div>

            <div class="search-container">
                <label>Search:</label>
                <input v-model="searchFilter" type="text" class="input" placeholder="Search in messages..."
                    aria-label="Search in log messages" />
            </div>

            <div class="clear-container">
                <button class="button is-danger" title="Clear log" @click="onClear" aria-label="Clear all log entries">
                    <span class="icon" aria-hidden="true">🗑</span>
                </button>
            </div>
        </div>

        <div class="logarea" @scroll="onScroll" ref="logAreaRef">

            <!-- Invisible spacer to create proper scrollable height only when needed -->
            <div v-if="needsScrolling" class="scroll-spacer" :style="{ height: scrollableAreaHeight + 'px' }">
            </div>

            <!-- Fixed size window for visible items -->
            <div class="items-window">
                <log-area-item v-for="logItem in visibleItems" :key="logItem.key" :model-value="logItem.log"
                    :style="{ height: rowHeight + 'px' }" />
            </div>

            <div v-if="emptyStateMessage" class="empty-state">
                {{ emptyStateMessage }}
            </div>
        </div>
    </div>
</template>
