---
description: "Executable assessment tasks for property search and personal watchlists"
---

# Tasks: Property Search and Personal Watchlists

**Input**: Design documents in `specs/001-property-search/`: [spec](spec.md), [plan](plan.md),
[research](research.md), [data model](data-model.md), [HTTP contract](contracts/http-api.md),
[real-time contract](contracts/realtime.md), and [validation guide](quickstart.md).

**Prerequisites**: Constitution v1.0.0 and the documents above. Application source now exists; see execution evidence below.
This file schedules implementation; creating it does not implement or verify the application.

**Tests**: Required by the specification. Per the user's execution order, automated test writing
and execution are grouped after real-time integration, rather than the template's test-first
example. Early checkpoints are manual smoke checks, not claims of complete acceptance.

**Organization**: Setup → foundation → US1 search → US2 login/watchlist → US3 live updates →
story-specific automated tests → US4 reviewer delivery → cross-cutting review. Test tasks retain
story labels and dependencies. All four stories are required; P2 does not mean optional.

## Format: `[ID] [P?] [Story] Description`

All checkboxes start unchecked. `[P]` permits independent work only after stated prerequisites;
it does not authorize skipping the user's phase order. `[US1]`–`[US4]` map to spec.md stories.
Paths below are planned implementation paths, relative to the repository root. Generated Rails
migration timestamp prefixes are chosen by the generator; `backend/db/migrate/` names the exact
owning directory without inventing timestamps. Each task is one reviewable work unit, not a
separate PR or approval gate.

## Path Conventions

- Rails: `backend/app/`, `backend/config/`, `backend/db/`, mirrored `backend/spec/`.
- React: `frontend/src/features/{auth,properties,watchlist}/`; app-level integration in
  `frontend/src/app/`. Substantial components own their folder, CSS module and test file.
- Shared code goes in `frontend/src/shared/` only for actual reuse; no speculative service layer.
- Root `compose.yaml`, `.gitignore`, `README.md` coordinate applications, not app dependencies.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create both applications independently; Docker is the reviewer runtime, not a source-generation gate.

- [ ] T001 Generate Rails API in `backend/` using pinned Rails 8.1.4.1 conventions (compatible local generator, direct file authoring, or temporary Ruby 3.4.13 container), PostgreSQL and `--skip-git --skip-test --skip-solid` (verify flags first); add bcrypt, pg, Puma and rspec-rails in `backend/Gemfile`, generate `backend/Gemfile.lock` with aarch64-linux/x86_64-linux support, and remove irrelevant generated deployment/CI scaffolding without breaking Rails conventions. Verify pinned image/gem availability and document necessary adjustments in `specs/001-property-search/research.md`; install no host runtimes and create no nested `.git`.
- [ ] T002 Generate Vite React-TypeScript in `frontend/` using existing Node 22.21.1 or a temporary container with a pinned create-vite 7 release (direct conventional file authoring is allowed); add React 19, TypeScript 5.9, TanStack Query 5, Rails-aligned @rails/actioncable, Jest 30, babel-jest, jsdom, RTL/user-event and Babel presets in `frontend/package.json`; generate `frontend/package-lock.json` and configure `frontend/tsconfig*.json` without a root npm project or nested Git repository.
- [ ] T003 Create `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore` and root `.gitignore`; use the plan's compatible pinned multiarch Debian images, build native pg/bcrypt, install frontend devDependencies with npm ci, bake source into app images, exclude secrets/dependency/build/log products, and preserve both dependency lockfiles. Do not force a platform or bind-mount host dependencies.
- [ ] T004 Create root `compose.yaml`, `backend/config/database.yml` and `frontend/vite.config.ts`: PostgreSQL 17.7 with pgdata and pg_isready healthcheck, backend depending on healthy db and connecting to hostname db, Rails 0.0.0.0:3000, Vite 0.0.0.0:5173/strictPort, local host port bindings, safe demo defaults and stable development-only secret; proxy /api and /cable to backend:3000 with WebSocket support and preserved Host/Origin. Keep development/test DB names distinct and require no manual .env.
- [ ] T005 Configure `backend/.rspec`, `backend/spec/rails_helper.rb`, `frontend/jest.config.cjs`, `frontend/babel.config.cjs`, `frontend/src/test/setup.ts` and `frontend/package.json`: isolated RSpec test DB and cable test adapter, Jest/Babel TypeScript/JSX transformation, jsdom/CSS module mapping, test setup and scripts `test` = jest (exits and accepts --runInBand), `typecheck` = tsc -b --pretty false, `build` = tsc -b && vite build. Test cases are added in Phase 6.

