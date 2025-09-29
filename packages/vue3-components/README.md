# Vue 3 Components

A collection of Vue 3 components with customizable styling using CSS variables.

## Installation

```bash
npm install @osmoweb/vue3-components
```

## Components

### Dropdown
**Usage:**
```vue
<template>
    <div>
        <!-- Dropdown -->
        <Dropdown
            v-model="selectedValue"
            placeholder="Choose option"
            :clearable="true"
        >
            <template #content="{ close, updateSelection }">
                <DropdownOption
                    v-for="option in options"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                    :selected="selectedValue === option.value"
                    @select="(value) => { updateSelection(value); close(); }"
                />
            </template>
        </Dropdown>

        <!-- Dropdown with search -->
        <Dropdown
            v-model="searchableValue"
            :searchable="true"
            size="large"
            variant="outlined"
        >
            <template #content="{ close, searchQuery, updateSelection }">
                <DropdownOption
                    v-for="option in filteredOptions(searchQuery)"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                    :description="option.description"
                    :selected="searchableValue === option.value"
                    @select="(value) => { updateSelection(value); close(); }"
                />
            </template>
        </Dropdown>

        <!-- Multiple selection -->
        <Dropdown
            v-model="multipleValues"
            :multiple="true"
            :clearable="true"
        >
            <template #content="{ updateSelection, selectedValues }">
                <DropdownOption
                    v-for="option in options"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                    :selected="selectedValues.includes(option.value)"
                    @select="(value) => {
                        const newValues = selectedValues.includes(value)
                            ? selectedValues.filter(v => v !== value)
                            : [...selectedValues, value];
                        updateSelection(newValues);
                    }"
                />
            </template>
        </Dropdown>
    </div>
</template>
```

### LogArea

A log viewer component with filtering capabilities, virtual scrolling, and real-time updates.

**Features:**
- Virtual scrolling for performance with large datasets
- Filter by log level (fatal, error, warning, info, debug)
- Filter by subsystem
- Search functionality
- Clear logs action
- Dark theme support

**Usage:**
```vue
<template>
  <LogArea
    :logs="logs"
    :subsystems="subsystems"
    @clear-logs="handleClearLogs"
  />
</template>

<script setup>
import { LogArea } from '@osmoweb/vue3-components'

const logs = ref([
  {
    id: 1,
    timestamp: '2025-09-14T10:30:00Z',
    level: 'info',
    subsystem: 'core',
    message: 'Application started'
  }
])

const subsystems = ref(['core', 'network', 'ui'])

function handleClearLogs() {
  logs.value = []
}
</script>
```

**Props:**
- `logs` (Array): Array of log objects with `id`, `timestamp`, `level`, `subsystem`, `message`
- `subsystems` (Array): Available subsystems for filtering
- `itemHeight` (Number): Height of each log item in pixels (default: 24)
- `bufferSize` (Number): Number of items to render outside visible area (default: 10)

**Events:**
- `clear-logs`: Emitted when clear button is clicked

### BtsInput

A BTS (Base Transceiver Station) configuration component with an input-like interface and dropdown configuration form.

**Features:**
- Input-like display showing current BTS configuration
- Connection status indicator with visual states
- Dropdown configuration form (BtsConfig component)
- Responsive design (modal on mobile)
- Frequency display (uplink/downlink) when configured
- Status-based styling and color coding

**Usage:**
```vue
<template>
  <BtsInput
    :bts="btsConfig"
    :supported-technologies="supportedTechs"
    :state="connectionState"
    :placeholder="'Configure your BTS'"
    :disabled="isProcessing"
    @update="handleBtsUpdate"
  />
</template>

<script setup>
import { BtsInput } from '@osmoweb/vue3-components'
import { RadioTechnology } from '@osmoweb/core/radio'

const btsConfig = ref({
  technology: RadioTechnology.GSM,
  band: 'GSM900',
  arfcn: 100
})

const supportedTechs = ref(new Set([
  RadioTechnology.GSM,
  RadioTechnology.LTE
]))

const connectionState = ref('configured') // 'not_configured', 'configured', 'connected', 'disconnected'
const isProcessing = ref(false)

function handleBtsUpdate(config) {
  btsConfig.value = config
  console.log('BTS updated:', config)
}
</script>
```

