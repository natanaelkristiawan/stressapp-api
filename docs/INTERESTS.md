# Admin interest catalog

Catalog-only implementation (26 October 2026). CMS: **Forum → Interests / Preferences**,
`/forum/interests`, `/forum/interests/new`, `/forum/interests/:id`.
Existing member JSON preferences, forum hashtags and educational categories are unchanged.
No mobile selection, user/post joins, automatic seed, or data conversion in this step.

All endpoints use existing CMS JWT middleware and live `CmsMembersGuard` checks.
Member tokens do not grant access. Responses use the existing success envelope with `data`.

| Method | Path | Input / result |
| --- | --- | --- |
| GET | `/cms-interests` | `search`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize`; returns `{items,total,page,pageSize}` |
| GET | `/cms-interests/:id` | Returns an active or inactive record |
| POST | `/cms-interests` | Required `name`, `description`, `sortOrder`, `isActive`; returns created record (201) |
| PUT | `/cms-interests/:id` | Full form fields plus required reviewed `revision`; returns updated record |
| DELETE | `/cms-interests/:id` | JSON `{revision}`; deactivates and returns retained record |

Records contain `id`, `name`, `description`, `sortOrder`, `isActive`, `revision`,
`createdAt`, `updatedAt` (ISO dates). IDs/revisions are positive integers.
Names: required, max 100 characters, NFKC normalized, trimmed, repeated whitespace
collapsed. A hidden unique SHA-256 key of the lowercase normalized name rejects
case/width/whitespace duplicates, including inactive records. Reactivate an existing
record instead of creating its name again. Description is required (empty string
allowed), trimmed, max 500 characters. Display order is integer 0–100000; active
status must be a JSON boolean. Unknown body/query fields and explicit nulls fail validation.

List defaults: empty search, status `all` (`active`/`inactive` supported),
`sortBy=sortOrder` (`name`/`createdAt` supported), `sortOrder=asc` (`desc` supported),
page 1, pageSize 20. Page max 100000, size max 100; search max 100 characters.
Search is a literal case-insensitive name substring, including literal `%`/`_`.
Ordering uses a fixed column allowlist and stable ID tie-breaker. CMS URL owns filters,
ordering and pagination; editor/back links retain them.

400: invalid input; 401/403: denied identity/access; 404: missing record;
409: duplicate name or stale revision. Updates/deactivation lock the row and compare
revision inside a transaction, incrementing it on change. Already-inactive deactivation
with the current revision is idempotent. Audit metadata (actor, interest ID, revision,
action) is committed atomically; raw catalog text is excluded from activity middleware.
There is no physical delete endpoint. CMS-authored catalog text follows the existing
admin policy; member forum moderation behavior is unchanged.

`Interest` is registered in the existing `mimate` runtime datasource; standalone
entity discovery also includes it. The approved development `synchronize:true`
setup creates `interests` on API startup. No migration, live schema sync or seed was run.

Checks: API/CMS builds, scoped lint, `node test/interests.cjs` in each repository,
and CMS `node test/navigation.cjs`. API tests exercise actual module/guard wiring,
DTO validation and service logic with a transactional repository double. They do
not prove MySQL uniqueness/locking behavior. Docker daemon was unavailable; disposable
MySQL schema/concurrency and live CMS browser acceptance remain unverified.

Next: verify against disposable MySQL, then implement the separately requested
user/post relationships and selection integration after resolving relevant selection rules.
