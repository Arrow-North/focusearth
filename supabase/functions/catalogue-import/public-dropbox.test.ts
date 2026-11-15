import assert from 'node:assert/strict';
import { test } from 'node:test';
import { discoverPublicDropbox, downloadPublicDropbox, PUBLIC_DOWNLOAD_LIMIT } from './public-dropbox.ts';
import { IMAGE_LIMIT, type CandidateClaim } from './support.ts';
import { folderZip } from './zip-fixture.ts';

const folder = 'https://www.dropbox.com/sh/folder/token?dl=0&subfolder_nav_tracking=1';
const file = 'https://www.dropbox.com/scl/fi/file/photo.png?rlkey=public-key&dl=0';
const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]);
const pdf = new TextEncoder().encode('%PDF-1.7\nmanual');
const fixture = () => folderZip({'nested/front.png':png,'nested/back.png':png,'manual.pdf':pdf,'nested/photometry.ies':new TextEncoder().encode('IESNA:LM-63'),'script.html':new TextEncoder().encode('<html>')});
function fetchFile(bytes: Uint8Array, headers: Record<string,string> = {}) {
  return (async () => new Response(bytes,{headers})) as typeof fetch;
}
async function claimFor(url: string, fetcher: typeof fetch, kind = 'image'): Promise<CandidateClaim> {
  const {entries} = await discoverPublicDropbox(url,kind,false,fetcher);
  const {entry,path} = entries[0];
  return {userId:'admin',url,path,name:entry.name,mimeType:kind==='image'?'image/png':'application/pdf',size:entry.size!,revision:entry.rev,source:'public',expires:Date.now()+60000};
}