**Props:**
- `bts` (BtsParams): Current BTS configuration object with `technology`, `band`, `arfcn` properties
- `supportedTechnologies` (Set<RadioTechnology>): Set of supported radio technologies
- `placeholder` (String): Placeholder text when no BTS is configured (default: 'Click to configure BTS')
- `state` (BtsState): Connection state - 'not_configured', 'configured', 'connected', 'disconnected'
- `disabled` (Boolean): Disable the input (default: false)

**Events:**
- `update`: Emitted when BTS configuration is updated with new config object

**Display Behavior:**
- Shows frequency information (downlink/uplink) when fully configured
- Shows "BTS not configured" when no configuration exists
- Shows ARFCN when frequency calculation fails
- Visual status indicator changes color based on connection state

### BtsConfig

A comprehensive BTS configuration form component that provides radio technology setup with automatic validation and frequency calculation.

**Features:**
- Dynamic radio technology selection (GSM, LTE, NR)
- Band selection based on chosen technology
- ARFCN/EARFCN/NRARFCN selection with frequency preview
- Real-time frequency calculation and display
- Form validation and error handling
- Reset functionality to restore original values
- Integration with @osmoweb/core/radio utilities

**Usage:**
```vue
<template>
  <BtsConfig
    :bts="currentConfig"
    :supported-technologies="supportedTechs"
    @submit="handleConfigSubmit"
    @cancel="handleConfigCancel"
  />
</template>

<script setup>
import { BtsConfig } from '@osmoweb/vue3-components'
import { RadioTechnology } from '@osmoweb/core/radio'

const currentConfig = ref({
  technology: RadioTechnology.GSM,
  band: 'GSM_900',
  arfcn: 100,
  uplinkFrequency: 890000,    // kHz
  downlinkFrequency: 935000   // kHz
})

const supportedTechs = ref(new Set([
  RadioTechnology.GSM,
  RadioTechnology.LTE,
  RadioTechnology.NR
]))

function handleConfigSubmit(config) {
  console.log('BTS configuration submitted:', config)
  // Save configuration
}

function handleConfigCancel() {
  console.log('Configuration cancelled')
  // Close modal or reset form
}
</script>
```

**Props:**
- `bts` (BtsParams): Initial BTS configuration object
  - `technology` (RadioTechnology): GSM, LTE, or NR
  - `band` (MobileBand): Mobile band (e.g., GSM_900, B3, N78)
  - `arfcn` (Number): Channel number (ARFCN for GSM, EARFCN for LTE, NRARFCN for NR)
  - `uplinkFrequency` (Number): Uplink frequency in kHz
  - `downlinkFrequency` (Number): Downlink frequency in kHz
- `supportedTechnologies` (Set<RadioTechnology>): Set of supported radio technologies (default: GSM only)

**Events:**
- `submit`: Emitted when form is submitted with valid configuration
- `cancel`: Emitted when cancel button is clicked

**Form Behavior:**
- Technology dropdown only appears if multiple technologies are supported
- Band options update automatically when technology changes
- ARFCN/EARFCN/NRARFCN options update when band changes
- Real-time frequency calculation shows uplink/downlink frequencies
- Form validates all required fields before submission
- Reset button restores original configuration values

**Types:**
```typescript
interface BtsParams {
  technology?: RadioTechnology;
  band?: MobileBand;
  arfcn?: number;
  uplinkFrequency?: number;
  downlinkFrequency?: number;
}

type RadioTechnology = 'GSM' | 'LTE' | 'NR';
type MobileBand = string; // e.g., 'GSM_900', 'B3', 'N78'
```

## Styling

All components are designed for maximum customization using CSS custom properties (variables). This allows you to easily integrate them with your existing design system or CSS framework.

### Quick Start

Import the base variables to get started:

```scss
@import '@osmoweb/vue3-components/src/styles/variables.scss';
```

### Component Customization

Each component exposes specific CSS variables for granular control:

