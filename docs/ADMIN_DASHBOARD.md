# Admin dashboard

The CMS home page combines forum, mood and breathing analytics. Forum reads remain
in AdminDashboardModule; mood and breathing retain their separate modules.

## Forum cards

`GET /admin/dashboard/forum?from=YYYY-MM-DD&to=YYYY-MM-DD`

- Active CMS admin required, revalidated through CmsMembersGuard; private/no-store.
- Required valid calendar-day range, ordered and bounded to 366 UTC days.
- Returns `{data: {from, to, dateBasis: 'UTC', posts, replies, reactions, daily,
  generatedAt}}`. Daily rows contain date and all three counts; missing days are zero.
- Posts count by publication time, replies/reactions by creation time. Forum polls
  follow the same post scope. Future publication, hidden, deleted and psychoeducation
  posts are excluded. Replies must be approved. Reactions are post reactions.
- Authors must be current member-auth accounts, not deleted or linked CMS staff.
  Suspended current members' historical activity remains included.
- Summary totals are sums of these daily buckets. Read calculations are local to
  each request, so concurrent date ranges do not share mutable service fields.
- Counts represent currently retained/visible records, rather than an immutable
  historical audit of content later deleted or hidden.

## Current member identity

Dashboard queries and exports use Member.name, Member.username, Member.id and the
current profilePictureUrl. Name fallback preserves spelling and falls back to
username or an internal member label. Member registration uses created_at.
MMID fullname/external IDs and vehicle/quiz/old point placeholder columns were
removed from this module's spreadsheet mappings. The shared entity's compatibility
columns, existing tables and the named `mimate` connection remain unchanged.

Member registration exports exclude legacy-auth accounts and linked CMS staff.
New post/reply/reaction exports exclude psychoeducation and hidden posts and use
current eligible member identities. Existing export routes remain admin-only.

## Retired behavior

The unused GET clear-member maintenance route and its implementation were removed;
it previously reset activation dates using a hardcoded 2025 cohort. No records were
changed. The history report now counts distinct current member login log records
for the requested period, with no hardcoded 2025 counts, excluded dates, visitor
substitutions or fixed totals. It reports available login logs; it does not infer
logins that were never recorded.

Other older reporting routes remain for compatibility; the new combined CMS page
uses the forum endpoint above. It does not depend on the older singleton range
fields or on previous-period percentage estimates.

## Verification

`ADMIN_DASHBOARD_TEST_PORT=<disposable-local-mysql-port> node test/admin-dashboard.integration.cjs`

Exercises actual module wiring, HTTP authorization and validation, concurrent date
ranges, UTC boundaries, forum/psychoeducation and account isolation, empty days,
current-identity XLSX exports, retired-route 404 and actual login-history counts.
The harness creates and drops its own synthetic schema and never loads app .env.
