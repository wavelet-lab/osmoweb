<script setup lang="ts">
import { ref, computed } from 'vue'
import { LogLevel } from '@osmoweb/core/utils'
import type { LogItem } from '@osmoweb/core/utils'
import { timestampToTimeString } from '@osmoweb/core/utils'

const props = defineProps({
    modelValue: Object,
})

const value = ref<LogItem>(props.modelValue as LogItem);

const logclass = computed((): string => {
    switch (value.value.logLevel) {
        case LogLevel.FATAL:
            return 'fatal';
        case LogLevel.ERROR:
            return 'error';
        case LogLevel.WARNING:
            return 'warning';
        case LogLevel.INFO:
            return 'info';
        case LogLevel.DEBUG:
        default:
            return 'debug';
    }
})

</script>


<template>
    <div>
        <p :class="logclass">{{ timestampToTimeString(value.timestamp) }} <b>{{ value.subSystem }}:</b> {{ value.message
            }}</p>
    </div>
</template>

<style scoped lang="scss">
[data-theme=light],
.theme-light {
    .fatal {
        color: darkred;
        font-family: monospace;
        font-size: small;
    }

    .error {
        color: red;
        font-family: monospace;
        font-size: small;
    }

    .warning {
        color: rgb(190, 124, 0);
        font-family: monospace;
        font-size: small;
    }

    .info {
        color: black;
        font-family: monospace;
        font-size: small;
    }

    .debug {
        color: blue;
        font-family: monospace;
        font-size: small;
    }
}

[data-theme=dark],
.theme-dark {
    .fatal {
        color: rgb(201, 0, 0);
        font-family: monospace;
        font-size: small;
    }

    .error {
        color: rgb(255, 78, 78);
        font-family: monospace;
        font-size: small;
    }

    .warning {
        color: rgb(238, 155, 0);
        font-family: monospace;
        font-size: small;
    }

    .info {
        color: lightgray;
        font-family: monospace;
        font-size: small;
    }

    .debug {
        color: rgb(0, 191, 255);
        font-family: monospace;
        font-size: small;
    }
}
</style>