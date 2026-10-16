# Active project migrations

Member authentication, refresh sessions and CMS identity baseline live here.
Apply them with `npm run migration:run` (source) or
`node dist/database/run-migrations.js` (after build). Deployment uses the latter.

`../data-source.ts` lists migration groups explicitly. Retain the original
`member_auth_migrations` and `cms_auth_migrations` tables: TypeORM uses them to
skip migrations already applied. Do not delete/reset these history tables.
New migrations must be registered in the appropriate group. Do not edit previously
applied migrations or run the general TypeORM datasource's migration:run directly;
the central runner selects the correct history for each group.

Old inherited migration source files were removed at the user’s request. No existing application tables or data are removed.
The CMS baseline refuses destructive rollback. Review schema changes individually;
there is no general automatic rollback command.
