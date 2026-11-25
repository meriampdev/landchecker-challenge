# Feature Specification: Property Search and Personal Watchlists

**Feature Branch**: Not created; no branch-creation hook is configured.

**Created**: 2026-11-25

**Status**: Draft

**Input**: Build a property-search application for the Landchecker Senior Fullstack Coding
Challenge with filtered, paginated listings, login/logout, private persistent watchlists,
real-time watched-property updates, Australian demo data, and Docker-based delivery within
approximately 3–4 hours. This specification authorizes no implementation yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Filter Properties (Priority: P1)

As a visitor, I can browse Australian properties and narrow the list to my budget, bedroom
needs, and property type so that I can find relevant homes.

**Why this priority**: Property discovery is the core value and works without an account.

**Independent Test**: With demo listings loaded, browse all pages and apply individual and
combined filters without logging in; verify matching results and complete listing details.

**Acceptance Scenarios**:

1. **Given** at least 48 demo properties, **When** I open listings, **Then** I see the first
   12 properties, the result count, current page, and usable pagination controls.
2. **Given** a listing card, **When** it renders, **Then** it shows title, address, suburb,
   AUD price, type, status, bedrooms, bathrooms, parking, a local image or visual placeholder,
   and a save control indicating when login is required.
3. **Given** I am on page 2 or later, **When** I apply or clear any filter, **Then** the result
   page resets to 1 and all supplied filters are applied together by the backend.
4. **Given** matching results span multiple pages, **When** I move between pages, **Then**
   filters remain applied and each full page contains 12 results in stable order without
   duplicates or omissions when the underlying data has not changed.
5. **Given** no properties match, **When** results load, **Then** I see an empty message and
   can clear or adjust filters.
6. **Given** a search is loading or fails, **When** I view the results area, **Then** I see a
   loading state or an error with retry; retry retains the requested filters and page.

### User Story 2 - Log In and Manage a Private Watchlist (Priority: P1)

As a demo user, I can log in, save homes, revisit my watchlist, remove homes, and log out
without exposing my saved choices to another user.

**Why this priority**: Persistent personal watchlists are required functionality and establish
ownership boundaries for real-time updates.

**Independent Test**: Use each of the two demo users separately to save and remove properties,
refresh, and attempt cross-user access; verify persistence and isolation.

**Acceptance Scenarios**:

1. **Given** valid demo credentials, **When** I log in, **Then** I see my authenticated state
   and can access my watchlist. Invalid credentials produce a clear error and allow retry.
2. **Given** I am signed in, **When** I save a listing, **Then** its control shows pending
   progress and then saved status, and it appears once in my watchlist.
3. **Given** a property is already saved, **When** saves are repeated or submitted concurrently,
   **Then** my watchlist still contains exactly one entry for that property.
4. **Given** I have saved a property, **When** I refresh while signed in or log out and back in,
   **Then** my saved property remains in my watchlist.
5. **Given** a saved property, **When** I remove it from listings or the watchlist, **Then** it
   disappears from my watchlist and visible save controls reflect the removal. A failed
   mutation reports an error and retains or restores the last confirmed state for retry.
6. **Given** user A's saved properties, **When** user B attempts to read, add to, or remove from
   A's watchlist by altering request identifiers, **Then** access is denied without exposing
   A's watchlist or changing it. Unauthenticated watchlist requests are also denied.
7. **Given** I am signed in, **When** I log out, **Then** my private watchlist is no longer
   visible and subsequent protected requests require login, including after a page refresh.
8. **Given** my watchlist is empty, loading, or unavailable, **When** I open it, **Then** I see
   the appropriate empty, loading, or error/retry state.

### User Story 3 - Observe Live Watched-Property Changes (Priority: P2)

As a signed-in user, I can see changes to watched property prices and statuses without
refreshing, so I can track changing listings.

**Why this priority**: Live updates complete the required assessment experience after browsing
and watchlist ownership are established. P2 is ordering, not optional scope.

**Independent Test**: Sign in with the documented demo user, open the known watched property,
and execute the documented change command. Observe the new values without refreshing.

**Acceptance Scenarios**:

1. **Given** the known property is watched and visible, **When** the documented command changes
   its price and status, **Then** the visible watchlist and any visible listing representation
   show the new values through WebSockets without refresh within 3 seconds on the local demo.
2. **Given** two signed-in users both watch the property, **When** it changes, **Then** both
   connected users receive updated values without refresh.
3. **Given** a user does not watch a property, **When** it changes, **Then** their private
   subscription does not receive an update for it. Cross-user subscription attempts are denied.
4. **Given** I remove a property or log out, **When** later changes occur, **Then** it no longer
   receives updates through my former watchlist subscription and private UI is cleared on logout.
5. **Given** a live connection drops, **When** I view the watchlist, **Then** a visible indicator
   explains that live updates are unavailable. Reconnection or a retry refreshes watched values
   so missed changes are reflected.

