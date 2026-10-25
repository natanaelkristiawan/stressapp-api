require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { MODULE_METADATA } = require('@nestjs/common/constants');
const { Test } = require('@nestjs/testing');
const { getQueueToken } = require('@nestjs/bullmq');
const { AdminPostModule } = require('../src/admin-post/admin-post.module');
const {
  ContentImportController,
} = require('../src/admin-post/content-import.controller');
const {
  ContentImportService,
} = require('../src/admin-post/content-import.service');
const { MemberAuthModule } = require('../src/member-auth/member-auth.module');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const {
  OTP_EMAIL_QUEUE,
} = require('../src/member-auth/member-auth.email.processor');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');

// Keep the real exporting module; isolate only database, Redis and email infrastructure.
async function main() {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AdminPostModule);
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    AdminPostModule,
  );
  assert(imports.includes(MemberAuthModule));
  assert(controllers.includes(ContentImportController));
  const module = await Test.createTestingModule({
    imports: imports.filter((item) => item === MemberAuthModule),
    controllers: [ContentImportController],
    providers: [{ provide: ContentImportService, useValue: {} }],
  })
    .overrideProvider(getQueueToken(OTP_EMAIL_QUEUE))
    .useValue({})
    .overrideGuard(CmsMembersGuard)
    .useValue({ canActivate: () => true })
    .useMocker((token) => (token === MemberAuthService ? undefined : {}))
    .compile();
  try {
    assert(
      module.get(ContentImportController) instanceof ContentImportController,
    );
    assert(module.get(MemberAuthService) instanceof MemberAuthService);
  } finally {
    await module.close();
  }
  console.log(
    'PASS: AdminPost imports MemberAuthModule and Nest resolves ContentImportController with its real exported MemberAuthService.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
