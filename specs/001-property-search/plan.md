# Architecture: Property Search and Personal Watchlists

See [the feature specification](spec.md), [data model](data-model.md),
[HTTP contract](contracts/http-api.md) and [real-time contract](contracts/realtime.md).
Startup, tests and the manual demonstration are documented in the [README](../../README.md).

## Application boundaries

Rails owns validation, sessions, authorization, filtering, pagination, persistence and
committed price/status broadcasts. React owns presentation and browser navigation.
The frontend retains feature-based auth, properties and watchlist modules with colocated
styles and tests. TanStack Query caches server state; authentication Context manages
identity, CSRF tokens and generation guards against late responses from an old session.

## Data and transport

PostgreSQL stores integer-cent prices and enforces watch uniqueness and foreign keys.
Public searches and private watchlists return 12 listings per page. Watchlist membership
IDs are returned separately so saved controls remain accurate outside the displayed page.
Relationship preloading avoids N+1 queries. Existing B-tree indexes support numeric/type
filters and owner/recipient lookups. Location substring matching deliberately scans the
small demo dataset; larger datasets should use trigram indexes.

HTTP and WebSocket traffic share Vite's browser origin. Rails API mode explicitly restores
cookies, sessions and CSRF protection, including origin checking. ActionCable authenticates
an encrypted cookie, rejects unsupported subscription parameters and closes at expiry.
Current watchers receive after-commit events over the PostgreSQL adapter. The browser
ignores stale events and refetches current state on reconnection. Delivery is best effort.

## Navigation and lifecycle

Hash URLs contain applied browse filters and pagination. Return destinations accept only
supported internal routes and validated browse query keys. The last browse destination is
retained for explicit return links; hidden browsing does not start new search requests.
Anonymous saves carry an idempotent save intent through login or account creation.
Logout clears private caches and disconnects live subscriptions.

## Development

Compose runs PostgreSQL, Rails and Vite. Database and backend health checks order startup.
The server prepares schema and creation-only development seeds; test commands use a separate
database and bypass server startup. Source mounts provide development reload without
rebuilding. No production deployment platform is included.