**Checkpoint**: Source generation does not require Docker. Real lockfile resolution remains mandatory;
missing compatible runtimes or registry access must be recorded, never replaced with fabricated locks. Source is not yet expected to provide the product flow.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared persistence, seed data and server lifecycle before browser stories.

- [ ] T006 Add User and WatchlistEntry migrations in `backend/db/migrate/` and models `backend/app/models/user.rb`, `backend/app/models/watchlist_entry.rb` per data-model.md: all tables have “Rails bigint primary keys and non-null created_at/updated_at timestamps”; email “text/string NOT NULL; stripped lowercase before validation; nonblank email format”; password_digest “string NOT NULL; bcrypt through has_secure_password; never serialized”; password “minimum 8, bcrypt byte limit respected”; user_id/property_id “bigint NOT NULL” with foreign keys and “ON DELETE CASCADE”; unique lower(email), unique (user_id, property_id), reverse (property_id, user_id) indexes. Define associations/validations and owner cleanup without redundant FK indexes. Coordinate the property FK with T007 before migrating.
- [ ] T007 Add Property migration in `backend/db/migrate/` and `backend/app/models/property.rb`: title “string NOT NULL; nonblank”, address “string NOT NULL; street and location identifying the seeded property”, suburb “string NOT NULL; nonblank”, property_type “string NOT NULL; house / apartment / townhouse”, price_cents “bigint NOT NULL; >= 0; API values capped at JavaScript safe integer”, bedrooms/bathrooms/parking_spaces each “integer NOT NULL; >= 0”, status “string NOT NULL; available / under_offer / sold”, image_path “string NOT NULL; default empty string means visual placeholder”, timestamps “NOT NULL”. Enforce nonnegative/type/status CHECKs and price_cents <= 9,007,199,254,740,991 in DB and model; add type/price, price-only and bedroom indexes, complete T006 foreign keys, migrate and record `backend/db/schema.rb`.
- [ ] T008 Implement creation-only development seeds in `backend/db/seeds.rb`: transaction advisory lock, >=48 stable address-keyed varied Australian properties, Alex/Sam credentials from quickstart.md and different initial watches, including Alex watching Harbour View House at 10 Demo Street, Richmond VIC 3121. Create defaults/passwords only for new records and initial watches only for newly created users in the same transaction; repeated runs preserve price/status/password changes and removed watches. Do not load demo users into test.
- [ ] T009 Implement server-only `backend/bin/server` with bounded real-DB readiness retry, db:prepare, repeatable db:seed and exec Rails bound to 0.0.0.0:3000; select it as backend command in `compose.yaml`, leaving generic entrypoint/one-off/test commands free of startup preparation. Run `docker compose up --build`, verify seeded counts/connectivity and preserve data on normal restart; keep this Docker verification pending without blocking independent story implementation.

**Checkpoint**: Fresh Compose startup seeds the database without host runtimes or manual setup;
restart preservation is a pending Docker acceptance gate. Source work depends on foundation
interfaces, not on execution of Docker checks.

## Phase 3: User Story 1 - Browse and Filter Properties (Priority: P1)

**Goal**: Anonymous visitors browse complete cards and backend-filtered, 12-item pages.

**Independent Test**: Follow quickstart.md browse checks without login: traverse 48+ records,
combine filters from page 2, verify page reset/counts and loading/error/empty states.

### Implementation for User Story 1

