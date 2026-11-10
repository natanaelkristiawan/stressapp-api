import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedGames } from './game.seed';

/**
 * Runs the Game & Level seed, syncing all local game data into the database.
 */
async function main() {
  let stage = 'database initialization';
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    stage = 'game seeding';
    console.log('Seeding Game & Level data from local configuration...\n');
    await seedGames(AppDataSource);
    console.log('\nGame & Level seeding completed successfully.');
  } catch (error) {
    console.error(`Game seed failed during ${stage}:`, error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main();

