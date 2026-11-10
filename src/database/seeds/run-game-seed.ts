import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedGames } from './game.seed';

/**
 * Runs the Game & Level seed, syncing all local game data into the database.
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
    stage = 'game seeding';
    console.log('Seeding Game & Level data from local configuration...\n');
    await seedGames(seedDataSource);
    console.log('\nGame & Level seeding completed successfully.');
  } catch (error) {
    console.error(`Game seed failed during ${stage}:`, error);
    process.exitCode = 1;
  } finally {
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
  }
}

void main();
