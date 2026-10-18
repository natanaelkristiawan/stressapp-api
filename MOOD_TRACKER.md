# Mood Tracker API

Member-only routes use `Authorization: Bearer <member access token>` and live
member-auth session/account validation. Admin/legacy JWTs are not accepted.
Responses use the existing `{ success, alert, data }` envelope and `private,
no-store` caching. Private notes and upload bodies are excluded from request logs.

## Confirmed behavior

One entry per member/local calendar day. Create/edit is limited to today in the
supplied valid IANA timezone; past dates are read-only. No delete endpoint.
Notes are optional (default empty, maximum 2,000 characters). The app supplies its
device timezone, e.g. `Asia/Makassar`; server time decides today in that zone.
Weeks start Monday. Onboarding mood remains separate. No CMS mood access.

Dates are `YYYY-MM-DD`. Entries retain their original date keys when a member
travels; history is not rebucketed into the current timezone. The server validates
the timezone identifier, not the device's physical location. Daily uniqueness
is by member/date, independent of timezone. Concurrent saves serialize on the
member row; the last committed save replaces that day. Retrying a PUT cannot
create a duplicate, but is not a stale-edit/version conflict protocol.

## Routes

| Method | Route | Input / purpose |
| --- | --- | --- |
| GET | `/me/moods` | Required `from`, `to`, `timeZone`; optional `page` (1), `pageSize` (31, max 100). Newest-date-first calendar/history page. |
| GET | `/me/moods/:date` | Required query `timeZone`. One owned entry, or 404 when absent. |
| PUT | `/me/moods/:date` | JSON `score` integer 1–5, `timeZone`, optional `note`, `attachmentIds` (default empty). Creates/replaces today. |
| GET | `/me/mood-summary` | Required `from`, `to`, `timeZone`; optional `grouping=week\|month` (week). Daily scores and distribution counts. |
| POST | `/upload/mood/image` | Multipart field `file`; one JPEG/PNG/WebP up to 5 MiB, maximum 16 million decoded pixels. Re-encoded WebP strips EXIF/location metadata. |
| POST | `/upload/mood/audio` | Multipart field `file`; one MP4/M4A, WebM, Ogg, WAV or MP3 up to 10 MiB. MIME and container signature must agree. |
| GET | `/upload/mood/:id` | UUID attachment ID. Refreshes a five-minute private preview/playback URL after ownership validation. |

Ranges are inclusive, ordered and at most 366 days. Grouping identifies the
chart view; the caller supplies the exact week/month date range. Summary returns
one point for every requested date; unrecorded days have `score: null`, never 0
or fabricated values. `stats` contains `sangatBuruk`, `buruk`, `biasa`, `baik`,
`sangatBaik`, and `total` counts for the requested range.

List data: `{ items, total, page, pageSize }`. Each entry contains string `id`,
`dateString`, `timeZone`, `score`, server-derived `mood`, `note`, `attachments`,
`createdAt` and `updatedAt`. Score mapping: 1 `sangat_buruk`, 2 `buruk`,
3 `biasa_saja`, 4 `baik`, 5 `sangat_baik`.

At most five unique attachment UUIDs per entry; every attachment must belong to
the authenticated member. Missing/foreign attachment IDs return 404. Omitting
`note`/`attachmentIds` on PUT replaces them with empty values. Original `createdAt`
is preserved on edits. Unknown fields, invalid dates/scores/timezones/IDs and
historical/future writes return 400. Invalid/revoked member sessions return 401.
Missing/foreign resources return 404. Oversized multipart files return 413.
Uploads share a Redis limit of 60 per member/hour (429 when exhausted).

## Storage and app sequence

Use the S3 settings in `.env.example` plus `S3_PRIVATE_BUCKET`. It must be a
separate existing bucket from `S3_BUCKET`, with **no anonymous read/list policy**.
The API needs PutObject, GetObject and DeleteObject permissions in that private
bucket (DeleteObject is used for best-effort cleanup if registration fails).
Environment settings alone do not create buckets or enforce their policies.
No public ACL is applied by mood uploads. Existing `/upload/image` and
`/upload/video` routes and public-media contracts are preserved.

1. Upload selected image/audio to the appropriate `/upload/mood/` route.
2. Keep returned `{ id, type, contentType, size, url, expiresAt }` for preview.
3. Save mood with the returned IDs in `attachmentIds`; never send device URIs.
4. Load entries for detail/calendar. Map attachment `url` to the mobile `uri`.
5. Refresh expired URLs through the authenticated attachment route. Avoid logging
   or persistently caching signed URLs. They are bearer links valid for five
   minutes, including after logout/revocation until expiry.

No public URLs, bucket paths, owner IDs or credentials are returned as separate
metadata fields. A presigned URL necessarily contains its object path and signing
parameters. Audio validation checks MIME/container signatures and size; it does
not fully decode media, calculate trusted duration, or perform speech scanning.
The current mobile UI still needs its separate API integration; this API work
preserves its routes/layout and does not replace demo state yet. Unattached or
removed uploads remain private; automated orphan retention/cleanup is not defined.
Mood reminders and loneliness assessments are outside these routes.

## Verification

```sh
npm run build
MOOD_TEST_PORT=<disposable-local-mysql-port> node test/mood-tracker.integration.cjs
```

The integration creates/drops a uniquely named schema on a disposable local
MySQL server using root with an empty password. It checks real HTTP, DTOs,
member JWT/session validation, ownership, pagination, chart gaps, today-only
writes, concurrent upserts, multipart limits and repeated schema synchronization.
S3 transport, Redis counters and email are mocked. It generates real SDK signatures
with synthetic credentials, but does not establish real MinIO policies/signature
acceptance, Redis availability, playback, deployment or native-device behavior.
Never point this fixture at shared/deployed databases.
