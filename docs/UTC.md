# API UTC date/time policy

Confirmed by user on 2026-10-22: keep API dates/times in UTC and remove manual
UTC+7/UTC+8 conversions. No existing timestamp rows are rewritten by this change.

- Date-range filters interpret selected days as UTC calendar days. Existing
  Members/Assessment UTC filters remain UTC. Legacy Admin Post/User, dashboard,
  activity, quest-history/report and export filters now use UTC calendar setters.
- Daily, weekday and hourly report buckets use unshifted stored timestamps;
  SQL DATE_ADD/CONVERT_TZ offsets are removed. Previous-period calculations and
  label formatting no longer depend on the API host timezone or DST.
- Response/export timestamps retain their UTC instants. Legacy activity labels,
  quest history, uploads, reactions, post reports, messages and poll availability
  no longer reconstruct a fake local wall clock. Date-only/legacy display strings
  keep their existing layouts but now represent UTC.
- API bootstrap sets process TZ=UTC; the PM2 template also declares UTC. Runtime
  and standalone TypeORM connections explicitly use timezone='Z'. MySQL server/
  session timezone should also be UTC for SQL-generated CURRENT_TIMESTAMP values;
  client serialization settings do not reconfigure the database server. Verify
  deployed server configuration when rolling out; no server configuration changed.
- Month/cohort boundaries, current leaderboard periods, legacy winner calculations
  and daily quest activity windows now use UTC. Cron's concluded-month selection
  uses UTC; no schedule expressions or external scheduler configuration changed.
- Leaderboard projection keys use `hof:utc:<period>:` to avoid serving caches
  calculated with old UTC+8 windows. Old keys/data remain untouched. Rebuild the
  current projection through the existing sync/daily-HOF flow after deployment
  before enabling real-time reads; do not clear shared Redis. Historical snapshots
  are retained as originally calculated rather than silently recomputed.

Mood `dateString` is a member-selected/local calendar key, not an instant. Its
existing device-timezone/today validation and date-key filtering remain unchanged;
mood createdAt/updatedAt timestamps still serialize as UTC. This preserves the
confirmed member-local daily mood contract.

Validation: API build and compiled datasource/entity metadata checks; 22 focused
unit/Redis regressions; real HTTP/disposable MySQL checks including Post UTC-midnight
filter/response and activity SQL bucket assertions under UTC, Asia/Makassar and
America/New_York. Tests use synthetic data/mock S3 and temporary Redis/MySQL only.
No deployment, existing-data conversion, production cache deletion or live storage
change performed. Previously shifted historical rows require independent review;
a timezone-code change cannot establish which old values were stored incorrectly.
