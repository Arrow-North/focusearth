import { ImportFailure, DOCUMENT_LIMIT, IMAGE_LIMIT, dropboxUrl, eligible, mimeForName, readBounded, validateBytes, type CandidateClaim, type DropboxEntry } from './support.ts';

// Public folder downloads are ZIPs. Bound the compressed response independently
// of each extracted file; never extract paths onto a filesystem.
export const PUBLIC_DOWNLOAD_LIMIT = 50 * 1024 * 1024;
const unavailable = 'This Dropbox link cannot be downloaded publicly. Set access to Anyone with the link, remove any password, and enable downloads, then retry.';
type Fetcher = typeof fetch;
type PublicEntry = { entry: DropboxEntry; path?: string };
interface ZipEntry { name: string; size: number; compressed: Uint8Array; method: number; crc: number }

/** Validate every redirect before opening a socket, without forwarding credentials. */
function downloadTarget(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ImportFailure('Dropbox returned an invalid download URL.', 422); }
  const trusted = ['dropbox.com', 'dropboxusercontent.com'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  if (url.protocol !== 'https:' || !trusted || url.port || url.username || url.password) {
    throw new ImportFailure('Dropbox redirected outside its trusted download hosts.', 422);
  }
  if (/^\/(?:login|register|signin|auth)(?:\/|$)/i.test(url.pathname)) throw new ImportFailure(unavailable, 422);
  return url;
}

