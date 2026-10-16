import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { adminSeedInput, seedAdmin } from './admin.seed';

/** Runs only the CMS admin seed, closes the database, and reports a nonzero failure. */
async function main() {
  try {
    const input = adminSeedInput(process.env);
    await AppDataSource.initialize();
    const result = await seedAdmin(AppDataSource, input);
    console.log(result === 'created' ? 'CMS admin created.' : 'CMS admin already exists; credentials unchanged.');
  } catch {
    // Database errors can contain SQL parameters; never print them here.
    console.error('Admin seed failed. Check ADMIN_SEED_* values, database connection/schema, and existing account/profile conflicts.');
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}
void main();
