# @osmoweb/nestjs-microservice

NestJS integration layer for OsmoWeb.

This package wires `@osmoweb/backend-core` into NestJS primitives:

- A ready-to-import `OsmoModule`
- WebSocket gateways for Osmocom bridge flows (`control`, `media`, `abis_oml`, `abis_rsl`)
- A small REST controller for per-user BTS config (`/api/v1/osmo/bts`)
- Optional background stats polling with writers for InfluxDB / Prometheus Pushgateway

It is designed to run in **Node.js**.

## Install

```bash
npm install @osmoweb/nestjs-microservice
```

## Imports (entrypoints)

Subpath exports:

- `@osmoweb/nestjs-microservice` — re-exports the OsmoWeb module and token
- `@osmoweb/nestjs-microservice/osmo` — OsmoWeb module (`OsmoModule`) and tokens

Import auth and users APIs directly from `@websdr/nestjs-microservice`.

## Quick start

In your application module:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OsmoModule } from '@osmoweb/nestjs-microservice/osmo';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OsmoModule,
  ],
})
export class AppModule {}
```

## Configuration (env vars)

`OsmoModule` provides an `OSMO_PARAMS` token (type `OsmoParams`) built from `@nestjs/config`.

### Osmocom service addresses

Per-service host/port pairs:

- `OSMO_UDP_MEDIA_URI`, `OSMO_UDP_MEDIA_PORT`
- `OSMO_TCP_ABIS_OML_URI`, `OSMO_TCP_ABIS_OML_PORT`
- `OSMO_TCP_ABIS_RSL_URI`, `OSMO_TCP_ABIS_RSL_PORT`
- `OSMO_TCP_HLR_URI`, `OSMO_TCP_HLR_PORT` (stats VTY)
- `OSMO_TCP_BSC_URI`, `OSMO_TCP_BSC_PORT` (REST configuration and stats VTY)

### WebSocket endpoints

Gateways are currently registered with fixed endpoints:

- `/wsdr/osmo/control`
- `/wsdr/osmo/media`
- `/wsdr/osmo/abis_oml`
- `/wsdr/osmo/abis_rsl`

The host application chooses its HTTP listening port. Gateway paths are not
configured through environment variables.

## REST API

### `GET /api/v1/osmo/bts`

Returns the BTS config/info assigned to the authenticated user.
Use the optional `instanceId` query parameter to select a non-default
assignment.

### `PUT /api/v1/osmo/bts`

Allocates a BTS for the authenticated user (if needed) and updates its config in the BSC via VTY.

The accepted payload fields are `instanceId`, `band`, top-level `arfcn`, and
`trx`. The controller applies its own generated BSC values for type, unit id,
cell identity, description, and GPRS mode.

### `DELETE /api/v1/osmo/bts`

Releases the authenticated user's assignment. An optional JSON
`instanceId` selects a non-default assignment.

Payloads are validated by a controller-level Nest `ValidationPipe`.
Undocumented fields are rejected.

Authentication: the controller uses `JwtAuthGuard` from
`@websdr/nestjs-microservice`.

## WebSocket bridge

The gateways delegate to `@osmoweb/backend-core` router controllers.

BTS assignments are managed in process memory by `BtsManager`; no configuration
file is loaded.

## Stats polling

`StatsModule` can periodically poll VTY controllers and write metrics.

Enable/disable and interval:

- `STATS_ENABLED` (default: true)
- `STATS_INTERVAL_MS` (default: 10000)

VTY endpoints:

- `OSMO_TCP_BSC_URI`, `OSMO_TCP_BSC_PORT`
- `OSMO_TCP_HLR_URI`, `OSMO_TCP_HLR_PORT`
- `OSMO_TCP_MGW_URI`, `OSMO_TCP_MGW_PORT`
- `OSMO_TCP_MSC_URI`, `OSMO_TCP_MSC_PORT`
- `OSMO_TCP_STP_URI`, `OSMO_TCP_STP_PORT`

Writers are enabled only when their env vars are provided:

InfluxDB:

- `INFLUXDB_URL`
- `INFLUXDB_ORG`
- `INFLUXDB_TOKEN`
- `INFLUXDB_BUCKET`

Prometheus Pushgateway:

- `PROMETHEUS_PUSH_URL`

## Compatibility notes

- **TypeScript:** ships `*.d.ts` typings.

## Development (monorepo)

From the repository root:

```bash
npm install
npm run build
npm test --workspace=packages/nestjs-microservice
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
- Entry point: https://github.com/wavelet-lab/osmoweb/blob/main/packages/nestjs-microservice/src/index.ts
- Osmo modules exports: https://github.com/wavelet-lab/osmoweb/blob/main/packages/nestjs-microservice/src/osmo/index.ts

Package folder (GitHub):
https://github.com/wavelet-lab/osmoweb/tree/main/packages/nestjs-microservice

## License

OsmoWeb is [MIT licensed](https://github.com/wavelet-lab/osmoweb/blob/main/LICENSE)
