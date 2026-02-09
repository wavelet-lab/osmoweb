# Architecture Documentation

This directory contains the **production architecture documentation** for the OsmoWeb platform.

The goal of these documents is to explain **how the system is structured at runtime**, how browser‑based GSM components interact with native [Osmocom](https://osmocom.org/) services, and where protocol and responsibility boundaries are defined.

The documentation intentionally focuses on **production deployment only**. Development, testing, and operational tooling are described elsewhere and are not part of the runtime architecture overview.

---

## Entry Point

Start with:

* [**`overview.md`**](overview.md) — High‑level architecture description

  * System goals and design rationale
  * Server‑side and client‑side components
  * [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) ⇄ TCP/UDP bridging model
  * Communication flows and protocol boundaries

This document is intended to be read top‑to‑bottom and provides the conceptual model for the entire platform.

---

## Diagrams

All diagrams are stored in the `diagrams/` subdirectory:

* **Deployment / Component View** — physical and logical component layout
* **Logical Data Path** — simplified runtime path overview
* **Runtime Data Flow** — message flow during normal operation
* **Interfaces & Protocols** — transport and API boundaries
* **Legend / Notation** — diagram conventions and protocol labels
* **Voice transport comparison** — [RTP](https://datatracker.ietf.org/doc/html/rfc3550) vs [Osmux](https://osmocom.org/projects/osmux/wiki)
* **Voice over Osmux** — chosen approach in OsmoWeb
* **Classic Osmocom topology** — reference hierarchical model (MSC → BSC → BTS)
* **Current OsmoWeb topology** — single backend BSC with multiple browser-based BTS instances
* **Target topology (multi-BSC)** — region-aware, scalable topology with multiple BSC instances

Diagram sources are written in **[Mermaid](https://mermaid.js.org/) (`.mmd`)** and rendered to **SVG** for stable display in GitHub and other Markdown renderers.

```
diagrams/
  deployment.mmd               → deployment.svg
  logical-data-path.mmd        → logical-data-path.svg
  dataflow.mmd                 → dataflow.svg
  interfaces.mmd               → interfaces.svg
  legend.mmd                   → legend.svg
  voice-compare.mmd            → voice-compare.svg
  voice-osmux.mmd              → voice-osmux.svg
  osmocom-topology-classic.mmd → osmocom-topology-classic.svg
  osmocom-topology-current.mmd → osmocom-topology-current.svg
  osmocom-topology-target.mmd  → osmocom-topology-target.svg
```

SVG files are the authoritative rendered artifacts; Mermaid files are the editable sources.

---

## Scope and Non‑Goals

**In scope:**

* Production runtime architecture
* Browser‑based BTS/TRX execution using [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
* Integration with native [Osmocom](https://osmocom.org/) services
* Transport adaptation via WebSocket ⇄ TCP/UDP bridging

**Out of scope:**

* Development and testing utilities
* CI/CD and build pipelines
* Operational scripts and service lifecycle tooling
* Experimental or historical implementations

---

## Intended Audience

These documents are intended for:

* Developers working on OsmoWeb frontend or backend components
* Engineers integrating Osmocom services with web environments
* Reviewers evaluating architectural decisions
* Contributors onboarding to the project

A basic familiarity with Osmocom components and GSM architecture is assumed.

---

## Maintenance Guidelines

* Update diagrams when component boundaries or communication paths change
* Keep `overview.md` aligned with production code only
* Avoid introducing testing‑only or experimental details into this directory

This helps ensure the architecture documentation remains accurate, readable, and stable over time.
