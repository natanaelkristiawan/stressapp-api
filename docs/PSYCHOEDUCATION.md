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
