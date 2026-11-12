import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dropboxUrl, requirePublicDropboxLink, eligible, IMAGE_LIMIT, validateBytes, readBounded, signCandidate, verifyCandidate, listCollection, type CandidateClaim } from './support.ts';

const url = 'https://www.dropbox.com/scl/fo/folder/token?rlkey=secret&dl=0';
const claim: CandidateClaim = { userId: 'superadmin', url, path: '/sub/photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 10, expires: Date.now() + 60000 };

test('only confirmed public, password-free, downloadable Dropbox links are eligible', () => {
  requirePublicDropboxLink({ link_permissions: { effective_audience: { '.tag': 'public' }, allow_download: true } });
  requirePublicDropboxLink({ link_permissions: { resolved_visibility: { '.tag': 'public' }, allow_download: true, require_password: false } });
  for (const audience of ['team', 'no_one', 'members', 'password', 'public_logged_in_only']) {
    assert.throws(() => requirePublicDropboxLink({ link_permissions: { effective_audience: { '.tag': audience }, allow_download: true } }), /Anyone with the link/);
  }
  for (const metadata of [
    {},
    { link_permissions: { allow_download: true } },
    { link_permissions: { effective_audience: { '.tag': 'public' }, require_password: true, allow_download: true } },
    { link_permissions: { effective_audience: { '.tag': 'public' }, allow_download: false } },
    { link_permissions: { effective_audience: { '.tag': 'public' } } },
  ]) assert.throws(() => requirePublicDropboxLink(metadata), /not available for import/);
});

test('Dropbox URL allowlist rejects arbitrary hosts, auth, local addresses and unsupported paths', () => {
  for (const value of ['https://localhost/s/abc/x', 'https://127.0.0.1/s/a/x', 'https://dropbox.com.evil.example/s/a/x', 'https://dropbox.com@evil.example/s/a/x', 'https://www.dropbox.com:8080/s/a/x', 'https://user:pass@dropbox.com/s/a/x', 'http://dropbox.com/s/a/x', 'https://www.dropbox.com/home/folder', 'https://dl.dropboxusercontent.com/s/a/x', 'https://www.dropbox.com/s/']) {
    assert.throws(() => dropboxUrl(value), /Dropbox|Invalid/);
  }
  const result = new URL(dropboxUrl(`${url}&raw=1&subfolder_nav_tracking=1#fragment`));
  assert.equal(result.searchParams.get('rlkey'), 'secret');
  assert.equal(result.searchParams.has('dl'), false);
  assert.equal(result.searchParams.has('raw'), false);
  assert.equal(result.hash, '');
});
test('candidate tokens are user-bound, tamper-resistant and expire', async () => {
  const token = await signCandidate(claim, 'test-signing-secret');
  assert.deepEqual(await verifyCandidate(token, claim.userId, 'test-signing-secret'), claim);
  await assert.rejects(verifyCandidate(token, 'another-admin', 'test-signing-secret'), /expired or is invalid/);
  await assert.rejects(verifyCandidate(`${token.slice(0,-4)}AAAA`, claim.userId, 'test-signing-secret'), /expired or is invalid/);
  await assert.rejects(verifyCandidate(token, claim.userId, 'different-secret'), /expired or is invalid/);
  const expired = await signCandidate({ ...claim, expires: Date.now() - 1 }, 'test-signing-secret');
  await assert.rejects(verifyCandidate(expired, claim.userId, 'test-signing-secret'), /expired or is invalid/);
});
test('eligible candidates enforce type and size separately for image and document fields', () => {
  assert.equal(eligible('photo.JPG', IMAGE_LIMIT, 'image'), true);
  assert.equal(eligible('photo.png', IMAGE_LIMIT + 1, 'image'), false);
  assert.equal(eligible('document.pdf', 100, 'image'), false);
  assert.equal(eligible('photometry.IES', 100, 'document'), true);
  assert.equal(eligible('instructions.pdf', 100, 'document'), true);
  assert.equal(eligible('script.html', 100, 'document'), false);
  assert.equal(eligible('empty.png', 0, 'image'), false);
});
test('file validation rejects HTML masquerading as an image and supports actual file signatures', () => {
  assert.throws(() => validateBytes(new TextEncoder().encode('<html>not an image</html>'), 'image/jpeg'), /content does not match/);
  validateBytes(new Uint8Array([255,216,255,224,0,0]), 'image/jpeg');
  const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]); validateBytes(png, 'image/png');
  assert.throws(() => validateBytes(png.subarray(0,8), 'image/png'), /content does not match/);
  validateBytes(new TextEncoder().encode('%PDF-1.7\n'), 'application/pdf');
  validateBytes(new TextEncoder().encode('IESNA:LM-63-2002'), 'text/plain');
  assert.throws(() => validateBytes(new Uint8Array(), 'image/png'), /empty/);
});
test('bounded readers enforce both declared and streamed byte lengths', async () => {
  await assert.rejects(readBounded(new Response('a', { headers: { 'Content-Length': '999' } }), 10), /size limit/);
  await assert.rejects(readBounded(new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(11)); controller.close(); } })), 10), /size limit/);
  assert.deepEqual(await readBounded(new Response('valid'), 10), new TextEncoder().encode('valid'));
});
test('a stalled file transfer times out and cancels the response stream', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  await assert.rejects(readBounded(response, 10, 5), /timed out/);
  assert.equal(cancelled, true);
});
test('collection enumeration visits nested folders and all pagination without account-level paths', async () => {
  const calls: Array<{route:string;body:Record<string,unknown>}> = [];
  const result = await listCollection(url, async (route, raw) => {
    const body = raw as Record<string,unknown>; calls.push({route,body});
    if (route === 'files/list_folder/continue') return { entries: [{ '.tag': 'file', name: 'page2.png', size: 5 }], cursor: 'done', has_more: false };
    if (body.path === '') return { entries: [{ '.tag': 'folder', name: 'nested', path_lower: '/account/private/secret' }, { '.tag': 'file', name: 'root.jpg', size: 5 }, { '.tag': 'file', name: 'undownloadable.png', size: 5, is_downloadable: false }], cursor: 'root-cursor', has_more: true };
    if (body.path === '/nested') return { entries: [{ '.tag': 'file', name: 'nested.ies', size: 5 }, { '.tag': 'folder', name: 'deeper' }], cursor: 'nested', has_more: false };
    if (body.path === '/nested/deeper') return { entries: [{ '.tag': 'file', name: 'deep.pdf', size: 5 }], cursor: 'deep', has_more: false };
    assert.fail(`Unexpected path ${body.path}`);
  });
  assert.deepEqual(result.map(value => value.path), ['/root.jpg', '/page2.png', '/nested/nested.ies', '/nested/deeper/deep.pdf']);
  assert.deepEqual(calls[1], { route: 'files/list_folder/continue', body: { cursor: 'root-cursor' } });
  for (const call of calls.filter(call => call.route === 'files/list_folder')) {
    assert.equal(call.body.recursive, false);
    assert.deepEqual(call.body.shared_link, { url });
  }
});
test('collection limits fail explicitly rather than silently returning partial files', async () => {
  await assert.rejects(listCollection(url, async () => ({ entries: Array.from({length:5001}, (_,i) => ({'.tag':'file',name:`${i}.jpg`,size:5})), cursor:'end',has_more:false })), /5,000 entries/);
  let calls = 0;
  await assert.rejects(listCollection(url, async () => { calls++; return {entries:[],cursor:'next',has_more:true}; }), /100 listing pages/);
  assert.equal(calls, 100);
});
