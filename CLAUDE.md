# CLAUDE.md — Acurast Processor Management Backend

This file provides a comprehensive reference for AI assistants working in this codebase.

---

## Project Overview

A NestJS backend that manages **Acurast processor check-ins** — mobile phones running the Acurast Core app act as TEE (Trusted Execution Environment) processors on the Acurast network. This service:

- Receives signed check-in heartbeats from processors (every ~30–60 seconds in practice)
- Stores battery level, charging status, network info, temperatures, and timestamps
- Provides REST API endpoints and an HTML web dashboard
- Queries the Acurast blockchain (via Polkadot.js) for manager→processor relationships

**Production URL:** `https://backend.monitor-acurast.com`
**Default port:** `9001` (mapped to `8002` in Docker Compose)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS v11 (TypeScript) |
| Database | PostgreSQL 16 (production), SQLite (local dev) |
| ORM | TypeORM v0.3 with migration-based schema management |
| Templating | Handlebars (HTML views) |
| API Docs | Swagger/OpenAPI (`@nestjs/swagger`) |
| Blockchain | `@polkadot/api` — WebSocket RPC to Acurast mainnet |
| Crypto | `elliptic` (P-256/secp256r1), `blakejs` (BLAKE2b), `bs58` (SS58 encoding) |
| Cache | `mnemonist` LRUCache (in-memory, no Redis) |
| Error tracking | Sentry (production only) |
| Containerization | Docker + Docker Compose |

---

## Directory Structure

```
.
├── src/
│   ├── main.ts                          # Entry point: bootstraps NestJS, sets up Swagger, CORS
│   ├── app.module.ts                    # Root module: wires TypeORM, ProcessorModule, WhitelistModule
│   ├── app.controller.ts                # Root controller: GET /, GET /health, GET /favicon.ico
│   ├── app.service.ts                   # Provides stats (total check-ins, active processors, etc.)
│   │
│   ├── acurast/
│   │   ├── init.ts                      # Polkadot.js API singleton (WebSocket to Acurast RPC)
│   │   ├── getManagerIdsForAddress.ts   # Queries on-chain `uniques.account` for manager NFT IDs
│   │   └── getProcessorsForManagerIds.ts # Queries on-chain for processor addresses by manager IDs
│   │
│   ├── db/
│   │   ├── typeorm.config.ts            # TypeORM config factory (SQLite for local, Postgres otherwise)
│   │   └── migrations/                  # TypeORM migrations (run via `npm run typeorm:run-migrations`)
│   │       ├── 1745324304186-initial-setup.ts
│   │       ├── 1754988992823-add-manager-entity.ts
│   │       ├── 1754999796969-use-acurast-manager-id.ts
│   │       └── 1755089362306-add-last-updated-to-manager.ts
│   │
│   ├── processor/
│   │   ├── processor.module.ts          # Module wiring for the processor feature
│   │   ├── processor.controller.ts      # All HTTP endpoints (REST + HTML web views)
│   │   ├── processor.service.ts         # Business logic: check-in handling, status queries, batch queue
│   │   ├── cache.service.ts             # LRU in-memory caches for Processor, DeviceStatus, etc.
│   │   ├── signature.service.ts         # Signature verification (Android P-256, iOS WebAuthn)
│   │   ├── manager.service.ts           # Manager↔Processor sync from Acurast blockchain
│   │   ├── constants.ts                 # EC curve instance, error codes, favicon base64
│   │   ├── enums.ts                     # NetworkTypeEnum, BatteryHealthState type
│   │   ├── types.ts                     # Core TypeScript interfaces (CheckInRequest, ProcessorStatus, etc.)
│   │   │
│   │   ├── dto/
│   │   │   └── device-status.dto.ts     # Swagger-annotated DTOs for API responses
│   │   │
│   │   ├── entities/                    # TypeORM entity definitions
│   │   │   ├── processor.entity.ts      # Processor (address + optional managerId)
│   │   │   ├── device-status.entity.ts  # DeviceStatus (timestamp, batteryLevel, isCharging)
│   │   │   ├── network-type.entity.ts   # NetworkType lookup table (wifi/cellular/usb/unknown)
│   │   │   ├── battery-health.entity.ts # BatteryHealth lookup table (good/bad/critical/etc.)
│   │   │   ├── ssid.entity.ts           # SSID lookup table (network name strings)
│   │   │   ├── temperature-reading.ts   # TemperatureReading (type: battery/cpu/gpu/ambient, value)
│   │   │   └── manager.entity.ts        # Manager (Acurast chain integer ID, SS58 address)
│   │   │
│   │   └── templates/                   # Handlebars HTML templates for web views
│   │       ├── device-list.html         # /processor/web/list
│   │       ├── device-status.html       # /processor/web/:address/status
│   │       ├── device-history.html      # /processor/web/:address/history
│   │       └── device-graph.html        # /processor/web/:address/graph
│   │
│   └── whitelist/
│       ├── whitelist.module.ts
│       └── whitelist.service.ts         # Reads PROCESSOR_WHITELIST env var; null = allow all
│
├── scripts/                             # Developer/testing utilities (TypeScript)
│   ├── check-in.ts                      # Simulates single-device check-ins (dev testing)
│   ├── batch.ts                         # Simulates batch check-ins for load testing
│   ├── sign.ts                          # Signs a check-in payload for dev purposes
│   ├── utils.ts                         # Sleep helper
│   ├── copy-templates.js                # Post-build: copies HTML templates into dist/
│   └── tsconfig.json                    # tsconfig for scripts compilation
│
├── test/
│   ├── app.e2e-spec.ts                  # E2E tests (supertest)
│   └── jest-e2e.json                    # Jest config for E2E tests
│
├── k8s/                                 # Kubernetes manifests
│   ├── common/
│   ├── development/
│   └── production/
│
├── .env.example                         # Environment variable template
├── .eslintrc.js / .eslintrc.json / eslint.config.mjs
├── .prettierrc
├── docker-compose.yml                   # App + migrations + PostgreSQL services
├── Dockerfile                           # Multi-stage build (node:20-alpine)
├── nest-cli.json
├── tsconfig.json / tsconfig.build.json
├── deploy.sh                            # Deployment helper script
├── README.md
├── SETUP-GUIDE.md                       # Detailed setup guide (French, includes network notes)
└── API-ENDPOINTS.md                     # Endpoint reference with curl examples
```

