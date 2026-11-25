# HTTP API Contract

Base path `/api/v1`, JSON; browser uses same-origin Vite proxy and session cookies. This is a
planned contract, not a deployed API. No client-supplied user ID selects an owner.

## Common shapes and security

User: `{ "id": 1, "email": "alex@example.com" }`. Never include password_digest.

Property:

```json
{
  "id": 1,
  "title": "Harbour View House",
  "address": "10 Demo Street",
  "suburb": "Richmond VIC 3121",
  "property_type": "house",
  "price_cents": 95000000,
  "bedrooms": 3,
  "bathrooms": 2,
  "parking_spaces": 1,
  "status": "available",
  "image_path": "",
  "updated_at": "2026-11-25T08:00:00.000000Z"
}
```

IDs above are illustrative; use actual IDs in responses. Cents are integer JSON numbers within
JavaScript's safe range; format AUD in the UI using Intl.NumberFormat. updated_at uses UTC
ISO-8601 with database precision. Empty image_path selects a local visual placeholder.

Errors use the same structure across controllers, including CSRF and missing routes:

```json
{
  "error": {
    "code": "invalid_parameters",
    "message": "Check the supplied filters.",
    "fields": { "min_price": ["must be a nonnegative whole AUD amount"] }
  }
}
```

`fields` is an object (empty when inapplicable). Status mapping: 400 malformed JSON/parameter
shape or owner override, 401 authentication_required/invalid_credentials, 403 invalid_csrf or
forbidden, 404 not_found, 422 invalid_parameters/validation_failed, 500 internal_error with
no stacktrace or secret. JSON required for mutation bodies (415 for unsupported content type).
An empty DELETE body is allowed. Error feedback must not reveal whether another user saved a
property. Authentication/CSRF checks precede mutations; a missing token can yield 403 before
401. Tests for unauthenticated authorization use a valid anonymous CSRF handshake.

All mutations require X-CSRF-Token, same-origin cookie and permitted Origin when supplied,
including POST session. GET csrf and session/me/watchlist responses are Cache-Control: no-store.
A 401 clears authenticated UI; a 403 CSRF failure renews the token and offers explicit retry,
without silently replaying a mutation. No public endpoint writes property prices/statuses.

## Endpoints

| Method/path | Access / request | Success |
|---|---|---|
| GET /csrf | Public, establishes anonymous cookie | 200 `{ "csrf_token": "masked-token" }` |
| POST /session | Public with CSRF; `{ "email": "alex@example.com", "password": "DemoPassword123!" }` | 200 `{ "user": User, "csrf_token": "rotated-token" }` after reset_session |
| DELETE /session | Authenticated with CSRF, no body | 200 `{ "user": null, "csrf_token": "new-anonymous-token" }`; session reset, remote cable disconnected |
| GET /me | Authenticated | 200 `{ "user": User }`; anonymous/expired 401 |
| GET /properties | Public, validated query below | 200 `{ "properties": [Property], "meta": Pagination }` |
| GET /watchlist | Authenticated | 200 `{ "properties": [Property], "saved_ids": [ID], "meta": { "page": 1, "per_page": 12, "total_count": 14, "total_pages": 2 } }`; stable property ID order, 12 listings per page; all owned membership IDs |
| PUT /watchlist/:property_id | Authenticated with CSRF; no body required | 200 `{ "property": Property }` whether created or already saved |
| DELETE /watchlist/:property_id | Authenticated with CSRF; no body | 204 empty whether own entry exists or already removed |

PUT/DELETE accept only a scalar positive property ID in the path and no owner fields. Reject
`GET /watchlist` accepts only an optional positive integer `page` query (up to nine digits), clamped to the last available page. Writes accept no query/body overrides.

`user_id`/`watchlist_entry_id`/owner overrides in query or body with 400; no endpoint accepts a
watchlist entry ID. Existing property missing from current user's watches is not another
user's resource: DELETE succeeds as a no-op. A nonexistent property yields 404 for both methods.
Saves are idempotent under the DB unique index, including competing requests.

## Search parameters

| Parameter | Meaning / validation |
|---|---|
| min_price | Optional nonnegative whole AUD amount, inclusive; converted to cents exactly |
| max_price | Same; must be >= min_price when both supplied |
| min_bedrooms | Optional nonnegative integer, inclusive minimum, within PostgreSQL integer range |
| property_type | Optional house / apartment / townhouse |
| page | Optional positive integer, default 1; bounds checked before offset arithmetic |

Blank filter values are omitted; blank page is invalid. Reject arrays/objects, decimals,
malformed numeric strings, negatives, unsupported types and unsafe numeric/offset values with
422. min/max price conversion must remain within safe integer cents. Page must fit signed
32-bit integer; compute offset safely. Unknown query keys, including per_page/page_size and
owner override fields, yield 400. Page size is fixed at 12, never client controlled.

Pagination shape:

```json
{ "page": 1, "per_page": 12, "total_count": 48, "total_pages": 4 }
```

Apply all supplied filters with AND, count the filtered set, then order id ASC and page. Empty
matches produce properties:[], total_count:0, total_pages:0. Positive pages beyond total_pages
produce properties:[] with the requested page and accurate counts. No implicit clamp or wrap.
Changing/clearing a filter resets frontend page to 1; navigating retains applied filters.
Public responses contain no owner-specific saved flag; derive saved controls from /watchlist.

## Required contract checks

- Verify the real cookie/token exchange, rotated token after login/logout, missing/invalid CSRF
  denial including login, invalid credentials and authenticated me/refresh.
- Verify filter boundaries/combinations, fixed page size/counts/order, invalid parameter shapes
  and out-of-range pages. Browser never downloads all properties to implement search.
- Verify A/B independence, override rejection, anonymous denial, repeated/concurrent saves,
  repeated deletes, nonexistent property, DB constraint enforcement and query counts.
