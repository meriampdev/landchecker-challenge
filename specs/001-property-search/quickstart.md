# Planned Quickstart and Validation Guide

This guide defines the commands and expected outcomes for the future implementation. Application
files do not exist yet; none of the commands below has been executed successfully in this phase.
Copy verified commands into the root README during implementation and report actual results.

## Prerequisites and startup

Only Git and Docker Engine/Desktop with Compose v2 are required. Allocate available local ports
5173 and 3000 and allow network access to package/image registries on the first build. No local
Ruby, Rails, Node, npm, or PostgreSQL installation is required. Apple Silicon and Intel/AMD use
native multiarch images without a forced platform.

From the repository root:

```sh
docker compose up --build
```

Expected: db becomes healthy, backend prepares schema and initializes missing demo data, Rails
listens on 0.0.0.0:3000, Vite on 0.0.0.0:5173. Open http://localhost:5173. No manual .env or seed
step is needed. Wait for both servers to be ready before browser checks. Frontend API and cable
traffic must use the browser origin, not Docker hostnames.

Initial credentials (local demonstration only):

| User | Email | Password |
|---|---|---|
| Alex | alex@example.com | DemoPassword123! |
| Sam | sam@example.com | DemoPassword123! |

Stop with Ctrl-C, or `docker compose down` after a detached run; this preserves the named DB
volume. `docker compose down -v` deliberately deletes all demo/user data for a fresh-start test;
use only when that data loss is intended. Existing account/password/listing/watch changes are
not reset by an ordinary restart.

## Automated validation

After startup, run each command from the repository root:

```sh
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bin/rails db:prepare
docker compose exec -e RAILS_ENV=test -e DATABASE_URL=postgresql://landchecker:landchecker@db:5432/landchecker_test backend bundle exec rspec
docker compose exec frontend npm test -- --runInBand
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run build
```

Expected: isolated test database, RSpec/Jest exit 0, Jest exits without watch mode, typecheck
reports no errors and build creates production assets. Test env uses ActionCable test adapter;
no test or one-off command runs bin/server or initializes development seeds. Test preparation
may need empty test-safe seeds; demo seeds must be explicitly guarded to development only.
These are planned validations, not recorded passes.

## Browse, ownership and accessibility checks

1. Browse anonymously: >=48 properties, four or more pages, 12 cards on full pages, all required
   fields and AUD formatting; see [HTTP contract](contracts/http-api.md).
2. On page 2, apply each filter and combinations; verify page 1, inclusive matches, result count
   and retained filters when navigating. Use network inspection to verify backend filtering and
   pagination. Exercise invalid input, no matches, network failure/retry and loading states.
3. Log in as Alex, save a listing, refresh, view the watchlist, remove and revisit listings.
   Repeated saves produce one entry; a failed mutation retains confirmed state and allows retry.
4. In a separate browser profile/private window log in as Sam. Verify different initial watches
   and independent mutations. Requests trying to select Alex through user_id must be rejected;
   unauthenticated watchlist requests fail. Verify login itself rejects missing CSRF.
5. At widths 375px and 1280px use keyboard only through filters, pagination, login, save/remove,
   watchlist navigation and logout. Check visible focus, labels, live feedback and no page overflow.
6. Change a property and remove an initial watch, then restart the application normally. Verify
   values/removal remain changed and the dataset/users have not duplicated.

## Real-time demonstration

1. Log in as Alex, open Watchlist, and find **Harbour View House**, **10 Demo Street**,
   **Richmond VIC 3121**. Seeds initialize it as watched; if previously removed, save it again.
2. Optionally log in as Sam in a second browser profile, save the same property and open its
   watchlist. Both users should observe the update; non-watchers must not receive the event.
3. Keep the browsers open and run:

   ```sh
   docker compose exec backend bin/rails demo:update_property
   ```

4. Expect the command to print the property's ID, increased AUD price and changed status. Within
   3 seconds both connected watchers see updated values without refresh and a subtle notification.
   Inspect the WebSocket frame if needed; this command runs in a different Rails process.
5. Repeat the command; price increases another AUD 1,000 and status changes again. The command
   must keep producing visible updates, not assign the same values on repeated runs.
6. Remove the property for Sam and run again: Alex updates; Sam receives no later watch event.
   Log Alex out and verify private content clears and the cable connection is terminated.
7. Temporarily interrupt the live connection, run the command, and reconnect/retry. Verify a
   visible disconnection state and current watched values restored without manual page refresh.

See [real-time contract](contracts/realtime.md) for payload, origin/authentication and reconnect
rules, and [data model](data-model.md) for recipient indexes and commit semantics.

## README delivery checklist in prose

The root README must reproduce validated startup/credentials/test/demo instructions, explain
frontend feature ownership and Rails query responsibilities, justify indexes, and disclose
limitations. Include best-effort live delivery, local demo secrets, CookieStore replay revocation,
no admin UI or external data, and no production Vite hosting. Production considerations include
TLS/Secure cookies, secret management, server-side revocation/rate limiting, origin restrictions,
least-privilege DB users, migration/backups and reliable broadcast delivery. Record commands
actually run, their outcomes and any gaps. Do not report this planning guide as executed evidence.
