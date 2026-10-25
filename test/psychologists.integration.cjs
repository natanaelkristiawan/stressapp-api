require('ts-node/register');
require('tsconfig-paths/register');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createConnection}=require('mysql2/promise');
const {Test}=require('@nestjs/testing');
const {TypeOrmModule,getDataSourceToken}=require('@nestjs/typeorm');
const {ValidationPipe,UnauthorizedException}=require('@nestjs/common');
const {plainToInstance}=require('class-transformer');
const {validate}=require('class-validator');
const ExcelJS=require('exceljs');
const {PsychologistsService}=require('../src/psychologists/psychologists.service');
const {PsychologistsImport,LOCATION_HEADERS}=require('../src/psychologists/psychologists.import');
const {CmsPsychologistsController,MemberPsychologistsController}=require('../src/psychologists/psychologists.controller');
const {LocationInputDto}=require('../src/psychologists/psychologists.dto');
const {PsychologistLocation}=require('../src/entity/psychologist-location.entity');
const {AdminAuthService}=require('../src/admin-auth/admin-auth.service');
const {MemberAuthService}=require('../src/member-auth/member-auth.service');
const {CmsMembersGuard}=require('../src/cms-members/cms-members.guard');
const {MemberAuthGuard}=require('../src/member-auth/member-auth.guard');
const {SuccessInterceptor}=require('../src/common/interceptors/success.interceptor');
const {NullToEmptyInterceptor}=require('../src/common/interceptors/null-to-empty.interceptor');
async function main(){
 const port=Number(process.env.DIRECTORY_TEST_PORT);assert(port>0,'Set DIRECTORY_TEST_PORT to a disposable local MySQL server');
 const password=process.env.DIRECTORY_TEST_PASSWORD??'';
 const schema=`directory_test_${process.pid}_${Date.now()}`;
 const connection=await createConnection({host:'127.0.0.1',port,user:'root',password});
 let app;
 try{
  await connection.query(`CREATE DATABASE \`${schema}\``);
  const folder=path.resolve(__dirname,'../src/entity');
  const module=await Test.createTestingModule({imports:[TypeOrmModule.forRoot({name:'mimate',type:'mysql',host:'127.0.0.1',port,username:'root',password,database:schema,timezone:'Z',synchronize:true,entities:fs.readdirSync(folder).filter(file=>/\.entity\.ts$/.test(file)&&!/^(user|car|vehicle)\.entity\./.test(file)).map(file=>path.resolve(folder,file))})],controllers:[CmsPsychologistsController,MemberPsychologistsController],providers:[PsychologistsService,PsychologistsImport,CmsMembersGuard,MemberAuthGuard,{provide:AdminAuthService,useValue:{currentAdmin:async id=>{if(id!==1){throw new UnauthorizedException();}}}},{provide:MemberAuthService,useValue:{limit:async()=>{},authenticateSession:async token=>{if(token!=='member'){throw new UnauthorizedException();}return{member:{id:2},sessionId:'synthetic'};}}}]}).compile();
  const db=module.get(getDataSourceToken('mimate'));
  await db.synchronize();
  const repository=db.getRepository(PsychologistLocation);
  app=module.createNestApplication();
  app.use((req,res,next)=>{if(req.headers.authorization==='Bearer cms'){req.userData={id:1};}next();});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.useGlobalInterceptors(new SuccessInterceptor(),new NullToEmptyInterceptor());
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function call(method,url,body,token='cms'){
   const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return{status:response.status,body:await response.json()};
  }
  async function upload(action,bytes,hash,token='cms'){
   const form=new FormData();form.append('file',new Blob([bytes]),'locations.xlsx');if(hash!==undefined){form.append('expectedHash',hash);}
   const response=await fetch(base+'/cms-psychologists/import/'+action,{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:form});
   return{status:response.status,body:await response.json()};
  }
  async function workbook(rows){const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Locations');sheet.addRow(LOCATION_HEADERS);for(const row of rows){sheet.addRow(row);}return Buffer.from(await book.xlsx.writeBuffer());}
  const importer=module.get(PsychologistsImport);
  const bytes=await importer.template();
  assert.equal((await call('GET','/cms-psychologists',undefined,null)).status,401);
  assert.equal((await call('GET','/cms-psychologists',undefined,'member')).status,401);
  assert.equal((await call('GET','/me/psychologists',undefined,'cms')).status,401);
  assert.equal((await upload('preview',bytes,undefined,null)).status,401);
  const preview=await upload('preview',bytes);assert.equal(preview.status,201);assert.equal(preview.body.data.rows.length,40);assert.equal(preview.body.data.canImport,true,JSON.stringify(preview.body.data));assert.equal(await repository.count(),0);
  const supplied=fs.readFileSync(path.resolve(__dirname,'../../outputs/psychologist-directory/psychologist-locations.xlsx'));
  const suppliedPreview=await importer.preview(supplied);assert.equal(suppliedPreview.canImport,true,JSON.stringify(suppliedPreview));assert.equal(suppliedPreview.rows[0].input.phone,'082138681319');assert.equal(suppliedPreview.rows.length,40);
  assert.equal((await upload('commit',bytes,'0'.repeat(64))).status,400);
  const committed=await upload('commit',bytes,preview.body.data.fileHash);assert.equal(committed.status,201,JSON.stringify(committed));assert.deepEqual(committed.body.data,{created:40,skipped:0});
  const retries=await Promise.all([upload('commit',bytes,preview.body.data.fileHash),upload('commit',bytes,preview.body.data.fileHash)]);retries.forEach(result=>assert.deepEqual(result.body.data,{created:0,skipped:40}));
  assert.equal(await repository.count(),40);
  const mobile=await call('GET','/me/psychologists?pageSize=100',undefined,'member');assert.equal(mobile.status,200);assert.equal(mobile.body.data.total,40);assert.equal(mobile.body.data.items[0].latitude,null);assert.equal(mobile.body.data.items[0].distanceKm,null);assert(!('identityKey' in mobile.body.data.items[0]));
  const cities=await call('GET','/me/psychologists/cities',undefined,'member');assert.equal(cities.body.data.length,6);
  const empty=await call('GET','/me/psychologists?city=NoSuchCity',undefined,'member');assert.equal(empty.body.data.total,0);
  const input={name:'Synthetic clinic',branch:'Main',city:'Synthetic city',address:'Synthetic address',phone:'081234567890',contactType:'whatsapp',contactNotes:'',website:'',serviceMode:'onsite',latitude:0,longitude:0,status:'published'};
  const created=await call('POST','/cms-psychologists',input);assert.equal(created.status,201,JSON.stringify(created));const id=created.body.data.id;
  assert.equal((await call('PATCH',`/cms-psychologists/${id}`,{...input,revision:1,longitude:1})).status,200);
  assert.equal((await call('PATCH',`/cms-psychologists/${id}`,{...input,revision:1})).status,409);
  const nearest=await call('GET','/me/psychologists?latitude=0&longitude=0',undefined,'member');assert.equal(nearest.status,200,JSON.stringify(nearest));assert.equal(nearest.body.data.items[0].id,id);assert(Math.abs(nearest.body.data.items[0].distanceKm-111.195)<0.1);
  assert.equal(nearest.body.data.items[1].distanceKm,null);
  await call('PATCH',`/cms-psychologists/${id}`,{...input,revision:2,status:'draft'});
  assert.equal((await call('GET','/me/psychologists?city=Synthetic%20city',undefined,'member')).body.data.total,0);
  for(const bad of [{...input,latitude:91},{...input,longitude:null},{...input,serviceMode:'online'},{...input,website:'javascript:alert(1)'},{...input,extra:1},{...input,latitude:undefined}]){assert.equal((await call('POST','/cms-psychologists',bad)).status,400,JSON.stringify(bad));}
  for(const query of ['pageSize=1000','latitude=0','latitude=NaN&longitude=1','status=bad','sort=address']){assert.equal((await call('GET','/me/psychologists?'+query,undefined,'member')).status,400,query);}
  const example=preview.body.data.rows[0].input;
  const invalid=await workbook([LOCATION_HEADERS.map(key=>key==='name'?{formula:'1+1'}:example[key]??'')]);const invalidPreview=await upload('preview',invalid);assert.equal(invalidPreview.body.data.canImport,false);assert.equal(invalidPreview.body.data.rows[0].input.name,'');assert.equal((await upload('commit',invalid,invalidPreview.body.data.fileHash)).status,400);
  assert.equal((await upload('preview',Buffer.from('not zip'))).status,400);
  const validNew={...input,name:'Rollback branch',status:'published'};
  const rollbackBytes=await workbook([LOCATION_HEADERS.map(key=>validNew[key]??''),LOCATION_HEADERS.map(key=>key==='name'?'Second rollback':validNew[key]??'')]);
  const rollbackPreview=await importer.preview(rollbackBytes);const original=db.transaction.bind(db);
  db.transaction=async callback=>original(async manager=>{let calls=0;const get=manager.getRepository.bind(manager);manager.getRepository=entity=>{const repo=get(entity);if(entity===PsychologistLocation){const insert=repo.insert.bind(repo);repo.insert=async value=>{if(++calls===2){throw new Error('forced write failure');}return insert(value);};}return repo;};return callback(manager);});
  await assert.rejects(()=>importer.commit(rollbackBytes,rollbackPreview.fileHash,1),/forced write failure/);db.transaction=original;assert.equal(await repository.countBy({name:'Rollback branch'}),0);
  const concurrentInput={...input,name:'Concurrent branch',latitude:null,longitude:null};
  const concurrentBytes=await workbook([LOCATION_HEADERS.map(key=>concurrentInput[key]??'')]);
  const concurrentPreview=await importer.preview(concurrentBytes);
  const concurrent=await Promise.all([upload('commit',concurrentBytes,concurrentPreview.fileHash),upload('commit',concurrentBytes,concurrentPreview.fileHash)]);
  assert.deepEqual(concurrent.map(result=>result.body.data.created).sort(),[0,1]);
  assert.equal(await repository.countBy({name:'Concurrent branch'}),1);
  await repository.delete({name:'Concurrent branch'});
  // Validate actual mobile adapter against the real HTTP envelope.
  const vm=require('node:vm'),ts=require('typescript'),mobileRequire=require('node:module').createRequire(path.resolve(__dirname,'../../stressapp/package.json'));
  function loadMobile(file,mocks){const exports={};const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../stressapp',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{exports,AbortController,URLSearchParams,fetch,setTimeout,clearTimeout,process:{env:{EXPO_PUBLIC_API_URL:base}},require:name=>name in mocks?mocks[name]:mobileRequire(name)});return exports;}
  const transport=loadMobile('lib/member-auth-api.ts',{'react-native':{Platform:{OS:'ios'}}});transport.configureMemberSession({version:()=>1,refresh:async()=>'member'});
  const adapter=loadMobile('lib/psychologists-api.ts',{'./member-auth-api':transport,'@/stores/auth-store':{useAuthStore:{getState:()=>({token:'member'})}}}).psychologistsApi;
  assert.equal((await adapter.list({pageSize:100})).total,40);assert.equal((await adapter.cities()).length,6);
  await db.synchronize();
  // Soft deletion removes a branch from CMS/member catalogs but keeps its identity reserved for imports.
  const deletionTarget = (await repository.find({ order: { id: 'ASC' }, take: 1 }))[0];
  const deletePath = '/cms-psychologists/' + deletionTarget.id;
  for (const token of [null, 'member']) { assert.equal((await call('DELETE', deletePath, {revision: deletionTarget.revision}, token)).status,401); }
  for (const body of [{},{revision:'1'},{revision:0},{revision:deletionTarget.revision,extra:true}]) { assert.equal((await call('DELETE',deletePath,body)).status,400); }
  assert.equal((await call('DELETE',deletePath,{revision:deletionTarget.revision+1})).status,409);
  const deletes=await Promise.all([call('DELETE',deletePath,{revision:deletionTarget.revision}),call('DELETE',deletePath,{revision:deletionTarget.revision})]);
  assert.deepEqual(deletes.map(result=>result.status).sort(),[200,404]);
  assert.equal((await call('GET',deletePath)).status,404);
  assert.equal((await call('PATCH',deletePath,{...input,revision:deletionTarget.revision})).status,404);
  assert.equal((await call('GET','/cms-psychologists?pageSize=100')).body.data.items.some(row=>row.id===deletionTarget.id),false);
  assert.equal((await call('GET','/me/psychologists?pageSize=100',undefined,'member')).body.data.items.some(row=>row.id===deletionTarget.id),false);
  const kept=await repository.findOne({where:{id:deletionTarget.id},withDeleted:true});assert(kept.deletedAt);assert.equal(kept.revision,deletionTarget.revision+1);
  const importAfterDelete=await upload('commit',bytes,preview.body.data.fileHash);assert.deepEqual(importAfterDelete.body.data,{created:0,skipped:40});
  assert.equal(await repository.findOneBy({id:deletionTarget.id}),null);
  await db.synchronize();await db.synchronize();assert((await repository.findOne({where:{id:deletionTarget.id},withDeleted:true})).deletedAt);
  console.log('PASS directory: HTTP guards/DTOs, supplied workbook, 40 published branches, repeats, null envelopes, cities, real nearest SQL, revision conflicts, hidden drafts, rollback and actual mobile adapter.');
 }finally{if(app){await app.close();}await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);await connection.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
