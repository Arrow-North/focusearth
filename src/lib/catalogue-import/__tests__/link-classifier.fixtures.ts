/**
 * Fixture suite for the catalogue-import link classifier and SSRF guard.
 *
 * This project has no test framework on purpose — the two modules under test
 * also run on Deno inside a Supabase Edge Function, so their dependency budget
 * is zero and so is this script's. Run it with:
 *
 *   npx tsx src/lib/catalogue-import/__tests__/link-classifier.fixtures.ts
 *
 * Exits 1 on the first failing assertion group, printing every failure.
 */
import assert from 'node:assert/strict';

import {
  classifyFromResponse,
  classifyUrl,
  extensionFor,
  normalizeUrl,
} from '../link-classifier';
import {
  BlockedUrlError,
  assertPublicHttpUrl,
  assertPublicHttpUrlWithDns,
  isBlockedHostname,
  isPrivateIp,
} from '../ssrf-guard';

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`  ✗ ${name}\n      ${(error as Error).message.split('\n')[0]}`);
  }
}

/** Assert the verdict of a pure (layer 1/2) classification. */
function expectClass(
  name: string,
  url: string,
  kind: string,
  via: string,
  fetchUrl?: string,
): void {
  check(name, () => {
    const result = classifyUrl(url);
    assert.equal(result.kind, kind, `kind: got ${result.kind} (${result.reason})`);
    assert.equal(result.via, via, `via: got ${result.via}`);
    assert.ok(result.reason.length > 0, 'reason must not be empty');
    if (fetchUrl !== undefined) {
      assert.equal(result.fetchUrl, fetchUrl, 'fetchUrl');
    }
  });
}

function expectResponse(
  name: string,
  contentType: string | null,
  contentDisposition: string | null,
  kind: string,
): void {
  check(name, () => {
    const result = classifyFromResponse(
      contentType,
      contentDisposition,
      'https://cdn.example.com/asset',
    );
    assert.equal(result.kind, kind, `kind: got ${result.kind} (${result.reason})`);
    assert.equal(result.via, 'probe');
    assert.equal(result.fetchUrl, 'https://cdn.example.com/asset');
    assert.ok(result.reason.length > 0, 'reason must not be empty');
  });
}

function expectBlocked(name: string, url: string): void {
  check(name, () => {
    assert.throws(() => assertPublicHttpUrl(url), BlockedUrlError);
  });
}

// ─── normalizeUrl ───────────────────────────────────────────────────────────

check('normalizeUrl lowercases scheme and host, keeps path case', () => {
  assert.equal(
    normalizeUrl('HTTPS://Example.COM/Path/Image.JPG'),
    'https://example.com/Path/Image.JPG',
  );
});

