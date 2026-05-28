# OsmoWeb
[OsmoWeb](https://github.com/wavelet-lab/osmoweb) is an open-source TypeScript library that brings Osmocom's mobile communication capabilities to the web.

## Description

OsmoWeb is a TypeScript monorepo for building web apps and services around Osmocom network elements, with a long‑term goal of providing an npm package to run a 2G base station in the browser or in a web environment.

What we are building:
- Web BTS: osmo-bts-trx compiled to WebAssembly (WASM), with its UDP network layer replaced by WebSocket. This enables running the BTS in the browser or WASI while talking to native Osmocom services through a bridge.
- Transport bridge: a WebSocket ↔ UDP router in backend-core that connects the browser-based BTS to the native Osmocom stack (osmo-bsc, osmo-msc, osmo-hlr, osmo-mgw).
- Frontend helpers: frontend-core adds client-side utilities for the WASM BTS transport and device handling.
- UI components: a small Vue 3 set for demos and apps, including log viewer, BTS configuration panel, and WebUSB SDR selection.

Responsibilities by package:
- core — shared types and utilities.
- backend-core — WebSocket ⇄ UDP router for Osmocom services, stats and log collection, and service management (e.g., BTS params, subscribers, etc.). All Osmocom services except the WASM osmo-bts-trx remain native.
- nestjs-microservice — NestJS integration that wraps backend-core into DI-ready providers and WebSocket gateways.
- frontend-core and vue3-components — client-side helpers and reusable UI for dashboards and demos.

Use cases:
- Browser-based labs and demos for SDR/Osmocom.
- Web dashboards for BSC/MSC/HLR/MGW state, logs, and control.
- Automation of routine network operations.

This project builds on existing Osmocom services; it does not replace them. Focus areas are developer ergonomics, type safety, and real-time streaming UX.

## Project structure

**Monorepo packages and test apps:**

```
.
├─ packages/
│  ├─ core/                – Shared domain types, utilities, constants
│  ├─ backend-core/        – Backend router/controllers and common types for Osmocom services
│  ├─ nestjs-microservice/ – NestJS module + gateways built on top of backend-core
│  ├─ frontend-core/       – Front-end utilities and client-side helpers
│  └─ vue3-components/     – Reusable Vue 3 UI components and styles
├─ test-apps/              – Small scripts to manually test integrations with Osmo services
└─ ...
```

- [packages/core](packages/core) — Core shared library with domain types, utilities, and constants used across all packages. Docs: [packages/core/README.md](packages/core/README.md)
- [packages/backend-core](packages/backend-core) — Backend building blocks: router and controllers to talk to Osmocom daemons.
Docs: [packages/backend-core/README.md](packages/backend-core/README.md)
- [packages/nestjs-microservice](packages/nestjs-microservice) — NestJS integration that wraps backend-core into DI-ready providers and WebSocket gateways; configurable via OSMO_* env vars.
Docs: [packages/nestjs-microservice/README.md](packages/nestjs-microservice/README.md)
- [packages/frontend-core](packages/frontend-core) — Front-end core utilities and adapters for client apps.
Docs: [packages/frontend-core/README.md](packages/frontend-core/README.md)
- [packages/vue3-components](packages/vue3-components) — Vue 3 UI components and styles used by OsmoWeb apps (BTS config/input components).
Docs: [packages/vue3-components/README.md](packages/vue3-components/README.md)
- [test-apps](test-apps) — Sample scripts for manual testing (e.g., [bsc-test.ts](test-apps/bsc-test.ts), [msc-test.ts](test-apps/msc-test.ts), [hlr-test.ts](test-apps/hlr-test.ts), [mgw-test.ts](test-apps/mgw-test.ts)).

## Documentation

- Docs index: [docs/README.md](docs/README.md)
- Architecture entry point: [docs/architecture/overview.md](docs/architecture/overview.md)

## Setup the project

```bash
npm install
```

## Build the project

Build
```bash
npm run build
```

## Run tests

Run unit tests for each workspace
```bash
npm run test
```

Run all tests
```bash
npm run test:all
```

Run all tests and watch for changes
```bash
npm run test:watch
```

Run coverage check
```bash
npm run test:coverage
```

## Run test applications

Test apps documentation: [test-apps/README.md](test-apps/README.md)

All test applications are located in the `test-apps` folder. Before running any of them, change into that directory:
```bash
cd test-apps
```

Run the BSC test application:
```bash
npm run test:bsc
```

Run the HLR test application:
```bash
npm run test:hlr
```

Run the MGW test application:
```bash
npm run test:mgw
```

Run the MSC test application:
```bash
npm run test:msc
```

> Note: Ensure the required Osmocom services are reachable before running the tests.

## Docker infrastructure

Monitoring stack (Prometheus/Pushgateway/Alertmanager + InfluxDB + Grafana):
- [docker/README.md](docker/README.md)

## Environments

OsmoWeb packages read configuration from the host application environment.

### Backend / NestJS

`packages/nestjs-microservice` builds `OSMO_PARAMS` from `@nestjs/config`:

| Variable | Default | Used for |
| --- | --- | --- |
| `OSMO_SERVER_PORT` | `8800` | Backend Osmo server port. |
| `OSMO_WORKER_POOL_SIZE` | `4` | Worker pool size for Osmo routing. |
| `OSMO_UDP_MEDIA_URI` / `OSMO_UDP_MEDIA_PORT` | `localhost` / `1984` | UDP media service endpoint. |
| `OSMO_TCP_ABIS_OML_URI` / `OSMO_TCP_ABIS_OML_PORT` | `localhost` / `3002` | ABIS OML TCP service endpoint. |
| `OSMO_TCP_ABIS_RSL_URI` / `OSMO_TCP_ABIS_RSL_PORT` | `localhost` / `3003` | ABIS RSL TCP service endpoint. |
| `OSMO_TCP_HLR_URI` / `OSMO_TCP_HLR_PORT` | `localhost` / `4258` | HLR TCP service endpoint. |
| `OSMO_TCP_BSC_URI` / `OSMO_TCP_BSC_PORT` | `localhost` / `4242` | BSC TCP service endpoint. |
| `OSMO_CONTROL_URI` | `/wsdr/osmo/control` | Control WebSocket endpoint stored in `OSMO_PARAMS`. |
| `OSMO_MEDIA_URI` | `/wsdr/osmo/media` | Media WebSocket endpoint stored in `OSMO_PARAMS`. |
| `OSMO_ABIS_OML_URI` | `/wsdr/osmo/abis_oml` | ABIS OML WebSocket endpoint stored in `OSMO_PARAMS`. |
| `OSMO_ABIS_RSL_URI` | `/wsdr/osmo/abis_rsl` | ABIS RSL WebSocket endpoint stored in `OSMO_PARAMS`. |

The WebSocket gateways are currently registered on the default `/wsdr/osmo/*` paths.

### Stats / Monitoring

| Variable | Default | Used for |
| --- | --- | --- |
| `STATS_ENABLED` | `true` | Enables periodic stats collection when at least one writer is configured. |
| `STATS_INTERVAL_MS` | `10000` | Stats polling interval in milliseconds. |
| `INFLUXDB_URL` | unset | Enables the InfluxDB writer. |
| `INFLUXDB_ORG` | unset | InfluxDB organization. |
| `INFLUXDB_TOKEN` | unset | InfluxDB token. |
| `INFLUXDB_BUCKET` | unset | InfluxDB bucket. |
| `PROMETHEUS_PUSH_URL` | unset | Enables the Prometheus Pushgateway writer. |

### Frontend

| Variable | Default | Used for |
| --- | --- | --- |
| `VITE_OSMO_PORT` / `OSMO_PORT` | current API base port | Overrides the port used when building Osmo WebSocket URLs in frontend packages. |

### Auth

The NestJS package reuses auth from `@websdr/nestjs-microservice`; set `JWT_SECRET` in real deployments. See the WebSDR NestJS package README for `JWT_ALGORITHM`, `JWT_EXPIRES_IN`, and cookie behavior controlled by `NODE_ENV`.

## Funding

This project is funded through [NGI0 Commons Fund](https://nlnet.nl/commonsfund), a fund established by [NLnet](https://nlnet.nl) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu) program. Learn more at the [NLnet project page](https://nlnet.nl/project/WSDR).

[<img src="https://nlnet.nl/logo/banner.png" alt="NLnet foundation logo" width="20%" />](https://nlnet.nl)
[<img src="https://nlnet.nl/image/logos/NGI0_tag.svg" alt="NGI Zero Logo" width="20%" />](https://nlnet.nl/commonsfund)

## License

OsmoWeb is [MIT licensed](https://github.com/wavelet-lab/osmoweb/blob/main/LICENSE)
