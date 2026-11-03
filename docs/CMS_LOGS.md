# CMS logs

Active CMS admins can read existing history through GET-only endpoints:

- `/cms-logs/activity` and `/cms-logs/activity/:id`
- `/cms-logs/notification` and `/cms-logs/notification/:id`

Lists accept `page`, `pageSize` (maximum 100), literal member name/email `search`,
`memberId`, and inclusive UTC dates `from`/`to` (YYYY-MM-DD). Activity adds exact
`action`; member filtering matches actor or target. Notification adds `type`,
`state` (all/unread/read/cleared), and `pushStatus`
(all/pending/sending/accepted/failed/skipped). Stable order is creation time then ID,
both descending. Invalid inputs return 400; unavailable records return 404.

Activity exposes audit metadata and limited member identities, excluding legacy
message/request fields that may contain private text. Notifications expose saved
template text, recipient identity, read/clear dates and push diagnostics, excluding
source identifiers, event keys and device tokens. Cleared notifications remain in
admin history. Firebase acceptance does not prove device display or member reading.

Responses are private/no-store. Live admin checks apply to every request. Reads
create no recursive activity/request log and offer no edit, clear, delete or retry-send
operation. Existing tables are reused; this feature adds no schema change.

Verification: `test/cms-logs.integration.cjs` exercises real HTTP and disposable
MySQL with production interceptors, JWT middleware and live admin guard (59 checks).
