import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedNotificationTemplates } from './notification-template.seed';

/**
 * Runs the Notification Templates seed, populating the 4 required automatic templates.
 * Disables schema synchronization during seeding so existing tables and indexes are never altered or dropped.
 */
async function main() {
  let stage = 'database initialization';
  const seedDataSource = new DataSource({
    ...AppDataSource.options,
    synchronize: false,
    migrationsRun: false,
  });

  try {
    console.log('Connecting to database...');
    await seedDataSource.initialize();
    stage = 'notification templates seeding';
    console.log('Seeding Notification Templates...\n');
    const result = await seedNotificationTemplates(seedDataSource);
    console.log(
      `\nNotification templates seed completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
    );
  } catch (error) {
    console.error(`Notification template seed failed during ${stage}:`, error);
    process.exitCode = 1;
  } finally {
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
  }
}

void main();