check('normalizeUrl strips default ports', () => {
  assert.equal(normalizeUrl('https://example.com:443/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(normalizeUrl('http://example.com:80/a.jpg'), 'http://example.com/a.jpg');
});

check('normalizeUrl keeps a non-default port', () => {
  assert.equal(
    normalizeUrl('https://example.com:8443/a.jpg'),
    'https://example.com:8443/a.jpg',
  );
});

check('normalizeUrl strips the fragment', () => {
  assert.equal(normalizeUrl('https://example.com/a.pdf#page=3'), 'https://example.com/a.pdf');
});

check('normalizeUrl strips utm_*, fbclid and gclid', () => {
  assert.equal(
    normalizeUrl(
      'https://example.com/a.jpg?utm_source=mail&utm_medium=cpc&fbclid=abc&gclid=def',
    ),
    'https://example.com/a.jpg',
  );
});

check('normalizeUrl preserves the Dropbox rlkey', () => {
  assert.equal(
    normalizeUrl('https://www.dropbox.com/scl/fi/id/a.png?rlkey=k9&utm_source=x'),
    'https://www.dropbox.com/scl/fi/id/a.png?rlkey=k9',
  );
});

check('normalizeUrl preserves the Drive id', () => {
  assert.equal(
    normalizeUrl('https://drive.google.com/open?id=1AbC&utm_campaign=x'),
    'https://drive.google.com/open?id=1AbC',
  );
});

check('normalizeUrl dedupes links that differ only by tracking params', () => {
  assert.equal(
    normalizeUrl('https://example.com/a.jpg?utm_source=a#x'),
    normalizeUrl('HTTPS://EXAMPLE.com:443/a.jpg?fbclid=zz'),
  );
});

check('normalizeUrl leaves distinct assets distinct', () => {
  assert.notEqual(
    normalizeUrl('https://example.com/a.jpg'),
    normalizeUrl('https://example.com/b.jpg'),
  );
});

check('normalizeUrl tolerates junk input', () => {
  assert.equal(normalizeUrl('  not a url  '), 'not a url');
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeUrl('   '), '');
});

// ─── Layer 1: Dropbox ───────────────────────────────────────────────────────

expectClass(
  'Dropbox /s/ is a FILE rewritten to the direct host',
  'https://www.dropbox.com/s/abc123/spec-sheet.pdf?dl=0',
  'FILE',
  'host',
  'https://dl.dropboxusercontent.com/s/abc123/spec-sheet.pdf?dl=1&raw=1',
);

expectClass(
  'Dropbox /scl/fi/ is a FILE and the rlkey survives the rewrite',
  'https://www.dropbox.com/scl/fi/9xk/product.png?rlkey=abc123def&dl=0',
  'FILE',
  'host',
  'https://dl.dropboxusercontent.com/scl/fi/9xk/product.png?rlkey=abc123def&dl=1&raw=1',
);

check('Dropbox /scl/fi/ rewrite keeps rlkey even with no dl param', () => {
  const result = classifyUrl('https://www.dropbox.com/scl/fi/9xk/p.png?rlkey=zz9&st=aa');
  assert.ok(result.fetchUrl.includes('rlkey=zz9'), `rlkey lost: ${result.fetchUrl}`);
  assert.ok(result.fetchUrl.includes('st=aa'), `st lost: ${result.fetchUrl}`);
  assert.ok(result.fetchUrl.startsWith('https://dl.dropboxusercontent.com/'));
});

expectClass(
  'Dropbox /sh/ is an IMAGE_REPO and is never rewritten',
  'https://www.dropbox.com/sh/abc123/AAbb?dl=0',
  'IMAGE_REPO',
  'host',
  'https://www.dropbox.com/sh/abc123/AAbb?dl=0',
);

expectClass(
  'Dropbox /scl/fo/ is an IMAGE_REPO',
  'https://www.dropbox.com/scl/fo/9xk/folder?rlkey=abc&dl=0',
  'IMAGE_REPO',
  'host',
  'https://www.dropbox.com/scl/fo/9xk/folder?rlkey=abc&dl=0',
);

expectClass(
  'dl.dropboxusercontent.com is already direct',
  'https://dl.dropboxusercontent.com/s/abc123/photo.png',
  'FILE',
  'host',
  'https://dl.dropboxusercontent.com/s/abc123/photo.png',
);

// ─── Layer 1: Google Drive ──────────────────────────────────────────────────

expectClass(
  'Drive /file/d/<id>/view is a FILE rewritten to uc?export=download',
  'https://drive.google.com/file/d/1AbC_dEf-123/view?usp=sharing',
  'FILE',
  'host',
  'https://drive.google.com/uc?export=download&id=1AbC_dEf-123',
);

expectClass(
  'Drive /drive/folders/<id> is an IMAGE_REPO',
  'https://drive.google.com/drive/folders/1XyZ?usp=sharing',
  'IMAGE_REPO',
  'host',
  'https://drive.google.com/drive/folders/1XyZ?usp=sharing',
);

expectClass(
  'Drive /drive/u/0/folders/<id> is an IMAGE_REPO',
  'https://drive.google.com/drive/u/0/folders/1XyZ',
  'IMAGE_REPO',
  'host',
);

expectClass(
  'Drive /open?id= is ambiguous and falls through for a probe',
  'https://drive.google.com/open?id=1AbC',
  'UNKNOWN',
  'none',
);

// ─── Layer 1: SharePoint / OneDrive ─────────────────────────────────────────

expectClass(
  'SharePoint /:f:/ is an IMAGE_REPO',
  'https://contoso.sharepoint.com/:f:/s/team/EabC123',
  'IMAGE_REPO',
  'host',
  'https://contoso.sharepoint.com/:f:/s/team/EabC123',
);

expectClass(
  'SharePoint /:fl:/ is an IMAGE_REPO',
  'https://contoso.sharepoint.com/:fl:/g/personal/user/EabC123',
  'IMAGE_REPO',
  'host',
);

expectClass(
  'SharePoint /:i:/ is a FILE with ?download=1',
  'https://contoso.sharepoint.com/:i:/s/team/EabC123',
  'FILE',
  'host',
  'https://contoso.sharepoint.com/:i:/s/team/EabC123?download=1',
);

expectClass(
  'SharePoint /:b:/ is a FILE with ?download=1',
  'https://contoso.sharepoint.com/:b:/s/team/EabC123?e=xyz',
  'FILE',
  'host',
  'https://contoso.sharepoint.com/:b:/s/team/EabC123?e=xyz&download=1',
);

expectClass(
  'SharePoint /:w:/ is a FILE',
  'https://contoso.sharepoint.com/:w:/s/team/EabC123',
  'FILE',
  'host',
);

expectClass(
  'SharePoint /:x:/ is a FILE',
  'https://contoso.sharepoint.com/:x:/s/team/EabC123',
  'FILE',
  'host',
);

expectClass(
  '1drv.ms short links are FILEs with ?download=1',
  'https://1drv.ms/i/s!AbCdEf',
  'FILE',
  'host',
  'https://1drv.ms/i/s!AbCdEf?download=1',
);

// ─── Layer 1: Box and transfer services ─────────────────────────────────────

expectClass(
  'Box /folder/<id> is an IMAGE_REPO',
  'https://app.box.com/folder/123456789',
  'IMAGE_REPO',
  'host',
  'https://app.box.com/folder/123456789',
);

expectClass(
  'Box /s/<id> is a FILE',
  'https://app.box.com/s/abc123def456',
  'FILE',
  'host',
  'https://app.box.com/s/abc123def456',
);

expectClass(
  'wetransfer.com is an IMAGE_REPO',
  'https://wetransfer.com/downloads/abc123/def456',
  'IMAGE_REPO',
  'host',
);

expectClass('smash.com is an IMAGE_REPO', 'https://fromsmash.com/abc123', 'IMAGE_REPO', 'host');

expectClass('we.tl is an IMAGE_REPO', 'https://we.tl/t-abc123', 'IMAGE_REPO', 'host');

check('host rules beat the path extension', () => {
  // A .zip inside a Dropbox /scl/fi/ link is still a single named file.
  const result = classifyUrl('https://www.dropbox.com/scl/fi/9xk/pack.zip?rlkey=q1');
  assert.equal(result.via, 'host');
  assert.equal(result.kind, 'FILE');
});

// ─── Layer 2: path extensions ───────────────────────────────────────────────

for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'svg', 'avif', 'heic']) {
  expectClass(
    `.${ext} is an IMAGE`,
    `https://cdn.example.com/assets/product.${ext}`,
    'IMAGE',
    'extension',
  );
}

