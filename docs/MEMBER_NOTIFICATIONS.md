# Member notifications — inbox and automatic-template API

Implemented locally 27–28 October 2026. Inbox storage/read/clear, automatic-template
APIs, source-event generation, daily mood scheduling and Firebase delivery are
connected in the API. Existing activity logs and Firebase test routes are preserved.
No deployment or CMS/mobile screen is included in these API steps.

## Confirmed scope

The home bell opens an in-app inbox separated by type, with no all-category view:
`message`, `forum`, `mood-reminder`, and `comment-reply`. Forum sources will include
both friends' posts and posts in joined communities. CMS will manage automatic
message templates only; no manual compose/send or broadcast facility is planned.
The template renderer returns title/body snapshots saved into recipient history;
editing templates never updates existing member_notifications rows. Daily mood
reminders target 20:00 in each member's stored IANA timezone and skip completed
local days (user confirmed 28 October 2026).

## Member contract

Existing bearer authentication requires a live eligible member/session. Routes
return `Cache-Control: private, no-store`. Actor identity always comes from the
server guard, never a client member ID. Production responses use the existing
`{ success, alert, data }` wrapper. Deliberate nulls are preserved for inbox and
template controllers; the legacy null-to-empty interceptor is bypassed.

- `GET /me/notifications?type=message&page=1&pageSize=20`: `type` is required and
  must be one of the four values above. Page defaults to 1 (1–100000); page size
  defaults to 20 (1–100). Unknown query fields are rejected. Returns
  `{ data: { items, total, page, pageSize } }`. Lists only that member's retained
  notifications in descending ID order. Each item contains `id`, `type`, `title`,
  `body`, `destination`, `createdAt`, `readAt`; timestamps serialize as UTC ISO.
  Offset pages can shift if new notifications arrive or records are cleared;
  refresh the first page when reopening the category.
- `PATCH /me/notifications/:id/read`: marks an owned, retained notification read.
  Returns `{ data: { id, readAt, unreadNotificationCount } }`. Repeated requests
  preserve the first read timestamp. Cleared, missing and foreign records get 404.
- `DELETE /me/notifications/:id`: sets `deletedAt` without deleting the database
  row. Returns `{ data: { id, deletedAt, unreadNotificationCount } }`. Repeating
  a clear preserves its first deletion timestamp. Missing/foreign records get 404.
  This step supports clearing individual records; bulk clearing is not included.
- Existing `GET /member-auth/me` retains its identity shape inside the standard
  response envelope and adds
  `unreadNotificationCount` across all four types, excluding read or cleared rows.
  This is the project's existing “me” route, not a new `/me` alias. Authentication
  used by guards/middleware/login stays unchanged and does not query the counter.

The app will refresh identity on app foreground/home opening in a later mobile
step. Read/clear responses provide a fresh counter for immediate badge updates.
Concurrent arrivals or actions on another device can change it after the response;
this step does not add realtime subscriptions.

## Persistence and safety

`member_notifications` stores recipient FK, type, title (160), body (1000), typed
JSON destination, creation/read/deletion timestamps. Destinations are internal
chat/post/comment/mood-tracker descriptors, not external URLs. No public create
endpoint exists. Internal producers validate rendered text/destinations, retain
event idempotency and enforce source visibility before writing notifications.
Opening a destination must still enforce that resource's current access rules.
Indexes cover member/type/retained listing and unread counts. Cleared rows remain
stored; no purge/retention policy or admin history access is introduced.
Schema uses the approved development TypeORM synchronization policy. Deploy the
API/schema before consumers call the new endpoints or expect the new field.
Do not start this API against a shared database just to test synchronization.

## Verification

Run `npm test -- --runInBand member-notifications.spec.ts` and `npm run build`.
The focused suite uses real HTTP/controller/DTO/guard/service execution with
synthetic authentication and repository doubles. It covers ownership, category
scope, pagination, invalid inputs, expired/revoked-session rejection, read/clear
retries, history retention, counter inclusion/exclusion and database errors.
It does not establish real MySQL schema/concurrency or device acceptance.


## CMS automatic-template contract (step 2)

All routes require the existing CMS JWT middleware and live `CmsMembersGuard`.
Member JWTs, missing/expired credentials and unlinked/suspended/deleted admins
are rejected. Responses use `{ data: ... }` and `Cache-Control: private, no-store`.
No manual-send, broadcast, arbitrary-type create, or delete endpoint is provided.

- `GET /cms-notification-templates`: returns the four fixed slots in
  `{ items, total: 4, page: 1, pageSize: 4 }`. No request parameters are required.
- `GET /cms-notification-templates/:type`: returns one slot. Type is one of the
  four member-inbox category values; unknown types return 400.
