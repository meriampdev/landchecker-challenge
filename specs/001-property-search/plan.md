# Implementation Plan: Property Search and Personal Watchlists

**Branch**: `001-property-search` (feature identifier reported by setup; no Git branch created)
| **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-property-search/spec.md` and user architecture
requirements. This is design only: generators, application files, migrations, Dockerfiles,
lockfiles, and tests are planned outputs of implementation, not created in this phase.

## Summary

Deliver a public, backend-filtered property browser with 12-item pagination and session-protected
personal watchlists. Rails owns validation, authorization, search, persistence, and committed
price/status broadcasts. React uses authentication Context, TanStack Query, feature-local CSS
modules, and one authenticated ActionCable subscription. Three Compose services provide a
repeatable local demo, including a separate-process property-update task.

## Technical Context

**Language/Version**: Ruby 3.4.13; Node 22.21.1; TypeScript 5.9 line. Exact dependency versions
resolved once and committed in Gemfile.lock and package-lock.json during implementation.

**Primary Dependencies**: Rails 8.1.4.1 API; bcrypt; pg; Puma; React 19; Vite 7; CSS modules;
TanStack Query 5; @rails/actioncable aligned with Rails 8.1.4.1; no router or global state library
needed for two simple views. Exact generator/runtime versions are pinned; no `latest` tags.

**Storage**: PostgreSQL 17.7 with named volume; integer bigint cents; PostgreSQL ActionCable
adapter uses the same database. No Redis, Solid Cable, or in-memory async adapter for the demo.

**Testing**: RSpec Rails request/model/query/channel specs; Jest 30, babel-jest with TypeScript
and React presets, jsdom, React Testing Library and user-event. Babel strips types; `tsc`
checks them separately. CSS module imports mapped in Jest. Tests are non-watch by default.

**Target Platform**: Docker Compose v2 on Apple Silicon and Intel/AMD; multiarch Debian images
`ruby:3.4.13-slim-bookworm`, `node:22.21.1-bookworm-slim`, `postgres:17.7-bookworm`. Verify tag
availability in implementation; document any compatibility-driven pin adjustment. No platform
override. Browser target: modern Chrome, Safari, Firefox; local HTTP on localhost:5173.

**Project Type**: Two independently configured applications in one repository.

**Performance Goals**: Watched changes visible within 3 seconds on healthy local connections;
12-item server responses; bounded query counts independent of card count. No load benchmark.

**Constraints**: Approximately 3–4 hours, host prerequisites Docker and Git only, no external
listing/image APIs, no bonus work until required flows and checks pass. Pins are reproducible
baselines, not claims of latest security releases; evaluate maintained patches when building.

**Scale/Scope**: 48+ seeded properties, two users, list/filter/login/watchlist/live-update views.

## Constitution Check

*GATE: evaluated before research and re-evaluated after design.*

| Principle / delivery gate | Pre-design | Post-design evidence |
|---|---|---|
| Independent application boundaries | PASS | Each app owns dependencies, config, Dockerfile, tests; root coordinates Compose/docs |
| Frontend feature locality | PASS | auth/properties/watchlist; colocated components; shared only for demonstrated reuse |
| Rails conventions | PASS | Standard app/controllers/models/channels; Properties::Search query; mirrored spec/ |
| Integrity and states | PASS | DB constraints, owner-scoped API/cable, explicit CSRF, bounded queries; all UI states |
| Proportionate quality and truthful checks | PASS | Critical-flow matrix, no speculative services, time budget, no unexecuted pass claims |
| Reproducible delivery | PASS | Docker reviewer startup/final integration; session-supported generation/checks, repeatable non-destructive seeds, exact demo command |

No constitutional exceptions or unresolved clarification gates. Pin/tag resolution and actual
build/test execution are implementation validations, not claimed as completed here.

## Project Structure

### Documentation (this feature)

```text
specs/001-property-search/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── http-api.md
│   └── realtime.md
├── quickstart.md
└── checklists/requirements.md
```

`tasks.md` is deferred to `$speckit-tasks`.

### Source Code (repository root)

Planned layout; these application paths do not exist yet:

```text
compose.yaml
.gitignore
README.md
backend/
├── Dockerfile, .dockerignore, Gemfile, Gemfile.lock
├── bin/server                 # readiness, prepare, seed, exec Rails; server-only
├── app/
│   ├── controllers/api/v1/     # csrf, sessions, me, properties, watchlist
│   ├── models/                # User, Property, WatchlistEntry
│   ├── queries/properties/search.rb
│   └── channels/              # ApplicationCable::Connection, WatchlistChannel
├── config/                    # database, cable, routes, explicit session/CSRF/origin config
├── db/                        # migrations, schema, seeds
├── lib/tasks/demo.rake
└── spec/                      # requests/api/v1, models, queries/properties, channels
frontend/
├── Dockerfile, .dockerignore, package.json, package-lock.json
├── vite.config.ts, tsconfig*.json, jest.config.cjs, babel.config.cjs
├── public/images/             # optional local images; CSS placeholder needs no download
└── src/
    ├── app/                   # App, provider composition and cross-feature integration
    ├── features/
    │   ├── auth/              # AuthProvider, LoginForm/, API, hooks, types
    │   ├── properties/        # PropertyCard/, PropertyFilters/, PropertyList/, Pagination/
    │   │                      # API, query keys, types, search hooks
    │   └── watchlist/         # WatchlistPage/, SaveButton/, subscription, API, hooks, types
    ├── shared/                # HTTP/error helper and truly shared primitives only
    └── test/                  # shared test setup/provider wrapper
