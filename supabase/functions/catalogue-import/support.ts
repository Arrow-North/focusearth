export class ImportFailure extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const DOCUMENT_LIMIT = 50 * 1024 * 1024;
export const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', ies: 'text/plain', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};

export function dropboxUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) throw new ImportFailure('A Dropbox shared URL is required.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ImportFailure('Invalid Dropbox URL.'); }
  if (url.protocol !== 'https:' || !['dropbox.com', 'www.dropbox.com'].includes(url.hostname) || url.port || url.username || url.password ||
      !/^\/(?:s|sh|scl\/fi|scl\/fo)\/[^/]+/.test(url.pathname)) {
    throw new ImportFailure('Only HTTPS Dropbox file or folder shared links are supported.');
  }
  url.hash = '';
  url.searchParams.delete('dl'); url.searchParams.delete('raw'); url.searchParams.delete('subfolder_nav_tracking');
  return url.toString();
}

export interface DropboxLinkPermissions {
  effective_audience?: { '.tag': string };
  resolved_visibility?: { '.tag': string };
  require_password?: boolean;
  allow_download?: boolean;
}

/** Account access must never substitute for a publicly downloadable shared link. */
export function requirePublicDropboxLink(metadata: { link_permissions?: DropboxLinkPermissions }): void {
  const permissions = metadata.link_permissions;
  const audiences = [permissions?.effective_audience?.['.tag'], permissions?.resolved_visibility?.['.tag']].filter(Boolean);
  if (!audiences.length || audiences.some(audience => audience !== 'public') || permissions?.require_password || permissions?.allow_download !== true) {
    throw new ImportFailure('This Dropbox link is not available for import. Set access to Anyone with the link, remove any password, and enable downloads.', 422);
  }
}

export function mimeForName(name: string): string | undefined { return MIME_TYPES[name.split('.').pop()?.toLowerCase() || '']; }
export function eligible(name: string, size: number, kind: string): boolean {
  const mime = mimeForName(name);
  return Boolean(mime && (kind !== 'image' || mime.startsWith('image/')) && size > 0 && size <= (kind === 'image' ? IMAGE_LIMIT : DOCUMENT_LIMIT));
}

export function validateBytes(bytes: Uint8Array, mime: string): void {
  if (!bytes.length || bytes.length > (mime.startsWith('image/') ? IMAGE_LIMIT : DOCUMENT_LIMIT)) throw new ImportFailure('File is empty or exceeds the size limit.');
  const ascii = new TextDecoder().decode(bytes.slice(0, 24));
  const valid = mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === 'image/png' ? bytes.slice(0, 8).every((b, i) => b === [137,80,78,71,13,10,26,10][i]) && bytes.length >= 24
    : mime === 'image/gif' ? /^GIF8[79]a/.test(ascii)
    : mime === 'image/webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
    : mime === 'application/pdf' ? ascii.startsWith('%PDF-')
    : ['application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime) ? bytes[0] === 80 && bytes[1] === 75
    : ['application/msword', 'application/vnd.ms-excel'].includes(mime) ? bytes.slice(0,8).every((b,i)=>b===[208,207,17,224,161,177,26,225][i])
    : mime === 'text/plain' || mime === 'text/csv';
  if (!valid) throw new ImportFailure('File content does not match its supported file type.');
}

export async function readBounded(response: Response, limit: number, timeoutMs = 30000): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > limit) throw new ImportFailure('File exceeds the size limit.');
  if (!response.body) throw new ImportFailure('File could not be downloaded.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new ImportFailure('File transfer timed out.',408)),timeoutMs);});
  try {
    while (true) {
      const next = await Promise.race([reader.read(),deadline]); if (next.done) break;
      size += next.value.length;
      if (size > limit) throw new ImportFailure('File exceeds the size limit.');
      chunks.push(next.value);
    }
  } finally { clearTimeout(timer!); void reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export function encode64(bytes: Uint8Array): string {
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function decode64(value: string): Uint8Array {
  try { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); } catch { throw new ImportFailure('Invalid file encoding.'); }
}
const url64 = (bytes: Uint8Array) => encode64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrl64 = (value: string) => decode64(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='));
export interface CandidateClaim { userId: string; url: string; path?: string; name: string; mimeType: string; size: number; revision?: string; expires: number }
async function signingKey(secret: string) { return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
export async function signCandidate(claim: CandidateClaim, secret: string): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(claim));
  return `${url64(data)}.${url64(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), data)))}`;
}
export async function verifyCandidate(token: unknown, userId: string, secret: string): Promise<CandidateClaim> {
  if (typeof token !== 'string' || token.length > 15000) throw new ImportFailure('Invalid file selection.');
  try {
    const parts = token.split('.'); if (parts.length !== 2) throw new Error();
    const data = fromUrl64(parts[0]);
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), fromUrl64(parts[1]), data)) throw new Error();
    const claim = JSON.parse(new TextDecoder().decode(data)) as CandidateClaim;
    if (claim.userId !== userId || claim.expires < Date.now()) throw new Error();
    dropboxUrl(claim.url);
    return claim;
  } catch { throw new ImportFailure('File selection expired or is invalid. Discover files again.'); }
}

export interface DropboxEntry { '.tag': string; name: string; path_lower?: string; path_display?: string; size?: number; rev?: string; is_downloadable?: boolean; link_permissions?: DropboxLinkPermissions }
export interface DropboxPage { entries: DropboxEntry[]; cursor: string; has_more: boolean }
export async function listCollection(url: string, api: (route: string, body: unknown) => Promise<unknown>): Promise<Array<{ entry: DropboxEntry; path: string }>> {
  // Dropbox does not support recursive:true together with shared_link.
  const queue = ['']; const visited = new Set<string>(); const files: Array<{ entry: DropboxEntry; path: string }> = [];
  let calls = 0; let entries = 0;
  while (queue.length) {
    const path = queue.shift()!; if (visited.has(path)) continue; visited.add(path);
    let page: DropboxPage | undefined;
    do {
      if (++calls > 100) throw new ImportFailure('Collection exceeds 100 listing pages. Use a smaller Dropbox folder; no partial collection was imported.');
      page = await api(page ? 'files/list_folder/continue' : 'files/list_folder', page ? {cursor: page.cursor} : {path, recursive:false, shared_link:{url}, limit:2000, include_non_downloadable_files:false}) as DropboxPage;
      if (!Array.isArray(page.entries)) throw new ImportFailure('Dropbox returned an invalid collection.');
      for (const entry of page.entries) {
        if (++entries > 5000) throw new ImportFailure('Collection exceeds 5,000 entries. Use a smaller Dropbox folder; no partial collection was imported.');
        // Build paths from the current relative path instead of account-level path_lower.
        const relativePath = `${path}/${entry.name}`;
        if (entry['.tag'] === 'folder') queue.push(relativePath);
        else if (entry['.tag'] === 'file' && entry.is_downloadable !== false) files.push({entry, path:relativePath});
      }
    } while (page.has_more);
  }
  return files;
}
