# Admin interest catalog

Catalog-only implementation (26 October 2026). CMS: **Forum → Interests / Preferences**,
`/forum/interests`, `/forum/interests/new`, `/forum/interests/:id`.
Existing member JSON preferences, forum hashtags and educational categories are unchanged.
No user/post joins, automatic seed, or data conversion in this step.

Interest categories added 25 November 2026. CMS: **Forum → Interest Categories**,
`/forum/interest-categories`, `/forum/interest-categories/new`,
`/forum/interest-categories/:id`. Each interest may reference one category (or none);
the member list stays a flat array but now includes the category reference.

Member read access added 19 November 2026 for forum onboarding: the mobile list now
loads active catalog names from `GET /me/interests` and falls back to the built-in
list when the request fails or the catalog is empty. Selection is still stored
locally; saving preferences to the member profile remains a separate step.

All CMS endpoints use existing CMS JWT middleware and live `CmsMembersGuard` checks.
Member tokens do not grant access to `/cms-interests` or `/cms-interest-categories`.
Responses use the existing success envelope with `data`.

| Method | Path | Input / result |
| --- | --- | --- |
| GET | `/me/interests` | Member session; active records only, ordered by category display order then `sortOrder` then `id`; returns `{id,name,description,categoryId,category,sortOrder}[]` |
| GET | `/cms-interests` | `search`, `categoryId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize`; returns `{items,total,page,pageSize}` |
| GET | `/cms-interests/:id` | Returns an active or inactive record with its category reference |
| POST | `/cms-interests` | Required `name`, `description`, `categoryId` (nullable), `sortOrder`, `isActive`; returns created record (201) |
| PUT | `/cms-interests/:id` | Full form fields plus required reviewed `revision`; returns updated record |
| DELETE | `/cms-interests/:id` | JSON `{revision}`; deactivates and returns retained record |
| GET | `/cms-interest-categories` | `search`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize`; returns `{items,total,page,pageSize}` |
| GET | `/cms-interest-categories/options` | Active categories ordered by `sortOrder` then `id`; returns `{id,name,sortOrder}[]` |
| GET | `/cms-interest-categories/:id` | Returns an active or inactive category |
| POST | `/cms-interest-categories` | Required `name`, `description`, `sortOrder`, `isActive`; returns created category (201) |
| PUT | `/cms-interest-categories/:id` | Full form fields plus required reviewed `revision`; returns updated category |
| DELETE | `/cms-interest-categories/:id` | JSON `{revision}`; deactivates only when no active interest references it |

Records contain `id`, `name`, `description`, `sortOrder`, `isActive`, `revision`,
`createdAt`, `updatedAt` (ISO dates). Interest records also contain `categoryId`
and `category` (`{id,name}` or null). IDs/revisions are positive integers.
Names: required, max 100 characters, NFKC normalized, trimmed, repeated whitespace
collapsed. A hidden unique SHA-256 key of the lowercase normalized name rejects
case/width/whitespace duplicates, including inactive records. Reactivate an existing
record instead of creating its name again. Description is required (empty string
allowed), trimmed, max 500 characters. Display order is integer 0–100000; active
status must be a JSON boolean. Unknown body/query fields and explicit nulls fail
validation.

List defaults: empty search, status `all` (`active`/`inactive` supported),
`sortBy=sortOrder` (`name`/`category`/`createdAt` supported), `sortOrder=asc`
(`desc` supported), page 1, pageSize 20. Page max 100000, size max 100; search max
100 characters. Search is a literal case-insensitive name substring, including
literal `%`/`_`. `categoryId` filters to exactly one category; omitted means all.
Ordering uses a fixed column allowlist and stable ID tie-breaker. CMS URL owns filters,
ordering and pagination; editor/back links retain them.

400: invalid input; 401/403: denied identity/access; 404: missing record;
409: duplicate name or stale revision. Updates/deactivation lock the row and compare
revision inside a transaction, incrementing it on change. Already-inactive deactivation
with the current revision is idempotent. Category deactivation is refused with 400
while active interests still reference it, so move or deactivate those first.
Audit metadata (actor, record ID, revision, action) is committed atomically; raw
catalog text is excluded from activity middleware. There is no physical delete endpoint.
CMS-authored catalog text follows the existing admin policy; member forum moderation
behavior is unchanged.

`Interest` and `InterestCategory` are registered in the existing `mimate` runtime
datasource; standalone entity discovery also includes them. Production runs with
synchronize disabled, so apply the hand-written migrations before deploying:

```bash
npm run typeorm:ds -- migration:run
```

- `1793918000000-InterestCategories.ts` creates `interest_categories` and adds
  `interests.categoryId` as a **signed** `INT` (`ON DELETE SET NULL`) with its
  index/foreign key. The column must be signed because `interests.id` is a signed
  `INT`; an `UNSIGNED` column fails MySQL's foreign-key compatibility check.
- `1793918000001-NormalizeInterestCategoryId.ts` fixes environments where the
  column already existed as `UNSIGNED` / `NOT NULL DEFAULT 0` and clears legacy
  `categoryId = 0` rows to `NULL`. The API also maps non-positive IDs to `null`,
  because zero is not a real category.

Both migrations re-check `information_schema`, so re-running after a partial
failure is safe. Development `synchronize:true` creates the same schema
automatically. No seed or data conversion was run.

Checks: API/CMS builds, scoped lint, `node test/interests.cjs` and
`node test/interest-categories.cjs` in each repository, and CMS
`node test/navigation.cjs`. API tests exercise actual module/guard wiring,
DTO validation and service logic with a transactional repository double. They do
not prove MySQL uniqueness/locking behavior. Docker daemon was unavailable; disposable
MySQL schema/concurrency and live CMS browser acceptance remain unverified.

Next: verify against disposable MySQL, then implement the separately requested
user/post relationships and selection integration after resolving relevant selection rules.