#### LogArea Component Variables
```scss
:root {
  /* Log level colors (customizable) */
  --log-fatal-color: darkred;
  --log-error-color: red; 
  --log-warning-color: rgb(190, 124, 0);
  --log-info-color: black;
  --log-debug-color: blue;

  /* Layout variables (customizable) */
  --logarea-filter-bg: var(--light, #f8f9fa);
  --logarea-filter-padding: var(--input-padding, 12px);
  --logarea-filter-gap: 1rem;
  --logarea-item-padding: 0.5rem;

  /* Typography variables (customizable) */
  --logarea-item-font-family: ui-monospace, SFMono-Regular, Monaco, 'Courier New', monospace;
  --logarea-item-font-size: var(--input-font-size, 14px);
  --logarea-item-line-height: 1rem;
}
```

#### Dropdown Component Variables
```scss
:root {
  /* Container variables (customizable) */
  --dropdown-bg: var(--white, #ffffff);
  --dropdown-border: var(--input-border, 1px solid #d1d5db);
  --dropdown-border-radius: var(--input-border-radius, 6px);
  --dropdown-shadow: var(--shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  --dropdown-padding: var(--input-padding, 8px 12px);

  /* State variables (customizable) */
  --dropdown-focus-border: var(--input-focus-border, #3b82f6);
  --dropdown-focus-shadow: var(--input-focus-shadow, 0 0 0 3px rgba(59, 130, 246, 0.1));
  
  /* Option variables (customizable) */
  --dropdown-item-hover-bg: var(--light, #f3f4f6);
  --dropdown-item-active-bg: var(--primary-color, #3b82f6);
  --dropdown-option-selected-bg: var(--primary-light, #eff6ff);
  --dropdown-option-selected-text: var(--primary-color, #3b82f6);
}
```

#### BtsInput Component Variables
```scss
:root {
  /* Uses base variables from variables.scss */
  /* Status indicator colors */
  --success-color: #28a745;  /* Connected state */
  --danger-color: #dc3545;   /* Disconnected state */
  --primary-color: #007bff;  /* Configured state */
  --muted: #6c757d;          /* Empty state text */
}
```

### Base Variables

Core design tokens available for all components:

```scss
:root {
  /* === PRIMARY COLOR PALETTE === */
  --primary-color: #007bff;
  --primary-hover: #0056b3;
  --primary-light: #cce7ff;
  --secondary-color: #6c757d;
  --secondary-hover: #545b62;
  --success-color: #28a745;
  --success-hover: #218838;
  --warning-color: #ffc107;
  --warning-hover: #e0a800;
  --danger-color: #dc3545;
  --danger-hover: #c82333;
  --info-color: #17a2b8;

  /* === NEUTRAL COLORS === */
  --white: #ffffff;
  --light: #f8f9fa;
  --dark: #495057;
  --muted: #6c757d;
  --border: #ced4da;
  --border-light: #dee2e6;
  --border-dark: #495057;
  --disabled-bg: #e9ecef;
  --text-muted: #6c757d;
  --text-light: #9ca3af;

  /* === FORM ELEMENT VARIABLES === */
  --input-padding: 12px;
  --input-border-radius: 6px;
  --input-font-size: 14px;
  --input-border: 1px solid var(--border);
  --input-focus-border: #80bdff;
  --input-focus-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  --input-transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

  /* === BUTTON VARIABLES === */
  --button-padding: 12px 24px;
  --button-border-radius: 6px;
  --button-font-size: 14px;
  --button-font-weight: 600;
  --button-transition: background-color 0.15s ease-in-out;

  /* === SHADOW VARIABLES === */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 10px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.3);
  --shadow: var(--shadow-md);

  /* === Z-INDEX LEVELS === */
  --z-dropdown: 1000;
  --z-modal: 1050;

  /* === RESPONSIVE BREAKPOINTS === */
  --mobile-breakpoint: 768px;

  /* === ANIMATION TIMING === */
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### Dark Theme Support

Enable dark theme by adding `data-theme="dark"` attribute or `theme-dark` class:

```html
<div data-theme="dark">
  <LogArea :logs="logs" />
  <Dropdown v-model="value" />
</div>
```

Dark theme automatically overrides variables:

```scss
[data-theme="dark"],
.theme-dark {
  --white: #1f232b;
  --light: #2a2f3a;
  --dark: #f8f9fa;
  --muted: #9aa4b2;
  --border: #3a4149;
  --border-light: #2a2f3a;
  
  /* Component-specific dark theme overrides */
  --log-fatal-color: rgb(201, 0, 0);
  --log-error-color: rgb(255, 78, 78);
  --log-warning-color: rgb(238, 155, 0);
  --log-info-color: lightgray;
  --log-debug-color: rgb(0, 191, 255);
  
  --dropdown-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}
