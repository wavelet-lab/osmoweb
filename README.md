# OsmoWeb
[OsmoWeb](https://github.com/wavelet-lab/osmoweb) is an open-source TypeScript library that brings Osmocom's mobile communication capabilities to the web.

⚠️ This project is under active development. Not all features are implemented yet and some functionality may not work.

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

- [packages/core](packages/core) — Core shared library with domain types, utilities, and constants used across all packages.
- [packages/backend-core](packages/backend-core) — Backend building blocks: router and controllers to talk to Osmocom daemons; also exposes common types/config like Osmo services and defaults (see [packages/backend-core/src/osmo/index.ts](packages/backend-core/src/osmo/index.ts)).
- [packages/nestjs-microservice](packages/nestjs-microservice) — NestJS integration that wraps backend-core into DI-ready providers and WebSocket gateways; main entry is [`OsmoModule`](packages/nestjs-microservice/src/osmo.module.ts) configurable via OSMO_* env vars.
- [packages/frontend-core](packages/frontend-core) — Front-end core utilities and adapters for client apps.
- [packages/vue3-components](packages/vue3-components) — Vue 3 components library (e.g., [LogArea](packages/vue3-components/src/components/LogArea.vue), [LogAreaItem](packages/vue3-components/src/components/LogAreaItem.vue)); built with Vite and ships types/styles.
- [test-apps](test-apps) — Sample scripts for manual testing (e.g., [bsc-test.ts](test-apps/bsc-test.ts), [msc-test.ts](test-apps/msc-test.ts), [hlr-test.ts](test-apps/hlr-test.ts), [mgw-test.ts](test-apps/mgw-test.ts)).

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

## Environments


## License

OsmoWeb is [MIT licensed](https://github.com/wavelet-lab/osmoweb/blob/main/LICENSE)
