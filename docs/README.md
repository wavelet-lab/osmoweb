# Documentation

This directory contains the **project documentation** for the OsmoWeb platform.

Documentation is organized by topic (architecture, operations, development, etc.) and is intended to evolve as the platform grows.

---

## Related Repositories

- **[websdr](https://github.com/wavelet-lab/websdr)** — shared web platform providing [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API) access, user management, authentication, utilities, and reusable UI components.

- **[osmoweb](https://github.com/wavelet-lab/osmoweb)** — [Osmocom](https://osmocom.org/)-specific platform implementing browser-based BTS/TRX execution, runtime transport ([WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) ⇄ TCP/UDP), and Osmocom control/statistics.

---

## Architecture Documentation

The [`architecture/`](architecture/README.md) subdirectory contains the **production architecture documentation** for the OsmoWeb platform.

Its goal is to explain **how the system is structured at runtime**, how browser‑based GSM components interact with native [Osmocom](https://osmocom.org/) services, and where protocol and responsibility boundaries are defined.

The architecture documentation intentionally focuses on **production deployment only**. Development, testing, and operational tooling are described elsewhere and are not part of the runtime architecture overview.

---

## Entry Points

* [**`architecture/overview.md`**](architecture/overview.md) — High‑level production architecture description
* **`architecture/diagrams/`** — diagrams, data flows, and interface definitions

---

## Related documentation in this repo

These docs focus on production runtime architecture. For package-level API docs and operational tooling, see:

- Repository entry point: [README.md](../README.md)
- Package docs:
	- [packages/core/README.md](../packages/core/README.md)
	- [packages/backend-core/README.md](../packages/backend-core/README.md)
	- [packages/frontend-core/README.md](../packages/frontend-core/README.md)
	- [packages/vue3-components/README.md](../packages/vue3-components/README.md)
	- [packages/nestjs-microservice/README.md](../packages/nestjs-microservice/README.md)
- Monitoring stack (Prometheus/InfluxDB/Grafana): [docker/README.md](../docker/README.md)
- Manual test apps (VTY controller scripts): [test-apps/README.md](../test-apps/README.md)

---

## Diagram Rendering (Mermaid)

Architecture diagrams are written in **[Mermaid](https://mermaid.js.org/) (`.mmd`)** and rendered to **SVG** for stable display in GitHub.

SVG files are the authoritative rendered artifacts; Mermaid files are the editable sources.

### Regenerate all diagrams under `docs/`:

This command renders all `.mmd` files under the `docs/` directory into adjacent `.svg` files.

- `npm run docs:diagrams`

### Ubuntu 23.10+ (Chromium sandbox):

On Ubuntu 23.10+, `mmdc` may fail with a Chromium sandbox error. If that happens, run it under the `chrome` AppArmor profile:

- `npm run docs:diagrams:ubuntu`

---

## Scope

**In scope:**

* Production runtime architecture
* Browser‑based BTS/TRX execution using [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
* Integration with native [Osmocom](https://osmocom.org/) services

**Out of scope:**

* Development and testing utilities
* CI/CD pipelines
* Operational scripts and service lifecycle tooling

---

## Audience

This documentation is intended for:

* Developers working on OsmoWeb frontend or backend components
* Engineers integrating Osmocom services with web environments
* Reviewers evaluating architectural decisions
* Contributors onboarding to the project

A basic familiarity with Osmocom components and GSM architecture is assumed.