expectClass('.pdf is a FILE', 'https://cdn.example.com/docs/spec.pdf', 'FILE', 'extension');

for (const ext of ['zip', 'rar', '7z', 'tar', 'gz']) {
  expectClass(
    `.${ext} is an IMAGE_REPO`,
    `https://cdn.example.com/bundles/images.${ext}`,
    'IMAGE_REPO',
    'extension',
  );
}

expectClass(
  'extension matching ignores the query string',
  'https://cdn.example.com/a/b/product.PNG?v=2&token=abc.pdf',
  'IMAGE',
  'extension',
);

expectClass(
  'no extension means probe needed',
  'https://cdn.example.com/assets/product',
  'UNKNOWN',
  'none',
);

expectClass(
  'an unrecognised extension means probe needed',
  'https://cdn.example.com/catalogue.aspx',
  'UNKNOWN',
  'none',
);

// ─── Malformed input ────────────────────────────────────────────────────────

expectClass('empty input is UNKNOWN', '', 'UNKNOWN', 'none');
expectClass('whitespace input is UNKNOWN', '   ', 'UNKNOWN', 'none');
expectClass('a bare filename is UNKNOWN', 'product image.jpg', 'UNKNOWN', 'none');
expectClass('a relative path is UNKNOWN', '/images/a.jpg', 'UNKNOWN', 'none');
expectClass('mailto: is UNKNOWN', 'mailto:sales@example.com', 'UNKNOWN', 'none');
expectClass('file: is UNKNOWN', 'file:///C:/images/a.jpg', 'UNKNOWN', 'none');
expectClass('ftp: is UNKNOWN', 'ftp://example.com/a.jpg', 'UNKNOWN', 'none');

