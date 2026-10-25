require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { MODULE_METADATA } = require('@nestjs/common/constants');
const { Test } = require('@nestjs/testing');
const { getQueueToken } = require('@nestjs/bullmq');
const { getDataSourceToken, getRepositoryToken } = require('@nestjs/typeorm');
const { BreathingModule } = require('../src/breathing/breathing.module');
const { BreathingService } = require('../src/breathing/breathing.service');
const { MemberBreathingController, CmsBreathingController } = require('../src/breathing/breathing.controller');
const { MemberAuthModule } = require('../src/member-auth/member-auth.module');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { AdminAuthModule } = require('../src/admin-auth/admin-auth.module');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { OTP_EMAIL_QUEUE } = require('../src/member-auth/member-auth.email.processor');
async function main() {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BreathingModule);
  assert(imports.includes(MemberAuthModule)); assert(imports.includes(AdminAuthModule));
  const builder = Test.createTestingModule({ imports: [BreathingModule] })
    .overrideProvider(getQueueToken(OTP_EMAIL_QUEUE)).useValue({})
    .overrideProvider(getRepositoryToken(Member, 'mimate')).useValue({})
    .overrideProvider(getRepositoryToken(UserAdmin, 'mimate')).useValue({})
    .useMocker(() => ({}));
  const module = await builder.compile();
  try {
    assert(module.get(MemberBreathingController) instanceof MemberBreathingController);
    assert(module.get(CmsBreathingController) instanceof CmsBreathingController);
    assert(module.get(MemberAuthService) instanceof MemberAuthService);
    assert(module.get(AdminAuthService) instanceof AdminAuthService);
    assert(module.get(BreathingService) instanceof BreathingService);
    const source = fs.readFileSync('src/app.module.ts', 'utf8');
    const entities = source.slice(source.indexOf('entities: ['), source.indexOf('// Your entities'));
    for (const name of ['BreathingExercise', 'BreathingPage', 'BreathingSession']) { assert(entities.includes(name)); }
    assert.equal((source.match(/path: 'me\/breathing'/g) || []).length, 2);
  } finally { await module.close(); }
  console.log('PASS: real BreathingModule resolves both controllers, real auth services and feature service; production entity/middleware registration present.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
