# Member notifications — inbox and automatic-template API

Implemented locally 27 October 2026. Inbox storage/read/clear operations and
CMS automatic-template APIs are available. Activity generation, schedules and
push delivery are not connected yet. Existing activity logs and Firebase test
routes are preserved. No CMS/mobile screen is included in these API steps.

## Confirmed scope

The home bell opens an in-app inbox separated by type, with no all-category view:
`message`, `forum`, `mood-reminder`, and `comment-reply`. Forum sources will include
both friends' posts and posts in joined communities. CMS will manage automatic
message templates only; no manual compose/send or broadcast facility is planned.
The internal template renderer returns title/body snapshots for future event
producers to save into recipient history; editing templates never updates existing
member_notifications rows. Producers and combined push delivery are the next step.

## Member contract

Existing bearer authentication requires a live eligible member/session. Routes
return `Cache-Control: private, no-store`. Actor identity always comes from the
server guard, never a client member ID.

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
- Existing `GET /member-auth/me` retains its direct identity response and adds
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
endpoint exists. Future producers must validate rendered text/destinations, retain
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
throws 503; there is no fallback notification text. It does not write history,
resolve recipients/destinations, or send push. Future producers must save these
rendered strings and preserve their event idempotency/visibility requirements.

`notification_templates` is registered with the API and standalone datasource
under the approved development synchronization policy. No deployed schema or
records have been modified. Configure the four slots through authenticated PUT
before connecting event producers. Audit records are committed atomically with
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
