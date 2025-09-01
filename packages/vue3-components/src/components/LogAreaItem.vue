<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'LogAreaItem',
});
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { JournalLogLevel } from '@osmoweb/core/utils'
import type { JournalLogItem } from '@osmoweb/core/utils'
import { timestampToTimeString } from '@osmoweb/core/utils'

const props = defineProps<{
    modelValue: JournalLogItem;
}>();

const JournalLogLevelToClassMap: Record<JournalLogLevel, string> = {
    [JournalLogLevel.FATAL]: 'fatal',
    [JournalLogLevel.ERROR]: 'error',
    [JournalLogLevel.WARNING]: 'warning',
    [JournalLogLevel.INFO]: 'info',
    [JournalLogLevel.DEBUG]: 'debug',
};

const logclass = computed((): string => {
    return JournalLogLevelToClassMap[props.modelValue.logLevel] ?? 'debug';
});

const formattedTime = computed(() => timestampToTimeString(props.modelValue.timestamp))

</script>


<template>
    <div class="log-area-item">
        <p :class="logclass">
            {{ formattedTime }}
            <b>{{ props.modelValue.subSystem }}:</b>
            {{ props.modelValue.message }}
        </p>
    </div>
</template>
