# Landchecker Homes

A property browser with combined location, price, bedroom and property-type filters,
listing details, personal watchlists and live price/status updates. Public browsing
requires no account. Prices are in AUD; the development dataset contains 48 Australian listings.

## Run locally

Install Docker Engine/Desktop with a stable Docker Compose v2 release. From the repository root:

```sh
docker compose up --build
```

Open **http://localhost:5173** after the services are ready. No host Ruby, Node or
PostgreSQL installation or `.env` file is required. The first build needs registry
access. Ports 3000 and 5173 must be available. On macOS, Docker Desktop must have
file-sharing access to the checkout.

| Email | Password |
| --- | --- |
| alex@example.com | DemoPassword123! |
| sam@example.com | DemoPassword123! |

Startup prepares the database and creates missing demo records. Seeds preserve
existing account, property and watchlist changes. `docker compose down` preserves
the named PostgreSQL volume; `docker compose down -v` deletes it.

Source mounts support Rails reload and Vite HMR. If Docker Desktop misses frontend
edits, use `VITE_USE_POLLING=true docker compose up -d --force-recreate frontend`.
After changing frontend dependencies, rebuild with
`docker compose up -d --build --renew-anon-volumes frontend`.

## Architecture

- **Backend:** Rails API, PostgreSQL, bcrypt and cookie sessions. A query object
  validates and combines search filters with stable 12-item pagination. Public
  serializers expose listing fields only. Mutations require CSRF tokens and matching
  origins; watchlists are scoped to the authenticated user.
- **Frontend:** React/TypeScript with `auth`, `properties` and `watchlist` features,
  colocated CSS modules and tests. TanStack Query owns server state; Context owns
  authentication. Hash routes preserve validated browse filters and pagination
  through details, authentication and deferred saves. Back/Forward reads URL state.
- **Watchlists:** 12 listings per page, eager-loaded relationships and a compact
  saved-ID list for accurate hearts across pages. A unique user/property index makes
  repeated and concurrent saves idempotent. Reverse relationship indexes support
  broadcast-recipient lookup.
- **Live updates:** One ActionCable subscription per signed-in client, using the
  PostgreSQL adapter across processes. Committed price/status changes go to current
  watchers. Reconnect refetches current values; timestamp checks discard stale events.
  Logout closes user connections; active sockets close at session expiry.
- **Development:** Compose runs PostgreSQL, Rails and Vite. HTTP and WebSocket requests
  use Vite's same-origin proxy. Backend health gates frontend startup. Both dependency
  lockfiles and the generated Rails schema are included.

## Tests and build

With Compose running, execute from the repository root:

```sh
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bin/rails db:prepare
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bundle exec rspec
docker compose exec backend bin/rails zeitwerk:check
docker compose exec frontend npm test -- --runInBand
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run build
```

RSpec requires a database name ending in `_test` and never seeds demo users.
Tests cover filtering, pagination, authentication, CSRF, isolation, concurrent saves,
authentication return flows and live cache updates.

For a real transport check, with Node 22 installed on the host:

```sh
npm --prefix frontend ci
node frontend/scripts/verify-realtime.cjs
```

This uses real authenticated WebSockets through Vite and separate Rails writer
processes. It temporarily changes the first listing and demo watches, then restores
them. Run against idle demo data. Set `BACKEND_CONTAINER` if Compose uses a different
container name, and `APP_URL` if using a different allowed origin.

## Real-time demonstration

1. Sign in as Alex and open Watchlist. In another browser profile, sign in as Sam.
   Ensure both users save **Harbour View House**, **10 Demo Street**.
2. Keep both watchlists open and run:

   ```sh
   docker compose exec backend bin/rails demo:update_property
   ```

   Both windows update without refresh: the price increases by AUD 1,000 and the
   status changes. Repeat to see another change.
3. Remove Sam's watch and repeat. Only Alex receives subsequent updates for that
   property. Log out to clear private data and disconnect live updates.
4. Interrupt the network, run an update, then reconnect. The client displays a
   connection warning and reconciles current values when its socket reconnects.

## Tradeoffs

This is a local coding-challenge application, with synthetic listings and illustrative
fallback artwork. Location search uses escaped `ILIKE` substring matching. A sequential
scan is appropriate for 48 rows; a larger dataset should add `pg_trgm` GIN indexes on
address and suburb. Price, type/price, bedrooms and relationship queries have B-tree
indexes. The saved-ID payload grows with watchlist membership, while listing payloads
and rendering are bounded.

Delivery is best effort after commit, with reconciliation rather than durable event
history. CookieStore logout does not revoke copied cookies or other HTTP sessions;
server-side revocation and login rate limiting would be appropriate for deployment.
The supplied credentials and secret are development defaults. Production hosting,
TLS, secret management and deployment operations are outside this challenge's scope.