- `PUT /cms-notification-templates/:type`: requires complete JSON
  `{ title, body, revision }`. Title/body are trimmed, nonempty plain text with
  limits 160/1000 UTF-16 units respectively. DTO limits also apply; unknown body
  fields, nulls, wrong types and invalid revisions return 400. Braces are reserved
  for the exact placeholder syntax below; HTML angle brackets and unsafe control
  characters are rejected. Newline/tab are allowed in template text.

Each slot returns `type`, `configured`, `title`, `body`, `revision`, `placeholders`,
`createdAt`, `updatedAt`. An unconfigured slot returns false, empty text, revision
0, null timestamps and its supported placeholder names. GET never seeds data.
First PUT must use revision 0; subsequent PUTs must carry the reviewed integer
revision (0–2147483646). Successful saves increment it once. Stale edits and
known uniqueness/lock conflicts return 409: reload and review before resubmitting.
Rows are locked within the save transaction. Per-type primary keys prevent
multiple configurations for one type; concurrent first saves can produce a
translated lock/duplicate conflict. There are no automatic write retries.

| Type | Supported placeholders |
| --- | --- |
| `message` | `{{actorName}}` |
| `forum` | `{{actorName}}` |
| `mood-reminder` | None |
| `comment-reply` | `{{actorName}}` |

Example initial message template:

```json
{
  "title": "Pesan baru",
  "body": "{{actorName}} mengirim pesan.",
  "revision": 0
}
```

Templates may omit supported placeholders. Unknown names, whitespace inside a
placeholder, partial/nested expressions and raw braces are rejected. Saving also
checks worst-case rendered length using actorName up to 100 UTF-16 units, so the
result fits notification storage without truncation. Message contents, mood
scores/notes, arbitrary URLs and executable template expressions are not supported
variables. Rendered strings are plain text: consumers must use text rendering,
never HTML interpretation.

`NotificationTemplatesService.render(type, values)` is an exported internal
service method, not a public endpoint. It returns `{ type, title, body,
templateRevision }`, validates the allowed variables and rejects missing values
that a template actually uses. Actor names must be nonblank strings, at most 100
UTF-16 units, without control characters. Other variables are rejected. Values
are inserted once as literal text, including braces, `$` and HTML-looking names;
no recursive evaluation or expression execution occurs. Missing configuration
throws 503; there is no fallback notification text. It does not itself write history,
resolve recipients/destinations, or send push. The event processor saves these
rendered strings and preserves event idempotency/visibility requirements.

`notification_templates` is registered with the API and standalone datasource
under the approved development synchronization policy. No deployed schema or
records have been modified. Configure all four slots through authenticated PUT before live activity delivery;
unconfigured templates leave durable events pending without failing user actions. Audit records are committed atomically with
saves and contain only actor ID, type and revision. Template request bodies are
excluded from request logging; generic activity middleware is excluded for this
controller, while CMS authentication middleware remains required.

### Step 2 verification

Run `node test/notification-templates.cjs`. It exercises the real imported Nest
module, CMS JWT middleware, live admin guard/service, DTOs, controller, template
service, renderer and logging exclusion with synthetic repositories. It covers
50 HTTP assertions plus rendering boundaries, revision conflicts, rollback on
audit failure and offline TypeORM metadata. Offline metadata validates entity
wiring only. Docker was unavailable, so live MySQL schema synchronization,
row/gap-lock races and transaction behavior remain unverified. No real push was
sent and no real admin/user records were changed.


## Activity events and Firebase delivery (step 3 — 28 October 2026)

New source writes record a `notification_events` row in the same transaction as
new messages, forum posts or forum comments/replies. Events contain source IDs,
not raw message/post/comment bodies. No existing activity is backfilled. Replayed
message request keys return the existing message without another event. Post/
comment endpoints retain their existing source-ID semantics: separately created
source records are separate activities; this step adds no client request key to
those endpoints. Reply counters now update atomically with the reply/event.

The existing scheduler polls committed events every five seconds. Each transaction
locks one event and processes up to 200 eligible recipients, persisting a member-ID
cursor. The first page stores one rendered text/revision snapshot for subsequent
pages. Unique `(eventKey, memberId)` history identities prevent overlapping or
replayed delivery. Cleared history and completed events retain their identities;
clearing cannot regenerate a notification. Missing templates/processing errors
back off from five seconds to at most five minutes, with safe error codes only.

Recipient rules implemented in this step:

- Messages: the other participant in a live one-to-one conversation, with an
  accepted friendship still present.
- Forum posts: accepted friends in either direction OR members following the
  post's public, visible community. Overlapping membership produces one item.
  Internal root spaces do not count as joined-community audiences.
