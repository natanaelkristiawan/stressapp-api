// Inspects the compiled Nest graph and ORM metadata without connecting to a database.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { AppModule } = require('../dist/app.module');
const roots = [];
const seen = new Set();
/** Traverses Nest imports/providers. Returns Promise<void>; rejects retired connection providers. */
async function visit(item) {
  item = await item;
  if (!item || seen.has(item)) return;
  seen.add(item);
  if (typeof item === 'function') {
    for (const child of Reflect.getMetadata('imports', item) || []) await visit(child);
    return;
  }
  if (typeof item !== 'object') return;
  for (const provider of item.providers || []) {
    const options = provider.useValue;
    if (options && options.type === 'mysql' && Array.isArray(options.entities)) roots.push(options);
    assert(!String(provider.provide || '').startsWith('mmid'), 'Retired datasource/repository provider remains');
  }
  for (const child of item.imports || []) await visit(child);
  await visit(item.module);
}
/** Validates the compiled app configuration. Returns Promise<void>; never opens a DB connection. */
async function check() {
  await visit(AppModule);
  assert.deepEqual(roots.map(options => options.name), ['mimate']);
  const source = new DataSource(roots[0]);
  await source.buildMetadatas();
  assert.equal(source.entityMetadatas.filter(entity => entity.tableName === 'users').length, 1);
  for (const name of ['UserEntity', 'UserVehicleEntity', 'CarEntity']) {
    assert(!source.entityMetadatas.some(entity => entity.name === name), `${name} should be retired`);
  }
  console.log('PASS: one MySQL datasource, no mmid providers, valid local entity relations and one CMS users mapping.');
}
check().catch(error => { console.error(error.message); process.exitCode = 1; });
