# Data Model: Property Search

All tables use Rails bigint primary keys and non-null created_at/updated_at timestamps.
Rails models own associations and validations; PostgreSQL enforces invariants under concurrency.
No application implementation or migration is included in this document.

## User

| Field | Storage / rules |
|---|---|
| email | text/string NOT NULL; stripped lowercase before validation; nonblank email format |
| password_digest | string NOT NULL; bcrypt through has_secure_password; never serialized |
| timestamps | NOT NULL |

Unique functional index on lower(email) enforces case-insensitive identity even when writes
bypass normalization. Lookups use normalized email and a compatible lower(email) predicate.
Validate password length for new/changed passwords (minimum 8, bcrypt byte limit respected).
User has_many watchlist_entries and properties through watchlist_entries; dependent deletion
removes entries, not properties. Foreign-key cascade or Rails dependent destruction must match.

Session payload is encrypted/signed CookieStore data: user_id, explicit expires_at and Rails
session/CSRF state. It is not a fourth database table. Expiry checked in HTTP and cable paths.

## Property

| Field | Storage / rules |
|---|---|
| title | string NOT NULL; nonblank |
| address | string NOT NULL; street and location identifying the seeded property |
| suburb | string NOT NULL; nonblank |
| property_type | string NOT NULL; house / apartment / townhouse |
| price_cents | bigint NOT NULL; >= 0; API values capped at JavaScript safe integer |
| bedrooms | integer NOT NULL; >= 0 |
| bathrooms | integer NOT NULL; >= 0 |
| parking_spaces | integer NOT NULL; >= 0 |
| status | string NOT NULL; available / under_offer / sold |
| image_path | string NOT NULL; default empty string means visual placeholder |
| timestamps | NOT NULL |

Add CHECK constraints for all nonnegative numeric fields and allowed type/status values.
Cap price_cents at 9,007,199,254,740,991 in validation and DB CHECK so JSON numeric cents remain
exact in JavaScript. Demo amounts and whole-AUD filters stay far below that bound. Blank image
path or image failure uses placeholder; other paths are local public assets, no remote URLs.

Property has_many watchlist_entries and users/watchers through entries. Property deletion is
not exposed; FK restrict/cascade behavior must be explicit. Use cascade for entry cleanup if a
property/user is deleted administratively; test integrity. No full-text search is required.

## WatchlistEntry

| Field | Storage / rules |
|---|---|
| user_id | bigint NOT NULL, FK users(id), ON DELETE CASCADE |
| property_id | bigint NOT NULL, FK properties(id), ON DELETE CASCADE |
| timestamps | NOT NULL |

Belongs to user and property. Unique composite index `(user_id, property_id)` is authoritative
for duplicate prevention; model validation may provide friendly feedback but is insufficient
under concurrency. PUT recovers a unique violation outside a failed transaction/savepoint and
loads the existing owner-scoped entry. DELETE by owner/property is idempotent.

## Index decisions and query bounds

| Index | Purpose / limitation |
|---|---|
| users lower(email), unique | Case-insensitive account uniqueness and lookup |
| watchlist_entries (user_id, property_id), unique | Ownership lookup, full owner list, race-safe saves; no redundant standalone user index |
| watchlist_entries (property_id, user_id) | Reverse lookup of recipient IDs for a changed property; no redundant standalone property index |
| properties (property_type, price_cents) | Equality type plus inclusive price range; can also serve type-only searches |
| properties (price_cents) | Price ranges without a type |
| properties (bedrooms) | Minimum-bedroom filtering; planner may combine indexes |
| properties primary key (id) | Deterministic browse order |

Range filters plus id ordering may still require a sort. At 48 records the planner may prefer
a sequential scan; do not claim indexes guarantee speedups. No status/suburb index is needed
because these are not filters. Do not add a combinatorial index for each filter combination.

Search performs count plus paged property fetch, with no association query per card. Watchlist
uses includes(:property), at most two data queries plus authentication. Broadcasting uses one
indexed pluck of distinct watcher IDs, not per-property eager-loading of User records.

## State and event transitions

- Login: anonymous → authenticated after bcrypt verification and session rotation; invalid
  credentials leave anonymous state. Logout/expiry clears access and disconnects live sessions.
- Watch: absent → present by idempotent PUT; present → absent by idempotent DELETE. Entries for
  other users are unchanged and cannot be selected through the owner's API.
- Property: nonnegative price can change; any of the three statuses may transition to another.
  Only committed price/status changes emit events. Timestamp/title-only changes do not.
- Rollback: no event. Bulk updates skipping model callbacks are not used for the demo task.
- Delivery is best effort; reconnect reads current committed values, not historical events.

## Creation-only demo initialization

Serialize seeds with a transaction advisory lock. Create at least 48 stable address-keyed
properties with varied prices, rooms, types, suburbs and statuses. Find-or-create records;
never update existing attributes on startup. Create alex@example.com and sam@example.com with
DemoPassword123! only on first creation; create initial watches only for newly created users
in that same transaction. The known property is Harbour View House, 10 Demo Street,
Richmond VIC 3121. No dedicated seed marker table is needed for this assessment.
