export function sleep(s: number) {
    return new Promise(r => setTimeout(r, s * 1000));
}

export function usleep(s: number) {
    return new Promise(r => setTimeout(r, s));
}

export function now() {
    return performance.now();
}

export function timestampToTimeString(timestamp: number) {
    const date = new Date(timestamp);
    return date.getHours().toString().padStart(2, '0') +
        ':' + date.getMinutes().toString().padStart(2, '0') +
        ':' + date.getSeconds().toString().padStart(2, '0') +
        '.' + date.getMilliseconds().toString().toString().padStart(3, '0');
}
