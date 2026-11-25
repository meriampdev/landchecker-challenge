# Property search and personal watchlists

Implementation is in progress. Separate Rails/PostgreSQL and React applications have been
written, but this checkout is **not yet verified or ready for reviewer startup**. Both real
dependency lockfiles are pending resolution. The current agent cannot access Docker, the npm
registry lookup fails, and the available host Ruby versions cannot run the pinned Rails application.

## Reviewer startup target

After the pending dependency resolution and integration checks below succeed, the reviewer
entry point remains:

```sh
docker compose up --build
```

Open http://localhost:5173. Docker and Git are the only reviewer host prerequisites. PostgreSQL is private to Compose. Backend and
frontend ports are intended to bind to loopback; confirm effective bindings with a supported
Compose v2 release (the session's old beta parses the file but may not preserve host bindings).

### Docker development and automatic reload

If startup fails with `exec user process caused: operation not permitted` or
`EPERM` opening `/app/package.json` on macOS, check Docker Desktop's access to the
checkout. Both services mount host source into `/app`, so a host folder access
restriction can affect both services even when the images built successfully.
In macOS System Settings → Privacy & Security → Files and Folders, allow Docker
Desktop to access the Desktop folder if that permission is listed. Also check
Docker Desktop's file sharing settings include the checkout's parent directory.
Restart Docker Desktop after changing permissions, then run:

```sh
docker compose up --build --force-recreate
```

Alternatively, move the checkout outside protected Desktop/Documents folders
(for example, to `~/Projects/landchecker-challenge`), ensure that location is
shared with Docker Desktop, and run Compose there. Keep the same Compose project
name to retain the existing named database volume. Do not use `down -v` or
recursive `chmod` to troubleshoot this error: the former deletes database data,
and the latter does not resolve macOS folder privacy restrictions.

`compose.yaml` is the local development setup. Start it with `docker compose up --build`
(subsequent starts can use `docker compose up`). Both applications bind-mount their source.
Edit a React component under `frontend/src` and save: Vite sends an HMR update to the browser
at http://localhost:5173 without rebuilding or refreshing manually. Vite listens on
`0.0.0.0:5173`; its HMR WebSocket uses the same published browser port, 5173.
If you change the published port, update `server.hmr.clientPort` in `frontend/vite.config.ts`
and the backend's allowed origins as well.

Frontend dependencies live in an anonymous container volume at `/app/node_modules`, masking
any host `node_modules`. Ruby gems remain in the image's `/usr/local/bundle`, outside the
backend source mount. Rails runs with `RAILS_ENV=development`, reloading application classes
on the next request using its built-in mtime file checker. No backend event watcher is needed.

If frontend edits are not detected on Docker Desktop for macOS, restart with polling enabled:

```sh
VITE_USE_POLLING=true docker compose up -d --force-recreate frontend
```

Polling applies only to Vite and is off by default. Save the component again and check for
`[vite] hmr update` in `docker compose logs -f frontend` and a visible browser change.
To check Rails reloads, temporarily change a controller response, repeat its API request,
confirm the new response, and restore the edit; neither check should require an image build.

Source and CSS edits need no rebuild. Restart the backend after changing Rails boot files,
initializers or environment configuration. Dependency manifests/lockfiles and Dockerfile
changes require rebuilding the affected service. For frontend dependency/image changes, also
renew its dependency volume so it receives the newly installed packages:

```sh
docker compose up -d --build --force-recreate --renew-anon-volumes frontend
docker compose up -d --build --force-recreate backend
```

Do not delete the PostgreSQL volume to refresh dependencies. These mounts, Vite HMR and Rails
reload settings are for development. `npm run build` still produces the production frontend
bundle, and `backend/config/environments/production.rb` keeps Rails reloading disabled.
The repository does not include a production deployment configuration.

Development reload verification (2026-11-25): `docker compose config` accepted the mounts,
dependency volume, development environment and frontend command; the development Rails
configuration passed `ruby -c`. `docker compose up -d --build` was attempted but denied
access to `/var/run/docker.sock` (`operation not permitted`). Consequently, neither an
edited component updating the browser nor an edited backend response has been runtime
verified in this session. Run the edit checks above on a Docker-enabled host.

| Account | Email | Initial password |
| --- | --- | --- |
| Alex | alex@example.com | DemoPassword123! |
| Sam | sam@example.com | DemoPassword123! |

These credentials and the Compose secret are local demo defaults, unsafe for deployment.
Seeds create 48 Australian listings and different initial watches, only in development. They
use a transaction advisory lock and creation-only defaults to preserve later user changes.
`docker compose down` preserves data; `docker compose down -v` deletes it intentionally.

## Pending developer prerequisites

Dependency versions in the manifests are proposed pins, not registry-verified resolutions.
Do not manufacture lockfiles or report builds passing without resolving and executing them.
With registry and Docker access, resolve dependencies in matching containers:

```sh
docker run --rm -v "$PWD/backend:/app" -w /app ruby:3.4.13-slim-bookworm sh -c 'bundle lock --add-platform aarch64-linux x86_64-linux'
docker run --rm -v "$PWD/frontend:/app" -w /app node:22.21.1-bookworm-slim npm install --package-lock-only --ignore-scripts
```

Verify image/gem/npm pin availability, compatibility and native gem builds, recording any
necessary adjustment in `specs/001-property-search/research.md`. Then verify Compose startup,
run migrations to generate `backend/db/schema.rb`, and execute the checks below. Root Git
initialization also remains pending: this workspace denied `git init` writes to `.git`.
Do not create nested application repositories.

## Required checks (not yet passed)

After successful Compose startup, run from the root:

```sh
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bin/rails db:prepare
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bundle exec rspec
docker compose exec frontend npm test -- --runInBand
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run build
```

One-off commands bypass `bin/server`; only the server command prepares/seeds development data.
Confirm the test database is separate and contains no demo seed users. Existing compatible
host tools may be used during development, but cannot substitute for final Docker verification.

## Live demonstration (pending verification)

Sign in as Alex and open Watchlist. Find Harbour View House, 10 Demo Street, Richmond VIC 3121.
In a separate browser profile, sign in as Sam and watch the same listing. Keep both windows
open and run twice:

```sh
docker compose exec backend bin/rails demo:update_property
```

The intended result is an AUD 1,000 price increase and a different status each run, visible to
both watchers within three seconds without refresh. Remove Sam's watch and repeat: subsequent
updates should only reach Alex. Log out and verify private content and live connections clear.
Interrupt/reconnect the socket and verify the visible unavailable state and current-value
recovery. These steps must exercise the PostgreSQL adapter across separate processes; mocked
transport tests cannot prove delivery.

## Architecture and maintenance

`frontend/` owns React, TypeScript, Vite and Jest configuration. Features are `auth`, `properties`
and `watchlist`; substantial components colocate styles and tests. The app composes public
feature interfaces, injecting save controls into property cards. TanStack Query owns server
state; authentication Context owns identity and token lifecycle. Relative HTTP and WebSocket
URLs preserve the browser origin. Labels use Australian English, `en-AU` AUD formatting, and
Australian demo addresses; no external image or listing service is used.

`backend/` follows Rails controller/model/query/channel conventions. `Properties::Search`
validates inputs and performs server-side filtering and fixed 12-item pagination. Cookie/CSRF
sessions protect owner-scoped watchlists and channels. Unique lower(email) and user/property
indexes enforce identity/membership invariants; reverse property/user indexing supports watcher
lookup. Type/price, price and bedroom indexes support filters, though a small dataset may favour
a sequential scan. Public property JSON contains no user-specific saved state.

Updates are best effort after commit, not durable event history. Reconnect reads committed
current values. CookieStore logout disconnects all sockets for that user but does not globally
revoke other browser HTTP sessions or replayed cookies. Production needs TLS/Secure cookies,
secret rotation, revocable sessions, login rate limits, restricted hosts/origins, a production
frontend server, least-privilege DB access, migration/backup operations and reliable delivery
appropriate to deployment scale. No production deployment is included.

## Verification evidence — 2026-11-25

- Passed: Ruby syntax checks on backend Ruby source/specs using host Ruby 3.0; shell syntax
  for `backend/bin/server`; Node syntax and regex checks for Jest/Babel configuration.
- Passed: TypeScript 5.9.3 source parsing and isolated event-validator assertions using a
  cached compiler; these are syntax/pure-function checks, **not** an application typecheck.
- Passed: static `docker compose config` parsing with Compose 2.0.0-beta.1. This proves neither
  daemon access nor startup, port binding, image availability or service health.
- Blocked: `bundle check` reports Ruby 2.6.10 versus required 3.4.13 in the backend shell
  (root-shell syntax checks use Ruby 3.0). npm dependency/lock resolution (registry DNS ENOTFOUND; incomplete offline cache).
  `npm run typecheck`, `npm run build`, and `npm test -- --runInBand` were attempted locally
  and failed because `tsc`/`jest` are not installed for this application.
- Pending: Gemfile.lock, package-lock.json, Rails boot/autoload checks, database migrations and
  generated schema, RSpec/Jest execution, complete critical-flow coverage, frontend typecheck
  and production build, actual PostgreSQL cable delivery, fresh-volume startup/restart
  persistence, concurrency/query-count tests, handshake/origin/expiry verification, and
  375px/1280px keyboard/browser review. Neither CPU architecture has been container-verified.

See `specs/001-property-search/tasks.md` for partial implementation and remaining acceptance work.

## Reference UI revision

The UI adapts the supplied Figma Make archive using existing CSS modules and feature structure.
Navigation uses `#/browse`, `#/watchlist`, and `#/login`. Public browsing remains available
without a session. Header Log in uses the existing Rails cookie/CSRF login; authenticated
users see account identity and Log out. Watchlist access and anonymous heart clicks open
login with an allowlisted return destination. Successful login ensures the requested favorite
with an idempotent PUT before returning, including retry/continue feedback on failure.
Applied browse filters and pagination remain mounted across this navigation. Missing photos
use the archive artwork labelled as illustrative; real API image paths retain precedence.

Revision checks: 38 TypeScript files parsed, 10 isolated navigation assertions passed,
added Ruby spec syntax passed, and changed UI files formatted. Runtime checks remain blocked:
registry DNS fails (ENOTFOUND; npm installation incomplete), `tsc`/`jest` are missing, Docker
socket access is denied, and host Ruby does not satisfy the backend version. Frontend build,
Jest, RSpec, browser viewport/keyboard checks and real login/save/live-update integration
have **not** passed. New regression tests and exact verification notes are tracked in
`specs/001-property-search/tasks.md`.
