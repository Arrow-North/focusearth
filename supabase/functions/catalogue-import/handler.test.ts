import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
import * as support from './support.ts';

const admin = '10000000-0000-4000-8000-000000000001';
const shared = 'https://www.dropbox.com/sh/folder/token?dl=0';
const importId = '20000000-0000-4000-8000-000000000001';
const secret = 'test-service-secret';
const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]);
interface State {
  profile: {type:string;enabled:boolean;is_deleted:boolean};
  linkPermissions: support.DropboxLinkPermissions;
  restrictedChild?: boolean;
  supplier: boolean;
  prior: Record<string,unknown>|null;
  products: Record<string,unknown>[];
  fetches: string[];
  uploads: string[];
  removed: string[];
  committed: Record<string,unknown>[];
  rpcError?: {message:string;code:string};
  rpcThrow?: boolean;
  rpcPersistThenError?: boolean;
  downloadSize?: number;
  downloadRevision?: string;
}
async function harness() {
  const state: State = { profile:{type:'SUPERADMIN',enabled:true,is_deleted:false},linkPermissions:{effective_audience:{'.tag':'public'},allow_download:true,require_password:false},supplier:true,prior:null,products:[],fetches:[],uploads:[],removed:[],committed:[] };
  let handler: (request:Request)=>Promise<Response>;
  const service = {
    auth:{getUser:async(token:string)=>({data:{user:token==='valid-token'?{id:admin}:null},error:null})},
    from(table:string) {
      const query = {
        select:()=>query,eq:()=>query,or:()=>query,is:()=>query,order:()=>query,
        single:async()=>({data:{id:1,name:'Supplier Company'},error:null}),
        maybeSingle:async()=>({data:table==='profiles'?state.profile:table==='company'?(state.supplier?{id:1,name:'Supplier Company'}:null):state.prior,error:null}),
        range:async()=>({data:state.products,error:null}),
      };
      return query;
    },
    storage:{from:(bucket:string)=>({
      upload:async(path:string)=>{state.uploads.push(path);return {error:null};},
      getPublicUrl:(path:string)=>({data:{publicUrl:`https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`}}),
      remove:async(paths:string[])=>{state.removed.push(...paths);return {error:null};},
    })},
    rpc:async(_name:string,params:Record<string,unknown>)=>{
      state.committed.push(params);
      if(state.rpcPersistThenError) state.prior={result:{status:'created',productId:42,assetPaths:[...state.uploads]},company_id:1,category:'lamp',order_code:'ABC'};
      if(state.rpcThrow) throw new Error('network interrupted');
      if(state.rpcError) return {data:null,error:state.rpcError};
      return {data:{status:params.p_decision==='update'?'updated':'created',productId:42},error:null};
    },
  };
  const fakeFetch = async (input:string|URL|Request, init?:RequestInit) => {
    const url = new URL(String(input)); state.fetches.push(url.toString());
    assert.ok(['api.dropboxapi.com','content.dropboxapi.com'].includes(url.hostname), `Unexpected external host ${url.hostname}`);
    assert.equal(init?.redirect,'error');
    const route = url.pathname;
    if(route.endsWith('sharing/get_shared_link_metadata')) {
      const body = JSON.parse(String(init?.body));
      return Response.json({'.tag':body.path?'file':'folder',name:body.path?'photo.png':'folder',link_permissions:body.path && state.restrictedChild ? {...state.linkPermissions,effective_audience:{'.tag':'team'}} : state.linkPermissions});
    }
    if(route.endsWith('files/list_folder')) {
      const body = JSON.parse(String(init?.body));
      return Response.json(body.path==='' ? {entries:[{'.tag':'file',name:'one.png',size:png.length},{'.tag':'file',name:'two.png',size:png.length},{'.tag':'file',name:'instructions.pdf',size:10}],cursor:'done',has_more:false} : {entries:[],cursor:'done',has_more:false});
    }
    if(route.endsWith('sharing/get_shared_link_file')) return new Response(state.downloadSize === undefined ? png : new Uint8Array(state.downloadSize), {headers: {'Dropbox-API-Result': JSON.stringify({rev:state.downloadRevision})}});
    if(route.endsWith('files/get_thumbnail_v2')) return new Response(new Uint8Array([255,216,255,224,0,0]));
    assert.fail(`Unexpected Dropbox route ${route}`);
  };
  const source = (await readFile(new URL('./index.ts',import.meta.url),'utf8')).replace(/^import .*\n/gm,'');
  const javascript = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const env:Record<string,string>={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:secret,DROPBOX_ACCESS_TOKEN:'dropbox-test-token'};
  const timeout = (callback:()=>void,ms:number) => { const timer=setTimeout(callback,ms);timer.unref();return timer; };
  // Run the exact handler source with only its two imports replaced by test dependencies.
  new Function('createClient','Deno','fetch','setTimeout',...Object.keys(support),javascript)(
    ()=>service,{env:{get:(key:string)=>env[key]},serve:(value:typeof handler)=>{handler=value;}},fakeFetch,timeout,...Object.values(support),
  );
  const request = async (body:Record<string,unknown>,token='valid-token') => {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/catalogue-import',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}));
    return {status:response.status,body:await response.json()};
  };
  return {state,request};
}
async function candidate(name='photo.png',mimeType='image/png',url=shared,revision?:string) {
  return support.signCandidate({userId:admin,url,name,mimeType,size:png.length,path:`/${name}`,revision,expires:Date.now()+60000},secret);
}
function payload(overrides:Record<string,unknown>={}) {
  return {action:'commit',companyId:1,category:'lamp',orderCode:'ABC',importId,rowId:'Lamps:4',decision:'create',details:{description:'Bulb',sourceValues:{'Order Code':'ABC'}},attachments:[],sourceLinks:[],...overrides};
}
const manual = {name:'manual.png',mimeType:'image/png',base64:support.encode64(png)};