---

## Database Schema

All schema changes are managed via TypeORM migrations (never `synchronize: true` in production).

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `processor` | `id`, `address` (unique), `managerId` (FK, nullable) | One row per Acurast device |
| `device_status` | `id`, `processorId` (FK), `timestamp` (bigint), `batteryLevel`, `isCharging`, `networkTypeId`, `batteryHealthId`, `ssidId` | Unique on `(processorId, timestamp)` |
| `temperature_reading` | `id`, `deviceStatusId` (FK), `type` (battery/cpu/gpu/ambient), `value` | Multiple rows per DeviceStatus |
| `network_type` | `id`, `type` (unique) | Lookup: wifi/cellular/usb/unknown |
| `battery_health` | `id`, `state` (unique) | Lookup: good/bad/critical/etc. |
| `ssid` | `id`, `name` (unique) | Lookup table for WiFi SSID strings |
| `manager` | `id` (PK, from chain), `address` (SS58, unique), `lastUpdated` | Acurast manager accounts |

### Generating a New Migration

```bash
# Always generate against compiled dist, not source
npm run build
npx typeorm-ts-node-esm migration:generate -d ./dist/db/typeorm.config.js src/db/migrations/<descriptive-name>

# Then run migrations
npm run typeorm:run-migrations
```

---

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `9001` |
| `ENVIRONMENT` | `production`, `development`, or `local` | — |
| `DB_HOST` | PostgreSQL host | — |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL username | — |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | PostgreSQL database name | — |
| `DB` | SQLite file path (only when `ENVIRONMENT=local`) | — |
| `PROCESSOR_WHITELIST` | Comma-separated SS58 addresses to allow; empty = allow all | `""` |
| `REFRESH_INTERVAL_IN_SECONDS` | Interval returned to processors in check-in response | `60` |
| `RPC_URL` | Acurast WebSocket RPC URL | `wss://public-rpc.mainnet.acurast.com` |
| `SENTRY_DSN` | Sentry DSN (production only) | — |
| `COMMIT_HASH` | Git commit hash for Sentry release tagging | — |

**Database mode selection:**
- `ENVIRONMENT=local` → SQLite (requires `DB=<filepath>`)
- Any other value → PostgreSQL (requires `DB_HOST`, `DB_PORT`, etc.)

---

## API Endpoints

All endpoints are under the `/processor` controller prefix unless noted.

### App-level (root controller)

| Method | Path | Description |
|---|---|---|
| GET | `/` | HTML dashboard with check-in stats and cache info |
| GET | `/health` | Health check — returns `"I'm healthy"` |
| GET | `/favicon.ico` | Acurast logo favicon (base64-embedded, cached 24h) |
| GET | `/api` | Swagger/OpenAPI interactive documentation |

