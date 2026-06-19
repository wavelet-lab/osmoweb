# OsmoWeb API Reference

This document describes the API surface implemented by the OsmoWeb repository at
version `0.6.4`. It covers the NestJS HTTP and WebSocket interfaces, published
TypeScript packages, browser/WASM integration, native Osmocom transports, and
repository command-line utilities.

## Scope and ownership

| Surface                               | Implemented here                       | External or host-provided                                                                 |
| ------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| BTS REST API                          | Yes, in `@osmoweb/nestjs-microservice` | JWT validation and HTTP server setup come from NestJS and `@websdr/nestjs-microservice`   |
| Osmocom WebSocket bridge              | Yes                                    | The host application creates and listens on the HTTP server                               |
| TypeScript SDK and Vue components     | Yes                                    | Shared HTTP, WebSocket, WebUSB, logging, and UI primitives come from `@websdr/*` packages |
| VTY controllers                       | Yes                                    | They connect to native Osmocom daemons                                                    |
| OML, RSL, and Osmux payload protocols | Transported without reinterpretation   | Defined and consumed by Osmocom                                                           |
| Authentication endpoints              | No                                     | Imported from `@websdr/nestjs-microservice` through `AuthModule`                          |
| Monitoring receivers                  | No                                     | InfluxDB and Prometheus Pushgateway are external systems                                  |
| Standalone application/server         | No                                     | Consumers embed `OsmoModule` in a NestJS application                                      |

There are no SSE endpoints, GraphQL endpoints, Socket.IO message handlers, or
independent RPC server implementations in this repository.

## HTTP API

### Common behavior

The implemented controller base path is:

```text
/api/v1/osmo/bts
```

All three operations use `JwtAuthGuard` from
`@websdr/nestjs-microservice/auth`. The guard accepts a JWT from either:

```http
Cookie: jwt=<token>
```

or:

```http
Authorization: Bearer <token>
```

The JWT payload must contain a non-empty `sub` claim. That value identifies the
BTS owner. Tokens are signature- and expiry-checked by Passport and checked
against the dependency's in-memory revocation list.

The frontend helpers use `apiFetch()`, which always sets
`credentials: "include"`, so browser cookies are sent when permitted by the
deployment's origin and CORS configuration.

No endpoint defines path or query parameters. JSON bodies use
`Content-Type: application/json`.

Nest serializes thrown `HttpException` objects. In a standard Nest application,
an error generally resembles:

```json
{
  "statusCode": 404,
  "message": "No BTS assigned to user"
}
```

The exact envelope can be changed by host-level exception filters.

### BTS data shape

Successful `GET` and `PUT` operations return:

```ts
interface BtsConfig {
  id: number;
  band: GSMBand;
  ipa: string;
  arfcn: number;
  cell_identity: number;
  osmux_port: number;
}
```

Supported `band` values are:

| Value     | ARFCN range accepted by `PUT` |
| --------- | ----------------------------: |
| `GSM850`  |                       128-251 |
| `GSM900`  |                         0-124 |
| `EGSM900` |                      975-1023 |
| `DCS1800` |                       512-885 |
| `PCS1900` |                       512-810 |

### `GET /api/v1/osmo/bts`

Returns a BTS assignment for the authenticated user. Without a query parameter,
the operation returns the user's default assignment.

| Item             | Contract                                         |
| ---------------- | ------------------------------------------------ |
| Authentication   | Required JWT                                     |
| Headers          | `Cookie: jwt=...` or `Authorization: Bearer ...` |
| Path parameters  | None                                             |
| Query parameters | Optional `instanceId` string                     |
| Request body     | None                                             |
| Success          | `200 OK` with `BtsConfig`                        |

Example:

```http
GET /api/v1/osmo/bts HTTP/1.1
Host: api.example.test
Authorization: Bearer eyJ...
```

To select a named assignment:

```http
GET /api/v1/osmo/bts?instanceId=browser-tab-1 HTTP/1.1
```

```json
{
  "id": 0,
  "band": "GSM900",
  "ipa": "26431/0/0",
  "arfcn": 12,
  "cell_identity": 48352,
  "osmux_port": 6001
}
```

Errors:

| Status             | Message or cause                          |
| ------------------ | ----------------------------------------- |
| `400 Bad Request`  | JWT is valid but has no `sub` claim       |
| `401 Unauthorized` | Missing, invalid, expired, or revoked JWT |
| `404 Not Found`    | `No BTS assigned to user`                 |

Side effects:

- Removes assignments whose last activity exceeds the manager TTL, five
  minutes by default.
- Refreshes `lastSeen` for the returned assignment.

### `PUT /api/v1/osmo/bts`

Allocates or reuses a BTS assignment and applies its generated configuration to
OsmoBSC over VTY.