- [ ] T010 [US1] Implement common JSON errors in `backend/app/controllers/application_controller.rb`, public GET /properties in `backend/app/controllers/api/v1/properties_controller.rb` and `backend/config/routes.rb`, and `backend/app/queries/properties/search.rb`; follow contracts/http-api.md for scalar validation, unknown keys, whole-AUD-to-cents inclusive ranges, type/min bedrooms, safe numeric/page bounds, stable id ASC, fixed 12 cap, count metadata and out-of-range/empty behavior. Use bound predicates and explicit safe property fields, never password or watch ownership data.
- [ ] T011 [US1] Add reusable JSON fetch/error handling in `frontend/src/shared/http.ts` and feature-local `frontend/src/features/properties/api.ts`, `types.ts`, `queries.ts`; use relative URLs, cancellation signals, filter/page query keys and typed pagination/errors. No browser Docker hostnames, client-side filtering or download-all pagination.
- [ ] T012 [US1] Build `frontend/src/features/properties/PropertyCard/PropertyCard.tsx`, `PropertyFilters/PropertyFilters.tsx`, `Pagination/Pagination.tsx` and colocated .module.css files: all specified card fields, AUD formatting, image failure placeholder, accessible labeled filter form, page controls and save-control slot. Keep private helpers/types beside components and export only needed feature interfaces.
- [ ] T013 [US1] Compose `frontend/src/features/properties/PropertyList/PropertyList.tsx` and colocated CSS in `frontend/src/app/App.tsx` with TanStack Query provider; apply/clear filters resets page 1, navigation retains filters, stale requests cannot replace current results, error/retry retains request, and loading/empty states are clear. Provide initial auth-required save affordance, responsive 375px/1280px layout and visible keyboard focus; manually exercise the US1 checkpoint before continuing.

**Checkpoint**: US1 is functional as the public discovery increment; automated proof follows in
Phase 6 and is required before final delivery.

## Phase 4: User Story 2 - Log In and Manage a Private Watchlist (Priority: P1)

**Goal**: Complete login → search → save → private watchlist → remove → logout flow.

**Independent Test**: Use both accounts in separate browser profiles, refresh saved choices,
retry failed mutations and attempt owner overrides; choices stay persistent and isolated.

### Implementation for User Story 2

- [ ] T014 [US2] Configure cookie/session middleware in `backend/config/application.rb` and `backend/config/initializers/session_store.rb`, explicit CSRF/cookies modules and origin checking in `backend/app/controllers/application_controller.rb`; add `backend/app/controllers/api/v1/csrf_controller.rb`, `sessions_controller.rb`, `me_controller.rb` and routes for GET csrf, POST/DELETE session and GET me. Use bcrypt, normalized email, HttpOnly/SameSite=Lax cookie, 12-hour expiry, session/token rotation, X-CSRF-Token for every mutation including login, no-store identity responses, consistent 401/403/422 errors and no credential serialization. Restrict Rails hosts and preserve proxy origins; do not disable forgery checks.
- [ ] T015 [US2] Implement GET/PUT/DELETE watchlist in `backend/app/controllers/api/v1/watchlist_controller.rb` and `backend/config/routes.rb`: authenticate, derive owner only from session, reject owner override fields, includes(:property), stable order and contract responses, idempotent PUT protected by DB uniqueness with safe concurrent-conflict recovery, idempotent DELETE scoped by current_user/property, and 404 nonexistent property. Never select another user's entry ID or permit user_id mass assignment.
- [ ] T016 [US2] Implement `frontend/src/features/auth/AuthProvider.tsx`, feature-local `api.ts`, `types.ts`, `LoginForm/LoginForm.tsx` and colocated CSS; bootstrap csrf and /me, preserve login on refresh, expose identity/token lifecycle through Context, show pending/invalid login feedback, send token on all mutations and handle 401/403 without automatic unsafe mutation replay. Add authentication generation guards, cancellation and private-cache cleanup on logout/expiry; wire providers in `frontend/src/app/App.tsx`.
- [ ] T017 [US2] Implement `frontend/src/features/watchlist/api.ts`, `queries.ts`, `SaveButton/SaveButton.tsx`, `WatchlistPage/WatchlistPage.tsx` and colocated CSS: user-ID query keys, confirmed-state save/remove, per-property pending controls, no automatic mutation retries, failure feedback retaining/restoring confirmed state, loading/error/retry/empty watchlist, and saved-state consistency across views. Reuse only the properties feature's public card/type interface.
- [ ] T018 [US2] Integrate login/logout, browse/watchlist navigation and injected SaveButton in `frontend/src/app/App.tsx`; protect private content, prevent late requests from a previous identity restoring it, and verify the full Alex/Sam core flow, refresh persistence, pending/error feedback and keyboard operation. Keep app-level feature composition free of circular feature imports and record failures for correction before real-time work.

