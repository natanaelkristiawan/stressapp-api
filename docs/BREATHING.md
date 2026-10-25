# Breathing exercises

Separate BreathingModule; exercise data is not stored in Post. User confirmed all
active CMS admins may manage content and view member session metadata. Member
sessions require an online start. Mobile owns animation/timing, pauses in the
background and reports terminal events. No rewards or clinical compliance claims.

## Routes

All responses use the existing success envelope with `data`. CMS routes use CMS
JWT middleware plus live CmsMembersGuard; member routes use MemberAuthGuard.

| Method/path | Purpose |
| --- | --- |
| GET /cms-breathing/exercises | Remote page/search/sort of draft and published exercises |
| GET /cms-breathing/exercises/:id | Current editable record and revision |
| POST /cms-breathing/exercises | Create exercise |
| PATCH /cms-breathing/exercises/:id | Replace editable fields with reviewed revision |
| GET, PUT /cms-breathing/page | Read/save plain-text landing copy and minute options |
| GET /cms-breathing/history | One row per session with member name/username/ID |
| GET /cms-breathing/summary | Start-cohort totals for dashboard |
| GET /me/breathing | Published catalog and landing configuration |
| POST /me/breathing/sessions | Online start: exerciseId, durationMinutes, requestId |
| PUT /me/breathing/sessions/:id/end | Owned ending: status, elapsedSeconds |

Exercise input: title (120), tag (50), description (500), 1–10 plain-text steps
(max500 each), inhaleSeconds/exhaleSeconds integers1–30, hold1Seconds/hold2Seconds
integers0–30 (0 skips), themeColor #RRGGBB, artwork relaxation/sleep/balance,
nullable imageUrl/guideImageUrl, sortOrder0–10000, draft/published status. Image
URLs must match existing CMS-uploaded Image assets; shared /upload/cms is reused.
No hard deletion; unpublishing preserves historical snapshots and ending reports.

Page fields: title, subtitle, educationTitle/Body, preparationTitle/Body,
1–8 unique durationOptions (integer minutes1–30), included defaultDuration, revision.
Concurrent page/exercise saves use locks and revision checks (409 on stale writes).
Existing three mobile patterns, copy and duration choices are inserted once on
module initialization. Insert-ignore preserves all later CMS edits/publication.
Built-in artwork uses bundled assets; custom uploaded images override it.

## Sessions, logging and reports

breathing_sessions contains UUID id, account-scoped requestId, member/exercise IDs,
start-time title/phase snapshot, selected duration, reported elapsed seconds,
server startedAt and terminal-report received endedAt. Start retries serialize on
the member row and reuse a unique member/requestId pair; inconsistent replays409.
End retries lock the owned session; identical endings replay, conflicting endings
409. Completion requires all selected seconds and sufficient server elapsed time;
this validates a timer report, not that someone physically followed each breath.

activity_logs is reused: nullable indexed breathingSessionId FK, targetType/source
breathing, actions breathing-started/completed/stopped, plus CMS edit/create audit
events without content copies. Writes commit with session/config changes. The
legacy ActivityService path is deliberately not invoked because it filters target
types and has comment/reaction notification/reward side effects. Existing activity
rows and notifications are retained. Raw HTTP request logging/null coercion skip
these controllers; nullable values retain their meaning.

Stored statuses: in_progress, completed, stopped. Reporting derives unconfirmed
when an in-progress session has no ending after24h. No worker or invented stop event;
a later owned ending reconciles that session. An app crash may leave it unconfirmed.

Reports require inclusive from/to UTC calendar days, maximum366 days; date range
selects startedAt, with exclusive next-day upper bound. Optional literal member
name/username search, exerciseId/status, bounded page/pageSize and allowlisted
sort/order. Deleted member accounts are excluded; suspended members remain in
reports. No member email, health responses, notes or private chat are exposed.

Dashboard counts distinct member IDs and session rows, never activity event rows.
Completed means completed sessions in this start-date cohort (even if the report
arrived later). Rate = completed/started, including still-in-progress sessions in
the denominator; null when none started. All timestamps are UTC.

Mobile saves one minimal ending before sending (native SecureStore, web tab-scoped
sessionStorage), scoped to the account and captured auth generation. Failed endings
retry on foreground/sign-in and every15s while foregrounded. New starts first flush
that report, so a newer session cannot overwrite it. Sign-out does not send old
activity as a new account. Web tab closure can lose tab-local pending data; native
storage survives restart. No offline starts, no reconstruction after process death.

## Verification and deployment

- npm run build; scoped ESLint; node test/breathing-wiring.cjs.
- BREATHING_TEST_PORT=<disposable local MySQL> node test/breathing.integration.cjs:
  creates/drops only its own synthetic schema; real HTTP, actual mobile transport,
  permissions/validation, concurrent edits/start/end, snapshots, logs, UTC report
  totals, late endings and repeat TypeORM schema sync.
- CMS node test/breathing.cjs; mobile node test/breathing.cjs; respective build/type/lint.

Production module and standalone datasource both include the new entities. Keep
confirmed development synchronize:true policy. Deploy API/schema before CMS/mobile.
No production deployment or physical device/browser acceptance is claimed.

## Dashboard cards (2026-10-25)

GET /cms-breathing/dashboard accepts the existing validated report query and
returns the summary fields plus daily completed counts grouped by UTC session
start date, up to20 exercise ID/historical-title groups (started/completed counts),
and latest4 safe history rows. Same active-admin guard and no-store policy as
history. Unfinished rows have endedAt:null. Completion is completed/started,
including in-progress sessions in the denominator. CMS shares one request across
module-owned cards; the dashboard owns date range and refresh.
