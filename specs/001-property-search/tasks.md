# Submission validation

The implemented scope is defined in [spec.md](spec.md). Reproducible startup, test and
real-time demonstration commands are maintained in the [README](../../README.md).

Review areas:

- Strict TypeScript checking, Jest and production frontend build.
- Combined search filters and URL pagination, including authentication return flows.
- Rails boot/autoloading, PostgreSQL migrations and generated schema.
- RSpec authentication, CSRF, expiry, owner isolation and concurrent-save coverage.
- Bounded watchlist listing payloads/rendering and membership outside the current page.
- Real PostgreSQL ActionCable delivery from a separate writer process, removal,
  unauthorized access, logout, expiry and reconnection.
- Fresh Compose startup and preservation of modified data across restarts and seeds.
- Mobile/desktop browsing, forms, focus, keyboard navigation and retry states.

Automated suites live alongside the application code. The transport smoke check is
`frontend/scripts/verify-realtime.cjs`; it restores the demo values and memberships it changes.
