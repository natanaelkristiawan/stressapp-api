# Baseline assessment API

Implemented 18 October 2026; CMS configuration/history views added 19 October.
Mobile integration remains pending. Uses the existing `mimate` datasource, MemberAuthGuard and live CMS admin
authentication. No new dependencies, seed questionnaire or migration commands.
Development startup synchronizes `assessment_versions`, `assessment_settings`
and `member_assessments`. Existing standalone datasource discovers these entities.

## Approved flow and scope

Splash → authentication/registration OTP → welcome → initial mood → mood feedback
→ six assessment questions → result → Home. Completed members should go to Home
when mobile routing is integrated. The native splash remains startup branding.
Initial mood is a distinct onboarding step, never a daily Mood Tracker record.
CMS owns questions, answer labels/values, reverse scoring, category ranges and
interpretation/disclaimer text. All active CMS admins can configure instruments;
configuration routes do not return member responses. The user separately approved
read-only assessment history for all active CMS admins on 19 October 2026.

This increment supports one baseline per member. Week-two/week-four timing,
late measurements and retakes remain undecided and are not implemented. Saved
submitted steps resume across sessions; individual unanswered/submitted-as-draft
question selections and the welcome screen acknowledgement are not persisted.
The API does not yet gate other feature APIs on assessment completion or change
`/member-auth/me`. The mobile client must load this status after session hydration.

## CMS routes

All require the existing CMS bearer JWT and an active linked admin. Responses
use the existing `{ success, alert, data }` envelope. JSON requests only.

| Method | Path | Input / result |
| --- | --- | --- |
| GET | `/cms-assessments?page=1&pageSize=20` | Version metadata, total/page/pageSize, activeVersionId (nullable); pageSize ≤100 |
| GET | `/cms-assessments/:id` | Full configuration and revision; unknown version 404 |
| POST | `/cms-assessments` | Complete definition below; creates unpublished draft, 201 |
| PUT | `/cms-assessments/:id` | Complete definition plus current integer `revision`; replaces draft, 200 |
| POST | `/cms-assessments/:id/publish` | `{ "revision": 1, "scoringApproved": true }`; publishes and activates, 201 |

Definition fields:

- `title` (1–200), `disclaimer` (1–2000), `sourceReference` (1–1000),
  `scoringNotes` (1–2000): required nonblank trimmed strings.
- `questions`: exactly six, in display order. Each has unique `id` matching
  `[a-zA-Z0-9_-]{1,40}`, `text` (1–1000), required boolean `reverseScored`,
  and exactly four `options` in display order.
- Each option has `label` (1–100) and integer `value` (1–4). Values must be
  exactly 1,2,3,4 once per question; labels must be distinct within a question.
- `categories`: exactly three with unique `id` and `label` (1–100), integer
  `min`/`max` (6–24), and `interpretation` (1–2000). Ranges must cover every
  integer 6–24 exactly once, without gaps/overlap.

Question/option/category text is plain text. Consumers must render it as text.
Only query/route numerals are converted; body strings are never coerced into
numbers or booleans. Unknown body/nested fields are rejected. ID/revision upper
bound is 2147483647. Pagination page upper bound is 1000000.

The existing source questionnaire/item-five scoring still needs instrument-owner
review. No clinical wording or algorithm is seeded as approved. An admin must
provide a source and scoring notes and explicitly approve scoring at publication.
Direct questions add the selected 1–4 value; reversed questions add `5 - value`.
Totals remain 6–24; there is no 6–21 normalization. The CMS can assign the labels
and scoring values to each choice and configure each question's direction/ranges.

Edits use a row lock and revision check; stale edits return 409. Published
versions cannot be edited/deleted/reactivated. Create a new draft using the
previous definition to revise it. Publish atomically selects a single active
version. An identical publish retry with the original revision succeeds only
while that version is still active; it cannot roll back a newer publication.
Creator/publisher actor IDs and UTC timestamps are stored, without recording
member health responses in request logs. A draft's revision increments on edit
and on publication; published version ID identifies the frozen instrument and
scoring configuration.

## Member routes

Require a live member bearer JWT/session/account. Identity always comes from the
guard. Members cannot read or modify another member's progress using an ID.
Responses have `Cache-Control: private, no-store` and preserve explicit nulls.

| Method | Path | Input / result |
| --- | --- | --- |
| GET | `/me/assessment` | Current member's initial mood, completion, questionnaire and historical result |
| PUT | `/me/assessment/mood` | `{ "score": 1 }`, integer 1–5; saves separate initial mood |
| PUT | `/me/assessment` | `{ "versionId": 1, "answers": [{ "questionId": "q1", "value": 1 }, ...] }`, exactly six answers |

Status shape inside `data`:

```json
{
  "completed": false,
  "nextStep": "mood",
  "initialMood": null,
  "questionnaire": null,
  "result": null,
  "completedAt": null
}
```

