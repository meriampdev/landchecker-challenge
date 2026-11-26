````markdown
# Landchecker Homes

A property browser with combined location, price, bedroom and property-type filters, listing details, personal watchlists and live price/status updates. Public browsing requires no account. Prices are in AUD; the development dataset contains 48 Australian listings.

## Run locally

Install Docker Engine/Desktop with Docker Compose v2. From the repository root, run:

```sh
docker compose up --build
```

Once the services are ready, open **http://localhost:5173**.

Docker handles application dependencies, database setup and demo data. No host Ruby, Node.js or PostgreSQL installation or `.env` file is required. The first build requires internet access, and ports 3000 and 5173 must be available.

Use either demo account to try personal watchlists:

| Email | Password |
| --- | --- |
| alex@example.com | DemoPassword123! |
| sam@example.com | DemoPassword123! |

### If startup fails…

On macOS, if startup fails with `exec user process caused: operation not permitted` or `EPERM` opening `/app/package.json`, check Docker Desktop’s access to the checkout. Both application services mount the source into `/app`, so folder restrictions can affect them even when the images build successfully.

1. Open **System Settings → Privacy & Security → Files and Folders** and allow Docker Desktop access to the project’s location, if listed.
2. In **Docker Desktop → Settings → Resources → File Sharing**, ensure the checkout’s parent directory is shared.
3. Restart Docker Desktop, then run:

   ```sh
   docker compose up --build --force-recreate
   ```

Alternatively, move the checkout outside protected Desktop/Documents folders—for example, to `~/Projects/landchecker-challenge`—and ensure that location is shared with Docker Desktop.

## Real-time demonstration

1. Sign in as Alex and open Watchlist. In another browser profile or incognito window, sign in as Sam. Ensure both users save **Harbour View House**, **10 Demo Street**.
2. Keep both watchlists open and run this command from the repository root:

   ```sh
   docker compose exec backend bin/rails demo:update_property
   ```

   Both windows update without refreshing: the price increases by AUD 1,000 and the status changes. Repeat the command to see another change.

3. Remove the property from Sam’s watchlist and run the command again. Only Alex receives subsequent updates for that property.
4. To check reconnection, take one browser session offline, run an update, then reconnect. The client displays a connection warning while disconnected and fetches current values when its socket reconnects.
5. Log out to clear private cached data and disconnect live updates.

## My approach

I approached the challenge around three connected flows: finding properties, saving them to a personal watchlist, and receiving updates when a saved property’s price or status changes. React handles presentation and navigation, while Rails handles validation, authentication, authorization and persistence. This keeps business rules enforced on the server while allowing the interface to evolve independently.

On the frontend, TanStack Query manages API data and caching, while React Context manages authentication. Browse filters and pagination are reflected in the URL so navigation preserves the user’s search. Loading, empty, error and save states are handled alongside the main flows. Signing out clears private cached data and closes the live connection.

On the backend, controllers handle requests, models define validations and relationships, and a dedicated query object combines search filters and pagination. Database constraints enforce relationships and unique watchlist entries. Cookie sessions and CSRF protection support authenticated actions, and watchlist access is scoped to the current user.

For live updates, Action Cable sends committed price and status changes to users watching the affected property. The PostgreSQL adapter supports broadcasts across Rails processes without adding Redis to this challenge. The frontend updates its cached data, checks event timestamps and refetches current values when the connection returns, accounting for changes that may have happened while a client was offline.

### Project structure

| Location | Responsibility |
| --- | --- |
| `frontend/src/app/` | Application composition, navigation and live-update integration. |
| `frontend/src/features/` | `auth`, `properties` and `watchlist` modules, including feature-specific API calls, hooks and types. Substantial components keep styles and tests alongside them. |
| `frontend/src/shared/` | Utilities reused across features, including HTTP and navigation helpers. |
| `backend/app/` | Rails controllers, models, search queries and Action Cable channels, organized by responsibility. |
| `backend/db/` | Database migrations, schema and demo seeds. |
| `backend/spec/` | Backend tests organized around the behavior they exercise. |
| `specs/001-property-search/` | Feature requirements, implementation plan, data model, API and real-time contracts, and task breakdown. |
| `.specify/` | Spec Kit configuration, templates and the project constitution. |
| `.circleci/` | Frontend and backend build and verification pipeline. |
| `compose.yaml` | Local PostgreSQL, Rails and Vite services, including startup health checks. |

The frontend groups code by feature so related changes stay close together. Shared code is extracted when it is reused across features. The backend follows Rails conventions so responsibilities are easy to find without introducing a custom architecture. Each application owns its dependencies and Dockerfile; the repository root coordinates startup and documentation.

### Why I used Spec Kit

I used Spec Kit to turn the challenge requirements into an explicit specification, a technical plan and small implementation tasks before working through the code. The project constitution records standards such as feature-based organization, Rails conventions, server-side ownership checks and focused verification.

This is particularly useful when working with an AI coding assistant. The specification provides a consistent reference for expected behavior, while the API and real-time contracts keep the frontend and backend aligned. The task breakdown makes progress and remaining work easier to review.

Spec Kit supports my development process; it does not replace engineering judgment or verification. I use the documented requirements to guide implementation, review the resulting code and check behavior against the intended user flows. The planning files remain in the repository so reviewers can follow the reasoning behind the implementation.

Spec Kit is not required to run the application.
````