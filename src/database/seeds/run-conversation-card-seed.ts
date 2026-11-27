import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedConversationCards } from './conversation-card.seed';

/**
 * Runs the conversation-card seed, populating the four default topic cards.
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
    stage = 'conversation cards seeding';
    console.log('Seeding Conversation Cards...\n');
    const result = await seedConversationCards(seedDataSource);
    console.log(
      `\nConversation cards seed completed: ${result.created} created, ${result.skipped} skipped.`,
    );
  } catch (error) {
    console.error(`Conversation card seed failed during ${stage}:`, error);
    process.exitCode = 1;
  } finally {
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
  }
}

void main();
