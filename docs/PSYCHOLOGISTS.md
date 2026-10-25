# Psychologist location directory

Confirmed 25 October 2026: user supplied 33 directory rows, authorized one row per
numbered branch (40 branch/service records), CMS-maintained coordinates, and
immediate publication after Excel preview/confirmation. Two services are online
only; the supplied 021 landline is telephone. Contact notes and websites are
preserved. Contact availability has not been independently verified.

## API

All new responses use `{ data: ... }`; deliberate null coordinates/distances are
preserved. Active CMS identity uses the existing CMS middleware and live-admin
guard. Member routes use the existing live member-session guard and bypass legacy
admin token middleware. Both controllers omit payload/request logging. Reverse
proxy/access logs should exclude query strings containing location coordinates.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /cms-psychologists | Server-paginated branches, including drafts |
| POST | /cms-psychologists | Create one validated branch |
| PATCH | /cms-psychologists/:id | Full editable fields + reviewed integer revision; stale saves return 409 |
| GET | /cms-psychologists/import/template | Filled 40-row Locations workbook + Guide |
| POST | /cms-psychologists/import/preview | Multipart `file`; validates without writes |
| POST | /cms-psychologists/import/commit | Multipart `file` + `expectedHash` from preview; publishes new rows atomically |
| GET | /me/psychologists | Published branches only, optional nearest ordering |
| GET | /me/psychologists/cities | Distinct published cities |

List parameters: `search` (up to 120 characters, literal name/branch/city search),
`city` (up to 80, exact), `page` (1–100000), `pageSize` (1–100), `sort` (name/city),
`order` (asc/desc), optional status (draft/published; member reads always force
published). Returns `{ items, total, page, pageSize }`, with stable ID tie-breaks.
Member listing accepts paired latitude/longitude in valid geographic ranges;
Haversine distance is calculated and sorted in MySQL before pagination. Coordinates
are not persisted for members. Known distances appear first, unknown/online last.
Distances are straight-line kilometres, not travel distance, time, or availability.
Without device coordinates the API returns null distances and alphabetical order.

Editable fields: name, branch, city, address, phone (text with 0/62 prefix),
contactType (whatsapp/telephone), contactNotes, HTTP(S) website (or empty string),
serviceMode (onsite/online), paired nullable latitude/longitude, status. IDs and
revisions are server-owned. Online-only entries must leave coordinates null.
Use draft status to unpublish; there is no destructive deletion route.
Writes and import audit events contain actor/target/revision or aggregate counts
and file hash, not addresses, member location or contact text.

## Excel

Use the exact eleven headers on the Locations sheet. One row per provider branch;
branch labels Cabang 1/2/3 follow source numbering, Utama is an editable single
address label. The cleaned workbook is in `outputs/psychologist-directory/` at the
workspace root. Numeric coordinates are optional; phone numbers must stay text.
The source CSV is preserved outside the application and is not imported directly.

Reuses psychoeducation ZIP/XML expansion limits, prefixed-XML compatibility and
literal-cell parsing. XLSX only, up to 2 MiB and 200 rows; formulas, Excel errors,
macros/external workbooks, invalid headers/fields and unsafe XML are rejected.
Preview exposes per-row validation and duplicate status. Confirmation revalidates
the exact hash and all rows. One transaction publishes all new rows or rolls back.
A unique hash of normalized provider/branch/city prevents duplicate branches and
keeps contact/address edits independent of repeat uploads. Duplicate rows are
skipped, including concurrent/repeated commits; existing records are never
updated or republished by import. Retry counts reflect what that retry created
or skipped, rather than replaying a saved receipt. CMS preview/commit rate limits
are 30/10 per admin per hour; member lists are bounded to 180 per hour.

## CMS and mobile

CMS `/psychologists`: table, URL-owned filters/sorting/page size, RHF/Yup editor,
publication status, coordinates and template/import dialogs. Failed input remains
editable; duplicate/stale edit messages require correction or reload. Account
changes discard drafts and loaded directory snapshots. Response validation and
editable-field stripping remain in the feature API adapter.

Mobile keeps the directory/card/detail flow, replaces samples with API pages,
uses published cities, shows branch address and selectable contact, and opens
WhatsApp or telephone according to contact type. Failed external opens retain a
visible number and website. Missing images use a neutral location icon. Foreground
location is requested only on the nearest button; denial/failure preserves city
search. Position is screen-scoped, clearable and reset on account change; there is
no background tracking, geocoding, continuous watching, booking or ratings.

Deploy API/schema before CMS/mobile. TypeORM synchronize follows the existing
approved development policy. New native builds must include expo-location and its
permission configuration; web export does not verify native permission behavior.
No directory entries are seeded automatically: import through CMS after deployment.

## Verification

`DIRECTORY_TEST_PORT=<disposable mysql port> DIRECTORY_TEST_PASSWORD=<test password>
node test/psychologists.integration.cjs` creates/drops only a synthetic schema.
Covers real HTTP guards/validation and success/null interceptors, supplied and
server-generated workbooks, no-write preview, immediate publication, repeated
imports, nearest MySQL ordering, drafts, stale revisions, rollback and the actual
mobile transport/adapter. Identity infrastructure is mocked in this harness.
`node test/psychologists-wiring.cjs` additionally resolves the CMS controller with
real exported MemberAuthService and mocked infrastructure. CMS boundary checks:
`node test/psychologists.cjs` in stressapp-cms.

## CMS direct record URLs

`GET /cms-psychologists/:id` returns the existing safe branch shape (including
revision/publication state and distanceKm:null) for the CMS route
`/psychologists/:id`. Existing active-admin guard and ID DTO apply; missing IDs
return404, and responses are private/no-store. Import list/mobile scopes remain
unchanged. Deploy API before CMS editor routes. Regression:
`node test/cms-record-detail.cjs` (real HTTP, repository doubles).