```

### Framework Integration Examples

#### Integration with Bulma CSS
```scss
:root {
  /* Use Bulma's color system */
  --primary-color: hsl(171, 100%, 41%);
  --primary-hover: hsl(171, 100%, 35%);
  --danger-color: hsl(348, 86%, 61%);
  --success-color: hsl(141, 53%, 53%);
  --warning-color: hsl(48, 100%, 67%);
  
  /* Use Bulma's sizing */
  --input-font-size: 1rem;
  --button-font-size: 1rem;
  --input-border-radius: 4px;
}
```

#### Integration with Tailwind CSS
```scss
:root {
  /* Use Tailwind color palette */
  --primary-color: theme('colors.blue.500');
  --primary-hover: theme('colors.blue.600');
  --success-color: theme('colors.green.500');
  --warning-color: theme('colors.yellow.500');
  --danger-color: theme('colors.red.500');
  
  /* Use Tailwind spacing and border radius */
  --input-padding: theme('spacing.3');
  --button-padding: theme('spacing.2') theme('spacing.4');
  --input-border-radius: theme('borderRadius.md');
}
```

### Advanced Customization Examples

#### Custom Log Colors and Typography
```scss
:root {
  /* Custom monospace font for logs */
  --logarea-item-font-family: 'Fira Code', 'JetBrains Mono', monospace;
  --logarea-item-font-size: 13px;
  
  /* Custom log level colors */
  --log-fatal-color: #ff0000;
  --log-error-color: #ff6b6b;
  --log-warning-color: #feca57;
  --log-info-color: #48dbfb;
  --log-debug-color: #ff9ff3;
  
  /* Custom filter background */
  --logarea-filter-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### Corporate Branding
```scss
:root {
  /* Corporate colors */
  --primary-color: #1e40af;        /* Corporate blue */
  --primary-hover: #1e3a8a;
  --success-color: #059669;        /* Corporate green */
  --warning-color: #d97706;        /* Corporate orange */
  --danger-color: #dc2626;         /* Corporate red */
  
  /* Corporate typography */
  --input-font-size: 15px;
  --button-font-weight: 700;
  
  /* Corporate spacing */
  --input-padding: 16px;
  --button-padding: 16px 32px;
  --input-border-radius: 8px;
  --button-border-radius: 8px;
  
  /* Corporate shadows */
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
```

#### Minimal/Flat Design
```scss
:root {
  /* Remove shadows and borders for flat design */
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
  --input-border: 1px solid transparent;
  --input-focus-shadow: none;
  --dropdown-shadow: none;
  
  /* Flat colors */
  --input-focus-border: var(--primary-color);
  --dropdown-border: 1px solid var(--border-light);
  
  /* Sharp corners */
  --input-border-radius: 0;
  --button-border-radius: 0;
  --dropdown-border-radius: 0;
}
```

### Component-Level Overrides

You can also override styles at the component level:

```vue
<template>
  <div class="custom-log-area">
    <LogArea :logs="logs" />
  </div>
</template>

<style scoped>
.custom-log-area {
  /* Override only for this instance */
  --log-error-color: #e74c3c;
  --log-warning-color: #f39c12;
  --logarea-item-font-size: 12px;
}
</style>
```

### CSS Class Overrides

For complete control, you can also override CSS classes:

```scss
/* Global overrides */
.log-area {
  border: 2px solid var(--primary-color);
  
  .filter {
    background: var(--primary-color);
    color: white;
  }
  
  .log-area-item {
    &:hover {
      background-color: var(--light);
    }
  }
}

.dropdown-trigger {
  border: 2px solid var(--border);
  
  &:focus {
    border-color: var(--primary-color);
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
}
```

This approach ensures that your components integrate seamlessly with any design system while maintaining consistent behavior and accessibility.

## Development

### Build
```bash
npm run build
```

### Test
```bash
npm run test
```

### Type Check
```bash
npm run type-check
```

## License

MIT