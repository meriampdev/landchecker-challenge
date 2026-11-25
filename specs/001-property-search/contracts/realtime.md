# Real-Time Contract

## Transport and authorization

- ActionCable at `/cable`; @rails/actioncable consumer uses the browser host with ws on HTTP
  and wss on HTTPS. Vite forwards the upgrade to backend:3000, preserving Host/Origin.
- Default allowed origins: http://localhost:5173 and http://127.0.0.1:5173 only. Reject others.
- ApplicationCable::Connection decrypts the configured session cookie and resolves current_user
  and expires_at server-side. Anonymous, invalid and expired sessions are rejected. Identify
  current_user for cross-process remote disconnection and close at session expiry.
- Subscribe using `{ "channel": "WatchlistChannel" }`. No user_id or property IDs are required;
  reject supplied owner-selection parameters rather than treating them as authorization.
- Stream is derived solely from current_user (`stream_for current_user`). No client-originated
  price/status updates or watch mutations are supported over cable.
- Use `postgresql` adapter in the demo environment, same database and channel_prefix in every
  process. Test adapter is only for isolated tests. Never async for the cross-process demo.

## Property update event

```json
{
  "type": "property.updated",
  "property": {
    "id": 1,
    "price_cents": 95010000,
    "status": "under_offer",
    "updated_at": "2026-11-25T08:01:00.000000Z"
  }
}
```

Payload stays below PostgreSQL NOTIFY's 8,000-byte limit. Do not include credentials, images,
watchlist contents or user identity. after_update_commit sends only for saved price_cents or
status changes, with one current watcher-ID lookup and one user-stream broadcast per recipient.
A transaction rollback or unrelated field change emits nothing. A non-watcher gets no event.

The demo task is `docker compose exec backend bin/rails demo:update_property`. It finds the
stable seeded address, row-locks, increments price by 100000 cents, toggles status to a different
valid value, calls update! and prints the changed values. Running it in a separate Rails process
proves the configured transport reaches the already-running web server.

## Frontend event handling and lifecycle

- Connect only after authentication bootstrap; one consumer/subscription per active identity.
- Patch existing property representations in cached search pages and current watchlist. Never
  add a property to the watchlist because an event arrived. Ignore unknown event types, invalid
  payloads and older timestamps; ignore IDs no longer watched and callbacks from old identities.
- Cancel affected in-flight reads before cache reconciliation, then invalidate/refetch to avoid
  stale snapshots overwriting current data. Fetch callbacks/events use auth generation guards.
- Show a subtle accessible status notification (not a modal), with updated price/status visible
  within 3 seconds for healthy local connections. Refetch may reconcile filter membership.
- On disconnect, show live-unavailable status; on successful reconnect, revalidate /me,
  /watchlist and active listing queries. Offer explicit retry if disconnected/rejected.
- On removal, confirmed membership excludes that property from later event handling. Broadcast
  recipient lookup excludes it on subsequent commits. Already queued pre-removal events may
  arrive but are ignored; transport cancellation is not a claim of instantaneous delivery ordering.
- On logout, server remotely disconnects the user's connections with reconnect:false; browser
  unsubscribes/disconnects, cancels HTTP queries and clears private caches. Broadcasts then
  cannot update the logged-out UI. All cable connections for that user close; other browser
  HTTP sessions are not globally revoked by this CookieStore design.

## Verification

RSpec tests connection rejection, server-derived identity, foreign owner parameters, watcher
recipient selection, remove/logout behavior, expiry, commit/rollback and unchanged-field behavior.
RTL injects events through a mocked consumer to verify displayed values and cleanup/reconnect.
The documented two-browser/task demonstration verifies actual PostgreSQL cross-process delivery;
mock tests alone do not establish it. Reconnect replays current values, not every historical event.
