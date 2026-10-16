# Unified member identity — fresh database

The user confirmed all database tables/history were cleared. The initial migration
creates the final schema directly: members, member_otps, member_sessions and users.
No existing-table/column checks, data copies, ID remapping, archive tables or
maintenance environment flag are needed. This baseline replaces the old auth,
refresh, CMS and merge migrations and targets an empty database only.

Run from the API folder:

```sh
npm run migration:run
npm run seed:admin
```

Compiled deployments use `node dist/database/run-migrations.js`. TypeORM records
completion in typeorm_migrations and skips it on later runs. Existing/incompatible
tables cause a normal schema error rather than an automatic repair. MySQL DDL can
leave a partial schema on failure; correct/reset the disposable fresh schema before
retrying. The down method drops these four tables in dependency order; it is not
invoked by deployment and must not be used once there is data to retain.

Member and UserMimateEntity resolve to one mapped class. OTP and session each live
in a dedicated entity-folder file. Password hashes are excluded from normal selects.
Legacy/CMS-only profiles have memberAuthEnabled=false; member registration sets it
true. CMS credentials remain in users with a unique profile foreign key.
Suspension/deletion/creation use is_suspended/deleted_at/created_at for all consumers.
Username/location/preferences are nullable storage for the mobile UI; profile API
persistence and final username rules remain separate work. Fields with API/CMS
consumers remain; unused locale/timeZone/income are absent from the initial schema.

`test/member-merge.integration.cjs` tests this fresh baseline on an explicitly
configured disposable local MySQL server. Set MEMBER_MERGE_TEST_PORT and run it
with Node from the API folder. It creates/drops only its uniquely named test DB,
never loads application .env, and tests migration history, constraints, entity
metadata, admin seeding and real registration/OTP/session flows. Redis/email
boundaries are mocked; production and mobile profile persistence are not tested.
