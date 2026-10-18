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
| POST | `/upload/mood/image` | Multipart field `file`; one JPEG/PNG/WebP up to 5 MiB, maximum 16 million decoded pixels. Re-encoded in the original JPEG/PNG/WebP format to strip EXIF/location metadata. |
| POST | `/upload/mood/audio` | Multipart field `file`; one MP4/M4A, WebM, Ogg, WAV or MP3 up to 10 MiB. MIME and container signature must agree. |
| GET | `/upload/mood/:id` | UUID attachment ID. Returns attachment metadata and a permanent public media URL after ownership validation. |

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

User explicitly approved public mood images/audio on 18 October 2026. This
supersedes the earlier private-bucket/signed-URL design. Use the existing S3
settings and `S3_BUCKET`; `S3_PRIVATE_BUCKET` is no longer used. Configure anonymous
GetObject for root UUID filenames and legacy `mood/*` in that bucket, with no anonymous write/list permission.
The API needs PutObject/DeleteObject (cleanup) permissions. Settings alone do
not create buckets or change policies; see [server setup](SERVER_INFRA.md).
Existing `/upload/image` and `/upload/video` contracts are preserved.

1. Upload selected image/audio to the appropriate `/upload/mood/` route.
2. Keep returned `{ id, type, contentType, size, url, expiresAt }` for preview.
3. Save mood with the returned IDs in `attachmentIds`; never send device URIs.
4. Load entries for detail/calendar. Map attachment `url` to the mobile `uri`.
5. URLs are permanent public links and `expiresAt` is `null`. Anyone with the
   URL can access the file without login, including after logout. The authenticated
   attachment route remains owner-only, as does attaching an upload to an entry.

Bucket/key/owner ID are not separate metadata fields; the public URL includes
its object path. Credentials are never returned. Existing attachments keep their
stored bucket/key; moving old private objects or changing their read policies is
a separate deployment operation. No automatic data migration is performed.
Audio validation checks MIME/container signatures and size; it does
not fully decode media, calculate trusted duration, or perform speech scanning.
The existing mobile UI is now connected through its feature Context and validated
API adapter; see [mobile integration](../stressapp/MOOD_TRACKER.md). Live native
and MinIO verification remains pending. Unattached or
removed uploads remain public when their bucket policy allows access; automated orphan retention/cleanup is not defined.
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
S3 transport, Redis counters and email are mocked. It checks unsigned public URLs and shared-bucket uploads, but does not establish real MinIO policy
acceptance, Redis availability, playback, deployment or native-device behavior.
Never point this fixture at shared/deployed databases.

Object naming (18 October 2026): new mood uploads are stored directly at the
bucket root as `<uuid>.<extension>`, without member/date/folder prefixes. Images
retain their decoded JPEG/PNG/WebP format while stripping metadata. Original
extensions are retained when compatible with the validated content type; missing
or mismatched extensions use the canonical extension. Old keys remain readable.