**Checkpoint**: Login/search/watchlist source interfaces precede live source integration; Docker runtime verification remains pending.
No security or persistence requirement is deferred as optional polish.

## Phase 5: User Story 3 - Observe Live Watched-Property Changes (Priority: P2)

**Goal**: Secure cross-process updates and correct cache lifecycle without refresh.

**Independent Test**: Run the demo task with a known watched listing visible in two sessions;
observe changed price/status within 3 seconds, then check removal/logout and reconnect recovery.

### Implementation for User Story 3

- [ ] T019 [US3] Configure PostgreSQL adapter/common channel prefix in `backend/config/cable.yml`, explicit allowed origins and /cable mount in `backend/config/routes.rb`/environment config; authenticate `backend/app/channels/application_cable/connection.rb` by decrypting the configured session cookie, reject anonymous/invalid/expired identity, schedule expiry closure, and implement `backend/app/channels/watchlist_channel.rb` with server-derived stream_for current_user and rejection of owner-selection params. Add remote user connection disconnection with reconnect:false to logout in `backend/app/controllers/api/v1/sessions_controller.rb`.
- [ ] T020 [US3] Add after_update_commit price/status-only broadcasts in `backend/app/models/property.rb`, one indexed current watcher-ID lookup and compact per-user event from contracts/realtime.md (<8,000 bytes); log delivery failures without claiming durable delivery. Add row-locked `demo:update_property` in `backend/lib/tasks/demo.rake` to find the known address, increase price by 100000 cents, toggle valid status with update!, and print results on every invocation. Use the same development DB/adapter/prefix as the web process.
- [ ] T021 [US3] Add authenticated consumer lifecycle in `frontend/src/features/watchlist/useWatchlistSubscription.ts` and `frontend/src/app/LiveUpdates.tsx`; derive ws/wss URL from browser host, connect once per current identity, ignore invalid/old/removed-property events and stale auth generations, and unsubscribe/disconnect on logout. Expose public feature cache helpers in `frontend/src/features/properties/queries.ts` and `frontend/src/features/watchlist/queries.ts`; cancel conflicting reads, patch existing visible price/status values, then revalidate. Add subtle aria-live notification, live-unavailable/retry state, and /me/watchlist/active search revalidation after reconnect.
- [ ] T022 [US3] Exercise `docker compose exec backend bin/rails demo:update_property` twice with the browser running using the scenario in `specs/001-property-search/quickstart.md`; verify actual PostgreSQL separate-process delivery, both watchers, no later delivery after removal, server/client logout cleanup, expiry/origin restrictions and reconnect recovery. Correct integration defects in `backend/config/cable.yml`, channel/model/task files and `frontend/src/app/LiveUpdates.tsx` before tests; do not substitute mocked event handling for cross-process verification.

**Checkpoint**: All required behavior is present; it is not yet declared test-verified.

## Phase 6: Story-Specific Automated Tests

**Purpose**: Required automated coverage after core flow and real-time integration, per user
request. Use the Phase 1 harness and isolated test DB. Compatible existing local tools may
run checks; Docker-only checks stay pending. Tasks marked [P] below can run after T021 because they own different test files; production fixes
must be coordinated and rechecked rather than edited concurrently.

### Tests for User Story 1