check('classifyUrl never throws', () => {
  const nasty = ['', '%%%', 'http://', 'https://[', '://x', 'N/A', 'TBC', 'see attached'];
  for (const value of nasty) {
    const result = classifyUrl(value);
    assert.ok(result.reason.length > 0, `no reason for "${value}"`);
    assert.equal(result.kind, 'UNKNOWN');
  }
});

check('malformed input still reports an actionable reason', () => {
  const result = classifyUrl('see attached');
  assert.ok(/not a valid absolute url/i.test(result.reason), result.reason);
});

// ─── Layer 3: classifyFromResponse ──────────────────────────────────────────

expectResponse('image/png is an IMAGE', 'image/png', null, 'IMAGE');
expectResponse('image/jpeg with charset is an IMAGE', 'image/jpeg; charset=binary', null, 'IMAGE');
expectResponse('image/webp is an IMAGE', 'image/webp', null, 'IMAGE');
expectResponse('application/pdf is a FILE', 'application/pdf', null, 'FILE');
expectResponse('text/html is an IMAGE_REPO', 'text/html; charset=utf-8', null, 'IMAGE_REPO');
expectResponse('application/zip is an IMAGE_REPO', 'application/zip', null, 'IMAGE_REPO');
expectResponse(
  'octet-stream with an archive filename is an IMAGE_REPO',
  'application/octet-stream',
  'attachment; filename="product-images.zip"',
  'IMAGE_REPO',
);
expectResponse(
  'octet-stream with an image filename is an IMAGE',
  'application/octet-stream',
  'attachment; filename="product.png"',
  'IMAGE',
);
expectResponse(
  'octet-stream with a pdf filename is a FILE',
  'application/octet-stream',
  'attachment; filename="spec.pdf"',
  'FILE',
);
expectResponse(
  'octet-stream with no usable filename is UNKNOWN',
  'application/octet-stream',
  null,
  'UNKNOWN',
);
expectResponse('a missing Content-Type is UNKNOWN', null, null, 'UNKNOWN');
expectResponse('an empty Content-Type is UNKNOWN', '', null, 'UNKNOWN');
expectResponse('text/plain is UNKNOWN', 'text/plain', null, 'UNKNOWN');
expectResponse(
  'an unexpected office type is UNKNOWN',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  null,
  'UNKNOWN',
);

check('classifyFromResponse echoes the final URL and names the Content-Type', () => {
  const result = classifyFromResponse('image/png', null, 'https://cdn.example.com/x?y=1');
  assert.equal(result.fetchUrl, 'https://cdn.example.com/x?y=1');
  assert.ok(result.reason.includes('image/png'), result.reason);
});

// ─── extensionFor ───────────────────────────────────────────────────────────

check('extensionFor: Content-Type beats Content-Disposition and the URL', () => {
  assert.equal(
    extensionFor('image/png', 'attachment; filename="thing.pdf"', 'https://e.com/thing.jpg'),
    '.png',
  );
});

check('extensionFor: a definite Content-Type beats a lying URL extension', () => {
  assert.equal(extensionFor('image/webp', null, 'https://e.com/photo.jpg'), '.webp');
  assert.equal(extensionFor('application/pdf', null, 'https://e.com/photo.jpg'), '.pdf');
});

check('extensionFor: Content-Disposition beats the URL', () => {
  assert.equal(
    extensionFor(null, 'attachment; filename="spec.pdf"', 'https://e.com/download.jpg'),
    '.pdf',
  );
});

check('extensionFor: octet-stream falls through to the filename', () => {
  assert.equal(
    extensionFor('application/octet-stream', 'attachment; filename="pack.zip"', 'https://e.com/d'),
    '.zip',
  );
});

check('extensionFor: RFC 5987 filename* is understood', () => {
  assert.equal(
    extensionFor(null, "attachment; filename*=UTF-8''sp%C3%A9cification.pdf", 'https://e.com/d'),
    '.pdf',
  );
});

check('extensionFor: the URL is the third choice', () => {
  assert.equal(extensionFor(null, null, 'https://e.com/a/b/photo.WEBP?v=2'), '.webp');
});