| Item             | Contract                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Authentication   | Required JWT                                                      |
| Headers          | `Content-Type: application/json` plus JWT cookie or bearer header |
| Path parameters  | None                                                              |
| Query parameters | None                                                              |
| Success          | `200 OK` with `BtsConfig`                                         |

Request body:

| Field        | Type                                        | Required by implementation            | Behavior                                                                                                                    |
| ------------ | ------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `instanceId` | `string`                                    | No                                    | Distinguishes multiple assignments owned by the same JWT subject; surrounding whitespace is ignored for assignment identity |
| `band`       | `GSMBand` string                            | Yes                                   | Must be one of the five values listed above                                                                                 |
| `arfcn`      | integer                                     | Yes, unless `trx[0].arfcn` is present | Top-level value takes precedence                                                                                            |
| `trx`        | array of `{ id: integer, arfcn?: integer }` | No                                    | Only `trx[0].arfcn` is read by this REST operation                                                                          |

Other JSON fields are rejected by the controller's validation pipe. BSC type,
unit id, location area, cell identity, description, and GPRS mode are generated
or fixed by the implementation.

Example:

```http
PUT /api/v1/osmo/bts HTTP/1.1
Host: api.example.test
Content-Type: application/json
Cookie: jwt=eyJ...

{
  "instanceId": "browser-tab-1",
  "band": "DCS1800",
  "arfcn": 871
}
```

```json
{
  "id": 1,
  "band": "DCS1800",
  "ipa": "51183/1/0",
  "arfcn": 871,
  "cell_identity": 36078,
  "osmux_port": 6001
}
```

Errors:

| Status                      | Message or cause                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`           | Missing JWT `sub`, missing `band`, missing ARFCN, unsupported GSM band, or ARFCN outside the selected band |
| `401 Unauthorized`          | Missing, invalid, expired, or revoked JWT                                                                  |
| `400 Bad Request`           | DTO validation failure                                                                                     |
| `503 Service Unavailable`   | BSC list synchronization failed                                                                            |
| `503 Service Unavailable`   | BSC update failed                                                                                          |
| `503 Service Unavailable`   | No BTS id or Osmux port remains in the configured manager pool                                             |
| `500 Internal Server Error` | Other allocation or processing failure                                                                     |

Side effects:

1. Expired assignments are released.
2. For a new assignment, the controller reads `show bts` and `show bts <id>`
   from OsmoBSC and synchronizes reusable BTS ids.
3. A BTS id, IPA unit id, cell identity, and Osmux port are allocated in memory.
4. A fixed OsmoBSC BTS/TRX/timeslot configuration is written over VTY.
5. The BSC configuration is not persisted with `write memory`.
6. If BSC configuration fails, a new assignment is released. An existing
   assignment restores its previous in-memory config and is marked disconnected.

The controller installs a `ValidationPipe` with transformation, whitelisting,
and rejection of non-whitelisted fields. The explicit `band` and ARFCN
compatibility checks run after DTO validation.

### `DELETE /api/v1/osmo/bts`

Releases the authenticated user's default assignment or the assignment selected
by `instanceId`.

| Item             | Contract                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Authentication   | Required JWT                                                      |
| Headers          | `Content-Type: application/json` plus JWT cookie or bearer header |
| Path parameters  | None                                                              |
| Query parameters | None                                                              |
| Request body     | Optional `{ "instanceId": string }`                               |
| Success          | `200 OK` with `{ "released": true }`                              |

Example:

```http
DELETE /api/v1/osmo/bts HTTP/1.1
Host: api.example.test
Content-Type: application/json
Authorization: Bearer eyJ...

