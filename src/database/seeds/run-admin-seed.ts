import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { adminSeedFailure, adminSeedInput, seedAdmin } from './admin.seed';

/** Runs only the CMS admin seed, closes the database, and reports a nonzero failure. */
async function main() {
  let stage = 'configuration validation';
  try {
    const input = adminSeedInput(process.env);
    stage = 'database initialization';
    await AppDataSource.initialize();
    stage = 'admin creation';
    const result = await seedAdmin(AppDataSource, input);
    console.log(result === 'created' ? 'CMS admin created.' : 'CMS admin already exists; credentials unchanged.');
  } catch (error) {
    // Database errors can contain SQL parameters; never print them here.
    console.error(`Admin seed failed during ${stage}: ${adminSeedFailure(error)}`);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}
void main();
