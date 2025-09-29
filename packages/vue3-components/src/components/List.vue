<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'List',
});

export interface ListProps<T = any> {
    items?: Array<T>;               // optional, full array source
    totalCount?: number;            // optional, total count when using getItem
    getItem?: (index: number) => T; // optional, getter for on-demand access
    itemHeight?: number;            // optional, item height in px, 0 means "auto-measure" (if unset or 0 component will measure the rendered item)
    virtualBuffer?: number;         // optional, rows above/below viewport
    maxHeight?: string;             // optional, max height for the list (e.g. "200px" or "50%")
    class?: string;                 // optional, additional class for list
    style?: Record<string, any>;    // optional, additional style for list
    autoScroll?: boolean;           // optional, scroll to bottom when new items are appended
}
</script>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = withDefaults(defineProps<ListProps>(), {
    items: undefined,
    totalCount: undefined,
    getItem: undefined,
    itemHeight: 0,
    virtualBuffer: 5,
    maxHeight: '100%',
    class: '',
    style: undefined,
    autoScroll: false,
});

const rootRef = ref<HTMLElement | null>(null);
const windowRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const measuredItemHeight = ref<number | null>(null);

// track whether auto-scroll is currently paused by user interaction
const autoScrollPaused = ref(false);
// mark programmatic scrolls so onScroll can ignore them
const programmaticScroll = ref(false);
// threshold in px to consider "at bottom"
const bottomThreshold = 4;

// determine count source
const totalCount = computed(() => {
    if (props.items && Array.isArray(props.items)) return props.items.length;
    if (typeof props.totalCount === 'number') return props.totalCount;
    return 0;
});

// effective item height: measured first, otherwise prop, otherwise fallback
const effectiveItemHeight = computed(() => {
    return (measuredItemHeight.value && measuredItemHeight.value > 0)
        ? measuredItemHeight.value
        : (props.itemHeight && props.itemHeight > 0 ? props.itemHeight : 25);
});

const totalHeight = computed(() => totalCount.value * effectiveItemHeight.value);

// visible rows and window calculations
const visibleRowsCount = computed(() => {
    if (containerHeight.value <= 0) return 1;
    return Math.ceil(containerHeight.value / effectiveItemHeight.value);
});

const windowRowsCount = computed(() => visibleRowsCount.value + props.virtualBuffer * 2);

// Check if scrolling is needed (use heights to avoid false toggles)
const needsScrolling = computed(() => {
    return totalHeight.value > containerHeight.value + 1;
});

// helper: are we at (or very near) the bottom?
function isAtBottom(currScrollTop = scrollTop.value) {
    const maxScrollTop = Math.max(0, totalHeight.value - containerHeight.value);
    return (maxScrollTop - currScrollTop) <= bottomThreshold;
}

// Calculate start index and clamp to a safe max start (prevents jump when near end)
const startIndex = computed(() => {
    if (!needsScrolling.value || containerHeight.value <= 0) return 0;

    const before = Math.floor(scrollTop.value / effectiveItemHeight.value) - props.virtualBuffer;
    const requested = Math.max(0, before);

    // maximum valid start so that window fits within available items
    const maxStart = Math.max(0, totalCount.value - windowRowsCount.value);

    // clamp into [0, maxStart] to avoid jumping beyond available buffered window
    return Math.min(requested, maxStart);
});

const endIndex = computed(() => {
    return Math.min(totalCount.value, startIndex.value + windowRowsCount.value);
});

const offsetY = computed(() => startIndex.value * effectiveItemHeight.value);

// map visible indices to items
const visibleItems = computed(() => {
    const out: Array<{ item: any, index: number }> = [];
    for (let i = startIndex.value; i < endIndex.value; i++) {
        const item = props.items ? props.items[i] : (props.getItem ? props.getItem(i) : undefined);
        out.push({ item, index: i });
    }
    return out;
});

// Force recalculation of virtual scroll when container size changes significantly
function recalculateVirtualScroll() {
    if (!rootRef.value) return;

    nextTick(() => {
        if (!rootRef.value) return;

        // update measured container height and scrollTop
        const oldScrollTop = scrollTop.value;
        scrollTop.value = rootRef.value.scrollTop;
        containerHeight.value = rootRef.value.clientHeight;

        // Clamp scrollTop only if it's outside the allowed range to avoid unnecessary jumps
        const maxScrollTop = Math.max(0, totalHeight.value - containerHeight.value);
        if (scrollTop.value > maxScrollTop + 1) {
            // apply clamp to both reactive and DOM value
            scrollTop.value = maxScrollTop;
            try {
                programmaticScroll.value = true;
                rootRef.value.scrollTop = maxScrollTop;
            } catch { /* ignore */ }
        } else if (scrollTop.value < 0) {
            scrollTop.value = 0;
            try {
                programmaticScroll.value = true;
                rootRef.value.scrollTop = 0;
            } catch { /* ignore */ }
        } else {
            // if scrollTop unchanged, keep DOM in sync (no set to avoid extra events)
            if (Math.abs(oldScrollTop - scrollTop.value) > 1) {
                try {
                    programmaticScroll.value = true;
                    rootRef.value.scrollTop = scrollTop.value;
                } catch { /* ignore */ }
            }
        }
    });
}

