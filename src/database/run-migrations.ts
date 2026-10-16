import { DataSource, DataSourceOptions } from 'typeorm';
import { AppDataSource, migrationGroups } from './data-source';

/** Runs active project migrations and records completed versions, closing each connection. */
export async function runProjectMigrations(
  createSource: (options: DataSourceOptions) => DataSource = (options) =>
    new DataSource(options),
): Promise<void> {
  for (const group of migrationGroups) {
    const source = createSource({
      ...AppDataSource.options,
      entities: [],
      ...group,
    });
    try {
      await source.initialize();
      await source.runMigrations();
    } finally {
      if (source.isInitialized) await source.destroy();
    }
  }
}

if (require.main === module) {
  runProjectMigrations().catch(() => {
    // Raw driver errors may contain SQL values or credentials.
    console.error(
      'Project migrations failed. Check database connectivity and schema; PM2 must not reload.',
    );
    process.exitCode = 1;
  });
}