### User Story 4 - Run and Review the Demo (Priority: P2)

As a reviewer, I can start, test, and demonstrate the complete application using Docker and
Git, without installing application runtimes locally.

**Why this priority**: Reproducible delivery is part of the assessment acceptance criteria.

**Independent Test**: Follow the root documentation from a fresh checkout, start the app,
exercise both users and the live demo, and execute the documented validation commands.

**Acceptance Scenarios**:

1. **Given** Docker and Git are installed, **When** I run `docker compose up --build` from a
   fresh checkout, **Then** the application becomes usable with its database and demo data,
   without host runtime setup or a separate manual seed step.
2. **Given** the documentation, **When** I follow it, **Then** I can find the application URL,
   both users' credentials, the known watched property, the repeatable live-update command,
   and commands for backend tests, frontend tests, type checking, and a frontend build.
3. **Given** a completed implementation, **When** its validation commands run, **Then** the
   critical backend/frontend tests and frontend checks pass, and reported results identify
   commands actually run and any failures or unexecuted checks.

### Edge Cases

- Blank filters mean no constraint; zero is a valid minimum. Price bounds are inclusive and
  minimum bedrooms means greater than or equal to the supplied whole number.
- Negative prices or bedroom counts, malformed numbers, unsupported types, and minimum price
  greater than maximum price are rejected server-side with clear field-level feedback.
- An omitted page means page 1. Non-positive or non-integer pages are rejected clearly. A valid
  page beyond available results returns an empty result with navigation back to valid pages.
- A last page can have fewer than 12 listings; zero results never display misleading page links.
- Rapid filter/page changes must not allow a stale response to replace the latest requested
  results. Pending save/remove controls prevent accidental repeated interactions.
- Removing an already removed property has no additional effect. Requests referencing a
  nonexistent property fail clearly without creating a watchlist entry.
- Expired or invalid authentication clears private content and prompts login; protected
  mutations and live subscriptions fail securely.
- A missing or unusable local image displays a stable placeholder without broken layout.
- A live price/status update refreshes visible values; automatic reordering or removal from
  filtered search results is not required until the next search or page request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Visitors MUST browse listings without login. Every card MUST include all fields
  specified in Story 1, using clearly formatted AUD prices and readable type/status labels.
- **FR-002**: The backend MUST apply optional minimum price, maximum price, minimum bedrooms,
  and one property type (`house`, `apartment`, `townhouse`) together; omitted type means all.
- **FR-003**: The backend MUST paginate matching results at 12 listings per page and supply
  enough information for result count and valid page navigation. Ordering MUST be deterministic.
- **FR-004**: Applying or clearing filters MUST reset pagination to page 1; page changes MUST
  preserve filters. Invalid filters and pages MUST be validated on the server.
- **FR-005**: Users MUST log in with demo credentials and log out. Authenticated state MUST
  survive an ordinary refresh until logout or session expiry. Login failures MUST allow retry.
- **FR-006**: Authenticated users MUST save/remove properties from listings and view/remove
  them in their personal watchlist. Confirmed saved state MUST agree across visible views.
- **FR-007**: Watchlists MUST persist across refresh and later login, and MUST contain at most
  one entry per user/property pair, including concurrent repeated saves.
- **FR-008**: The server MUST scope watchlist reads, mutations, and live subscriptions to the
  authenticated owner. Client-supplied identifiers MUST NOT grant access to another user.
- **FR-009**: Price/status changes to watched properties MUST reach connected authorized users
  through WebSockets without refresh and update all visible representations of those properties.
- **FR-010**: Removing a watch or logging out MUST stop its private live delivery. Connection
  failures MUST be visible, and reconnect/retry MUST resynchronize current watched values.
- **FR-011**: Demo data MUST include at least 48 distinct Australian properties spanning all
  three types, multiple suburbs, varied prices and room counts, and multiple listing statuses.
  It MUST include two users with nonidentical watchlists and a documented known watched property.
- **FR-012**: Listing and watchlist reads MUST show loading, error/retry, and empty states.
  Login and save/remove actions MUST show pending and failure feedback and support retry.
- **FR-013**: The interface MUST remain usable at 375px and 1280px widths without horizontal
  page overflow. Forms and controls MUST have accessible names, visible keyboard focus,
  keyboard operation, and perceivable error/status feedback.
- **FR-014**: Root documentation MUST cover startup, demo credentials, tests/checks, and a
  repeatable command that changes a known watched property's price/status, with expected
  browser results and instructions for observing the real-time demonstration.
- **FR-015**: Fresh startup MUST work through `docker compose up --build` with Docker and Git
  as the only host prerequisites. Repeated startup/data initialization MUST NOT duplicate demo
  properties, users, or watchlist entries.