// observe size & scroll
let ro: ResizeObserver | null = null;
let itemRo: ResizeObserver | null = null;

const onScroll = (e: Event) => {
    if (!rootRef.value) return;
    scrollTop.value = rootRef.value.scrollTop;

    if (!props.autoScroll) return;

    // if this scroll was triggered programmatically, ignore as a user interaction
    if (programmaticScroll.value) {
        programmaticScroll.value = false;
        // ensure paused state follows actual position (if programmatic scroll moved to bottom, resume)
        if (isAtBottom()) autoScrollPaused.value = false;
        return;
    }

    // user scrolled: pause auto-scroll when user moves away from bottom,
    // resume when user scrolls back to bottom
    const atBottom = isAtBottom(scrollTop.value);
    autoScrollPaused.value = !atBottom;
};

onMounted(() => {
    nextTick(() => {
        if (!rootRef.value) return;
        containerHeight.value = rootRef.value.clientHeight;

        // initialize paused state based on current position
        scrollTop.value = rootRef.value.scrollTop;
        autoScrollPaused.value = props.autoScroll ? !isAtBottom() : true;

        ro = new ResizeObserver(() => {
            if (!rootRef.value) return;
            const oldHeight = containerHeight.value;
            containerHeight.value = rootRef.value.clientHeight;
            // If container height changed significantly, recalculate
            if (Math.abs(oldHeight - containerHeight.value) > 1) {
                recalculateVirtualScroll();
            }
        });
        ro.observe(rootRef.value);

        // observe the window area so we can measure first visible child's height when rendered
        if (windowRef.value && typeof ResizeObserver !== 'undefined') {
            itemRo = new ResizeObserver(() => {
                // measure several visible children's height
                nextTick(() => {
                    if (!windowRef.value) return;
                    const first = windowRef.value.firstElementChild as HTMLElement | null;
                    if (first) {
                        // Measure several visible children and take average to avoid one huge item bias.
                        const children = Array.from(windowRef.value!.children) as HTMLElement[];
                        const measureCount = Math.min(children.length, 8);
                        let sum = 0;
                        let counted = 0;
                        for (let i = 0; i < measureCount; i++) {
                            const el = children[i];
                            if (!el) continue;
                            const h = el.getBoundingClientRect().height;
                            if (h > 0) { sum += h; counted++; }
                        }
                        if (counted > 0) {
                            const avg = Math.max(1, Math.round(sum / counted));
                            // clamp average to containerHeight (if known) to avoid totalHeight >> real content
                            const maxAllowed = containerHeight.value > 0 ? Math.max(1, Math.round(containerHeight.value)) : avg;
                            const measured = Math.min(avg, maxAllowed);
                            if (measuredItemHeight.value !== measured) {
                                measuredItemHeight.value = measured;
                                // recalc scroll when measured height changes
                                recalculateVirtualScroll();
                            }
                        }
                    }
                });
            });
            itemRo.observe(windowRef.value);
        }
    });
});

onUnmounted(() => {
    if (ro) {
        try { ro.disconnect(); } catch { /* ignore */ }
        ro = null;
    }
    if (itemRo) {
        try { itemRo.disconnect(); } catch { /* ignore */ }
        itemRo = null;
    }
});

// keep scrollTop valid when total count or item height changes (e.g. filtering / measuring)
watch([totalCount, effectiveItemHeight], () => {
    // small delay so DOM updated before clamp
    nextTick(() => recalculateVirtualScroll());
});

// Auto-scroll to bottom when new items are appended (if enabled and not paused)
watch(totalCount, (newVal, oldVal) => {
    nextTick(() => {
        // Recalculate first to ensure totalHeight/containerHeight are up to date
        recalculateVirtualScroll();

        if (props.autoScroll && !autoScrollPaused.value && newVal > (oldVal ?? 0) && rootRef.value) {
            const maxScrollTop = Math.max(0, totalHeight.value - containerHeight.value);
            scrollTop.value = maxScrollTop;
            try {
                programmaticScroll.value = true;
                rootRef.value.scrollTop = maxScrollTop;
            } catch { /* ignore */ }
        }
    });
});
</script>

<template>
    <div :class="['list', props.class]" ref="rootRef" @scroll.stop="onScroll"
        :style="{ ...props.style, maxHeight: props.maxHeight }">
        <!-- spacer sets full scrollable height -->
        <div class="list-spacer" :style="{ height: totalHeight + 'px' }"></div>
        <!-- window with visible items positioned by translateY -->
        <div class="list-window" ref="windowRef" :style="{ transform: `translateY(${offsetY}px)` }">
            <template v-for="entry in visibleItems" :key="entry.index">
                <slot :item="entry.item" :index="entry.index">
                </slot>
            </template>
        </div>
    </div>
</template>

<style scoped lang="scss" src="@/styles/list.scss" />