### Processor API (JSON)

| Method | Path | Description |
|---|---|---|
| POST | `/processor/check-in` | Submit a processor check-in (requires `X-Device-Signature` header) |
| GET | `/processor/api/status` | Get latest status for all processors |
| GET | `/processor/api/status/bulk` | Bulk status by `?addresses=addr1,addr2` |
| GET | `/processor/api/:address/status` | Latest status for one processor |
| GET | `/processor/api/:address/history` | History with `?limit=N` (default 100) |
| GET | `/processor/api/manager/:address/processors` | Processor addresses for a manager |

### Web Views (HTML)

| Method | Path | Description |
|---|---|---|
| GET | `/processor/web/list` | HTML list of all processors |
| GET | `/processor/web/:address/status` | HTML status page for one processor |
| GET | `/processor/web/:address/history` | HTML history with trend data |
| GET | `/processor/web/:address/graph` | Interactive metrics graph |

### Debug

| Method | Path | Description |
|---|---|---|
| GET | `/processor/debug/cache/status` | Cache size/capacity stats |
| GET | `/processor/debug/cache/contents` | Full cache dump (use carefully in production) |

---

## Check-In Flow

```
Processor (phone)
  │
  ├─ POST /processor/check-in
  │    Headers: X-Device-Signature: <hex ECDSA signature>
  │    Body: { deviceAddress, platform, timestamp, batteryLevel,
  │            isCharging, batteryHealth?, temperatures?, networkType, ssid? }
  │
  └─ ProcessorController.checkIn()
       ├─ WhitelistService.shouldHandleProcessor() → 403 if not allowed
       ├─ ProcessorService.handleCheckIn()
       │    ├─ SignatureService.verifySignature() → 401 if invalid
       │    │    ├─ platform=0 (Android): SHA-256 hash → P-256 recovery
       │    │    └─ platform=1 (iOS): WebAuthn/PassKey format → P-256 recovery
       │    │         Recovered public key → blake2b → SS58 → compare deviceAddress
       │    └─ Adds to in-memory batch queue (BATCH_SIZE=1000, BATCH_INTERVAL=50ms)
       │
       └─ Background timer every 50ms: processBatch()
            ├─ Groups by processor address
            ├─ Skips duplicates (cache + DB unique constraint fallback)
            └─ DB transaction: getOrCreate Processor, NetworkType, Ssid, BatteryHealth
                               → save DeviceStatus → save TemperatureReadings
                               → update LRU cache
```

---

## Caching Architecture

`CacheService` maintains five in-memory LRU caches (no external cache server):

| Cache | Key | Capacity |
|---|---|---|
| `processorCache` | processor address | 20,000 |
| `processorStatusCache` | processor address → latest DeviceStatus | 20,000 |
| `networkTypeCache` | network type string | 5,000 |
| `batteryHealthCache` | health state string | 5,000 |
| `ssidCache` | SSID name | 5,000 |

**Cache-aside pattern:** Read from cache first; on miss, query DB and populate cache.
**Write-through:** Every DB write updates the cache.
**Duplicate detection:** `hasNewerProcessorStatus()` checks if cache already has a newer or equal timestamp before writing to DB.

---

## Signature Verification

Platform is indicated by `platform` field in the check-in body:
- `0` = Android: message is JSON-stringified body → SHA-256 → P-256 ECDSA recovery
- `1` = iOS: WebAuthn/PassKey format — extracts `(r, s, v)`, `authenticatorData`, optional `clientDataContext` from the hex signature; constructs the final hash via SHA-256 double-hashing

In both cases, the recovered public key is compressed, then hashed via BLAKE2b-256, and the result is SS58-encoded (prefix 42) to produce the Substrate address, which must match `deviceAddress`.

**Curve:** P-256 (secp256r1) — via `elliptic` library.

---

## Manager Integration (Blockchain)

When `GET /processor/api/manager/:address/processors` is called:

1. Check if manager data in DB is fresh (< 24 hours old)
2. If stale or missing: call `getManagerIdsForAddress()` → queries `uniques.account` on-chain
3. Call `getProcessorsByManagerIds()` → queries processor list on-chain
4. Upsert `Manager` entity; upsert/link `Processor` entities with `managerId`
5. Return processor addresses

The Polkadot.js API (`src/acurast/init.ts`) is initialized as a module-level singleton on startup. It requires `RPC_URL` to be set.

---

## Development Workflow

### Local Setup (SQLite)