```

**Structure Decision**: Substantial components own .tsx, .module.css, .test.tsx and private
helpers. Each feature exports only integration needs. Properties owns the reusable property
representation; watchlist imports that public representation, never internal property hooks.
The app composes PropertyCard with a watchlist-provided SaveButton slot, avoiding a circular
properties→watchlist→properties dependency. Auth exposes identity through Context, not imports
of private state. App integration connects live events to property and watchlist cache helpers.
No service layer, repository layer, shared DTO package, or generated client is necessary.

## Implementation Design

### Bootstrap and container lifecycle

1. Docker daemon access is a pending final-integration prerequisite, not a generation gate.
   Use compatible existing host runtimes, pinned generators, or author conventional application
   files directly when the pinned runtime is unavailable. Never install host runtimes or
   silently downgrade Rails. Record unresolved dependency/platform verification separately.
   When Docker is available, Mount the repository and run pinned Rails `new backend --api
   --database=postgresql --skip-git --skip-test --skip-solid` and a pinned create-vite 7 React-TS
   generator into `frontend/`. Verify flags against Rails 8.1 CLI in that container. Remove
   irrelevant generated CI/devcontainer/deployment scaffolding, not required Rails conventions.
2. Resolve real lockfiles with available compatible tools, or inside matching images later;
   never fabricate dependency resolutions. Pending lockfiles block Docker build verification,
   not independent application implementation. Add `aarch64-linux` and `x86_64-linux` Bundler
   platforms and verify native pg/bcrypt installation. Commit both lockfiles; use `bundle install`
   and `npm ci` at build time. No nested .git or host runtime installation.
3. Backend image installs compilation/libpq prerequisites for gems. Frontend image installs
   devDependencies needed by Vite, Jest, and tsc. Build contexts are per application. Each
   .dockerignore excludes local dependencies, build products, logs, credentials, and Git metadata.
4. Compose db uses postgres:17.7-bookworm, pgdata at `/var/lib/postgresql/data`, pg_isready
   healthcheck, safe demo credentials, and no host DB port requirement. backend depends on
   service_healthy; DATABASE_URL names `db`, not localhost. Development/test DBs are distinct.
5. backend command is bin/server: bounded real DB connection retry, `bin/rails db:prepare`,
   explicit repeatable `db:seed`, then `exec bin/rails server -b 0.0.0.0 -p 3000`. No prepare/seed
   in ENTRYPOINT; generic commands, tests and demo tasks must not rerun server initialization.
   Rails' possible prepare-time seed and the explicit seed are safe because seeds are idempotent.
6. frontend runs Vite on 0.0.0.0:5173 with strictPort. Publish frontend on 127.0.0.1:5173 and
   backend on 127.0.0.1:3000 for local inspection. Vite proxies `/api` to http://backend:3000
   and `/cable` to that target with `ws: true`. Preserve browser Host/Origin (`changeOrigin:
   false`) so Rails origin checking compares the browser's actual origin. Allow only needed
   Rails hosts; do not allow all hosts or rewrite Origin to hide mismatches.
7. Browser fetch uses relative `/api/v1` paths and same-origin credentials. Cable URL derives
   ws/wss from window.location.protocol and window.location.host plus `/cable`; never use the
   Docker hostname in browser code. Origin allowlist defaults to http://localhost:5173 and
   http://127.0.0.1:5173, configurable for explicit alternatives; no wildcard or disabled checks.
8. Provide stable development-only SECRET_KEY_BASE, DB defaults, and demo credentials without
   requiring .env. Clearly label them unsafe for deployed environments. Runtime code is baked
   into images for predictable fresh checkout startup; rebuild after source changes. Do not
   bind-mount host node_modules or overwrite container-installed dependencies.

### Authentication and CSRF

Use bcrypt `has_secure_password`, normalized lowercase email, and Rails encrypted cookie
sessions. Explicitly register ActionDispatch::Cookies before the configured CookieStore in API
mode; use a named HttpOnly, SameSite=Lax cookie, finite expiry (12 hours), Secure in production.
Use an ApplicationController based on ActionController::API with the cookies and request
forgery protection modules, `protect_from_forgery with: :exception`, and origin checking enabled.
Test this exact module/middleware combination rather than assuming API defaults protect it.

GET csrf establishes the anonymous session and returns a masked token with Cache-Control:
no-store. Fetch it before login, send X-CSRF-Token on every mutation including login/logout,
and use JSON bodies. Successful login resets the session before setting user_id and expiry;
return a fresh token after rotation. Logout disconnects the user's cable connections through
remote_connections, resets session, and returns a fresh anonymous token. Map invalid CSRF to
403 JSON. Do not silently retry a mutation after a CSRF error: renew token and offer user retry.
All identity endpoints are no-store. Filtered property data is public; saved state is derived
from the authenticated watchlist cache, not embedded in public property responses.

Cable connection decrypts the configured CookieStore cookie with Rails cookies.encrypted,
derives current_user solely from that verified session data, checks session expiry,
and rejects anonymous connections. Identify current_user for server-side disconnection; schedule
connection close at cookie/session expiry so a long-lived socket cannot outlive authentication.
Logout disconnection intentionally closes all cable connections for that user; HTTP cookie
sessions in other browsers are not globally revoked. Client generation guards, query cancellation,
and removal prevent old in-flight HTTP/events from repopulating another identity's UI. Server
logout works even if the browser has not yet disconnected. Stateless CookieStore replay
revocation is a production limitation, not a claim of globally revocable sessions.

### Search, watchlists, and live updates

Properties::Search validates scalars before using bound SQL predicates; converts whole AUD
filter inputs to bigint cents exactly, applies inclusive ranges/type/min bedrooms, counts,
orders id ASC, offsets and limits to a fixed 12. No arbitrary per_page parameter or client-side
filtering. Watchlist reads use includes(:property); saves operate only on current_user entries,
are idempotent under the unique index, and recover a unique violation by loading the existing
entry. Deletes only target that user's property relation. Reject owner override fields.

Property after_update_commit broadcasts only when price_cents/status changed. Determine current
watcher IDs with one indexed query, then send a small event to each WatchlistChannel stream for
that user, using PostgreSQL adapter and a common channel_prefix in web and task processes.
One user stream avoids dynamic per-property subscriptions; watch removals affect future recipient
lookups automatically. Events already in flight can race removal; ignore any event for an ID no
longer in the confirmed watchlist. Broadcast exceptions are logged; reconnect/manual retry
restores committed state. Durable delivery/outbox is outside this local demo.

TanStack Query owns server state. Context owns current identity and CSRF lifecycle; initialize
identity from /me. Query keys include filters/page for properties and user ID for watchlists.
Use cancellation signals and immutable updates; disable duplicate mutations per property and
use confirmed-state updates with explicit failure feedback. A successful save/remove updates
watchlist data so all card controls agree. Disable default automatic mutation retries.

The app-level live bridge patches price/status/updated_at in all existing property pages and
the active user's watchlist, never creates a missing entry. Compare updated_at values to ignore
older events; cancel affected in-flight reads and invalidate/refetch after patching to prevent
stale HTTP snapshots overwriting events. Re-fetching may reconcile filter membership, though
instant removal/reordering is not required. Reconnect and explicit live retry revalidate /me,
watchlist, and active property queries. Show a quiet aria-live notification and disconnected
indicator. Logout unmounts subscription, disconnects consumer, cancels pending queries, clears
private caches and saved-state UI; reject callbacks belonging to a previous auth generation.

### Seeds and demonstration

Guard demo seeds to development so test database preparation never installs demo accounts.
Seed 48+ deterministic, varied Australian records and two users. Find properties by stable
seed address and users by normalized email; set initial fields/passwords only on creation.
Create a user's initial watchlist only when that demo user is first created, inside the same
transaction. Take a PostgreSQL advisory transaction lock to serialize concurrent seed runs.
This preserves later price/status/password changes and deliberate watch removals on restart.

Use `alex@example.com` and `sam@example.com`, initial password `DemoPassword123!` for both.
Known listing: `Harbour View House`, `10 Demo Street`, `Richmond VIC 3121`, initially watched by
Alex and optionally Sam; remaining initial entries differ. The task finds it by stable address,
locks the property row, toggles available/under_offer (sold→available) and increases price by
AUD 1,000, calls update! once, and prints ID/new price/status. No direct update_all or SQL
bypassing callbacks. Each run must visibly change it:
`docker compose exec backend bin/rails demo:update_property`.

### Test and documentation strategy

| Area | Critical checks |
|---|---|
| Authentication | Real CSRF enforced in dedicated requests including login; valid/invalid login, me, refresh, logout, 401, 403; cookie flags |
| Search | Every filter, inclusive boundaries, combined ranges, invalid scalars/page/type, fixed 12, stable ordering, metadata, last/empty/out-of-range pages |
| Watchlists | Persistence, A/B isolation and owner override rejection, repeated PUT/DELETE, DB unique constraint and competing saves, missing property |
| Channels/broadcasts | Anonymous/foreign-origin rejection, no client user override, expiry/logout disconnection, watcher-only recipients, removal, unchanged/uncommitted/no-broadcast |
| Frontend | RTL loading/error/retry/empty, filter resets page, pending save/remove and failure, login/logout clearing, incoming event changes rendered values, reconnect refresh |
| Delivery | Fresh Compose startup, repeated restart preserves changes/removals, actual separate-process PG broadcast, keyboard and 375/1280px review |

RSpec request tests normally disable forgery protection; explicitly enable it for CSRF tests
and perform the real token/cookie handshake. Use test adapter for isolated broadcast assertions
but retain development PostgreSQL adapter for the end-to-end separate-process demo. Never
mistake a mock channel test for proof of cross-process delivery. Configure Jest/Babel CommonJS
transforms independently of Vite's ESM module pipeline; map CSS modules and avoid import.meta
in browser API helpers (relative URLs eliminate the need).

npm scripts: `test` = `jest` (accepts `--runInBand`, exits), `typecheck` = `tsc -b --pretty false`,
`build` = `tsc -b && vite build`. No watch flag in default test command. Backend uses RSpec.
Root README must contain the exact commands in quickstart.md, architecture and feature boundary
notes, index rationale, local-only credentials, and production considerations: TLS/Secure cookies,
secret rotation, revocable sessions, login rate limiting, restricted origins/hosts, a production
frontend server, least-privilege DB access, migrations/backups, reliable event delivery and scale.

### Delivery order and time budget

- 0–40 minutes: generators, pins/lockfiles, Docker connectivity, schema and repeatable seeds.
- 40–100 minutes: authenticated API, CSRF, query object, owner-scoped watchlists, request specs.
- 100–160 minutes: frontend browsing/auth/watchlist flows, responsive states, critical RTL tests.
- 160–195 minutes: cable authentication, PostgreSQL broadcast task, cache/reconnect behavior.
- 195–240 minutes: remaining boundary tests, fresh-start/demo checks, build/typecheck, README.

This is a tight estimate, not executed work. Drop all optional polish before weakening required
security, tests or acceptance flows. Report incomplete requirements honestly if time expires.

## Complexity Tracking

No constitution violations. The query object, authentication Context, TanStack Query and cable
bridge each satisfy a current requirement. No additional services or infrastructure are planned.

## Revised execution gate — 2026-11-25

User-authorized revision: frontend/backend source and tests may be implemented independently
without Docker. Run supported local syntax, unit, type and build checks and identify their
environment. Docker remains mandatory for final Compose startup, PostgreSQL migrations/seeds,
Rails runtime checks when no compatible local Ruby exists, cross-process cable delivery and
fresh-volume/restart validation. These checks remain pending until actually executed. Compose
remains the reviewer startup method; host application runtimes are optional developer tools.
