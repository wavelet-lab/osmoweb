# @osmoweb/frontend-core

Front-end HTTP, WebSocket, WebUSB, worker, and WebAssembly helpers for OsmoWeb
applications.

## Install

```bash
npm install @osmoweb/frontend-core
```

## Imports (entrypoints)

- `@osmoweb/frontend-core` — re-exports `./services` and `./osmo`
- `@osmoweb/frontend-core/services` — API client helpers
- `@osmoweb/frontend-core/osmo` — browser BTS/TRX runtime helpers

```ts
import { getBts, releaseBts, updateBts } from '@osmoweb/frontend-core/services';
```

## Services

### BTS service

Endpoints:

- `GET /api/v1/osmo/bts` → `getBts()`
- `GET /api/v1/osmo/bts?instanceId=...` → `getBts(instanceId)`
- `PUT /api/v1/osmo/bts` → `updateBts(cfg?)`
- `DELETE /api/v1/osmo/bts` → `releaseBts(instanceId?)`

```ts
import { getBts, releaseBts, updateBts } from '@osmoweb/frontend-core/services';
import { GSMBand } from '@osmoweb/core';
import type { BtsUpdateInput } from '@osmoweb/frontend-core/services';

// Read BTS info for the current user/session
const bts = await getBts();

// Update BTS config
const cfg: BtsUpdateInput = {
  instanceId: 'browser-tab-1',
  band: GSMBand.GSM_900,
  arfcn: 0,
};

await updateBts(cfg);
await getBts('browser-tab-1');
await releaseBts('browser-tab-1');
```

## Notes

- These helpers assume an OsmoWeb backend that exposes `/api/v1/osmo/*` routes.
- Request mechanics (base URL, auth headers/cookies, error handling) are delegated to `apiFetch` from `@websdr/frontend-core`.

## API overview

From `@osmoweb/frontend-core/services`:

- `getBts(instanceId?: string): Promise<BtsConfig>`
- `updateBts(cfg?: BtsUpdateInput): Promise<BtsConfig>`
- `releaseBts(instanceId?: string): Promise<{ released: boolean }>`

From `@osmoweb/frontend-core/osmo`:

- Runtime: `Osmo`, `initOsmo()`, and Emscripten callback exports
- Worker API: `OsmoTrxWorker`, `OsmoTrxManager`,
  `OsmoTrxManagerWorker`, `getOsmoTrxManagerInstance()`
- Transport helpers: `endpointToOsmoWsUrl()`, `OsmoWSUrls`
- Runtime types and constants: `BtsStatsGroup`, `OsmoBands`,
  `IPAccessProto`

## Compatibility notes

- **TypeScript:** ships `*.d.ts` typings.

## Development (monorepo)

From the repository root:

```bash
npm install
npm run build
npm test --workspace=packages/frontend-core
```

From this package folder:

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

## Source links

This package publishes `dist/` to npm. Source is available in the GitHub repository:
- Entry point: https://github.com/wavelet-lab/osmoweb/blob/main/packages/frontend-core/src/index.ts
- Osmo services exports: https://github.com/wavelet-lab/osmoweb/blob/main/packages/frontend-core/src/services/index.ts

Package folder (GitHub):
https://github.com/wavelet-lab/osmoweb/tree/main/packages/frontend-core


## License

OsmoWeb is [MIT licensed](https://github.com/wavelet-lab/osmoweb/blob/main/LICENSE)