- [ ] T023 [P] [US1] Add `backend/spec/queries/properties/search_spec.rb` and `backend/spec/requests/api/v1/properties_spec.rb` for individual/combined inclusive filters, blank/zero boundaries, invalid scalar shapes/types/ranges/pages/unknown size keys, fixed 12, deterministic nonduplicating pages, metadata/last/empty/out-of-range behavior and bounded query counts; verify server behavior against contracts/http-api.md.
- [ ] T024 [P] [US1] Add `frontend/src/features/properties/PropertyList/PropertyList.test.tsx` and `PropertyFilters/PropertyFilters.test.tsx` with an isolated QueryClient wrapper in `frontend/src/test/render.tsx`; cover loading/error/retry/empty, filter apply/clear resetting page 1, retained filters, network pagination, latest-result safety, card fields and placeholder behavior through user-visible interactions.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add `backend/spec/requests/api/v1/sessions_spec.rb`, `csrf_spec.rb`, `me_spec.rb` and test-local cookie/token helpers in `backend/spec/support/authentication.rb`; explicitly enable forgery protection for real handshake tests, verify missing/invalid CSRF including login, origin mismatch, valid/invalid credentials, cookie options, token/session rotation, authenticated refresh, expiry/logout and protected endpoint denial with valid anonymous token where needed.
- [ ] T026 [P] [US2] Add `backend/spec/models/user_spec.rb`, `property_spec.rb`, `watchlist_entry_spec.rb` and `backend/spec/requests/api/v1/watchlist_spec.rb`: constraints/model validations, lower(email) uniqueness, numeric/type/status checks, FK integrity, A/B isolation/owner override denial, persistent save/remove, missing properties, repeated PUT/DELETE, actual competing saves against unique index and bounded association queries. Ensure concurrency tests commit setup and use separate DB connections rather than being hidden by transactional fixtures.
- [ ] T027 [P] [US2] Add `frontend/src/features/auth/LoginForm/LoginForm.test.tsx`, `frontend/src/features/watchlist/SaveButton/SaveButton.test.tsx`, `WatchlistPage/WatchlistPage.test.tsx` and `frontend/src/app/App.test.tsx`; test login/logout, pending/failed auth and mutations, retry, saved-state agreement, empty/error watchlist, persistence re-fetch and user-switch/logout cancellation so late responses cannot leak prior saved choices.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add `backend/spec/channels/application_cable/connection_spec.rb` and `backend/spec/channels/watchlist_channel_spec.rb`: cookie-derived identity, anonymous/invalid/expired rejection, expiry closure, foreign origin/owner-parameter rejection, only current user stream and remote logout disconnect behavior. Use the actual handshake/config path where channel stubs cannot prove Origin handling.
- [ ] T029 [P] [US3] Add `backend/spec/models/property_broadcast_spec.rb` and `backend/spec/tasks/demo_spec.rb`: compact payload and correct watcher-only recipients, removal exclusion, commit-only price/status changes, no rollback/unrelated-change broadcast, and repeated demo command changes. Clearly distinguish isolated test-adapter assertions from T022's real PostgreSQL delivery check.
- [ ] T030 [P] [US3] Add `frontend/src/app/LiveUpdates.test.tsx` and `frontend/src/features/watchlist/useWatchlistSubscription.test.tsx` with mocked cable transport; verify received events change rendered cards/watchlist and notification, stale/invalid/removed-property events are ignored, disconnect/retry/reconnect revalidates current values, and logout/user switch cleans consumer/private caches and rejects late callbacks.

**Checkpoint**: Story coverage exists and can be executed; US4 runs the full suite/checks and
fixes failures. Tests must assert behavior and authorization, not mirror implementation details.

## Phase 7: User Story 4 - Run and Review the Demo (Priority: P2)

**Goal**: Docker-only delivery, successful required checks and reproducible reviewer docs.

**Independent Test**: Follow README from a fresh checkout, use both accounts, execute automated
checks and the live task, then restart and confirm user changes remain intact.

### Validation and Documentation for User Story 4

- [ ] T031 [US4] Run exact test DB preparation, RSpec, `npm test -- --runInBand`, typecheck and build commands from `specs/001-property-search/quickstart.md` through Compose using `backend/spec/`, `frontend/src/` tests and `frontend/package.json`; fix diagnosed app/config/test failures, rerun affected checks, then record final command outcomes in the delivery notes in `README.md`. Confirm test DB isolation and that one-off execution never invokes `backend/bin/server`; claim passes only for successful executed commands.
- [ ] T032 [US4] Write root `README.md` with verified `docker compose up --build`, URL, exact demo credentials, Docker-only test/check commands, repeatable demo task, watcher/reconnect steps, startup/rebuild/stop/data-reset behavior, architecture/feature boundaries, index rationale, limitations and production considerations from plan.md. Explain creation-only seeds and local-only secrets, session replay revocation limits, TLS/origin/rate-limit requirements, production frontend hosting, DB backups and best-effort event delivery; keep statements aligned with actual results.
- [ ] T033 [US4] Validate `compose.yaml`, `backend/bin/server` and README.md in a fresh disposable Compose project/volume so existing data is preserved; confirm single-command startup, 48+ records/two users, both app lockfiles, no nested Git, native available architecture and no host runtime dependency. Modify a price/status and remove an initial watch, restart normally, verify changes/removal persist and no duplicates appear. Exercise test/one-off commands without triggering startup seeds; record results and any unverified second architecture in `README.md`.
- [ ] T034 [US4] Follow `README.md` end-to-end as a reviewer: manually check 375px/1280px keyboard flows, all feedback states, two-user privacy and actual WebSocket task/reconnect behavior against `specs/001-property-search/quickstart.md`; fix material defects in owning component CSS/TSX, Rails or Docker config and repeat relevant checks. Record remaining limitations/unexecuted checks truthfully in `README.md`.

