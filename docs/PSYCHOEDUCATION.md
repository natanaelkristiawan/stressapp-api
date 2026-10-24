# CMS psychoeducation API

Implemented inside the existing **AdminPostModule**, using **PostEntity**
(`backup_post_with_attributes`). No new content/interaction table or Nest module.
CMS and mobile screen work remains separate.

## Authorization and routes

Every route requires the existing CMS bearer token plus live active-admin
validation. Ordinary member tokens, expired tokens, suspended/deleted linked
profiles and non-admin identities are rejected. Author identity comes from the
admin's linked member profile. Responses are private/no-store and request bodies
are excluded from request logging.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/admin-post/psychoeducation` | Search/filter/sort/paginate nondeleted educational content, including drafts |
| GET | `/admin-post/psychoeducation/:id` | Detail, including sanitized article HTML and server counts |
| POST | `/admin-post/psychoeducation` | Create article/video; server sets the flag and author |
| PATCH | `/admin-post/psychoeducation/:id` | Replace the editable form fields with revision checking |
| DELETE | `/admin-post/psychoeducation/:id` | Soft delete after revision checking; retain assets and interactions |
| POST | `/upload/cms` | Upload one CMS image/video through existing UploadService and backup_assets |

New post columns: `isPsychoeducation` (false by default), nullable
`contentType` (`article`/`video`), nullable `videoUrl`, and `contentRevision`
(default 1). Existing forum media `type` remains `image`/`video`; it is not the
educational content type. Existing `textContent` stores article HTML; `image`
stores the thumbnail URL. Existing `status` stores DRAFT/PUBLISHED. No community
or forum participation/reward counter is assigned when creating CMS content.

## Content form payload

```json
{
  "contentType": "article",
  "title": "Understanding loneliness",
  "description": "A short summary",
  "body": "<h2>Introduction</h2><p>Article text.</p>",
  "thumbnailUrl": null,
  "videoUrl": null,
  "status": "draft"
}
```

- Required: contentType, nonblank trimmed title (max 200), status (`draft` or
  `published`). Description is optional plain text (max 255).
- Article body: required nonempty text after HTML sanitization, max 100,000 input
  characters. Supported tags: p, br, h2/h3/h4, strong/b, em/i, u, s, ul/ol/li,
  blockquote, a, img. Only link href/title and image src/alt survive. No scripts,
  handlers, inline styles, iframes, SVG, data URLs or protocol-relative URLs.
  Link schemes are http/https. Embedded image URLs must identify CMS image uploads.
- Video: videoUrl required; article body must be absent/null/empty. Uploaded MP4
  or WebM only; no YouTube/remote URL import. Articles reject a nonempty videoUrl.
- Thumbnail URL is optional. Thumbnail, video and embedded-image URLs must match
  existing shared upload records of the expected type whose uploader is linked
  to a CMS admin. Arbitrary remote URLs and ordinary members' uploads are rejected.
  Active admins can reuse other CMS admins' uploaded assets.
- URL input max 2,048 characters. Unused fields accept null or omission; an empty
  URL string is invalid. Unknown properties (including author IDs, flag and client
  counters) are rejected.
- PATCH requires the complete editable form payload plus current integer
  `revision`. Omitted optional fields clear their values. Switching type clears
  the previous body/video value. Existing author remains unchanged.
- DELETE body: `{ "revision": 2 }`. Writes lock the row; stale revision returns
  409. Concurrent edits from one revision produce one success and one conflict.
- Publishing sets publishedAt on the first publication and each transition back
  to published. Unpublishing retains the previous publication timestamp.

Responses use the existing success envelope with data. Detail data includes id,
isPsychoeducation, contentType, title, description, body, thumbnailUrl, videoUrl,
status, revision, commentCount, likeCount, viewCount, createdAt, updatedAt and
publishedAt. Inapplicable fields are deliberate nulls. Counts are server-owned:
comments count nondeleted comments/replies; likes count existing `+1` reactions;
views use stored `viewsCount` (not the legacy activity-log aggregate). CMS reads
never increment views. Timestamps are database timestamps serialized as ISO dates.

## List query

page defaults to 1 (max 100,000); pageSize defaults to 20 (max 100). Optional
contentType/status filters use the same enums as the form. Search (max 100)
matches title/description using case-insensitive SQL LIKE; `%`/`_` retain LIKE
wildcard meaning. Sort accepts title/createdAt/updatedAt/publishedAt (default
createdAt), order asc/desc (default desc), with descending ID as a stable tie-breaker.
Data is `{ items, total, page, pageSize }`. Deleted content and ordinary forum
posts return 404 through this API and are excluded from lists.

## Upload flow

CMS sends multipart `file` to `/upload/cms`. JPEG/PNG/WebP images are decoded and
normalized by the existing shared uploader (max 5 MiB). MP4/WebM videos have MIME
and container-signature validation (max 100 MiB); this is not video transcoding,
full-stream decoding or codec compatibility certification. Uploads are limited
to 30 per admin profile per hour using the existing Redis limiter. Request size
also remains subject to the deployed reverse proxy's upload limit.

The existing upload response returns `data.url`, mediaId, id, type, contentType
and size. CMS can append the returned URL to its form-session file list and send
it as thumbnailUrl/videoUrl or an article image src. Upload and content save are
separate requests. No upload-library/list screen or automatic orphan cleanup is
implemented. Soft-deleting content never deletes stored files. Returned media
URLs use the existing public URL model; unpublishing metadata does not revoke an
already-known media URL or change bucket policy.

## Existing consumers and member integration

Legacy forum feed/search, trending and Admin Post CRUD/export exclude educational
posts. Capture BSI endpoints and their Swagger page were removed on 2026-10-22
at the user’s request; shared Post/Comment/Reaction services remain. Legacy detail/update/delete
cannot bypass the content CRUD's validation/revision checks. Legacy clean-all
operations exclude educational posts/interactions. Shared comment/reaction paths
reject unpublished/hidden/deleted educational posts; comment replies must target
a parent on the same post.

Existing comment/reaction/view tables and services remain the interaction owners.
This CMS API does not introduce mobile content routes, change member authentication
on legacy routes, implement unique-member views, or redesign reaction idempotency.
Mobile integration is the next step; its UI is still static. Manual SARA moderation is available as described below. No automated filter,
reflection, challenge/reward integration, restore endpoint or content seed added.

## Verification and deployment

`npm run build`, scoped ESLint and the existing upload/storage unit tests.
Run `PSYCHOEDUCATION_TEST_PORT=<disposable-local-mysql-port> node test/psychoeducation.integration.cjs` against an explicitly disposable server.
It creates/removes a synthetic schema and uses mocked S3 calls; it never loads
application .env or contacts MinIO. Checks include schema/repeat-sync, HTTP auth,
conditional validation/sanitization, upload negatives, filter/pagination boundaries,
cross-admin concurrency, counts, soft deletion and legacy route isolation.

Development schema uses synchronize:true. Deployment adds the four new Post
columns and also applies the previously approved removal of 20 unused columns;
those removals can discard stored values. No deployment/database update is made
by building or running the isolated test. Real MinIO delivery and CMS UI remain
to be verified when integrated.


## CMS manual comment moderation (2026-10-22)

Confirmed scope: all active CMS admins can review and soft delete educational
content comments containing SARA. No automatic detection/classification or text
editing is added. Existing Post/Comment/Activity tables remain the owners.

- GET `/admin-post/psychoeducation/:id/comments`: bounded flat comments/replies,
  newest first (created timestamp then ID). page default 1/max 100,000; pageSize
  default 20/max 100. Deleted comments excluded; drafts may be moderated by admins.
  Response data is `{ items, total, page, pageSize }`. Each item contains id,
  content, authorName, parentId, createdAt, updatedAt and opaque version. No email,
  profile details or other member-private fields are exposed.
- DELETE `/admin-post/psychoeducation/:id/comments/:commentId`: body
  `{ "reason": "sara", "version": "<64 lowercase hex characters>" }`.
  Server derives the reviewed version from comment ID/text/update timestamp;
  changing text within the same timestamp precision still invalidates review.
  A stale review returns 409. A deleted/mismatched/noneducational target returns
  404. Unknown body fields or unsupported reasons return 400. CMS guard, private
  response headers and request-body logging exclusions also cover these routes.
- Transaction locks educational post then selected comment. Only the offending
  comment is soft deleted; other replies remain stored and visible in the flat
  CMS list. Existing member thread rendering can hide replies to deleted parents;
  tombstone/thread presentation is deferred to member integration.
- Updates direct parent reply count, post comment counts and the author's existing
  total_comments. Existing Activity records actor ID, target IDs, delete action,
  timestamp, source=cms-psychoeducation and fixed SARA reason atomically. No comment
  text or credentials are copied into the event. Repeated concurrent deletion
  creates one audit event; the losing request receives 404.

CMS implementation: one Psikoedukasi menu/list, rich-text article/video form,
form-session image/video upload URL list, confirmed content delete and comment
moderation dialogs. Guide: ../../stressapp-cms/docs/PSYCHOEDUCATION.md.

Expanded integration checks passed authorization, bad reason/version/page size,
cross-post access, changed review, concurrent removal, reply retention, counts
and audit-event metadata in disposable MySQL. CMS build/boundary/browser checks
use synthetic data; no live moderation or deployed storage changes were performed.

## Video sources (2026-10-23)

Video writes accept `videoSource: "self" | "youtube"`. Omitting it preserves the
legacy self-hosted contract. Self-hosted videos require an existing CMS-uploaded
`videoUrl` and reject `youtubeUrl`. YouTube videos require an HTTPS `youtubeUrl`
and reject `videoUrl`; accepted hosts are youtube.com, www.youtube.com,
m.youtube.com and youtu.be, with watch, embed, shorts or short-link paths.
The API extracts an 11-character ID without fetching any supplied URL. Host
lookalikes, credentials, nonstandard ports, malformed/ambiguous IDs are rejected.
Articles reject nonempty video fields. Thumbnail validation is unchanged.

Responses add nullable `videoSource` and `youtubeId`; YouTube rows have null
`videoUrl`, articles have null source/ID/URL. Existing video rows with a null
source are returned as `self`. Source/type updates clear inactive stored fields.
Two nullable columns are added through the existing synchronize:true development
policy; no migration/history rewrite. Deploy API before the updated CMS. Link
syntax validation does not guarantee existence, availability or embeddability.

Verification: API build/scoped lint, 15 URL-parser cases, disposable MySQL HTTP
suite including repeat schema sync, YouTube create/read, invalid/mixed-source
inputs, source/type switching and old-row fallback. Live YouTube playback is
separate device acceptance; no storage/provider calls or deployment performed.

## Member API and asynchronous comments (2026-10-23)

All routes below use the existing MemberAuthGuard (live member session/account),
private/no-store responses and body-log exclusion. CMS tokens cannot grant member
access. Only published, nonhidden, nondeleted educational posts are eligible.

| Method | `/me/psychoeducation` suffix | Behavior |
| --- | --- | --- |
| GET | empty | `type=article|video`, optional search (100 chars), limit 1–50 and after |
| GET | `/:id` | Detail, source/ID/URL, approved-comment count, likes/is-liked, views |
| GET | `/:id/comments` | Approved comments plus caller-owned pending/rejected rows |
| POST | `/:id/comments` | `{content,requestId}` saves pending immediately |
| PATCH | `/:id/comments/:commentId` | Same body; own comment only, new moderation revision |
| DELETE | `/:id/comments/:commentId` | Own comment soft deletion |
| PUT / DELETE | `/:id/like` | Idempotent like/unlike in existing reactions table |
| POST | `/:id/views` | `{requestId}` counts one detail opening; replay does not increment |

Lists return `{items,nextAfter,hasNextPage}` within `data`; cursors encode stable
created_at/ID descending bounds, scoped to list filters or post/calling member.
No Redis pagination sessions or offsets. Malformed/cross-scope cursors return 400.
Content GETs do not increment views. Existing Activity rows store scoped operation
IDs for comment/view retries, without comment text. Post-row locks serialize writes
and deduplicate concurrent identical operations. Member comment writes are limited
to 30/hour; view events to 600/hour. These operations do not grant forum points.

Comment DTOs trim and enforce 1–260 Unicode characters. Existing Comment rows gain
moderationStatus (approved default for legacy rows) and moderationRevision. New
member comments start pending. The existing PostModule registers the
psychoeducation-comments BullMQ queue/worker and reuses ContentModerationService's
classifier. Jobs contain comment ID/revision, never submitted text. The worker
loads current text, rejects stale revisions/deleted rows and atomically records
approval/rejection plus approved-only post counts. Provider uncertainty/errors
stay pending and retry eight times with exponential backoff. A bounded 60-second
recovery sweep repairs queue outages/exhausted transient jobs; author list reads
also requeue pending rows. This publication worker does not change the existing
legacy moderation-cache queue or CMS-authorized bypass.

Member responses expose status but no provider payload/diagnostics/categories.
CMS lists all statuses for manual review/deletion; its counts include approved
comments only. CMS deletion and member/worker writes lock post then comment, so
an in-flight job cannot resurrect deleted text. Legacy comment list/reply queries
exclude nonapproved rows. Existing forum comments keep their current length rules.

Tested: API build/scoped lint; 67 focused moderation/parser/DI tests; metadata
check; HTTP + disposable repeat-sync MySQL covering auth/privacy/visibility,
260-character validation, real keyset pages/scope checks, stale revisions,
approval/rejection/pending, ownership, replay-safe comments, likes/views and CMS
deletion of pending comments without forum-counter changes. Actual BullMQ/Redis
delivery and a transient pending → retry → approval were exercised. AI/storage
were synthetic; real provider quality, live storage/playback and production
worker deployment remain acceptance checks. No production data was modified.

The final HTTP run also loaded the real mobile adapter and shared member
transport against the disposable API (including JSON content headers), covering
list/detail, pending comments, deletion, likes and retry-safe view events. Run
from stressapp-api with PSYCHOEDUCATION_TEST_PORT, optional
PSYCHOEDUCATION_TEST_REDIS_PORT and PSYCHOEDUCATION_TEST_MOBILE_ADAPTER=1; the last
flag requires the sibling stressapp checkout. All test services are disposable.

## Four-type moderation (confirmed and implemented 2026-10-23)

The current policy is `opencode-four-types-v3`. OpenCode returns exactly
`{"type":"safe"}` with one of `self_harm`, `sexual`, `sara`, `bullying`, `safe`,
`uncertain`. Priority is self_harm > sexual > sara > bullying. Profanity and threats
map to bullying; sexual education and neutral/reporting context remain allowed.
Safe publishes; uncertain/provider failure stays pending; the four violation types
reject with the matching message. Self-harm gets supportive wording, no account
penalty. The AI does not write notification text or perform unrelated tasks.

CMS Settings → Content Moderation → Notification messages edits four fixed,
nonblank plain-text messages (maximum 2000 characters each). Configuration reuses
`setting_config` under `moderation.notification-messages.v1`; missing rows initialize
once without overwriting existing edits. GET/PUT `/cms-settings/moderation/messages`
requires a live authorized admin. PUT includes `{messages, version}`; stale edits
return 409. No schema migration or dependency was added. Test results include
`type` and `notificationMessage`; each test reads current configuration even when
the classification is cached. Sanitized provider preview and admin write bypass
remain. Missing/corrupt message configuration fails closed.

Queued psychoeducation comments store the matching message with the exact rejected
revision; only their author sees type/message. Replayed saves retain that snapshot.
Later CMS changes apply to new decisions, not historical snapshots. Mobile shows
inline feedback and one popup per rejected revision in the authenticated provider
session, with a support title for self_harm. Logout/account changes reset that state.
The defaults exclude unverified phone numbers from the source CSV. Push delivery,
account penalties and human escalation are outside this step.

Validation: 97 focused API tests, real disposable MySQL HTTP + BullMQ/Redis worker
integration (including self_harm and bullying messages, private visibility, replay,
concurrent CMS writes and revision retries), standalone Redis lock/cache/rate tests,
CMS boundary tests, mobile adapter/provider tests, API/CMS builds, mobile web export,
TypeScript and scoped lint pass. AI responses are synthetic in tests; live OpenCode
quality, real browser interaction and physical-device popup behavior need acceptance
checks after deployment. Deploy API/worker before CMS/mobile.

## Shared content categories (2026-10-23)

Categories reuse backup_tags and backup_post_tags with a separate isContentCategory
scope; no new table/module. Tags gain an optional unique normalized-name hash,
archive flag and revision. Forum hashtag lookup/discovery excludes this scope.

CMS GET/POST /admin-post/psychoeducation/categories lists paginated catalog rows
(page/pageSize, max100) or creates {name}. PATCH /categories/:id requires
{name,active,revision}; duplicate normalized names return409, stale edits409.
Names normalize NFKC/whitespace, require1–80 characters. Archive replaces deletion
and preserves assignments; renaming immediately updates canonical names everywhere.

Content writes accept categoryIds: up to20 unique positive integer IDs. Unknown
IDs/forum tags/new archived assignments return400. Omitted categoryIds preserves
assignments during updates; [] clears them. Existing archived assignments can be
retained or removed. Assignments commit atomically with content under post/category
locks. Content responses include categories [{id,name,active}]; CMS includes
assigned archives, member responses show active categories only.

Member GET /me/psychoeducation/categories returns the active catalog with limit/after
cursors (immutable ID ascending). Both CMS/member content lists accept categoryId;
EXISTS filtering avoids duplicate content rows. Member after cursors include the
category filter scope. Catalog names do not expose unpublished content.

Verified: API build/scoped lint, metadata and disposable MySQL repeat-sync/HTTP
suite, including multiple assignments for both types, duplicates/invalid IDs/limits,
renaming, stale category edits, archives/retained links/removal, catalog pagination
and category-scoped content cursors. Real mobile adapter checks also pass. No live
database/deployment changes; synchronize:true adds metadata to existing tag tables.

## Standalone psychoeducation Comments table (2026-10-24)

Confirmed: Psikoedukasi has a separate Comments page following All Members.
Show full comments/replies from articles/videos with author name/email, source
title/type, AI status and UTC creation time. Filters: user name/email, comment
text, source title and inclusive UTC start/end creation days. Server pagination
and newest-first order; no detail popup. Admins may confirm soft deletion only;
AI retains approve/reject. Reuse existing Post/Comment/Activity and revision guards.

API: GET /admin-post/psychoeducation/comments accepts page/pageSize, user, comment,
article (source title), startDate/endDate (YYYY-MM-DD, UTC). Deleted comments and
content are excluded; all AI statuses included. DELETE /:id/comments/:commentId
also accepts reason admin_delete with the reviewed version; legacy sara retained.
No approval/rejection action is exposed. No schema or dependency changes.

## Searchable comment source filter (2026-10-24)

Reused the existing demo/CMS StyledCombobox for the Comments article/video filter.
Debounced API search returns up to 20 suggestions with title/type/ID, plus All
articles and videos. Exact postId selection distinguishes duplicate titles; the
selected label restores from URL, with loading/error/retry feedback. RHF owns the
draft and URL owns the applied filter. Existing content endpoints reused; comment
API validates and filters postId. Legacy API article title search remains supported.
API/CMS builds, scoped lint (existing TanStack warnings), API boundary/query check
and CMS boundary tests pass. Browser/live database acceptance not run. No deployment.
Next: deploy API before CMS and verify search/select/reset/back navigation.
