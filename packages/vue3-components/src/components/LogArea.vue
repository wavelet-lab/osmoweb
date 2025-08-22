<script setup lang="ts">
import { ref, computed, ComputedRef } from 'vue'
import { LogItem, LogLevel } from '@/lib/logging'
import WaveletInput from '@/components/UI/WaveletInput.vue';
import WaveletSelect, { SelectOption } from '@/components/UI/WaveletSelect.vue';
import LogAreaItem from '@/components/LogAreaItem.vue';

const props = defineProps({
    modelValue: Array,
    subSystems: Array<SelectOption>,
    autoscroll: Boolean,
})
let num = 0;

interface LogItemKey {
    key: number,
    log: LogItem,
}

const levelOptions: Array<SelectOption> = [
    { value: '', caption: 'ALL' },
    { value: LogLevel.DEBUG, caption: 'DEBUG' },
    { value: LogLevel.INFO, caption: 'INFO' },
    { value: LogLevel.WARNING, caption: 'WARNING' },
    { value: LogLevel.ERROR, caption: 'ERROR' },
    { value: LogLevel.FATAL, caption: 'FATAL' },
]

const logAreaRef = ref(null)
const logItems = ref<Array<LogItemKey>>(props.modelValue as Array<LogItemKey>);
const subSysFilter = ref('');
const levelFilter = ref('');
const searchFilter = ref('');
let needScroll = props.autoscroll;
let scrollToBottomProcess = false;
let scrollTimer: string | number | NodeJS.Timeout | undefined = undefined;

function scrollToBottom() {
    scrollToBottomProcess = true;
    if (logAreaRef.value) {
        const logArea: HTMLDivElement = logAreaRef.value as HTMLDivElement;
        logArea.scrollTop = logArea.scrollHeight;
    }
}

function onScroll(event: Event) {
    if (props.autoscroll && !scrollToBottomProcess) {
        const logArea: HTMLDivElement = event.target as HTMLDivElement;
        needScroll = logArea.scrollTop + logArea.clientHeight === logArea.scrollHeight;
        // console.log('event', event, 'NEEDSCROLL', needScroll)
    }
    scrollToBottomProcess = false;
}

function onClear() {
    while (logItems.value.length > 0) logItems.value.pop();
}

const logItemsFiltered: ComputedRef<Array<LogItemKey>> = computed((): Array<LogItemKey> => {
    const subsys = subSysFilter.value.toLowerCase();
    const level = levelFilter.value;
    const search = searchFilter.value.toLowerCase();
    if (needScroll === true && scrollTimer === undefined) {
        scrollTimer = setTimeout(() => {
            scrollToBottom();
            scrollTimer = undefined;
        }, 200);
    }
    return [...logItems.value].filter((logitem: LogItemKey) =>
        (subsys === '' || logitem.log.subSystem.toLowerCase().includes(subsys)) &&
        (level === '' || LogLevel[logitem.log.logLevel] === level) &&
        (search === '' || logitem.log.message.toLowerCase().includes(search))
    )
});

</script>


<template>
    <div class="outerContainer">
        <div class="innerContainer">
            <div class="flexContainer">
                <div class="filter">
                    <!-- <p>SubSystem:</p><wavelet-input type="text" class="is-small" v-model="subSysFilter"/> -->
                    <p>SubSystem:</p>
                    <wavelet-select class="is-small" :options="props.subSystems" v-model="subSysFilter" />
                    <p>Level:</p>
                    <wavelet-select class="is-small" :options="levelOptions" v-model="levelFilter" />
                    <p>Search:</p>
                    <wavelet-input type="text" class="is-small" v-model="searchFilter" />
                    <wavelet-button class="is-small is-danger" title="Clear log" @click.stop="onClear">
                        <span class="icon">
                            <font-awesome-icon icon="fa-regular fa-trash-can" style="color: white;" />
                        </span>
                    </wavelet-button>
                </div>
                <div class="logarea" ref="logAreaRef" :onscroll="onScroll">
                    <log-area-item v-for="logItem in logItemsFiltered" :key="logItem.key" :model-value="logItem.log" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.outerContainer {
    display: table;
    width: 100%;
    height: 100%;
}

.outerContainer .innerContainer {
    display: table-cell;
    width: 100%;
    height: 100%;
    margin: 0 auto;
}

.flexContainer {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    overflow: auto;
}

.filter {
    display: flex;
    flex-direction: row;
    // align-content: flex-start;
    align-items: center;
    width: 100%;
    height: 3em;
    font-size: small;
    gap: 1em;
    // vertical-align: center;
    // text-align: right;
}

.logarea {
    display: block;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border: 0.0625em solid var(--wsdr-theme-border);
    overflow: auto;
}
</style>