```bash
npm install

# Create .env with ENVIRONMENT=local, DB=./dev.sqlite, RPC_URL=wss://...
npm run start:dev        # Hot-reload dev server
```

### Local Setup (PostgreSQL via Docker)

```bash
cp .env.example .env     # Fill in DB_* and RPC_URL
docker compose up -d     # Starts db + runs migrations + starts app on :8002
```

### Available npm Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript + copy HTML templates to dist/ |
| `npm run start:dev` | Development server with hot reload |
| `npm run start:debug` | Debug mode with inspect breakpoints |
| `npm run start:prod` | Run compiled production build |
| `npm run test` | Unit tests (Jest, `src/**/*.spec.ts`) |
| `npm run test:e2e` | End-to-end tests (`test/jest-e2e.json`) |
| `npm run test:cov` | Unit tests with coverage report |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier formatting |
| `npm run typeorm:generate` | Generate a new migration (requires build first) |
| `npm run typeorm:run-migrations` | Apply pending migrations |
| `npm run check-in:single` | Simulate a single-device check-in stream (dev) |
| `npm run check-in:batch` | Simulate batch check-ins (load testing) |

### Build Note

The `build` script calls `scripts/copy-templates.js` after `nest build` to copy Handlebars HTML templates from `src/processor/templates/` into `dist/`. This is required because the NestJS build excludes non-TypeScript files by default. The controller looks for templates in both `__dirname/templates` and `dist/src/processor/templates`.

---

## Code Conventions

### NestJS Patterns
- Standard module/controller/service architecture
- Dependency injection via `@Injectable()` and constructor injection
- `@InjectRepository()` for TypeORM repositories
- Swagger decorators (`@ApiOperation`, `@ApiParam`, `@ApiResponse`, etc.) on all controller methods
- `Logger` from `@nestjs/common` for structured logging (prefer over `console.log` in services)

### TypeScript Style
- `strict` mode enabled in `tsconfig.json`
- ESLint with `@typescript-eslint/recommended` (several unsafe rules disabled — see `.eslintrc.js`)
- Prettier for formatting (`.prettierrc`)
- Interfaces in `types.ts` for domain types; entities in `entities/`; DTOs in `dto/`

### Error Handling
- Controllers use `HttpException` with explicit `HttpStatus` codes
- Services throw `NotFoundException` for missing resources
- Batch processing catches `QueryFailedError` with code `23505` for duplicate key violations and logs a warning instead of throwing

### Database Conventions
- Never use `synchronize: true` in production (migrations only)
- Use `bigint` for timestamp columns (Unix millisecond timestamps)
- Lookup tables (`NetworkType`, `BatteryHealth`, `Ssid`) follow a get-or-create pattern with LRU cache backing
- `DeviceStatus` has a unique constraint on `(processorId, timestamp)` to prevent duplicate check-ins

### Migrations
- Name files: `<timestamp>-<kebab-case-description>.ts`
- Always implement both `up()` and `down()` methods
- Generate via `npm run typeorm:generate` (builds first automatically)

---

## Docker Deployment

```bash
# Build and run everything
docker compose up -d

# Service startup order: db (healthcheck) → migrations → app
# App exposed on host port 8002 → container port 9001

# Useful commands
docker logs -f <container-name>
docker exec -it <db-container> psql -U postgres -d acurast_processor
docker compose restart app
```

**PostgreSQL** is configured with performance tuning in `docker-compose.yml`:
- `shared_buffers=1GB`, `effective_cache_size=3GB`
- `shm_size: 4gb`

---

## Testing

- **Unit tests:** `src/**/*.spec.ts` — run with `npm test`
- **E2E tests:** `test/app.e2e-spec.ts` — run with `npm run test:e2e`
- **Load simulation:** `npm run check-in:batch` (requires the server running on `localhost:3000`)

Unit test framework: Jest with `ts-jest` transformer. Test environment: Node.

---

## Key Files to Know

| File | Why It Matters |
|---|---|
| `src/processor/processor.service.ts` | Core business logic; batch queue, all DB queries |
| `src/processor/signature.service.ts` | Cryptographic check-in verification (Android + iOS) |
| `src/processor/cache.service.ts` | All caching logic — touch this when adding new entities |
| `src/db/typeorm.config.ts` | DB connection config — SQLite vs Postgres switching |
| `src/acurast/init.ts` | Polkadot.js singleton — must have `RPC_URL` set at startup |
| `src/whitelist/whitelist.service.ts` | Processor access control |
| `docker-compose.yml` | Full local stack definition |
| `scripts/copy-templates.js` | Required post-build step for HTML templates |
