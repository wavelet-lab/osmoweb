// Measures text widths and fits as many items into a width as possible.

export interface CalculateDisplayItemsOptions<T = any> {
    values: readonly T[];
    availableWidth: number;
    labelFor: (v: T) => string;
    font?: string;                 // e.g. '16px Inter, system-ui, ...'
    separator?: string;            // default: ', '
    suffix?: (remaining: number) => string; // default: (n) => `+${n} more`
    minItems?: number;             // default: 1
}

export interface CalculateDisplayItemsResult<T = any> {
    displayItems: T[];
    remainingCount: number;
}

// Reuse a single canvas context
let ctx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!ctx) {
        const canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
    }
    return ctx;
}

function measure(text: string, font: string): number {
    const c = getCtx();
    if (!c) return text.length * 8; // SSR/fallback heuristic
    if (c.font !== font) c.font = font;
    return c.measureText(text).width;
}

export function calculateDisplayItems<T = any>(
    opts: CalculateDisplayItemsOptions<T>
): CalculateDisplayItemsResult<T> {
    const {
        values,
        availableWidth,
        labelFor,
        font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        separator = ', ',
        suffix = (n: number) => `+${n} more`,
        minItems = 1
    } = opts;

    if (!values?.length) return { displayItems: [], remainingCount: 0 };

    const labels = values.map(v => labelFor(v) ?? '');
    const sepW = measure(separator, font);

    let currentW = 0;
    let displayCount = 0;

    for (let i = 0; i < labels.length; i++) {
        const labelW = measure(labels[i] ?? '', font);
        const addSep = i > 0 ? sepW : 0;

        const remainingAfter = labels.length - (i + 1);
        // Reserve space for suffix if there will be remaining items
        const suffixW = remainingAfter > 0 ? sepW + measure(suffix(remainingAfter), font) : 0;

        const totalIfAdd = currentW + addSep + labelW + suffixW;

        if (totalIfAdd > availableWidth && displayCount >= Math.max(1, minItems)) {
            break;
        }

        currentW += addSep + labelW;
        displayCount++;
    }

    displayCount = Math.max(minItems, Math.max(1, displayCount));

    return {
        displayItems: values.slice(0, displayCount),
        remainingCount: Math.max(0, values.length - displayCount)
    };
}