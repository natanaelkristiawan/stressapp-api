require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { MODULE_METADATA } = require('@nestjs/common/constants');
const { Test } = require('@nestjs/testing');
const { getQueueToken } = require('@nestjs/bullmq');
const { PsychologistsModule } = require('../src/psychologists/psychologists.module');
const {
  CmsPsychologistsController,
} = require('../src/psychologists/psychologists.controller');
const {
  PsychologistsImport,
} = require('../src/psychologists/psychologists.import');
const { MemberAuthModule } = require('../src/member-auth/member-auth.module');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const {
  OTP_EMAIL_QUEUE,
} = require('../src/member-auth/member-auth.email.processor');
const { PsychologistsService } = require('../src/psychologists/psychologists.service');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');

// Keep the real exporting module; isolate only database, Redis and email infrastructure.
async function main() {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, PsychologistsModule);
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    PsychologistsModule,
  );
  assert(imports.includes(MemberAuthModule));
  assert(controllers.includes(CmsPsychologistsController));
  const module = await Test.createTestingModule({
    imports: imports.filter((item) => item === MemberAuthModule),
    controllers: [CmsPsychologistsController],
    providers: [{ provide: PsychologistsImport, useValue: {} }, { provide: PsychologistsService, useValue: {} }],
  })
    .overrideProvider(getQueueToken(OTP_EMAIL_QUEUE))
    .useValue({})
    .overrideGuard(CmsMembersGuard)
    .useValue({ canActivate: () => true })
    .useMocker((token) => (token === MemberAuthService ? undefined : {}))
    .compile();
  try {
    assert(
      module.get(CmsPsychologistsController) instanceof CmsPsychologistsController,
    );
    assert(module.get(MemberAuthService) instanceof MemberAuthService);
  } finally {
    await module.close();
  }
  console.log(
    'PASS: PsychologistsModule imports MemberAuthModule and Nest resolves CmsPsychologistsController with its real exported MemberAuthService.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