async function publicDownload(value: string, fetcher: Fetcher) {
  let url = new URL(dropboxUrl(value));
  url.searchParams.set('dl', '1');
  const signal = AbortSignal.timeout(30000);
  try {
    for (let hop = 0; hop <= 5; hop++) {
      url = downloadTarget(url.toString());
      const response = await fetcher(url, { method: 'GET', redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || hop === 5) throw new ImportFailure('Dropbox download has too many or invalid redirects.', 422);
        url = downloadTarget(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new ImportFailure(response.status === 429 || response.status >= 500 ? 'Dropbox is temporarily unavailable. Retry discovery shortly.' : unavailable, response.status === 429 || response.status >= 500 ? 503 : 422);
      }
      // Login, password and no-access pages may return HTTP 200. They are never files.
      if (/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        throw new ImportFailure(unavailable, 422);
      }
      if (Number(response.headers.get('content-length')) > PUBLIC_DOWNLOAD_LIMIT) {
        await response.body?.cancel();
        throw new ImportFailure('Public Dropbox download exceeds the 50 MB size limit. Use a direct file link or share a smaller folder.', 422);
      }
      const bytes = await readBounded(response, PUBLIC_DOWNLOAD_LIMIT);
      const prefix = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
      if (/^(?:<!doctype\s+html|<html|<head|<body|<script)/i.test(prefix)) throw new ImportFailure(unavailable, 422);
      return { bytes, disposition: response.headers.get('content-disposition') };
    }
  } catch (error) {
    if (error instanceof ImportFailure) throw error;
    throw new ImportFailure('Could not download the public Dropbox link. Check its access settings and retry.', 502);
  }
  throw new ImportFailure(unavailable, 422);
}

function fileName(disposition: string | null, url: URL): string {
  const encoded = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  try {
    const name = encoded ? decodeURIComponent(encoded.trim()) : plain ? (plain[1] || plain[2]).trim() : decodeURIComponent(url.pathname.split('/').pop() || '');
    return name.split(/[\\/]/).pop() || '';
  } catch { throw new ImportFailure('Dropbox returned an invalid filename.', 422); }
}

/** Read only ordinary, single-disk ZIP central directories; reject ambiguous paths. */
function zipEntries(bytes: Uint8Array): ZipEntry[] {
  const invalid = () => new ImportFailure('Dropbox returned an unsupported or invalid folder ZIP. Use a smaller shared folder or a direct file link.', 422);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  try {
    let end = bytes.length - 22;
    for (; end >= Math.max(0, bytes.length - 65557); end--) {
      if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
    }
    if (end < 0 || u32(end) !== 0x06054b50 || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw invalid();
    const count = u16(end + 10); const size = u32(end + 12); let offset = u32(end + 16);
    if (count > 5000) throw new ImportFailure('Collection exceeds 5,000 entries. Use a smaller Dropbox folder; no partial collection was imported.');
    if (offset + size !== end || offset === 0xffffffff || size === 0xffffffff) throw invalid();
    const entries: ZipEntry[] = []; const names = new Set<string>(); let compressedTotal = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || u32(offset) !== 0x02014b50) throw invalid();
      const flags = u16(offset + 8); const method = u16(offset + 10);
      const compressedSize = u32(offset + 20); const originalSize = u32(offset + 24);
      const nameLength = u16(offset + 28); const extraLength = u16(offset + 30); const commentLength = u16(offset + 32);
      const local = u32(offset + 42);
      if (offset + 46 + nameLength + extraLength + commentLength > end || flags & 1 || u16(offset + 34) || ![0, 8].includes(method) || compressedSize === 0xffffffff || originalSize === 0xffffffff) throw invalid();
      compressedTotal += compressedSize;
      if (compressedTotal > bytes.length) throw invalid();
      const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      // Dropbox adds a stored, empty "/" directory marker to folder ZIPs.
      // It is not a file path and is never returned as an import candidate.
      const rootDirectory = name === '/' && originalSize === 0 && compressedSize === 0 && method === 0;
      if (!name || name.length > 4096 || (name.startsWith('/') && !rootDirectory) || name.includes('\\') || Array.from(name).some(char => char.charCodeAt(0) < 32) || name.split('/').some(part => part === '..' || part === '.') || names.has(name)) throw invalid();
      names.add(name);
      if (local + 30 > u32(end + 16) || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) throw invalid();
      const start = local + 30 + u16(local + 26) + u16(local + 28);
      const localName = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(local + 30, local + 30 + u16(local + 26)));
      if (localName !== name || start + compressedSize > u32(end + 16)) throw invalid();
      if (!name.endsWith('/')) entries.push({ name, size: originalSize, compressed: bytes.subarray(start, start + compressedSize), method, crc: u32(offset + 16) });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    if (offset !== end) throw invalid();
    return entries;
  } catch (error) {
    if (error instanceof ImportFailure) throw error;
    throw invalid();
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function isFolder(url: string) { return /^\/(?:sh|scl\/fo)\//.test(new URL(url).pathname); }
function scopedEntries(url: string, download: { bytes: Uint8Array; disposition: string | null }): ZipEntry[] {
  const source = new URL(url); const parts = source.pathname.split('/').filter(Boolean);
  const scope = (source.searchParams.get('subpath') || parts.slice(parts[0] === 'sh' ? 3 : 4).map(part => decodeURIComponent(part)).join('/')).replace(/^\/+|\/+$/g,'');
  const entries = zipEntries(download.bytes);
  if (!scope) return entries;
  const archiveName = download.disposition ? fileName(download.disposition,source).replace(/\.zip$/i,'') : '';
  // Some Dropbox links download the parent collection even when their URL
  // points at a nested folder. Keep the chooser within the requested subtree.
  if (archiveName === scope.split('/').pop()) return entries;
  return entries.filter(entry => entry.name.startsWith(`${scope}/`) || entry.name.startsWith(`${archiveName}/${scope}/`));
}
const crcTable = Uint32Array.from({length:256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

export async function discoverPublicDropbox(url: string, kind: string, legacy: boolean, fetcher: Fetcher = fetch): Promise<{ sourceType: 'file' | 'folder'; entries: PublicEntry[] }> {
  const download = await publicDownload(url, fetcher);
  const sourceType = isFolder(url) ? 'folder' : 'file';
  const supported = (name: string, size: number) => eligible(name, size, kind) && (!legacy || ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(mimeForName(name)!));
  if (sourceType === 'folder') {
    const entries: PublicEntry[] = [];
    for (const entry of scopedEntries(url,download)) {
      if (!supported(entry.name, entry.size)) continue;
      entries.push({ path: `/${entry.name}`, entry: { '.tag': 'file', name: entry.name.split('/').pop()!, size: entry.size, rev: await digest(entry.compressed) } });
    }
    return { sourceType, entries };
  }
  const name = fileName(download.disposition, new URL(url));
  if (!supported(name, download.bytes.length)) return { sourceType, entries: [] };
  validateBytes(download.bytes, mimeForName(name)!);
  return { sourceType, entries: [{ entry: { '.tag': 'file', name, size: download.bytes.length, rev: await digest(download.bytes) } }] };
}

export async function downloadPublicDropbox(claim: CandidateClaim, fetcher: Fetcher = fetch): Promise<Uint8Array> {
  const download = await publicDownload(claim.url, fetcher);
  const changed = () => new ImportFailure('Selected Dropbox file changed since preview. Discover and select it again.');
  let bytes = download.bytes;
  if (claim.path) {
    const entry = zipEntries(bytes).find(entry => `/${entry.name}` === claim.path);
    if (!entry || entry.size !== claim.size || await digest(entry.compressed) !== claim.revision) throw changed();
    const limit = claim.mimeType.startsWith('image/') ? IMAGE_LIMIT : DOCUMENT_LIMIT;
    if (entry.size > limit) throw new ImportFailure('File exceeds the size limit.');
    // Stream decompression through the same byte limit as ordinary downloads.
    // A malicious ZIP's claimed uncompressed size cannot allocate an unbounded buffer.
    try {
      bytes = entry.method === 0 ? entry.compressed : await readBounded(new Response(new Blob([entry.compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))), Math.min(limit,entry.size));
    } catch (error) {
      if (error instanceof ImportFailure) throw error;
      throw new ImportFailure('Dropbox returned a corrupted folder file.', 422);
    }
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    if (((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw new ImportFailure('Dropbox returned a corrupted folder file.', 422);
  } else if (await digest(bytes) !== claim.revision) throw changed();
  if (bytes.length !== claim.size) throw changed();
  validateBytes(bytes, claim.mimeType);
  return bytes;
}
