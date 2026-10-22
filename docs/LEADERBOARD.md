UTC policy update (2026-10-22): month/cohort calculations now use UTC. Projection
keys use `hof:utc:<period>:`; rebuild the current projection after deployment.
Historical snapshots and old Redis keys remain untouched. See [UTC policy](UTC.md).
Current schema uses synchronize:true; older migration instructions below are historical.

# Leaderboard module

One BullMQ queue and one Redis projection are shared by all three pods. Each pod
runs a processor with concurrency 1. Redis uses the existing default connection
(`BULL_HOST`, `BULL_PORT`, local port 6379) and BullMQ uses its existing connection.
No new Redis deployment or dependency is required. All pods must use the same
host, port, database index and queue prefix. This implementation targets the
existing standalone Redis configuration, not Redis Cluster.

## Enable locally / staging

1. Run the `Leaderboard1791500000000` migration against the intended database.
   This code change does not run a migration or change deployment configuration.
2. Set `LEADERBOARD_ENABLED=true` on all pods; keep
   `LEADERBOARD_READ_ENABLED=false` during shadow validation.
3. Invoke authenticated `GET /cron/daily-hof` to backfill the current UTC month.
   External scheduler timing is unchanged; period calculations now use UTC.
   No internal HOF scheduler is enabled. Concurrent daily calls are rejected
   through a MySQL named lock shared across pods.
4. Invoke Basic-Auth protected `GET /cron/leaderboard-validate` to compare all
   participants across database history, accumulated scores and Redis. It returns
   mismatch count and up to 100 examples. Also compare against legacy category calculations
   on representative data. Equal scores now use ascending numeric member ID.
5. Enable `LEADERBOARD_READ_ENABLED=true` after integration and load validation.
   Read authenticated `GET /hof/realtime?category=paling-eksis` (also
   `pendatang-terbaik`, `tampil-kembali`). Existing HOF endpoints keep their
   existing response contracts and continue reading `hof_list`; client adoption
   of the new endpoint is a separate change.

Public landing pages can use `GET /hof/realtime/public?category=paling-eksis`
without authentication. It has the same top-5/period/source metadata but always
returns `me=null`. Personal positions remain protected by the authenticated
`/hof/realtime` endpoint. The Olimpiade client uses the public route for guests,
uses `me.point` for category points, and refreshes every 60 seconds while the
Hall of Fame page is visible.

The new response has `period`, `category`, `source`, `stale`, `updatedAt`, `top` and `me`.
`source` is `redis`, `snapshot`, or `unavailable`. The fallback never silently
uses another month. `me.rank=null` means the member is absent from the ranking;
`eligible=null` distinguishes unknown eligibility from a positive ranking.
Zero-score and ineligible presentation remains a product decision.
Disable the read flag to return to snapshots without disabling point recording.

## Consistency and recovery

- Point award/history/monthly accumulation/outbox use one database transaction.
  An existing member row serializes first total-point insert and subsequent
  mutations. Award deduplication is checked again inside that lock. Olympic
  awards retain per-interaction semantics rather than applying a daily cap.
- Negative admin deductions remain excluded from category scores, matching
  existing positive-history rules. They are now transactional with total points.
- Dispatcher polls pending events every second, at most 100 per pass per pod.
  A stable event job ID and absolute versioned Redis updates handle duplicate
  enqueue/retries. Ten exponential retries are used; failed jobs are retained.
  Before initial backfill, events remain pending rather than projecting a partial
  leaderboard. Delivered outbox rows are retained for operational inspection.
- Worker reads only the member's three monthly scores. Version, membership,
  score and integrity metadata update together in Lua. Tombstones are retained.
  Missing/evicted ranking or version keys trigger fallback/rebuild, rather than
  pretending the ranking is empty.
- Daily sync recalculates all three categories, including eligibility changes,
  and transactionally writes current-period snapshots and accumulation rows.
  It builds a new Redis generation; the database commits before atomic
  publication. A named projection lock prevents workers updating the old
  generation between commit and publication. Updates committed during that
  interval remain in outbox and apply after publication.
- Point requests take shared period locks; sync takes an exclusive period lock.
  Consequently, requests can wait during the database recalculation. Redis construction runs after commit and
  does not hold the database period lock; Redis outage therefore does not
  hold point transactions open. Measure this pause
  and queue latency before rollout; replace with snapshot/replay if unacceptable.
  Projection is serialized per period across pods during worker writes. This is
  a deliberate initial throughput ceiling, not a claimed production benchmark.
- Unpublished generations expire after one hour; previous successful generations
  expire after one day. Active generation keys have no TTL. Redis write failures
  do not occur in point transactions and therefore cannot roll back valid points.
- Redis outage/data loss: restore service, invoke `/cron/daily-hof`, and inspect
  retained failed BullMQ jobs. Daily sync enqueues reconciliation for all stored
  participants, so it repairs exhausted/previously delivered jobs as well.
- Unexpected process death between DB commit and Redis publication leaves the
  previous generation readable; repeat daily sync to finish recovery. Monitor
  sync success and outbox/queue latency. Histories for prior periods are not
  overwritten by the current-month daily endpoint.

Existing query semantics are retained (including NULL notes and multiplication
from multiple qualifying `log_last_active_manual` rows). Eligibility changes
without a point award are incorporated by daily sync; an eligible scoring award
also reevaluates category membership from the accumulated base score. Direct
moderation/deletion and manual final overrides require the open product rules
before adding additional mutation hooks. Database timestamp storage and driver
session timezone must be verified with production baseline before rollout.

## Checks

`npm run build`, `npx jest --runInBand leaderboard`, and
`npx jest --runInBand hof.realtime`.
The Redis tests start the locally installed `redis-server` on a temporary Unix
socket, with persistence disabled; they never connect to existing port 6379.
Set `REDIS_TEST_BINARY` if necessary. MySQL tests are opt-in: provide
`MYSQL_TEST_URL=mysql://user:password@127.0.0.1:3306` pointing to an isolated
local test server. They create and drop their own `leaderboard_test_*` schema,
never read application `.env`, and test concurrent awards, transaction rollback,
and shared/exclusive period locking. The test account needs CREATE DATABASE. MySQL concurrency/rollback and BullMQ
end-to-end integration plus load tests are required before rollout; isolated
MySQL was not available in this session. No production migrations were run. The existing monthly maintenance resets all
general `quest_points` totals to zero, including awards racing that reset; this
pre-existing lifecycle needs separate coordination before rollover rollout. The
new monthly category accumulations and history are not reset by that operation.

Operational inspection (in the intended environment): pending outbox count/age,
retained failed jobs, worker exceptions, sync completion duration, API p95/p99,
point commit to projection latency, Redis memory/eviction, and DB lock waits.
The proposed 60-second freshness target has not been proven by a load test.
