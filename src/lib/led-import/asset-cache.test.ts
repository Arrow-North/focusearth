import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ImportAssetCache, assetLinkKey, type AssetDiscovery } from './asset-cache';

const url = 'https://www.dropbox.com/sh/shared/token?rlkey=access&dl=0';
const candidates = [
  {id:'photo',name:'front.jpg',mimeType:'image/jpeg',size:100},
  {id:'large',name:'large.png',mimeType:'image/png',size:11*1024*1024},
  {id:'pdf',name:'spec.pdf',mimeType:'application/pdf',size:200},
];
const listing:AssetDiscovery = {sourceType:'folder',candidates};
function deferred<T>() {
  let resolve!: (value:T)=>void; let reject!: (error:Error)=>void;
  const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function fixture(previewBudget?: number) {
  const requests:Record<string,unknown>[]=[];
  const cache=new ImportAssetCache(async<T>(body:Record<string,unknown>)=>{
    requests.push(body);
    return (body.action==='discover' ? listing : {previewUrl:'aa'}) as T;
  },true,previewBudget);
  return {cache,requests};
}

test('one shared pending listing serves repeated rows and image/document columns',async()=>{
  const wait=deferred<AssetDiscovery>();const requests:Record<string,unknown>[]=[];
  const cache=new ImportAssetCache(async<T>(body:Record<string,unknown>)=>{requests.push(body);return await wait.promise as T;},true);
  const document=cache.discover(url,'document');
  const image=cache.discover(url.replace('dl=0','raw=1')+'&subfolder_nav_tracking=1#preview','image');
  await Promise.resolve();assert.equal(requests.length,1);
  assert.deepEqual(requests[0],{action:'discover',url:assetLinkKey(url),kind:'document',legacy:true});
  wait.resolve(listing);
  assert.equal((await document).candidates.length,3);
  assert.deepEqual((await image).candidates.map(candidate=>candidate.id),['photo']);
  assert.equal((await cache.discover(url,'image')).candidates[0],candidates[0]);
  assert.equal(requests.length,1);
});
test('keys ignore presentation options while preserving access parameters, subfolders and query order',async()=>{
  assert.equal(assetLinkKey(url),assetLinkKey(url.replace('dl=0','raw=1')+'&subfolder_nav_tracking=1#fragment'));
  assert.notEqual(assetLinkKey(url),assetLinkKey(url.replace('access','different-access')));
  const {cache,requests}=fixture();
  for (const value of [url,url.replace('/token','/token/child'),url.replace('access','other')]) await cache.discover(value,'document');
  assert.equal(requests.length,3);
  assert.ok(String(requests[0].url).includes('rlkey=access'));
  for (const invalid of ['https://127.0.0.1/private','https://dropbox.com.evil.test/sh/token','http://www.dropbox.com/sh/folder/token']) {
    await assert.rejects(cache.discover(invalid,'document'),/public Dropbox/);
  }
  assert.equal(requests.length,3);
});
test('shared previews reuse pending and completed image requests across cards and remounts',async()=>{
  const wait=deferred<{previewUrl:string}>();let requests=0;
  const cache=new ImportAssetCache(async<T>()=>{requests++;return await wait.promise as T;});
  const first=cache.preview('photo');const second=cache.preview('photo');
  assert.equal(first,second);await Promise.resolve();assert.equal(requests,1);
  wait.resolve({previewUrl:'data:image/jpeg;base64,photo'});
  assert.equal((await first).previewUrl,(await second).previewUrl);
  await cache.preview('photo');assert.equal(requests,1);
});
test('failed listings and thumbnails are retryable and do not poison the upload cache',async()=>{
  let discoveries=0;let previews=0;
  const cache=new ImportAssetCache(async<T>(body:Record<string,unknown>)=>{
    if (body.action==='discover') { if (++discoveries===1) throw new Error('offline');return listing as T; }
    if (++previews===1) throw new Error('thumbnail unavailable');
    return {previewUrl:'retry'} as T;
  });
  await assert.rejects(cache.discover(url,'document'),/offline/);
  assert.equal((await cache.discover(url,'image')).candidates.length,1);
  await assert.rejects(cache.preview('photo'),/unavailable/);
  assert.equal((await cache.preview('photo')).previewUrl,'retry');
  assert.equal(discoveries,2);assert.equal(previews,2);
});
test('malformed successful responses are not retained as cached content',async()=>{
  let discoveries=0;let previews=0;
  const cache=new ImportAssetCache(async<T>(body:Record<string,unknown>)=>{
    if (body.action==='discover') return (++discoveries===1 ? {} : listing) as T;
    return (++previews===1 ? {} : {previewUrl:'valid'}) as T;
  });
  await assert.rejects(cache.discover(url,'document'),/Retry discovery/);
  assert.equal((await cache.discover(url,'image')).candidates.length,1);
  await assert.rejects(cache.preview('photo'),/unavailable/);
  assert.equal((await cache.preview('photo')).previewUrl,'valid');
});
test('explicit refresh invalidates that hyperlink and its cached previews',async()=>{
  const {cache,requests}=fixture();
  await cache.discover(url,'document');await cache.preview('photo');
  cache.invalidate(url);
  await cache.discover(url,'image');await cache.preview('photo');
  assert.equal(requests.filter(body=>body.action==='discover').length,2);
  assert.equal(requests.filter(body=>body.action==='thumbnail').length,2);
});
test('clearing a file cache resets metadata and previews, and separate uploads never share state',async()=>{
  const {cache,requests}=fixture();
  await cache.discover(url,'image');await cache.preview('photo');cache.clear();
  await cache.discover(url,'document');await cache.preview('photo');
  assert.equal(requests.length,4);
  const next=fixture();await next.cache.discover(url,'image');await next.cache.preview('photo');
  assert.equal(next.requests.length,2);
});
test('late failures and preview completions cannot corrupt replacements after invalidation',async()=>{
  const old=deferred<AssetDiscovery>();let requests=0;
  const cache=new ImportAssetCache(async<T>()=> (++requests===1 ? await old.promise : listing) as T);
  const pending=cache.discover(url,'document').catch(error=>error);
  await Promise.resolve();cache.invalidate(url);
  await cache.discover(url,'image');old.reject(new Error('old request failed'));
  assert.match((await pending).message,/old request/);
  await cache.discover(url,'image');assert.equal(requests,2);
  const preview=deferred<{previewUrl:string}>();let thumbnails=0;
  const previews=new ImportAssetCache(async<T>()=>(++thumbnails===1 ? await preview.promise : {previewUrl:'new'}) as T, false, 8);
  const first=previews.preview('photo');await Promise.resolve();previews.clear();
  await previews.preview('photo');preview.resolve({previewUrl:'old'});await first;
  assert.equal((await previews.preview('photo')).previewUrl,'new');assert.equal(thumbnails,2);
});
test('preview retention is bounded and evicts least recently used images',async()=>{
  const {cache,requests}=fixture(8); // Two retained two-character data URLs.
  await cache.preview('a');await cache.preview('b');await cache.preview('a');await cache.preview('c');
  await cache.preview('a');assert.equal(requests.length,3);
  await cache.preview('b');assert.equal(requests.length,4);
});
test('cached discovery tokens and previews are renewed before their 24-hour expiry',async()=>{
  const original=Date.now;let now=original();Date.now=()=>now;
  try {
    const {cache,requests}=fixture();await cache.discover(url,'image');await cache.preview('photo');
    now+=23*60*60*1000;
    await cache.discover(url,'document');await cache.preview('photo');
    assert.equal(requests.length,4);
  } finally { Date.now=original; }
});