**Checkpoint**: Required functionality, automated checks and reviewer instructions have concrete
verification evidence; failures remain open work, not caveats that imply completion.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Focused final review, not bonus features or architectural expansion.

- [ ] T035 Review `frontend/src/features/`, `frontend/src/app/`, `backend/app/`, `backend/db/schema.rb` and `backend/spec/` against `.specify/memory/constitution.md`: component/test/style locality, actual shared reuse, no circular/private feature imports, Rails naming/autoloading, explicit ownership, DB constraints, bounded queries, no unnecessary services and comments explaining only non-obvious decisions. Make focused behavior-preserving corrections and rerun only impacted checks before the final verification checkpoint.
- [ ] T036 Reconcile completion evidence in `specs/001-property-search/tasks.md` and `README.md` with FR-001–FR-016/SC-001–SC-008; mark only actually completed tasks, list any failed or unexecuted acceptance checks and commands, and report the final required test/build outcomes after any T035 changes. Do not add bonus features, claim unsupported passes or claim implementation complete with unmet required tasks.

## Dependencies & Execution Order

### Phase Dependencies

```text
Independent source: T001 backend / T002 frontend → T003–T005 configuration
  → T006/T007 definitions → T008/T009 server source
  → US1 T010–T013 → US2 T014–T018 → US3 T019–T021
  → story test source/checks T023–T030 → T035 source review
Pending Docker gate: daemon access → T001 lock/platform checks + T007 migration
  + T009 startup → T018 runtime flow → T022 actual cable → T031–T034 → T036
```

- Setup/foundation block story integration. T006 migration definitions can precede T007, but
  database migration must order properties before the watchlist property FK; use a separate
  FK migration if necessary. Do not run a broken intermediate schema.
- US1 is the public browsing MVP and can be demonstrated independently with seeded data.
- US2 needs US1 card composition for the requested end-to-end flow; its API can also be tested
  independently against seeded properties. Complete auth/session before protected mutations.
- US3 depends on authenticated identity, confirmed watch membership and property cache APIs
  from US1/US2. Its independent scenario uses preseeded watches, not a UI save precondition.
- US4 depends on all required behavior and story test files. T031 must precede claims in T032;
  T033/T034 validate the resulting instructions. T035 corrections require targeted revalidation.
- Within each implementation story, tasks run in listed order. Test tasks T023–T030 are the
  only marked parallel opportunities and start after T021 source integration; they must all complete before T031.

### Parallel Examples per Story

Optional examples for future execution, not a request to start agents now:

| Story | Independent work after T021 | Coordination |
|---|---|---|
| US1 | T023 backend query/request specs alongside T024 RTL search specs | Agree existing contract; T024 owns shared frontend test wrapper before other tests import it |
| US2 | T025 auth requests, T026 persistence/watch requests, T027 auth/watch UI tests | Other frontend tests may create local wrappers or wait for T024's shared wrapper; no concurrent shared config edits |
| US3 | T028 cable authorization, T029 broadcasts/task, T030 UI live updates | Mock transport stays in test-local files; coordinate production fixes |
| US4 | No parallel task marked: T031 results → T032 README → T033/T034 reviewer validation | Shared README and runtime state require sequential work |

`[P]` applies to different owned test files, not to test runs mutating the same database or to
shared harness changes. Use local test wrappers where needed until T024's wrapper is complete.
No assumption of multiple implementers is required; sequential execution is the default.

## Implementation Strategy

### MVP First

