// Local synthetic database only; real HTTP/DTO/JWT/session/SQL paths, mocked queue/Redis transport.
require('ts-node/register'); require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { Member } = require('../src/entity/user-mimate.entity');
const { MemberSession } = require('../src/entity/member-session.entity');
const { MemberPushDevice } = require('../src/entity/member-push-device.entity');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { MemberAuthGuard } = require('../src/member-auth/member-auth.guard');
const { PushDevicesController } = require('../src/push-devices/push-devices.controller');
const { PushDevicesService } = require('../src/push-devices/push-devices.service');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');

/** Verifies independent installations, account switches, refresh continuity and automatic logout cleanup. Drops only its unique schema. */
async function main() {
  const port = Number(process.env.PUSH_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set PUSH_TEST_PORT to isolated local MySQL');
  const options = {host:'127.0.0.1',port,user:'root',password:''};
  const connection = await createConnection(options), schema = `push_test_${process.pid}_${Date.now()}`;
  const secret = 'synthetic-push-fixture-secret', jwt = new JwtService({secret});
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname,'../src/entity');
    const module = await Test.createTestingModule({
      imports:[TypeOrmModule.forRoot({name:'mimate',type:'mysql',...options,username:'root',database:schema,timezone:'Z',synchronize:true,
        entities:readdirSync(folder).filter(f=>/\.entity\.ts$/.test(f)&&!/^(user|car|vehicle)\.entity\./.test(f)).map(f=>resolve(folder,f))})],
      controllers:[PushDevicesController], providers:[PushDevicesService,MemberAuthGuard,
        {provide:MemberAuthService,inject:[getDataSourceToken('mimate')],useFactory:db=>new MemberAuthService(db,{add:async()=>undefined},{getOrThrow:()=>({eval:async()=>1})},{get:()=>secret,getOrThrow:()=>secret},jwt)}],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
    app.useGlobalInterceptors(new SuccessInterceptor()); app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0,'127.0.0.1');
    const base = await app.getUrl(), db = module.get(getDataSourceToken('mimate'));
    await db.synchronize();
    const auth = module.get(MemberAuthService), devices = module.get(PushDevicesService);
    const alice = await db.getRepository(Member).save({name:'Alice',email:'push-alice@example.test',memberAuthEnabled:true,verifiedAt:new Date()});
    const bob = await db.getRepository(Member).save({name:'Bob',email:'push-bob@example.test',memberAuthEnabled:true,verifiedAt:new Date()});
    /** Creates a real independent persisted login session. Returns token/session and a refresh fixture. */
    async function access(member) {
      const sid = randomBytes(32).toString('hex'), refreshToken = `refresh_${randomBytes(32).toString('hex')}`;
      await db.getRepository(MemberSession).save({tokenHash:sid,memberId:member.id,refreshHash:auth.hash(refreshToken),expiresAt:new Date(Date.now()+3600000)});
      return {sid,refreshToken,token:jwt.sign({sid,kind:'member-access'},{subject:String(member.id),issuer:'temu-sobat',audience:'member',expiresIn:3600})};
    }
    const a1 = await access(alice), a2 = await access(alice), b1 = await access(bob);
    const input = {platform:'android',provider:'fcm',token:'synthetic-fcm-first-installation'};
    /** Sends a real protected request. Returns envelope data after asserting its status. */
    async function request(status,method,body,bearer=a1.token,path='') {
      const response=await fetch(`${base}/me/push-devices${path}`,{method,headers:{...(bearer?{Authorization:`Bearer ${bearer}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const payload=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(payload)}`);return payload.data;
    }
    await request(401,'PUT',input,''); await request(401,'PUT',input,'invalid');
    const admin = jwt.sign({id:alice.id,iss:'https://mimate.otesuto.com/admin-auth/login',aud:'cms',kind:'admin-access'});
    await request(401,'PUT',input,admin);
    for(const invalid of [{...input,memberId:bob.id},{...input,sessionId:b1.sid},{...input,token:'short'},{...input,token:'bad token contains spaces'},{...input,provider:'expo'},{...input,provider:'apns'},{...input,platform:'invalid'},{...input,token:null}]) await request(400,'PUT',invalid);
    const [first, second] = await Promise.all([request(200,'PUT',input),request(200,'PUT',{...input,token:'synthetic-fcm-second-installation'},a2.token)]);
    assert.equal(first.registered,true);assert.equal(second.registered,true);
    assert(!JSON.stringify(first).includes('token'));assert(!JSON.stringify(first).includes(a1.sid));
    assert.equal((await devices.recipients(alice.id)).length,2);
    await request(200,'PUT',input);assert.equal((await devices.recipients(alice.id)).length,2);
    await request(200,'PUT',{...input,token:'synthetic-fcm-rotated-installation'});
    assert.equal((await devices.recipients(alice.id)).length,2);
    assert(!(await devices.recipients(alice.id)).some(d=>d.token===input.token));
    const renewed=await auth.refresh(a1.refreshToken);
    await request(200,'PUT',{...input,token:'synthetic-fcm-rotated-installation'},renewed.token);
    assert.equal((await devices.recipients(alice.id)).length,2);
    // Same physical push token signing in to another account moves only that subscription.
    await request(200,'PUT',{...input,token:'synthetic-fcm-rotated-installation'},b1.token);
    assert.equal((await devices.recipients(alice.id)).length,1);assert.equal((await devices.recipients(bob.id)).length,1);
    await auth.logout(a1.token);assert.equal((await devices.recipients(bob.id)).length,1);
    await request(401,'PUT',input,a1.token);
    await request(200,'DELETE',undefined,a2.token,'/android');
    await request(200,'DELETE',undefined,a2.token,'/android');
    assert.equal((await devices.recipients(alice.id)).length,0);
    await request(200,'PUT',input,a2.token);
    await auth.logout(a2.token);assert.equal((await devices.recipients(alice.id)).length,0);
    assert.equal(await db.getRepository(MemberPushDevice).countBy({sessionId:a2.sid}),0);
    await request(400,'DELETE',undefined,b1.token,'/invalid');
    await request(200,'PUT',{platform:'web',provider:'fcm',token:'synthetic-web-browser-installation'},b1.token);
    assert.equal((await devices.recipients(bob.id)).length,2);
    const a3 = await access(alice);
    await request(200,'PUT',{platform:'ios',provider:'apns',token:'a'.repeat(64)},b1.token);
    await request(200,'PUT',{platform:'ios',provider:'apns',token:'A'.repeat(64)},a3.token);
    assert.equal((await devices.recipients(bob.id)).length,2);
    assert.equal((await devices.recipients(alice.id)).length,1);
    const safe = await auth.authenticate(b1.token);assert(!('sessionId' in safe));
    await db.getRepository(Member).update(bob.id,{is_suspended:true});
    assert.equal((await devices.recipients(bob.id)).length,0);await request(401,'PUT',input,b1.token);
    await db.getRepository(Member).update(bob.id,{is_suspended:false});
    await db.getRepository(MemberSession).update(b1.sid,{expiresAt:new Date(Date.now()-1000)});
    assert.equal((await devices.recipients(bob.id)).length,0);await request(401,'PUT',input,b1.token);
    assert(readFileSync(resolve(__dirname,'../src/common/interceptors/logging.interceptor.ts'),'utf8').includes("'PushDevicesController'"));
    console.log('PASS: push devices HTTP/MySQL schema/repeat-sync, auth/DTOs, multi-device tokens, rotation, account switch, refresh and cascade logout cleanup.');
  } finally {if(app)await app.close();await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);await connection.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