{"instanceId":"browser-tab-1"}
```

```json
{ "released": true }
```

Errors:

| Status             | Message or cause                          |
| ------------------ | ----------------------------------------- |
| `400 Bad Request`  | JWT has no `sub` claim                    |
| `401 Unauthorized` | Missing, invalid, expired, or revoked JWT |
| `404 Not Found`    | No matching assignment exists             |

Side effects:

- Removes the assignment from process memory.
- Makes its BTS id and Osmux port available for reuse.
- Does not delete or disable the corresponding BTS in OsmoBSC.

## WebSocket API

### Common connection behavior

The NestJS gateways use the `ws` adapter and raw WebSocket frames. They do not
declare guards, cookies, tokens, required headers, query parameters, or
subprotocols. `Sec-WebSocket-Protocol` is not validated or used by the
controllers.

The gateway paths are fixed in decorators:

| Path                  | Frame types                    | Native destination              |
| --------------------- | ------------------------------ | ------------------------------- |
| `/wsdr/osmo/control`  | Text JSON                      | In-process BTS manager          |
| `/wsdr/osmo/abis_oml` | Binary                         | TCP `localhost:3002` by default |
| `/wsdr/osmo/abis_rsl` | Binary                         | TCP `localhost:3003` by default |
| `/wsdr/osmo/media`    | Initial text JSON, then binary | UDP `localhost:1984` by default |

The gateway paths are fixed. The host NestJS application selects the HTTP server
address and listening port.

### `/wsdr/osmo/control`

Client request:

```json
{ "event": "get-bts-list" }
```

Server response:

```json
{
  "event": "get-bts-list",
  "bts": [
    {
      "id": 0,
      "band": "GSM900",
      "ipa": "26431/0/0",
      "arfcn": 12,
      "cell_identity": 48352,
      "osmux_port": 6001
    }
  ]
}
```

The list contains assignments currently known to the process-local singleton
`BtsManager`.

The only implemented request event is `get-bts-list`. An object with another
`event` reaches the controller's default branch and receives:

```json
{ "error": { "description": "Unknown request [object Object]" } }
```

Malformed JSON is not converted into a protocol-level error response. Binary
frames are ignored. No external BSC or HLR connection is currently established
by this channel.

The protocol types and validators are published from
`@osmoweb/backend-core/osmorouter/protocol`. The separate `OsmoParser` and
`OsmoResponse` helpers support a four-byte request-id prefix followed by UTF-8
JSON, but the active control gateway does not use that framing; it exchanges
plain text JSON.

### `/wsdr/osmo/abis_oml`

This is a bidirectional byte bridge:

- Each client binary frame represented as a Node.js `Buffer` is written to the
  configured OsmoBSC OML TCP socket.
- Each TCP data chunk is sent as one binary WebSocket message.
- Text frames are ignored.
- Closing or failing either side disconnects the TCP client and ultimately
  closes the WebSocket.

Payload framing and meaning are native IPA/OML semantics; OsmoWeb does not
validate or transform the bytes.

### `/wsdr/osmo/abis_rsl`

This has the same behavior as the OML endpoint, but bridges to the configured
RSL TCP service. Payloads are native IPA/RSL bytes.

### `/wsdr/osmo/media`

The client must first select an allocated BTS using a text frame:

```json
{ "bts": 0 }
```

The server looks up that BTS id in the process-local manager and binds a UDP
socket to the assignment's `osmux_port`. It then connects the socket to the
configured media service.

After selection:

- Client binary messages are sent as UDP datagrams to the media service.
- Each received UDP datagram is sent as a binary WebSocket message.
- Activity refreshes the assignment's `lastSeen` timestamp.
- WebSocket close/error marks the assignment disconnected.

There is no success acknowledgement for BTS selection. Invalid JSON is logged
and ignored. If the id does not identify an assignment, the handler continues
waiting and does not establish the UDP bridge. Binary messages sent before a
valid selection do not establish a media destination.

## Authentication integration

Authentication implementation belongs to `@websdr/nestjs-microservice`, not
this repository. `OsmoModule` imports that package's `AuthModule`, and the BTS
controller consumes its `JwtAuthGuard`.

The dependency currently provides `/api/auth/login`, `/api/auth/guest`,
`/api/auth/logout`, `/api/auth/profile`, and `/api/auth/refresh`. These routes
are integration dependencies rather than OsmoWeb-owned contracts.

The dependency's cookie is named `jwt` and is set with:

| Attribute  | Value                                  |
| ---------- | -------------------------------------- |
| `HttpOnly` | `true`                                 |
| `Secure`   | `true` only when `NODE_ENV=production` |
| `SameSite` | `strict`                               |
| `Path`     | `/`                                    |
| `Max-Age`  | Derived from the JWT expiry            |

The guard also accepts bearer tokens. The JWT `sub` claim is the only identity
field consumed by the OsmoWeb REST controller.

## Configuration

### NestJS and transport variables

Invalid, missing, zero, or negative numeric values fall back to their defaults.
String values are trimmed.

| Variable                 | Default     | Implementation use                                  |
| ------------------------ | ----------- | --------------------------------------------------- |
| `OSMO_UDP_MEDIA_URI`     | `localhost` | UDP Osmux destination host                          |
| `OSMO_UDP_MEDIA_PORT`    | `1984`      | UDP Osmux destination port                          |
| `OSMO_TCP_ABIS_OML_URI`  | `localhost` | OML TCP destination host                            |
| `OSMO_TCP_ABIS_OML_PORT` | `3002`      | OML TCP destination port                            |
| `OSMO_TCP_ABIS_RSL_URI`  | `localhost` | RSL TCP destination host                            |
| `OSMO_TCP_ABIS_RSL_PORT` | `3003`      | RSL TCP destination port                            |
| `OSMO_TCP_HLR_URI`       | `localhost` | HLR address used by stats and stored control config |
| `OSMO_TCP_HLR_PORT`      | `4258`      | HLR port                                            |
| `OSMO_TCP_BSC_URI`       | `localhost` | BSC VTY address used by REST and stats              |
| `OSMO_TCP_BSC_PORT`      | `4242`      | BSC VTY port                                        |

The BSC REST controller constructs one `BscController` and reuses its VTY
client. Host applications should shut down their process normally to close
network resources.

### JWT variables

These are read by the external WebSDR auth module:

| Variable         | Default                                       |
| ---------------- | --------------------------------------------- |
| `JWT_SECRET`     | `just_a_demo_secret_key_you_should_change_me` |
| `JWT_ALGORITHM`  | `HS256`                                       |
| `JWT_EXPIRES_IN` | `1h`                                          |
| `NODE_ENV`       | Controls the JWT cookie's `Secure` attribute  |

### Frontend URL variables

| Variable                   | Behavior                                                                      |
| -------------------------- | ----------------------------------------------------------------------------- |
| `VITE_OSMO_PORT`           | Preferred override for the port used by `endpointToOsmoWsUrl()`               |
| `OSMO_PORT`                | Non-Vite fallback for the same override                                       |
| `VITE_API_URL` / `API_URL` | Read by external `@websdr/frontend-core` to form HTTP and WebSocket base URLs |
| `globalThis.__API_BASE__`  | Runtime API base override provided by the external frontend package           |

`endpointToOsmoWsUrl()` returns an existing `ws://` or `wss://` URL unchanged.
For a relative endpoint it delegates to `apiWsUrl()` and applies the optional
Osmo port override.