check('extensionFor: defaults to .jpg', () => {
  assert.equal(extensionFor(null, null, 'https://e.com/a/b/photo'), '.jpg');
  assert.equal(extensionFor(null, null, ''), '.jpg');
  assert.equal(extensionFor('application/octet-stream', null, 'https://e.com/d'), '.jpg');
});

check('extensionFor: image/jpeg normalises to .jpg, tiff to .tif', () => {
  assert.equal(extensionFor('image/jpeg', null, 'https://e.com/d'), '.jpg');
  assert.equal(extensionFor('IMAGE/JPEG; charset=utf-8', null, 'https://e.com/d'), '.jpg');
  assert.equal(extensionFor('image/tiff', null, 'https://e.com/d'), '.tif');
  assert.equal(extensionFor('image/svg+xml', null, 'https://e.com/d'), '.svg');
});

// ─── SSRF guard: isPrivateIp ────────────────────────────────────────────────

const PRIVATE_IPS = [
  '127.0.0.1',
  '127.1.2.3',
  '10.0.0.1',
  '10.255.255.255',
  '172.16.0.1',
  '172.31.255.254',
  '192.168.1.1',
  '169.254.1.1',
  '169.254.169.254',
  '0.0.0.0',
  '0.1.2.3',
  '100.64.0.1',
  '100.127.255.255',
  '::1',
  '::',
  'fc00::1',
  'fd12:3456::1',
  'fe80::1234',
  '::ffff:127.0.0.1',
  '::ffff:192.168.0.1',
  '::ffff:7f00:1',
  '255.255.255.255',
  '224.0.0.1',
];

for (const ip of PRIVATE_IPS) {
  check(`isPrivateIp("${ip}") is true`, () => {
    assert.equal(isPrivateIp(ip), true);
  });
}

const PUBLIC_IPS = ['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.0.1', '100.128.0.1', '2606:4700:4700::1111'];

for (const ip of PUBLIC_IPS) {
  check(`isPrivateIp("${ip}") is false`, () => {
    assert.equal(isPrivateIp(ip), false);
  });
}

check('isPrivateIp returns false for non-IP input', () => {
  assert.equal(isPrivateIp('example.com'), false);
  assert.equal(isPrivateIp(''), false);
});

// ─── SSRF guard: isBlockedHostname ──────────────────────────────────────────

const BLOCKED_HOSTS = [
  'localhost',
  'LOCALHOST',
  'app.localhost',
  'metadata.google.internal',
  'printer.local',
  'db.internal',
  'metadata',
  '127.0.0.1',
  '[::1]',
  '169.254.169.254',
  '2130706433',
  '0x7f000001',
  '0177.0.0.1',
  '',
];

for (const host of BLOCKED_HOSTS) {
  check(`isBlockedHostname("${host}") is true`, () => {
    assert.equal(isBlockedHostname(host), true);
  });
}

for (const host of ['example.com', 'cdn.example.co.uk', 'localhost.example.com', '8.8.8.8']) {
  check(`isBlockedHostname("${host}") is false`, () => {
    assert.equal(isBlockedHostname(host), false);
  });
}

// ─── SSRF guard: assertPublicHttpUrl ────────────────────────────────────────

expectBlocked('file: scheme is blocked', 'file:///etc/passwd');
expectBlocked('ftp: scheme is blocked', 'ftp://example.com/a.jpg');
expectBlocked('data: scheme is blocked', 'data:text/html,<script></script>');
expectBlocked('gopher: scheme is blocked', 'gopher://example.com/');
expectBlocked('localhost is blocked', 'http://localhost:3000/admin');
expectBlocked('127.0.0.1 is blocked', 'http://127.0.0.1/');
expectBlocked('10/8 is blocked', 'http://10.0.0.5/internal');
expectBlocked('172.16/12 is blocked', 'http://172.16.4.4/');
expectBlocked('192.168/16 is blocked', 'http://192.168.0.1/');
expectBlocked('the cloud metadata IP is blocked', 'http://169.254.169.254/latest/meta-data/');
expectBlocked('metadata.google.internal is blocked', 'http://metadata.google.internal/');
expectBlocked('0.0.0.0 is blocked', 'http://0.0.0.0:8080/');
expectBlocked('CGNAT space is blocked', 'http://100.64.1.1/');
expectBlocked('::1 is blocked', 'http://[::1]:8000/');
expectBlocked('fc00::/7 is blocked', 'http://[fd00::1]/');
expectBlocked('fe80::/10 is blocked', 'http://[fe80::1]/');
expectBlocked('IPv4-mapped IPv6 loopback is blocked', 'http://[::ffff:127.0.0.1]/');
expectBlocked('a .local host is blocked', 'http://nas.local/images/');
expectBlocked('a .internal host is blocked', 'https://assets.internal/a.jpg');
expectBlocked('decimal IP notation is blocked', 'http://2130706433/');
expectBlocked('hex IP notation is blocked', 'http://0x7f000001/');
expectBlocked('embedded credentials are blocked', 'http://user:pass@example.com/a.jpg');
expectBlocked('an unparseable URL is blocked', 'not a url');
expectBlocked('an empty URL is blocked', '');