- **FR-016**: Critical tests MUST cover backend filtering, pagination, login/logout, persistent
  watchlist operations, duplicate prevention, ownership and subscription authorization, and
  live update delivery; frontend coverage MUST exercise filtering/page reset, login/logout,
  watchlist interactions, failure states, and displayed live updates. Frontend type checking
  and a production build MUST also pass before delivery is described as verified.

### Key Entities *(include if feature involves data)*

- **Property**: A demo Australian listing with a stable identity, title, street address, suburb,
  AUD price, type, status, bedrooms, bathrooms, parking, and a local image reference or placeholder.
- **User**: A demo account with credentials and an authenticated identity; owns a private watchlist.
- **Watchlist Entry**: A persistent relationship between one user and one property, unique for
  that pair. Removing it does not delete the property or another user's entry.
- **Property Update**: A committed price and/or status change associated with a property,
  delivered live only to authorized watchers. Historical update storage is not required.

### Required Delivery and Technology Constraints

These are explicit user requirements, not additional design choices introduced by this spec.

- Use a Ruby on Rails REST API, PostgreSQL, React with TypeScript and hooks, and ActionCable.
- Use RSpec for backend tests and Jest with React Testing Library for frontend tests.
- Follow constitution v1.0.0: separate `frontend/` and `backend/` in one root Git repository,
  each owning dependencies, configuration, Dockerfile, and tests; root Compose and documentation.
- Preserve frontend feature locality (`auth`, `properties`, `watchlist`) and Rails conventions;
  enforce key invariants with database constraints and avoid N+1 queries.
- Target approximately 3–4 hours of implementation. No registration, password reset, maps,
  external property APIs, or infinite scroll. No admin editing UI or property detail page is
  required; the documented command provides the live-update trigger.
- Bonus work is allowed only after all required functionality and checks work. No bonus feature
  is part of this specification's acceptance criteria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can browse at least 48 distinct listings and reach every listing by
  pagination, with 12 listings on each full page and no duplicates in an unchanged dataset.
- **SC-002**: Every individual and combined filter returns only matching listings; applying
  or clearing a filter from a later page always returns to page 1.
- **SC-003**: Both demo users can save, refresh, revisit, and remove properties successfully;
  repeated/concurrent saves leave exactly one saved copy per user/property pair.
- **SC-004**: All attempted unauthenticated or cross-user watchlist reads, writes, and private
  live subscriptions in the acceptance tests are denied without exposing private saved choices.
- **SC-005**: A documented watched-property price/status change appears in connected watchers'
  browsers within 3 seconds in the local demo without refresh; disconnected users can recover
  the current values after reconnect/retry.
- **SC-006**: At 375px and 1280px viewport widths, a reviewer can browse, filter, log in, save,
  view/remove saved properties, and log out using only the keyboard, with visible focus and
  no horizontal page overflow.
- **SC-007**: Starting from a fresh checkout, a reviewer following the documented single startup
  command can access seeded listings and both demo accounts without host runtime installation.
- **SC-008**: Every documented critical test and frontend validation command succeeds before
  the delivery is reported as passing; the delivery report lists any unexecuted checks honestly.

## Assumptions

- Browsing is public; email/password demo login protects watchlists. There is no sign-up flow.
- Prices are nonnegative whole AUD amounts; bedroom, bathroom, and parking counts are
  nonnegative integers. Listing statuses are `available`, `under_offer`, and `sold`.
  All statuses remain browsable; status is displayed but is not an additional search filter.
- Results use a stable default order by property identity. No user-selectable sort is required.
- The watchlist is a single list per user; displaying all saved entries is sufficient for the
  small demo dataset. Only the main property search requires 12-item server-side pagination.
- At least one demo user starts with the documented watched property. The users' initial lists
  differ; they may share a property to demonstrate delivery to both watchers.
- The demo command can be run repeatedly and produces an observable valid change each time.
  No external property feed or external image service is needed.
- The target is a local assessment demo with normal Docker build network access and available
  documented ports, not a production deployment, large-scale load test, or offline build.
- The three-second live-update target applies to healthy local demo connections. Recovery
  covers current values, not replay of every intermediate event or a historical audit trail.

## UI revision — 2026-11-25

The supplied `ui.zip` is a visual/interaction reference, adapted to existing Australian
listings, Rails APIs, filter semantics, pagination and live watchlists. Use warm paper,
forest accents, editorial typography, responsive sidebar filters and image-led cards.
Header contains Explore homes, Watchlist and logged-out Log in or authenticated Log out;
Sell and Journal are excluded. A dedicated hash login route uses existing cookie/CSRF auth.
Anonymous saves and private watchlist access redirect to login with an allowlisted return
route. Deferred saves use idempotent PUT membership rather than a toggle. Keep the public
browser mounted across login to retain applied filters and pagination. No property detail
route or separate like endpoint exists in this application; existing save controls are the
heart/favorite interaction. No reference mock data or dependencies are imported.
