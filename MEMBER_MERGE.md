# Unified member identity — development synchronization

The user explicitly selected TypeORM synchronize:true during development.
API startup and standalone seeds synchronize the configured DB directly from
entities. Migration files, runner, npm migration commands and deployment migration
step have been removed. GitHub deployment installs/builds and reloads PM2; API
startup applies synchronization. Existing migration-history tables are not used
or explicitly removed.

Run `npm run seed:admin` after configuring the server .env. The seed datasource
also synchronizes before creating a dedicated CMS admin. Member and
UserMimateEntity share one mapped class. OTP/session entities declare their member
FKs and unique constraints directly; CMS credentials remain in users.

`test/member-merge.integration.cjs` tests full entity synchronization on disposable
MySQL (MEMBER_MERGE_TEST_PORT must be supplied), repeats synchronization to check
record preservation, and exercises real registration/OTP/JWT/admin flows with
Redis/email boundaries mocked. It never loads the application's .env.

This configuration follows the user's development decision and supersedes earlier
migration/maintenance/archive instructions. Mobile profile persistence remains
separate work.
