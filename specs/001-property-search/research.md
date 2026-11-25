# Research Decisions: Property Search

Research date: 2026-11-25. Official documentation was reviewed; no generators, dependency
installation, image pulls, runtime tests, or application builds were executed in this phase.

## Runtime and dependency baseline

**Decision**: Pin Ruby 3.4.13 and Rails 8.1.4.1; Node 22.21.1, Vite 7, React 19, TypeScript 5.9,
TanStack Query 5, Jest 30; PostgreSQL 17.7. Align @rails/actioncable with the Rails release.
Resolve exact package/gem versions once during implementation and commit both lockfiles.
Verify the proposed Debian multiarch image tags before relying on them.

**Rationale**: Ruby 3.4 fits Rails 8.1; Node 22.21.1 satisfies Vite's Node 22.12+ requirement.
Exact pins and lockfiles make generator/build behavior repeatable. These are compatible
baselines, not claims of latest patches. Native pg/bcrypt must work on both Linux architectures.

**Alternatives considered**: `latest` generators/images introduce drift; host runtimes burden
reviewers; forced amd64 adds emulation on Apple Silicon. Avoid all three.

Sources: [Ruby 3.4.13 release](https://www.ruby-lang.org/en/news/2026/11/18/ruby-3-4-13-released/),
[Rails 8.1.4.1](https://rubygems.org/gems/rails/versions/8.1.4.1),
[Node 22.21.1 release](https://nodejs.org/en/blog/release/v22.21.1),
[Vite prerequisites](https://vite.dev/guide/),
[PostgreSQL 17.7 release](https://www.postgresql.org/docs/17/release-17-7.html).

## Same-origin sessions and CSRF

**Decision**: Restore Rails cookie/session middleware explicitly in API mode; use bcrypt and
CookieStore, and include request forgery protection explicitly. Use a GET token endpoint and
X-CSRF-Token for all mutations including login. Rotate session/token on authentication changes.
Proxy API and cable from Vite without replacing browser Host/Origin. Restrict hosts and origins.

**Rationale**: API-only Rails excludes browser session middleware and CSRF defaults. The browser
sees one origin, avoiding cross-origin cookies and CORS complexity. Proxy preservation ensures
CSRF origin checks are meaningful rather than disabled to accommodate Docker hostnames.

**Alternatives considered**: JWT storage adds unnecessary token lifecycle; exempting login from
CSRF is unsafe; server-side revocable sessions are useful production work but add persistence
beyond the three required entities. Cookie replay revocation remains an explicit limitation.

Sources: [Rails API middleware](https://guides.rubyonrails.org/v8.1/api_app.html),
[CSRF module](https://api.rubyonrails.org/classes/ActionController/RequestForgeryProtection.html),
[Rails security](https://guides.rubyonrails.org/security.html).

## Cross-process authenticated live updates

**Decision**: Use ActionCable `postgresql` adapter, identical database/prefix in the web server
and rake task, and a compact event per affected user's stream after commit. Decrypt the same
configured session cookie in ApplicationCable::Connection; do not assume controller session
access in a WebSocket connection. Check expiry and close established connections on expiry.
Logout also uses remote disconnection with reconnect disabled.

**Rationale**: PostgreSQL synchronizes messages across processes without a fourth service.
PostgreSQL NOTIFY limits payload size to under 8,000 bytes: send ID, cents, status, updated_at,
not images or entire watchlists. A single user stream needs no resubscribe after each save.
Recipient lookup reflects current database ownership, not channel parameters.

**Alternatives considered**: Async adapter cannot deliver task-process messages to server
sockets. Redis adds infrastructure not required here. Per-property public streams expose
updates to unwatched users and complicate subscription changes. An outbox is unnecessary for
a local best-effort demo with revalidation, but required for stronger delivery guarantees.

Sources: [ActionCable adapters, authentication, origins and notes](https://guides.rubyonrails.org/action_cable_overview.html),
[Remote disconnection](https://api.rubyonrails.org/classes/ActionCable/RemoteConnections.html).

## Frontend state and test integration

**Decision**: Auth Context for identity/token lifecycle; TanStack Query for reads/mutations and
immutable event patches. Cross-feature coordination belongs to app composition, not internal
feature imports. Jest uses babel-jest with TypeScript/JSX presets, jsdom and CSS module mapping;
`tsc -b` separately validates types. Default `npm test` exits, with optional --runInBand.

**Rationale**: This keeps user identity separate from query caching and enables isolated RTL
flows without adopting extra global state or routing infrastructure. Babel transformation is
independent of Vite and avoids ts-jest/Jest major compatibility coupling.

**Alternatives considered**: Hand-built effect/fetch caching duplicates TanStack responsibilities;
Vitest violates the explicit Jest requirement; a single shared global feature module violates
locality. Polling does not meet the WebSocket requirement.

Sources: [Jest TypeScript setup](https://jestjs.io/docs/getting-started),
[TanStack Query cache updates](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses).

## Startup, seeds, indexes and query design

**Decision**: Compose health-gates backend on db; server-only script additionally retries a
real connection, prepares schema and runs creation-only seeds. One-off commands bypass this
script. Seed inside an advisory-locked transaction and initialize each user's watchlist only
on account creation. Use targeted B-tree indexes and includes/pluck rather than extra layers.

**Rationale**: A running DB container is not necessarily ready; explicit health conditions and
connection retries address startup races. Creation-only initialization preserves mutated
property values and removed watches. At 48 records sequential scans are acceptable; index
choices support intended predicates without claiming an index always removes sorting.

**Alternatives considered**: Entrypoint seeding affects tests/tasks and can overwrite changes;
seeding all watches each restart resurrects deliberate removals; indexing every filter
combination adds write/maintenance cost without evidence.

Sources: [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/),
[PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/17/indexes-multicolumn.html),
[PostgreSQL index ordering](https://www.postgresql.org/docs/17/indexes-ordering.html).

## Resolved scope

All planning questions have defaults and decisions above. Docker tag availability, native gem
builds, browser proxy behavior, and separate-process live delivery must be verified during
implementation. They are execution checks, not unresolved product requirements.

## Implementation environment update — 2026-11-25

The user authorized direct application file authoring and compatible existing host tools;
Docker is required for final integration, not source generation. No host runtimes installed.
Host Node is 22.21.1; host Ruby is 3.0.0 and cannot run Rails 8.1.4.1. Both app skeletons were
therefore authored directly; no claim of generator execution. npm registry DNS failed with
ENOTFOUND. Offline cache is incomplete (including ActionCable), so manifest pins remain
proposed/unresolved and both real lockfiles must still be generated. Rails/Ruby/Node/Postgres
pins have not been container-verified. An existing cached TypeScript 5.9.3 tarball is used only
for isolated syntax/pure-function checks, without changing application dependency versions.
Docker socket remains denied. Compose 2.0.0-beta.1 parses configuration but effective host
bindings and all runtime behavior require a supported Compose release and daemon access.