- Comments/replies: the post owner and, for a reply, its approved parent comment's
  owner. Deduplicate and exclude the actor. Anonymous posts use `Anonim` in text.
  If a named post is later anonymized, pending pushes/further fanout of its old
  named snapshot stop; already-created historical text is retained.
- All activity audiences require active, verified member accounts. Deleted,
  hidden, unpublished, educational, unapproved or inaccessible source content is
  suppressed; hidden/invite-only communities are not notification sources here.

Audience and source eligibility are checked at materialization and immediately
before push. Inbox text is a historical snapshot; accessing its destination still
requires resource authorization. Comment destinations carry `kind`, comment `id`
and `postId` for later client routing. Chat read receipts and inbox `readAt` remain
separate states; opening a chat does not automatically mark its inbox item read.

New history rows have internal `pushStatus`, attempt time, accepted/failed counts
and safe failure code; old history defaults to `skipped` and is not broadcast.
Pending rows are claimed as `sending` in a transaction before external Firebase
I/O. Read/cleared/ineligible items are skipped. Delivery reuses live session-owned
Android/web FCM devices and the existing sender; APNs-only devices are skipped.
Push text is the saved template snapshot, never raw source content. Push data is
`{ type: "member-notification", notificationId, category }`, with no private chat
text or arbitrary URLs. Existing CMS test text/rate limits remain unchanged.

Provider acceptance is not device display or read confirmation. Failed/ambiguous
push attempts are not automatically replayed. A process crash after the claim can
leave `sending` with an unknown outcome; its durable inbox item remains available.
This is one application attempt, not an exactly-once device-display guarantee.
When Firebase configuration is absent, pending pushes remain queued. Invalid
credentials/provider rejections after an attempt are recorded without raw SDK
messages/tokens. Existing web notification clicks still focus/open the app;
category/destination navigation awaits the mobile/web integration step.

### Mood reminder timezone setting

- `GET /me/notifications/settings`: returns
  `{ timeZone: null, moodReminderLocalTime: "20:00" }` before configuration.
- `PATCH /me/notifications/settings`: requires `{ timeZone: "Asia/Makassar" }`
  or another valid IANA zone using the existing mood timezone validator. Unknown
  fields, nulls, wrong types and invalid zones return 400. The guard owns member
  identity; this cannot change another member's timezone or reminder hour.

`Member.notificationTimeZone` is the single account-level owner, shared across
installations. The future client integration must synchronize the device's IANA
zone on app opening/timezone changes. No timezone is guessed from server location,
old mood history or IP; unset members receive no scheduled reminder yet.

The scheduler checks local days/minutes, targets 20:00 and makes at most one daily
event per member/local calendar date. If processing starts late, it may catch up
later that same day; it never sends a previous local day's reminder. A recorded
`member_moods.dateString` suppresses scheduling; completion is rechecked before
inbox materialization and before push. An already-created reminder remains in
history if mood is completed later, while its pending push is skipped. Changing
timezone invalidates pending reminders for the old zone. Daily event identities
remain reserved, including after clearing; they are not a retry/reset switch.

### Verification and rollout

Passed locally: 77 focused Jest cases, 50 template HTTP checks with production
response interceptors, moderation write-boundary regression, event processor/Nest
module wiring, generated recipient SQL, DST/local-day bounds, fanout pagination,
snapshot consistency, retries and failure handling, API build/scoped lint.

`test/notification-events.integration.cjs` additionally passed against a disposable
MySQL 8.0 container: real schema/repeat synchronization, concurrent template edits,
audit rollback, shared post/comment source-event rollback and concurrent reply
counters, concurrent fanout/push claims, actual audience queries, source visibility,
soft clear, text snapshots and daily mood idempotency. This uncovered and fixed
DATETIME(3) defaults that incorrectly used CURRENT_TIMESTAMP(6) in the foundation.
Synthetic schemas were dropped and the disposable container removed. Firebase
was mocked; live device delivery, permission/foreground behavior and deployment
remain unverified. Existing unrelated AppModule/legacy formatting warnings remain.

To rerun MySQL verification, create a disposable `mysql:8.0` container with a random
localhost-published port, synthetic root password `synthetic-notification-root`,
and no production volumes. The test never reads .env and requires explicit opt-in:

```sh
NOTIFICATION_TEST_DISPOSABLE=1 NOTIFICATION_TEST_PORT=<ephemeral-port> node test/notification-events.integration.cjs
```

It creates/drops only its own `notification_test_*` schema. Run
`node test/notification-events.cjs` for the repository-double/generated-SQL suite.
Deploy API/schema first, configure all four templates and Firebase privately, then
integrate client timezone synchronization, bell refresh and notification routing.