Finish setup/foundation and US1 for the independently useful public browser. The user's first
usable assessment checkpoint is US1 + US2: Docker startup, login, server search/pagination,
persistent private save/remove and logout. Neither checkpoint is the complete assessment.

### Incremental Delivery

1. Spend roughly 40 minutes on generation/infrastructure/schema/seeds; implement server startup; defer Docker execution if blocked.
2. Spend roughly 120 minutes on core backend and frontend US1/US2 slices and manual checkpoints.
3. Spend roughly 35 minutes on US3 cable, cross-process task and cache/reconnect lifecycle.
4. Reserve roughly 45 minutes for automated tests, required checks and reviewer documentation.

Total target is approximately 3–4 hours, a tight estimate rather than a guarantee. Tasks are
small enough for focused changes; no separate approval, exhaustive suite or deployment is
required. If time runs short, omit optional polish before weakening critical functionality or
security; report unfinished required work honestly. Do not implement during task generation.

## Notes

### Implementation attempt — 2026-11-25

- Specification checklist: 16 checked, 0 unchecked; prerequisite discovery succeeded.
- Blocked before T001: `docker version` cannot access the configured Docker daemon socket.
  `docker run --rm ruby:3.4.13-slim-bookworm ruby --version` exited 126 with
  `dial unix /var/run/docker.sock: connect: operation not permitted`.
- The default Docker context uses that socket. Its symlink points to Docker Desktop's socket
  under the user's Library directory. This session's sandbox denies the connection, and
  sandbox escalation is disabled by its permission policy. No permissions were changed and
  no alternative socket was used to bypass the restriction.
- No application files were generated and no tasks are marked complete. Container generation,
  Compose build/startup, DB initialization, RSpec, Jest, TypeScript checks, frontend production
  build, and separate-process real-time verification have not executed.
- Resume at T001 in a session permitted to access the Docker daemon. The workspace also has
  no root Git repository yet (`git rev-parse --git-dir` failed); initialize one during setup
  when execution resumes, without nested application repositories.

### Resume prerequisite retry — 2026-11-25

- Re-read the constitution, implementation skill, plan and tasks; prerequisite discovery again
  resolved this feature successfully. The requirements checklist remains 16 checked, 0 unchecked.
- Docker access is still blocked in this agent session despite the reported successful check
  in the Mac Terminal. `docker --version` succeeds (20.10.6), and `docker compose version`
  reports 2.0.0-beta.1, but neither proves daemon connectivity or planned Compose compatibility.
- Retried `docker info`, `docker version`, and
  `docker run --rm ruby:3.4.13-slim-bookworm ruby --version`. All daemon requests failed with
  `dial unix /var/run/docker.sock: connect: operation not permitted`; no container ran.
- The current session still disables sandbox escalation. No socket permissions or endpoints
  were changed. The prior blocker therefore remains active; resume at T001 only after daemon
  access succeeds from the agent session itself.
- `git rev-parse --git-dir` still reports no root Git repository. No application files were
  generated, no implementation checks ran, and no tasks were marked complete on this retry.
- No `.specify/extensions.yml` exists, so there are no before/after implementation hooks to run.

All tasks remain unchecked at generation. Tests are requested and mandatory for delivery, but
not TDD in this execution order. Keep changes within their owning application, preserve behavior
when refactoring and do not create services or bonus features without an implemented need.

### Revised authorization and evidence — 2026-11-25

- Docker access remains pending for final integration, not application file generation.
- Backend/frontend source and supported local checks may proceed independently. Mixed tasks
  remain unchecked until every required implementation and verification step is complete;
  record partial progress here. T007 migrations, T009 Compose startup, T018 browser integration,
  T022 cross-process delivery and T031–T034 Docker acceptance are not passed by source review.
- Earlier notes requiring Docker before T001 describe superseded execution gates.

### Independent implementation progress — 2026-11-25

- T001–T005 source/configuration authored directly in separate application directories:
  Rails conventional skeleton, Gemfile, React/TypeScript manifest and Vite setup, Dockerfiles,
  Compose, ignore files and RSpec/Jest harness. Generator execution is not claimed. Both real
  lockfiles remain pending (registry DNS failure/incomplete offline cache; incompatible host
  Ruby). No Docker build, dependency installation or pin/platform verification passed.
- T006–T008 models, ordered migrations, DB constraints/indexes and creation-only development
  seeds authored. Migration execution and generated schema remain pending.