test('anonymous direct downloads retain access parameters and validate content without credentials',async()=>{
  const calls: string[] = [];
  const fetcher = (async (input,init) => {
    const url = new URL(String(input)); calls.push(url.toString());
    assert.equal(url.searchParams.get('dl'),'1'); assert.equal(url.searchParams.get('rlkey'),'public-key');
    assert.equal(init?.redirect,'manual'); assert.equal(init?.credentials,'omit');
    assert.equal(init?.headers,undefined);
    return new Response(png,{headers:{'content-type':'image/png','content-disposition':"attachment; filename*=UTF-8''photo%20front.png"}});
  }) as typeof fetch;
  const discovery = await discoverPublicDropbox(file,'image',false,fetcher);
  assert.equal(discovery.sourceType,'file'); assert.equal(discovery.entries[0].entry.name,'photo front.png');
  assert.equal(discovery.entries[0].entry.size,png.length);
  assert.deepEqual(await downloadPublicDropbox(await claimFor(file,fetcher),fetcher),png);
  assert.equal(calls.length,3);
});
test('public folder ZIPs list nested eligible files independently for image, document and legacy fields',async()=>{
  const fetcher = fetchFile(fixture());
  const images = await discoverPublicDropbox(folder,'image',false,fetcher);
  assert.equal(images.sourceType,'folder');assert.deepEqual(images.entries.map(entry=>entry.path),['/nested/front.png','/nested/back.png']);
  const documents = await discoverPublicDropbox(folder,'document',false,fetcher);
  assert.equal(documents.entries.length,4);
  assert.equal((await discoverPublicDropbox(folder,'document',true,fetcher)).entries.length,3);
  assert.deepEqual(await downloadPublicDropbox(await claimFor(folder,fetcher),fetcher),png);
  assert.deepEqual(await downloadPublicDropbox(await claimFor(folder,fetchFile(folderZip({'front.png':png},false))),fetchFile(folderZip({'front.png':png},false))),png);
});
test('nested shared links keep discovery within their subtree when Dropbox downloads the parent folder',async()=>{
  const url='https://www.dropbox.com/sh/folder/token/nested?dl=0';
  const entries=(await discoverPublicDropbox(url,'document',false,fetchFile(fixture()))).entries;
  assert.deepEqual(entries.map(entry=>entry.path),['/nested/front.png','/nested/back.png','/nested/photometry.ies']);
  const wrapped=folderZip({'Parent/nested/front.png':png,'Parent/sibling/photo.png':png});
  const wrappedFiles=(await discoverPublicDropbox('https://www.dropbox.com/scl/fo/folder/token/nested?rlkey=key','image',false,fetchFile(wrapped,{'content-disposition':'attachment; filename="Parent.zip"'}))).entries;
  assert.deepEqual(wrappedFiles.map(entry=>entry.path),['/Parent/nested/front.png']);
  const scoped=(await discoverPublicDropbox(url,'image',false,fetchFile(folderZip({'front.png':png}),{'content-disposition':'attachment; filename="nested.zip"'}))).entries;
  assert.equal(scoped.length,1);
});
test('redirects follow only HTTPS Dropbox hosts, preserve relative locations and never forward cookies or auth',async()=>{
  const seen: string[] = [];
  const fetcher = (async (input,init) => {
    const url = new URL(String(input));seen.push(url.toString());
    assert.equal(init?.headers,undefined);assert.equal(init?.credentials,'omit');
    if (seen.length===1) return new Response(null,{status:302,headers:{location:'/s/dl/file/photo.png'}});
    if (seen.length===2) return new Response(null,{status:302,headers:{location:'https://dl.dropboxusercontent.com/cd/0/inline/photo'}});
    return new Response(png);
  }) as typeof fetch;
  assert.equal((await discoverPublicDropbox(file,'image',false,fetcher)).entries.length,1);
  assert.equal(seen.length,3);
  for (const location of ['http://www.dropbox.com/s/file/photo.png','https://dropbox.com.evil.test/file','https://127.0.0.1/file','https://user:pass@www.dropbox.com/file','https://www.dropbox.com:8080/file','https://www.dropbox.com/login']) {
    let requests=0;
    await assert.rejects(discoverPublicDropbox(file,'image',false,(async()=>{requests++;return new Response(null,{status:302,headers:{location}});}) as typeof fetch),/trusted|publicly/);
    assert.equal(requests,1);
  }
  let requests=0;
  await assert.rejects(discoverPublicDropbox(file,'image',false,(async()=>{requests++;return new Response(null,{status:302,headers:{location:file}});}) as typeof fetch),/redirects/);
  assert.equal(requests,6);
});
test('login/password/no-access/disabled-download pages are rejected, including HTTP 200 and HTML disguised as text',async()=>{
  for (const headers of [{'content-type':'text/html'}, {'content-type':'application/xhtml+xml'}, {'content-type':'text/plain'}]) {
    await assert.rejects(discoverPublicDropbox(file,'document',false,fetchFile(new TextEncoder().encode('<!DOCTYPE html><html>Sign in / No Access</html>'),headers)),/downloaded publicly/);
  }
  for (const status of [401,403,404]) await assert.rejects(discoverPublicDropbox(folder,'document',false,(async()=>new Response(null,{status})) as typeof fetch),/Anyone with the link/);
  await assert.rejects(discoverPublicDropbox(folder,'document',false,(async()=>new Response(null,{status:429})) as typeof fetch),/temporarily unavailable/);
  await assert.rejects(discoverPublicDropbox(file,'image',false,fetchFile(new TextEncoder().encode('not a png'))),/content does not match/);
});
test('size limits apply to the public response, central directory and decompressed bytes',async()=>{
  await assert.rejects(discoverPublicDropbox(folder,'document',false,fetchFile(png,{'content-length':String(PUBLIC_DOWNLOAD_LIMIT+1)})),/size limit/);
  const oversized = folderZip({'huge.png':png});
  const view = new DataView(oversized.buffer);const central = view.getUint32(oversized.length-6,true);
  view.setUint32(central+24,IMAGE_LIMIT+1,true);
  assert.equal((await discoverPublicDropbox(folder,'image',false,fetchFile(oversized))).entries.length,0);
  view.setUint32(central+24,1,true); // A forged tiny size must not allow a ZIP bomb.
  const claim = await claimFor(folder,fetchFile(oversized));
  await assert.rejects(downloadPublicDropbox(claim,fetchFile(oversized)),/size limit/);
  const tooMany = folderZip({});new DataView(tooMany.buffer).setUint16(8,5001,true);new DataView(tooMany.buffer).setUint16(10,5001,true);
  await assert.rejects(discoverPublicDropbox(folder,'document',false,fetchFile(tooMany)),/5,000 entries/);
});
test('unsafe or corrupt ZIPs fail explicitly instead of returning a partial listing',async()=>{
  for (const name of ['../front.png','/front.png','nested/../front.png','nested\\front.png','front\u0000.png']) {
    await assert.rejects(discoverPublicDropbox(folder,'image',false,fetchFile(folderZip({[name]:png}))),/invalid folder ZIP/);
  }
  await assert.rejects(discoverPublicDropbox(folder,'image',false,fetchFile(fixture().subarray(0,40))),/invalid folder ZIP/);
  const encrypted=folderZip({'front.png':png});const view=new DataView(encrypted.buffer);const central=view.getUint32(encrypted.length-6,true);view.setUint16(central+8,0x801,true);
  await assert.rejects(discoverPublicDropbox(folder,'image',false,fetchFile(encrypted)),/invalid folder ZIP/);
  const badCrc=folderZip({'front.png':png});const cv=new DataView(badCrc.buffer);cv.setUint32(cv.getUint32(badCrc.length-6,true)+16,123,true);
  await assert.rejects(downloadPublicDropbox(await claimFor(folder,fetchFile(badCrc)),fetchFile(badCrc)),/corrupted/);
});
test('selected bytes must match discovery even when a replacement has the same size, and public access is rechecked',async()=>{
  const fetcher=fetchFile(fixture());const claim=await claimFor(folder,fetcher);
  const changed=png.slice();changed[23]=42;
  await assert.rejects(downloadPublicDropbox(claim,fetchFile(folderZip({'nested/front.png':changed}))),/changed since preview/);
  await assert.rejects(downloadPublicDropbox(claim,fetchFile(folderZip({'different.png':png}))),/changed since preview/);
  await assert.rejects(downloadPublicDropbox(claim,fetchFile(new TextEncoder().encode('<html>Access revoked</html>'),{'content-type':'text/html'})),/downloaded publicly/);
  const direct=await claimFor(file,fetchFile(png));
  await assert.rejects(downloadPublicDropbox(direct,fetchFile(changed)),/changed since preview/);
});