test('handler denies anonymous, expired, non-superadmin and disabled accounts before Dropbox access',async()=>{
  const {request,state}=await harness();
  assert.equal((await request({action:'discover',url:shared,kind:'image'},'')).status,401);
  assert.equal((await request({action:'discover',url:shared,kind:'image'},'expired')).status,401);
  state.profile.type='Sa'; assert.equal((await request({action:'discover',url:shared,kind:'image'})).status,403);
  state.profile.type='SUPERADMIN';state.profile.enabled=false;assert.equal((await request({action:'discover',url:shared,kind:'image'})).status,403);
  assert.deepEqual(state.fetches,[]);
});
test('handler enumerates all eligible images and documents without downloading originals during discovery',async()=>{
  const {request,state}=await harness();
  const image=await request({action:'discover',url:shared,kind:'image'});
  assert.equal(image.status,200);assert.equal(image.body.sourceType,'folder');assert.equal(image.body.candidates.length,2);
  const document=await request({action:'discover',url:shared,kind:'document'});
  assert.equal(document.body.candidates.length,3);
  assert.equal(state.uploads.length,0);assert.equal(state.fetches.some(url=>url.endsWith('sharing/get_shared_link_file')),false);
  assert.equal((await request({action:'discover',url:'http://127.0.0.1/private',kind:'image'})).status,400);
});
test('discovery rejects private, login-required, password-protected and download-disabled links',async()=>{
  const {request,state}=await harness();
  const permissions: support.DropboxLinkPermissions[] = [
    {effective_audience:{'.tag':'team'},allow_download:true},
    {effective_audience:{'.tag':'public_logged_in_only'},allow_download:true},
    {effective_audience:{'.tag':'public'},allow_download:true,require_password:true},
    {effective_audience:{'.tag':'public'},allow_download:false},
  ];
  for (const value of permissions) {
    state.linkPermissions=value;
    const result=await request({action:'discover',url:shared,kind:'image'});
    assert.equal(result.status,422);assert.match(result.body.error,/Anyone with the link/);
  }
  assert.equal(state.fetches.some(url=>url.endsWith('files/list_folder')),false);
  assert.equal(state.uploads.length,0);
});
test('selected files must remain public at thumbnail and commit, including restricted children of public folders',async()=>{
  const {request,state}=await harness();
  const discovery=await request({action:'discover',url:shared,kind:'image'});
  assert.equal(discovery.status,200);
  const token=discovery.body.candidates[0].id;
  state.restrictedChild=true;
  assert.equal((await request({action:'thumbnail',candidateId:token})).status,422);
  const result=await request(payload({sourceLinks:[{detailKey:'productImage',url:shared}],attachments:[{field:'productImage',candidateId:token}]}));
  assert.equal(result.status,422);
  assert.equal(state.fetches.some(url=>url.endsWith('sharing/get_shared_link_file')||url.endsWith('files/get_thumbnail_v2')),false);
  assert.equal(state.uploads.length,0);assert.equal(state.committed.length,0);
});
test('handler requires a product image and rejects a PDF chosen as image',async()=>{
  const {request,state}=await harness();
  assert.equal((await request(payload())).status,400);
  const token=await candidate('spec.pdf','application/pdf');
  const result=await request(payload({attachments:[{field:'productImage',candidateId:token}],sourceLinks:[{detailKey:'productImage',url:shared}]}));
  assert.equal(result.status,400);assert.match(result.body.error,/valid product image/);assert.equal(state.committed.length,0);
});
test('explicit None can decline image and documents independently without downloads and records trusted audit data',async()=>{
  const {request,state}=await harness();
  const sourceLinks=[{detailKey:'productImage',url:shared},{detailKey:'productSpecifications',url:shared}];
  const result=await request(payload({sourceLinks,omittedFields:['productImage','productSpecifications'],details:{productImage:shared,image:'old-image',productImageHyperlink:'old-image',productSpecifications:shared,productSpecificationsHyperlink:'old-document',omittedAssets:{spoofed:'caller'}}}));
  assert.equal(result.status,200);assert.equal(result.body.status,'created');
  assert.deepEqual(state.fetches,[]);assert.deepEqual(state.uploads,[]);
  const details=state.committed[0].p_details as Record<string,unknown>;
  assert.equal(details.productImage,'');assert.equal(details.image,'');assert.equal(details.productImageHyperlink,'');assert.equal(details.productSpecifications,'');assert.equal(details.productSpecificationsHyperlink,'');
  assert.deepEqual(details.importedAssets,{});
  assert.deepEqual(details.omittedAssets,{productImage:{reason:'admin_declined',sourceUrl:shared},productSpecifications:{reason:'admin_declined',sourceUrl:shared}});
});
test('None requires explicit field choices and rejects ambiguous, forged or unrelated omissions',async()=>{
  const {request,state}=await harness();
  assert.equal((await request(payload({details:{productImage:'',omittedAssets:{productImage:{reason:'admin_declined'}}}}))).status,400);
  assert.equal((await request(payload({omittedFields:['productImage','productImage']}))).status,400);
  assert.equal((await request(payload({omittedFields:['productImage','unrelatedField']}))).status,400);
  assert.equal((await request(payload({omittedFields:['productImage'],manualImage:manual}))).status,400);
  assert.equal((await request(payload({omittedFields:['productImage'],attachments:[{field:'productImage',candidateId:await candidate()}]}))).status,400);
  assert.equal((await request(payload({omittedFields:['productImage'],sourceLinks:[{detailKey:'productSpecifications',url:shared}]}))).status,400);
  assert.equal((await request(payload({manualImage:manual,sourceLinks:[{detailKey:'omittedAssets',url:shared}],attachments:[{field:'omittedAssets',candidateId:await candidate()}]}))).status,400);
  assert.deepEqual(state.uploads,[]);assert.deepEqual(state.committed,[]);
});
test('missing image can be explicitly declined while an independently chosen document is saved',async()=>{
  const {request,state}=await harness();
  const result=await request(payload({omittedFields:['productImage'],sourceLinks:[{detailKey:'productSpecifications',url:shared}],attachments:[{field:'productSpecifications',candidateId:await candidate()}]}));
  assert.equal(result.status,200);assert.equal(state.uploads.length,1);
  const details=state.committed[0].p_details as Record<string,unknown>;
  assert.equal(details.productImage,'');assert.ok(String(details.productSpecifications).includes('catalogue-assets/'));
});
test('asset CSV selections are stored with safe company and field-specific content-addressed paths',async()=>{
  const {request,state}=await harness();const token=await candidate();
  const body={action:'store-asset',companyId:1,luminaireType:'fixtures',productId:importId,candidateId:token,url:shared};
  const image=await request({...body,field:'productImage'});
  const spec=await request({...body,field:'specifications'});
  const retry=await request({...body,field:'productImage'});
  assert.equal(image.status,200);assert.equal(spec.status,200);assert.equal(retry.status,200);
  assert.match(image.body.publicUrl,/\/public\/leds\/supplier-company\/fixtures\//);
  assert.equal(image.body.bucket,'leds');assert.equal(image.body.objectKey,retry.body.objectKey);
  assert.notEqual(image.body.objectKey,spec.body.objectKey);
  assert.match(spec.body.objectKey,/-spec-[0-9a-f]{24}\.png$/);
  assert.equal(state.committed.length,0);
});
test('asset CSV selections reject unsupported types, invalid destinations and private or stale files',async()=>{
  const {request,state}=await harness();
  const base={action:'store-asset',companyId:1,luminaireType:'fixtures',productId:importId,field:'productImage',candidateId:await candidate(),url:shared};
  assert.equal((await request({...base,url:'https://www.dropbox.com/sh/different/token'})).status,400);
  assert.equal((await request({...base,url:undefined})).status,400);
  assert.equal((await request({...base,luminaireType:'../../outside'})).status,400);
  assert.equal((await request({...base,productId:'not-a-uuid'})).status,400);
  assert.equal((await request({...base,field:'unexpected'})).status,400);
  assert.equal((await request({...base,candidateId:await candidate('spec.pdf','application/pdf')})).status,400);
  assert.equal((await request({...base,field:'specifications',candidateId:await candidate('spec.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')})).status,400);
  state.restrictedChild=true;
  assert.equal((await request(base)).status,422);
  state.restrictedChild=false;state.downloadSize=png.length+1;
  assert.equal((await request(base)).status,400);
  assert.equal(state.uploads.length,0);
});
test('each hyperlink column needs its own file selection even when columns share the same folder',async()=>{
  const {request,state}=await harness();const token=await candidate();
  const sourceLinks=[{detailKey:'productImage',url:shared},{detailKey:'productSpecifications',url:shared}];
  const missing=await request(payload({sourceLinks,attachments:[{field:'productImage',candidateId:token}]}));
  assert.equal(missing.status,400);assert.match(missing.body.error,/every linked field/);assert.equal(state.uploads.length,0);
  const complete=await request(payload({sourceLinks,attachments:[{field:'productImage',candidateId:token},{field:'productSpecifications',candidateId:token}]}));
  assert.equal(complete.status,200);assert.equal(complete.body.status,'created');assert.equal(state.uploads.length,2);
  const details=state.committed[0].p_details as Record<string,unknown>;
  assert.ok(String(details.productImage).includes('catalogue-assets/'));assert.ok(String(details.productSpecifications).includes('catalogue-assets/'));
  assert.deepEqual(Object.keys(details.importedAssets as object),['productImage','productSpecifications']);
});
test('manual image replaces an inaccessible or unsupported image source while document sources remain enforced',async()=>{
  const {request,state}=await harness();
  const result=await request(payload({manualImage:manual,sourceLinks:[{detailKey:'productImage',url:'https://unsupported.example/photo.png'}]}));
  assert.equal(result.status,200);assert.equal(state.uploads.length,1);assert.equal(state.fetches.length,0);
  const missingDoc=await request(payload({rowId:'Lamps:5',manualImage:manual,sourceLinks:[{detailKey:'productImage',url:'https://unsupported.example/photo.png'},{detailKey:'installationInstructions',url:shared}]}));
  assert.equal(missingDoc.status,400);assert.equal(state.uploads.length,1);
});
test('manual upload content is validated before SQL commit',async()=>{
  const {request,state}=await harness();
  const result=await request(payload({manualImage:{...manual,base64:support.encode64(new TextEncoder().encode('<html>fake image</html>'))}}));
  assert.equal(result.status,400);assert.match(result.body.error,/content does not match/);assert.equal(state.committed.length,0);assert.equal(state.uploads.length,0);
});
test('selected Dropbox file size and revision changes require rediscovery before storage or SQL writes',async()=>{
  const sizeChanged=await harness();sizeChanged.state.downloadSize=png.length+1;
  const selected=await candidate();
  const changedSize=await sizeChanged.request(payload({sourceLinks:[{detailKey:'productImage',url:shared}],attachments:[{field:'productImage',candidateId:selected}]}));
  assert.equal(changedSize.status,400);assert.match(changedSize.body.error,/changed since preview/);
  assert.deepEqual(sizeChanged.state.uploads,[]);assert.deepEqual(sizeChanged.state.committed,[]);
  const revisionChanged=await harness();revisionChanged.state.downloadRevision='new-revision';
  const stale=await candidate('photo.png','image/png',shared,'selected-revision');
  const changedRevision=await revisionChanged.request(payload({sourceLinks:[{detailKey:'productImage',url:shared}],attachments:[{field:'productImage',candidateId:stale}]}));
  assert.equal(changedRevision.status,400);assert.match(changedRevision.body.error,/changed since preview/);
  assert.deepEqual(revisionChanged.state.uploads,[]);assert.deepEqual(revisionChanged.state.committed,[]);
  const unchanged=await harness();unchanged.state.downloadRevision='selected-revision';
  assert.equal((await unchanged.request(payload({sourceLinks:[{detailKey:'productImage',url:shared}],attachments:[{field:'productImage',candidateId:stale}]}))).status,200);
});
test('retries with logged identity return prior success without another upload',async()=>{
  const {request,state}=await harness();state.prior={result:{status:'created',productId:42},company_id:1,category:'lamp',order_code:'ABC'};
  assert.equal((await request(payload())).status,200);assert.equal(state.uploads.length,0);assert.equal(state.committed.length,0);
  const changed=await request(payload({companyId:2}));assert.equal(changed.status,400);assert.match(changed.body.error,/identity changed/);
});
test('definite database rollback cleans unreferenced assets and ambiguous transport preserves them for safe retries',async()=>{
  const first=await harness();first.state.rpcError={code:'P0001',message:'Duplicate detected; refresh preview'};
  const failure=await first.request(payload({manualImage:manual}));assert.equal(failure.status,409);assert.equal(first.state.removed.length,1);
  const second=await harness();second.state.rpcThrow=true;
  const uncertain=await second.request(payload({manualImage:manual}));assert.equal(uncertain.status,500);assert.equal(second.state.uploads.length,1);assert.equal(second.state.removed.length,0);
});
test('an ambiguous RPC response confirmed in the import log returns success and preserves referenced assets',async()=>{
  const {request,state}=await harness();state.rpcPersistThenError=true;state.rpcError={code:'',message:'gateway response interrupted'};
  const result=await request(payload({manualImage:manual}));
  assert.equal(result.status,200);assert.equal(result.body.status,'created');
  assert.equal(state.uploads.length,1);assert.deepEqual(result.body.assetPaths,state.uploads);assert.deepEqual(state.removed,[]);
  const retry=await request(payload());
  assert.equal(retry.status,200);assert.equal(state.uploads.length,1);assert.equal(state.committed.length,1);
});