check('assertPublicHttpUrl allows a public https URL', () => {
  const url = assertPublicHttpUrl('https://cdn.example.com/a/b.jpg?x=1');
  assert.equal(url.hostname, 'cdn.example.com');
  assert.equal(url.protocol, 'https:');
});

check('assertPublicHttpUrl allows a public http URL and a public IP', () => {
  assert.equal(assertPublicHttpUrl('http://cdn.example.com/a.jpg').hostname, 'cdn.example.com');
  assert.equal(assertPublicHttpUrl('https://8.8.8.8/a.jpg').hostname, '8.8.8.8');
});

check('BlockedUrlError carries a usable name and message', () => {
  try {
    assertPublicHttpUrl('http://169.254.169.254/');
    assert.fail('expected a throw');
  } catch (error) {
    assert.ok(error instanceof BlockedUrlError);
    assert.equal((error as Error).name, 'BlockedUrlError');
    assert.ok((error as Error).message.length > 0);
  }
});

// ─── SSRF guard: assertPublicHttpUrlWithDns ─────────────────────────────────

async function runAsyncChecks(): Promise<void> {
  // Node has no Deno.resolveDns, so this must degrade to the sync checks.
  await checkAsync('assertPublicHttpUrlWithDns allows a public host without Deno', async () => {
    const url = await assertPublicHttpUrlWithDns('https://cdn.example.com/a.jpg');
    assert.equal(url.hostname, 'cdn.example.com');
  });

  await checkAsync('assertPublicHttpUrlWithDns still blocks localhost', async () => {
    await assert.rejects(
      () => assertPublicHttpUrlWithDns('http://localhost/a.jpg'),
      BlockedUrlError,
    );
  });

  await checkAsync('assertPublicHttpUrlWithDns still blocks the metadata IP', async () => {
    await assert.rejects(
      () => assertPublicHttpUrlWithDns('http://169.254.169.254/latest/meta-data/'),
      BlockedUrlError,
    );
  });

  await checkAsync('assertPublicHttpUrlWithDns rejects a host resolving to a private IP', async () => {
    const globals = globalThis as { Deno?: unknown };
    const original = globals.Deno;
    globals.Deno = { resolveDns: async () => ['10.0.0.7'] };
    try {
      await assert.rejects(
        () => assertPublicHttpUrlWithDns('https://rebind.example.com/a.jpg'),
        BlockedUrlError,
      );
    } finally {
      if (original === undefined) delete globals.Deno;
      else globals.Deno = original;
    }
  });

  await checkAsync('assertPublicHttpUrlWithDns allows a host resolving to a public IP', async () => {
    const globals = globalThis as { Deno?: unknown };
    const original = globals.Deno;
    globals.Deno = { resolveDns: async () => ['93.184.216.34'] };
    try {
      const url = await assertPublicHttpUrlWithDns('https://cdn.example.com/a.jpg');
      assert.equal(url.hostname, 'cdn.example.com');
    } finally {
      if (original === undefined) delete globals.Deno;
      else globals.Deno = original;
    }
  });
}

async function checkAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push(`  ✗ ${name}\n      ${(error as Error).message.split('\n')[0]}`);
  }
}

// ─── Runner ─────────────────────────────────────────────────────────────────

runAsyncChecks().then(() => {
  const total = passed + failures.length;
  if (failures.length > 0) {
    console.error(`\n${failures.length} failing assertion group(s):\n`);
    console.error(failures.join('\n'));
    console.error(`\nlink-classifier fixtures: ${passed}/${total} passed, ${failures.length} failed`);
    process.exit(1);
  }
  console.log(`link-classifier fixtures: ${passed}/${total} passed`);
});