`nextStep` is `mood`, `assessment`, `unavailable` (mood saved but no instrument
published), or `home` (completed). Questionnaire is null until a version is
published; otherwise it contains `versionId`, `title`, `disclaimer`, and the six
`questions` with `id`, `text`, `options`. CMS-only scoring controls/notes are not
sent to mobile. Completing members receive their original frozen questionnaire
and result even when a new version is published.

Saved initial mood contains `score`, server UTC `submittedAt`, and `feedbackType`
(`positive` for 3–5, `empathetic` for 1–2). Identical mood retries retain the
original timestamp; a mood can be changed until baseline completion. New mood
writes after completion return 409. No client date/timezone is needed because
this record is not a calendar-day mood entry.

Submission requires initial mood first (400 otherwise). Five answers, duplicate
or unknown question IDs, out-of-range/string values, extra fields and client
scores/categories/member IDs are rejected (400). Unconfigured submission returns
503; an obsolete version returns 409 and requires reloading current questions.
The server calculates the result and stores canonical ordered raw answers, the
immutable version FK, result snapshot and UTC completion time atomically.

Result fields: `score`, `maxScore` (24), `categoryId`, `category`, `interpretation`.
Submission returns `{ versionId, result, completedAt }`. A database primary key
on member ID plus member row locking permits one baseline only. Identical retries
(including reordered identical answers and retries after later publication)
return the original result/time; different replays return 409. No deletion or
retake endpoint exists. Publication uses an exclusive settings-row lock;
submissions use shared settings locks so members can submit concurrently while
publication cannot invalidate an in-flight accepted submission.

## Verification

```sh
npm run build
npx eslint src/assessment/*.ts src/entity/assessment-*.entity.ts src/entity/member-assessment.entity.ts
npm test -- --runInBand assessment.rules.spec.ts
ASSESSMENT_TEST_PORT=<disposable-local-mysql-port> node test/assessment.integration.cjs
```

Integration creates/drops only a uniquely named synthetic local schema. It uses
real HTTP, global DTO validation/envelopes, JWT guards, live account/session SQL,
MySQL schema synchronization/repeat synchronization, publication/versioning,
negative inputs, two-member privacy, saved history and concurrent submissions.
Queue and Redis transport are mocked; no application `.env` is loaded. Unit
checks cover score boundaries 6,9,10,15,16,24 and configurable reverse scoring.
No questionnaire content in these synthetic tests is production seed data.

## CMS assessment history (approved 19 October 2026)

`GET /cms-assessments/history` accepts required `from`/`to` YYYY-MM-DD calendar
dates (UTC completion dates, inclusive, ordered range ≤366 days), optional trimmed
`name` ≤100, `page`/`pageSize` with the same bounds as versions, `sortBy`
(`memberName`, `completedAt`, `score`) and `sortOrder` (`asc`, `desc`). Defaults:
page 1, pageSize 20, completedAt descending with descending member-ID tie-breaker.
Filtering, sorting and pagination run on the server. Lists current eligible mobile
accounts including suspended accounts, excluding deleted/legacy/staff profiles,
and only completed assessments. `data` contains `items`, `total`, `page`,
`pageSize`; each item has string `id` (baseline member ID), `memberName`,
`versionId`, UTC `completedAt`, `score`, `maxScore`, `category`.

`GET /cms-assessments/history/:id` returns the same scoped baseline's member name,
version ID/title, completion time, stored result and six ordered answers. Answers
include original `questionId`, `question`, chosen `answer` label, selected `value`,
actual awarded `points`, and `reverseScored`. Details derive wording and points
from the immutable submitted version, not the currently active instrument.
No email, credentials, initial mood or other private feature data is returned.
Unauthorized reads are 401; unknown/ineligible/incomplete records are 404.
Explicit nulls and no-store headers remain. Submission edit/delete/export routes
are not provided; CMS configuration changes never modify member history.

CMS routes under Mood Tracker:
`/mood-participation/assessments/questions`, `/results`, `/history`.
Question and Result share one RHF draft and a scoped server-snapshot Context.
Question contains the repeated answer labels/point fields; Result edits category
ranges. The user removed the separate Answers view on 19 October 2026 because
answers are already managed within Question. Save validates the entire instrument. Publish
requires a saved clean draft and explicit scoring confirmation. Published versions
are read-only; copy to a new draft to change them. History uses a remote TanStack
DataTable with URL-owned filters/pagination/sorting and a read-only detail dialog.
Private snapshots reset on account transitions and requests cancel on navigation.

Expanded integration checks cover history roles, read-only method rejection,
original direct/reverse points, totals, paging/filter/sort, UTC date boundaries,
and exclusion of deleted/legacy/staff accounts. Optional local UI fixture mode:
`ASSESSMENT_TEST_SERVE=1 ASSESSMENT_HTTP_PORT=3199 ASSESSMENT_TEST_PORT=<isolated port>`
keeps the synthetic API available until SIGTERM/SIGINT; it still drops only its own
schema on exit. Preview the CMS with `VITE_API_URL=http://127.0.0.1:3199` on port
5188; no application .env or deployed data is used.