### Statistics variables

| Variable                                 | Default              | Behavior                                                       |
| ---------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `STATS_ENABLED`                          | `true`               | Enables collection only when at least one writer is registered |
| `STATS_INTERVAL_MS`                      | `10000`              | Poll interval; invalid and non-positive values use the default |
| `OSMO_TCP_BSC_URI` / `OSMO_TCP_BSC_PORT` | `localhost` / `4242` | BSC stats VTY endpoint                                         |
| `OSMO_TCP_HLR_URI` / `OSMO_TCP_HLR_PORT` | `localhost` / `4258` | HLR stats VTY endpoint                                         |
| `OSMO_TCP_MGW_URI` / `OSMO_TCP_MGW_PORT` | `localhost` / `4243` | MGW stats VTY endpoint                                         |
| `OSMO_TCP_MSC_URI` / `OSMO_TCP_MSC_PORT` | `localhost` / `4254` | MSC stats VTY endpoint                                         |
| `OSMO_TCP_STP_URI` / `OSMO_TCP_STP_PORT` | `localhost` / `4239` | STP stats VTY endpoint                                         |
| `INFLUXDB_URL`                           | Unset                | Registers the InfluxDB writer                                  |
| `INFLUXDB_ORG`                           | Unset                | Adds `org` to a generated v2 write URL                         |
| `INFLUXDB_BUCKET`                        | Unset                | Adds `bucket` to a generated v2 write URL                      |
| `INFLUXDB_TOKEN`                         | Unset                | Sends `Authorization: Token <value>`                           |
| `PROMETHEUS_PUSH_URL`                    | Unset                | Registers the Pushgateway writer                               |

### In-memory BTS manager defaults

| Setting                   |   Default |
| ------------------------- | --------: |
| BTS id range              |   0-65535 |
| Osmux port start          |      6001 |
| Osmux port count          |      1024 |
| Assignment inactivity TTL | 300000 ms |
| Default band              |  `GSM900` |
| Default ARFCN             |       `0` |

Assignments are process-local and are not persisted.

## Published TypeScript API

All packages are ESM and publish TypeScript declarations.

### `@osmoweb/core`

Entrypoints:

| Import                | Exports                                                       |
| --------------------- | ------------------------------------------------------------- |
| `@osmoweb/core`       | Everything from `radio` and `osmo`                            |
| `@osmoweb/core/radio` | Radio enums, types, conversions, detection, and range helpers |
| `@osmoweb/core/osmo`  | Osmo log conversion and TRX buffer constants                  |

Radio enums and types:

- `RadioTechnology`: `GSM`, `LTE`, `NR`
- `GSMBand`, `LTEBand`, `NRBand`
- `MobileBand`
- `ARFCNConfigInput`
- `ARFCNConfig`
- `FrequencyResult`

All frequency values are in kHz.

Functions:

| Function                                                             | Result                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `configureARFCN(input)`                                              | Resolves technology/band when possible and returns ARFCN plus uplink/downlink frequencies |
| `getSupportedBands(technology)`                                      | All package-supported bands for a technology                                              |
| `getBandArfcnRange(technology, band)`                                | `{ arfcnStart, arfcnEnd }` or `undefined` for an unknown band                             |
| `getBandFrequencyRange(technology, band)`                            | Uplink/downlink bounds or `undefined`                                                     |
| `gsmArfcnToFrequency(arfcn, band)`                                   | `{ uplink, downlink }`                                                                    |
| `gsmFrequencyToArfcn(frequency, band)`                               | GSM ARFCN                                                                                 |
| `detectGSMBandFromFrequency(frequency)`                              | Matching `GSMBand[]`; throws when none match                                              |
| `detectGSMBandFromArfcn(arfcn)`                                      | Matching `GSMBand[]`; throws when none match                                              |
| `getGSMBandArfcnRange(band)`                                         | GSM ARFCN bounds                                                                          |
| `getGSMBandFrequencyRange(band)`                                     | GSM frequency bounds                                                                      |
| `getAllGSMBands()`                                                   | All supported GSM bands                                                                   |
| `lteArfcnToFrequency`, `lteFrequencyToArfcn`                         | LTE conversions                                                                           |
| `detectLTEBandFromFrequency`, `detectLTEBandFromArfcn`               | Matching LTE bands; throw when none match                                                 |
| `getLTEBandArfcnRange`, `getLTEBandFrequencyRange`, `getAllLTEBands` | LTE metadata                                                                              |
| `nrArfcnToFrequency`, `nrFrequencyToArfcn`                           | NR conversions                                                                            |
| `detectNRBandFromFrequency`, `detectNRBandFromArfcn`                 | Matching NR bands; throw when none match                                                  |
| `getNRBandArfcnRange`, `getNRBandFrequencyRange`, `getAllNRBands`    | NR metadata                                                                               |
| `getJournalLogLevelFromOsmoLogLevel(level)`                          | Maps Osmocom levels 1/3/5/7/8 to WebSDR journal levels                                    |

`configureARFCN()` gives `arfcn` priority over `frequency`, defaults technology
to LTE when neither technology nor a detectable frequency is supplied, and
throws when neither ARFCN nor frequency is provided.

Constants:

| Constant                |                                    Value |
| ----------------------- | ---------------------------------------: |
| `OSMO_TRK_CHUNK_SIZE`   |                                   `2500` |
| `OSMO_TRX_PKT_SIZE`     |                                   `5000` |
| `OSMO_TRX_PKT_BYTESIZE` | `OSMO_TRX_PKT_SIZE * COMPLEX_INT16_SIZE` |
| `COMPLEX_INT16_SIZE`    |   Re-exported from `@websdr/core/common` |

### `@osmoweb/backend-core`

Entrypoints:

| Import                                      | Purpose                                                      |
| ------------------------------------------- | ------------------------------------------------------------ |
| `@osmoweb/backend-core`                     | Re-exports `osmo`, `osmoctrl`, `osmorouter`, and `osmostats` |
| `@osmoweb/backend-core/osmo`                | BTS assignment manager                                       |
| `@osmoweb/backend-core/osmoctrl`            | Osmocom VTY controllers and control-protocol types           |
| `@osmoweb/backend-core/osmorouter`          | WebSocket bridge router/controllers and configuration        |
| `@osmoweb/backend-core/osmorouter/protocol` | Control message types and validators                         |
| `@osmoweb/backend-core/osmostats`           | Stats collector and writers                                  |

#### BTS manager

Public functions:

- `getBtsManagerInstance(options?)`
- `createIpaFromUuid(uuid, btsId)`
- `createCellIdentityFromUuid(uuid, btsId)`
- `assignmentToBtsConfig(assignment)`

`BtsManager` methods:

| Method                                                  | Behavior                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `syncFromBsc(btsList)`                                  | Records known BSC ids and marks disconnected, unassigned ids reusable       |
| `allocate(uuid, ip, params?)`                           | Returns an existing assignment for the owner/instance key or allocates one  |
| `updateForUuid(uuid, ip, params)`                       | Requires band and ARFCN, then allocates or updates                          |
| `getByUuid(uuid, instanceId?)` / `getById(id)`          | Returns an assignment or `null`                                             |
| `releaseByUuid(...)` / `releaseById(id)`                | Releases resources and returns whether an assignment existed                |
| `markSeen`, `markSeenById`                              | Refresh activity; id form also marks connected                              |
| `markDisconnected`, `markDisconnectedById`              | Marks an assignment disconnected                                            |
| `cleanupExpiredAssignments(now?)`                       | Releases assignments older than the TTL                                     |
| `cleanupDisconnectedBscAssignments(btsList)`            | Releases locally disconnected assignments also reported disconnected by BSC |
| `toBtsConfig(assignment)`                               | Returns a shallow copy of public BTS config                                 |
| `isAssigned`, `countAssigned`, `countFree`, `dumpState` | State inspection                                                            |

