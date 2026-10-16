# Active project migrations

InitialIdentity1792195200000 creates the final member, OTP, session and CMS admin
identity schema directly for the user-confirmed empty database. It replaces the
previous auth/refresh/CMS/merge sequence. No backup table or data conversion occurs.

Run `npm run migration:run` or `node dist/database/run-migrations.js` after build.
TypeORM uses typeorm_migrations to skip completed versions. The central datasource
lists the baseline explicitly and discovers entities from src/entity.

No existing-table/column checks or automatic schema repair are performed.
See [the identity guide](../../../MEMBER_MERGE.md). Other feature schemas remain
separate work; this baseline covers identity only.
