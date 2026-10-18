# CMS Mood Tracker participation

Confirmed 18 October 2026: all active CMS admins may view participant names and
mood-record dates only, plus aggregate entry/participant counts. This does not
grant access to mood scores, notes, photos, audio, individual health assessment
results or member-private file URLs. There are no edit/delete/export endpoints.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/cms-mood-participation/summary` | Dashboard counts for required inclusive `from`/`to` dates. |
| GET | `/cms-mood-participation` | Read-only participation history for the same required dates; optional `name`, `page`, `pageSize`, `sortBy`, `sortOrder`. |

Date format: YYYY-MM-DD, valid ordered range of 1–366 days. Dates filter the
member-local `member_moods.dateString`, not createdAt/updatedAt converted into an
admin timezone. The CMS initially uses month-to-date; users may change it.

Summary data: `{ from, to, dateBasis: "member-local", totalEntries,
uniqueParticipants, generatedAt }`. Total entries counts stored daily records;
unique participants uses DISTINCT member ID across the complete period. Editing
an entry never adds a participation event. This is record-based participation,
not page views, session activity, diagnosis or an improvement metric.

History data: `{ items: [{ id, memberName, dateString }], total, page, pageSize }`.
The row ID is a string used for table identity. No member ID/email, mood values,
notes, attachments, timezone per participant, or exact submission timestamps are
returned. The SQL projection selects only the approved fields. Current member
names are displayed; historical names are not snapshotted. One row represents a
member's daily record, not an immutable log of every edit.

Both views use current mobile-account eligibility: memberAuthEnabled=true,
not soft-deleted and not linked to a CMS staff account. Suspended mobile members'
historical participation is included. Removing account eligibility may therefore
change historical totals; these are live reports, not frozen research cohorts.

Name search is a case-insensitive literal substring, maximum 100 characters.
Pagination defaults to page 1, size 20; max size 100. Approved sort keys:
`memberName` and `dateString`; directions `asc`/`desc`. Default is date descending,
with descending record ID as the stable tie-breaker. Counts/filtering/sorting
and pagination run in SQL; the CMS never calculates totals from loaded rows.

Existing CMS JWT middleware plus the live admin guard protect every request;
member/legacy/expired tokens and suspended/non-admin identities are rejected.
Responses use the standard envelope, private/no-store caching and safe errors.
Request-body/query logging is excluded for this controller. No schema changes
or extra stored participant logs are needed.

## CMS

Dashboard: `/dashboards/home` has the two cards and date filters. History:
`/mood-participation`, available through the Mood Tracker navigation or dashboard
link preserving dates. The table follows the Members remote TanStack standard,
URL-owned query state, scoped Context, RHF+Yup filter drafts, runtime response
validation and loading/empty/error/retry feedback. Name/date fields are read-only.
No CSV export, clinical distributions or reminder analytics are included.

Deploy API/CMS together; no MinIO configuration is needed for these metadata
reports. They do not call private media services. Existing private mobile Mood
Tracker routes and ownership checks remain unchanged.

## Verification

```sh
npm run build
CMS_MOOD_TEST_PORT=<disposable-local-mysql-port> node test/cms-mood-participation.integration.cjs
```

The fixture creates/drops only a unique synthetic schema on localhost MySQL/root
with an empty password. It verifies real HTTP/admin auth, eligibility, totals vs
source rows, strict privacy fields, inclusive dates, filters, pagination/sorting,
invalid inputs, edit counting and active-admin checks. Redis writes are mocked;
no deployed database or member/media data is used. Never run it against a shared
or deployed database. Optional CMS_MOOD_BROWSER=1 and CMS_MOOD_HTTP_PORT retain
that synthetic HTTP fixture until SIGINT/SIGTERM for a local browser check.

CMS checks: `npm run build`, scoped ESLint, `node test/admin-auth.cjs` and
`node test/mood-participation.cjs`. Browser verified cards, single-day counts,
reset, metadata-only history, filtering, sorting, pagination and invalid ranges
against the real API/disposable MySQL fixture. Existing CMS bundle/circular-chunk
and TanStack React Compiler warnings remain. No deployment performed.