Main types are `BtsManagerOptions`, `IpaUnitId`, `BtsAssignment`,
`BtsAllocateParams`, and `BtsUpdateParams`.

#### VTY controllers

Controllers connect to plain TCP Osmocom VTY/telnet ports. No VTY password or
TLS option is implemented.

Every controller inherits:

- `connect()`, `ensureConnected()`, `disconnect()`, `isConnected()`
- `getUptime(): Promise<number>`
- `getStats(): Promise<OsmoBaseStats>`
- `vty`, exposing the underlying `VtyClient` instance even though
  `VtyClient` is not exported from the package entrypoint

Controller-specific API:

| Class           | Constructor defaults               | Public operations                                                                                                          |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BscController` | `localhost`, `4242`, debug `false` | `getStats`, `getAllBts`, `getBts`, `addBts`, `updateBts`, `btsExists`                                                      |
| `HlrController` | `localhost`, `4258`, debug `false` | `getStats`, `getSubscribers`, `getSubscriber`, `addSubscriber`, `updateSubscriber`, `subscriberExists`, `deleteSubscriber` |
| `MgwController` | `localhost`, `4243`, debug `false` | `getStats`                                                                                                                 |
| `MscController` | `localhost`, `4254`, debug `false` | `getStats`                                                                                                                 |
| `StpController` | `localhost`, `4239`, debug `false` | `getStats`                                                                                                                 |

`BscController.updateBts(id, config, persist)` applies a fixed baseline BTS and
timeslot configuration plus caller-supplied fields. `persist=true` appends
`write memory`; the default is `false`. BTS deletion is not implemented.

`HlrController` subscriber writes issue native VTY commands. Supported 2G
algorithm names are `comp128v1`, `comp128v2`, `comp128v3`, and `xor-2g`;
recognized 3G names are `milenage`, `tuak`, and `xor-3g`, although the emitted
3G command currently uses `milenage`.

Exported data types include `BscBtsConfig`, `BscBtsTrxConfig`, `BscBtsInfo`,
all controller stats types, `HlrSubscriber`, `CtrlCommand`, `CtrlResponse`,
`CtrlTrapEvent`, `OsmoComponent`, and `OSMO_COMPONENTS`.

#### Router and protocol

`Router` provides:

- `register(token, controllerClass)`
- `init(osmoParams)`
- `resolve(token)`
- `to(uri, port)`, which resolves the final path segment; `port` is unused

Built-in tokens are `control`, `abis_rsl`, `abis_oml`, and `media`.
Unknown tokens resolve to `DefaultController`, which only logs the missing URL.

Exported router classes are `Router`, `AbisOmlController`,
`AbisRslController`, `ControlController`, and `MediaController`. Exported
configuration includes `OsmoServices`, `osmoServiceAddrMap`,
`osmoDefaultParams`, `OsmoParams`, and `BtsConfig`.

The protocol subpath exports `validateOsmoRequest()` and
`validateOsmoResponse()` plus the request/response types. Validators return the
input object when recognized and `undefined` otherwise.

#### Statistics

`StatsCollector.addController(id, controller)` registers a VTY controller.
`collect()` connects sequentially, gathers stats, disconnects, and returns one
`CollectedStat` per controller. Failures become:

```json
{
  "id": "osmo-bsc",
  "stats": { "status": "disconnected", "uptime": 0 },
  "timestamp": 1710000000000
}
```

`InfluxAdapter.write()` sends InfluxDB line protocol with measurement
`osmo_stats`. `PrometheusAdapter.write()` sends text exposition data, normally
to `/metrics/job/<service>`. Both writers log receiver failures instead of
throwing them to the caller.

Other exports are `forEachOsmoService`, `forEachCollectedStat`,
`CollectedStat`, `CollectedStats`, `StatsWriter`, `InfluxOptions`, and
`PrometheusOptions`.

### `@osmoweb/nestjs-microservice`

Actual published entrypoints:

| Import                              | Exports                     |
| ----------------------------------- | --------------------------- |
| `@osmoweb/nestjs-microservice`      | `OsmoModule`, `OSMO_PARAMS` |
| `@osmoweb/nestjs-microservice/osmo` | `OsmoModule`, `OSMO_PARAMS` |

`OsmoModule` registers the REST controller, four WebSocket gateways, router,
logging integration, auth integration, and stats module. It is an embeddable
Nest module and does not bootstrap or listen on a port.

Auth and users APIs are imported directly from
`@websdr/nestjs-microservice`.

### `@osmoweb/frontend-core`

Entrypoints:

| Import                            | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| `@osmoweb/frontend-core`          | Re-exports `osmo` and `services`                   |
| `@osmoweb/frontend-core/services` | BTS HTTP helpers                                   |
| `@osmoweb/frontend-core/osmo`     | Browser worker, WebSocket, WebUSB, and WASM bridge |

HTTP helpers:

```ts
getBts(instanceId?: string): Promise<BtsConfig>
updateBts(cfg?: BtsUpdateInput): Promise<BtsConfig>
releaseBts(instanceId?: string): Promise<{ released: boolean }>
```

They delegate URL, cookie, and non-2xx handling to the external
`@websdr/frontend-core/services` package.

Manager API:

| Export                               | Main contract                                    |
| ------------------------------------ | ------------------------------------------------ |
| `getOsmoTrxManagerInstance(params?)` | Returns the process-global manager instance      |
| `OsmoTrxManager`                     | Abstract manager contract                        |
| `OsmoTrxManagerWorker`               | Worker-backed implementation                     |
| `OsmoTrxWorker`                      | Worker-side WebUSB/WASM/WebSocket runtime        |
| `OsmoTrxWorkerInitialParams`         | Default WebSocket paths                          |
| `endpointToOsmoWsUrl(endpoint)`      | Converts a relative API endpoint to `ws:`/`wss:` |

`OsmoTrxManager` methods:

- `open_bts(bts, band, arfcn, ip_access_uid, osmux_port)`
- `open_usb(vendorId?, productId?)`
- `open_ws(urls)`
- `close()`
- `getBtsStats(group)`
- `setParameter(param, value)`
- `startWorker(params)`, `stopWorker()`
- `start(params)`, `stop()`

`OsmoTrxManagerWorker` additionally exposes `close_usb()` and `close_ws()`.
Callback properties are `onWriteLog`, `onLog`, and `onChangeParameter`.

`BtsStatsGroup` accepts `stats`, `rate-counters`, `bts`, `trx`,
`transceiver`, or `websdr`.

`OsmoTrxWorker` public members include:

- `fd`, `urls`
- `openWs`, `openBasicWS`, `closeWs`
- `openUsbByVidPid`, `openUsb`, `closeUsb`
- `openBts`, `close`, `start`, `stop`, `destroy`
- `sendOmlBuffer`, `sendRslBuffer`
- WebUSB/WASM/WebSocket callback methods such as `onReceiveData`,
  `onMediaData`, `onAbisData`, and the `onWS*` handlers
- `setParameter("urls" | "bts", value)`; other parameter names return `false`

The worker's `openBasicWS()` opens OML, RSL, and media channels. It does not open
the control channel.

#### WASM bridge

Exports include:

- `initOsmo(overrides?)`
- `Osmo`
- `OsmoBands`, `OsmoBandsKeys`, `IPAccessProto`
- Native callbacks `on_start`, `on_stop`, `on_set_rx_frequency`,
  `on_set_tx_frequency`, `on_write_samples`, `ws_osmux_deliver_cb`,
  `ws_ipa_send`, `write_log`, `on_log`, `start_timer_interval`, and
  `ws_rsl_connect_cb`

`Osmo` methods include `init`, `applyBtsConfig`, `deinit`,
`sendSchedulerTimer`, `startSchedulerTimer`, `stopSchedulerTimer`,
`sendRxShortData`, `getTxShortVector`, `sendMediaData`, `sendAbisData`,
`getBtsStats`, and `debug`.

The bundled declaration also defines `OsmoTrxModule`, the Emscripten module
contract for native functions:

- `_osmobts_init`
- `_osmobts_apply`
- `_osmobts_push_rx_short_vector`
- `_osmobts_get_tx_short_vector`
- `_osmobts_get_stats`
- `_ws_osmux_push_raw_data`
- `_ws_ipa_push_raw_data`
- `_on_sched_timer`

The generated module itself is bundled for internal use but is not a package
subpath export.

### `@osmoweb/vue3-components`

Entrypoints:

| Import                                | Exports                           |
| ------------------------------------- | --------------------------------- |
| `@osmoweb/vue3-components`            | Components and their public types |
| `@osmoweb/vue3-components/components` | Same component exports            |
| `@osmoweb/vue3-components/styles/*`   | Compiled CSS assets               |

#### `BtsConfig`

Props:

| Prop                    | Type                | Default                 |
| ----------------------- | ------------------- | ----------------------- |
| `bts`                   | `BtsParams`         | `undefined`             |
| `supportedTechnologies` | `RadioTechnology[]` | `[RadioTechnology.GSM]` |
| `searchable`            | `boolean`           | `false`                 |

Events:

- `submit(config: BtsParams)`
- `cancel()`

`BtsParams` contains optional `technology`, `band`, `arfcn`,
`uplinkFrequency`, and `downlinkFrequency`. Frequencies are kHz.

#### `BtsInput`

Props:

| Prop                    | Type                                                        | Default                       |
| ----------------------- | ----------------------------------------------------------- | ----------------------------- |
| `bts`                   | `BtsParams`                                                 | `undefined`                   |
| `supportedTechnologies` | `RadioTechnology[]`                                         | Passed through to `BtsConfig` |
| `placeholder`           | `string`                                                    | `Click to configure BTS`      |
| `size`                  | external `SizeType`                                         | `medium`                      |
| `btsState`              | `not-configured \| configured \| connected \| disconnected` | `undefined`                   |
| `disabled`              | `boolean`                                                   | `false`                       |
| `searchable`            | `boolean`                                                   | `false`                       |

Events:

- `update(config: BtsParams)`
- `cancel()`

## Native and hardware protocols

### Osmocom VTY

The backend VTY client uses a TCP socket with minimal telnet negotiation. It
sends CRLF-terminated commands, detects `Osmo...>` or `Osmo...#` prompts, and
serializes queued commands. Default connect timeout is 5000 ms and most command
timeouts are 5000 ms.

This is an integrating API: command syntax and output formats belong to the
corresponding Osmocom daemon. OsmoWeb implements parsers and command sequences
for the controller methods listed above.

### IPA OML and RSL

The WebSocket bridge forwards native binary IPA/OML and IPA/RSL streams over
TCP. The browser WASM bridge uses stream selector `1` for OML and `2` for RSL.

### Osmux media

Media WebSocket binary messages map one-to-one to UDP datagrams after BTS
selection. The server binds the UDP socket to the allocated `osmux_port` and
connects it to the configured media endpoint.

### WebUSB SDR

The browser runtime uses `WebUsbSourceSink` and device management from the
external `@websdr/frontend-core/webusb` package. OsmoWeb configures complex
signed 16-bit IQ data, sample rate `1,083,333`, packet size `5000` complex
samples, and default RX/TX radio parameters. Device discovery, USB control
commands, and the underlying firmware protocol are external contracts.

Browser WebUSB access requires the browser's WebUSB conditions, including a
secure context and user-mediated device selection where applicable.

## Command-line interfaces

No package defines a `bin` entry or installs a product CLI.

Repository scripts provide development and operations commands:

| Command                                      | Purpose                                                      |
| -------------------------------------------- | ------------------------------------------------------------ |
| `npm run build`                              | Builds all workspaces                                        |
| `npm run test`                               | Runs workspace tests                                         |
| `npm run test:all`                           | Runs the root Vitest configuration                           |
| `npm run test:watch`                         | Runs Vitest in watch mode                                    |
| `npm run test:coverage`                      | Runs coverage                                                |
| `npm run docs:diagrams`                      | Renders Mermaid files under `docs/`                          |
| `npm run docs:diagrams:ubuntu`               | Renders through the configured AppArmor profile              |
| `node scripts/render-mermaid.js [docs-root]` | Direct diagram-renderer invocation; default root is `docs`   |
| `cd test-apps && npm run test:bsc`           | Manual BSC VTY integration script; changes BSC configuration |
| `cd test-apps && npm run test:hlr`           | Manual HLR CRUD script; changes subscriber data              |
| `cd test-apps && npm run test:msc`           | Reads MSC stats                                              |
| `cd test-apps && npm run test:mgw`           | Reads MGW stats                                              |
| `cd docker && ./start_stats.sh`              | Starts monitoring containers                                 |
| `cd docker && ./stop_stats.sh`               | Stops monitoring containers                                  |

The manual test applications use hard-coded localhost VTY destinations and do
not accept command-line flags.

## External outbound APIs

These calls originate in OsmoWeb but target systems not implemented here:

| Destination            | Request                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| InfluxDB 2.x           | `POST` line protocol to the configured write URL, or generated `/api/v2/write?...&precision=ns`  |
| Prometheus Pushgateway | `POST` text exposition format to a configured metrics URL, or generated `/metrics/job/<service>` |
| OsmoBSC OML            | Raw TCP to configured host/port                                                                  |
| OsmoBSC RSL            | Raw TCP to configured host/port                                                                  |
| Osmux media service    | Raw UDP to configured host/port                                                                  |
| Osmocom VTY services   | Telnet-like TCP commands to BSC, HLR, MGW, MSC, and STP                                          |

Receiver-specific response bodies are not exposed as OsmoWeb API contracts.
InfluxDB non-2xx responses and network failures are logged. Pushgateway fetch
rejections are logged; HTTP status codes are not otherwise interpreted.