- T009 server source authored; Compose startup/restart checks remain pending.
- T010–T021 API, UI and live-update source authored, preserving feature locality, explicit
  owner scoping, Australian addresses/en-AU AUD formatting and separate app ownership.
  End-to-end behavior, session/cookie/expiry compatibility and cable delivery remain unverified.
- T023–T030 initial request/model/query/channel and component/hook tests authored. They are
  not executed, exhaustive or complete: execution of competing-session saves, query-count bounds, real handshake/origin
  and expiry, richer UI timing/reconnect/user-switch scenarios and repeated demo-task coverage
  still require completion and execution. Do not mark these mixed implementation/test tasks done.
- README draft records intended reviewer Compose commands, demo and limitations, clearly labels
  missing locks and unverified startup. T032 remains pending verified command evidence.
- Executed successful local checks: all backend .rb files parse with host Ruby 3.0; server shell
  syntax; Jest/Babel CJS syntax and mapping patterns; TypeScript 5.9.3 parsing and isolated live
  event validator assertions; static Compose config parsing. These are not runtime acceptance.
- Local npm typecheck/build/Jest were attempted and failed because app dependencies are absent.
  npm online lock resolution failed ENOTFOUND; offline resolution failed ENOTCACHED. Git init
  failed with Operation not permitted for root .git. No alternate Git directory was used.
- Docker-dependent tasks and all mixed tasks remain unchecked. Resume dependency resolution
  and supported app checks when registries/runtime access is available; T022/T031/T033/T034
  remain mandatory final integration gates, not prerequisites for writing more source.

- Final supported recheck: 36 TypeScript files parsed with TypeScript 5.9.3; 9 isolated live
  payload validation assertions passed; frontend/Compose formatting passed. A concurrent-save
  request spec and late-response-after-logout provider test are now authored but unexecuted.
  Rails boot/dependency resolution is still incompatible with host Ruby; no acceptance task
  is closed by these static checks.

- `bundle check` was also attempted in backend and failed with Ruby 2.6.10 versus required
  3.4.13 (the directory shell selects a different Ruby than root-shell syntax checks).
  This is not a Rails boot or RSpec pass. Final Ruby syntax sweep includes 45 files, covering
  .rb, .rake, Gemfile, Rakefile, config.ru and bin/rails.

## UI revision — supplied Figma Make archive

- [x] U001 Inspect archive, existing specification/constitution, application and authentication boundaries.
- [x] U002 Adapt reference layout, palette, typography, cards, filters, navigation and responsive styles using existing CSS modules.
- [x] U003 Add dedicated login navigation, account controls, allowlisted return destinations and idempotent deferred saves; preserve mounted browse state.
- [x] U004 Retain backend owner-scoped authorization and add anonymous read/delete regression coverage; retain live updates and API contracts.
- [x] U005 Author regression tests for return validation, anonymous save navigation, deferred-save deduplication and retry.
- [ ] U006 Execute frontend tests/typecheck/build and backend RSpec; record actual results below.
- [ ] U007 Verify 375px/1280px layout, keyboard flows and live end-to-end login/save in a running browser.

UI revision verification:
- Passed: 38 TypeScript source/test files parsed using cached TypeScript; 10 isolated
  navigation/return-allowlist assertions; Ruby syntax for added watchlist request coverage;
  changed frontend files formatted using cached Prettier. These do not constitute typecheck
  or application tests.
- Blocked: npm install attempted twice, including a writable temporary cache. Registry tarball
  requests fail ENOTFOUND and npm exits with `Exit handler never called`. No dependencies added
  or reference dependencies copied. Typecheck/build/Jest were attempted again and stop at
  missing `tsc` / `jest`.
- Blocked: Docker Compose RSpec invocation cannot connect to the protected Docker socket.
  Host bundle check reports Ruby 2.6.10 versus required 3.4.13.
- Browser viewport/keyboard and real session/WebSocket verification remain pending a running
  application. U006/U007 stay unchecked. No backend behavior was replaced; existing session,
  owner-scoped watchlist and channel protections were inspected directly.
- Reused the archive's local house artwork solely as an explicitly labelled illustrative
  fallback for unavailable property photos. Real property image paths take precedence.
