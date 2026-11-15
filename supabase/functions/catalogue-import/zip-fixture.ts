// Small deterministic test ZIPs, including malformed headers and paths.
import { crc32, deflateRawSync } from 'node:zlib';

export function folderZip(files: Record<string, Uint8Array>, deflate = true, dataDescriptors = false): Uint8Array {
  const locals: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const [name, bytes] of Object.entries(files)) {
    const filename = new TextEncoder().encode(name);
    const compressed = deflate ? new Uint8Array(deflateRawSync(bytes)) : bytes;
    const descriptor = dataDescriptors && name !== '/';
    const flags = descriptor ? 8 : name === '/' ? 0 : 0x800;
    const local = new Uint8Array(30 + filename.length + compressed.length + (descriptor ? 16 : 0));
    const lv = new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,flags,true); lv.setUint16(8,deflate?8:0,true);
    if (!descriptor) { lv.setUint32(14,crc32(bytes),true); lv.setUint32(18,compressed.length,true); lv.setUint32(22,bytes.length,true); }
    lv.setUint16(26,filename.length,true);
    local.set(filename,30); local.set(compressed,30+filename.length);
    if (descriptor) {
      const start = 30 + filename.length + compressed.length;
      lv.setUint32(start,0x08074b50,true); lv.setUint32(start+4,crc32(bytes),true); lv.setUint32(start+8,compressed.length,true); lv.setUint32(start+12,bytes.length,true);
    }
    const entry = new Uint8Array(46 + filename.length); const cv = new DataView(entry.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,flags,true); cv.setUint16(10,deflate?8:0,true);
    cv.setUint32(16,crc32(bytes),true); cv.setUint32(20,compressed.length,true); cv.setUint32(24,bytes.length,true); cv.setUint16(28,filename.length,true); cv.setUint32(42,offset,true);
    entry.set(filename,46); locals.push(local); central.push(entry); offset += local.length;
  }
  const centralSize = central.reduce((size, entry) => size + entry.length,0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(8,central.length,true); ev.setUint16(10,central.length,true); ev.setUint32(12,centralSize,true); ev.setUint32(16,offset,true);
  const result = new Uint8Array(offset+centralSize+22); let position = 0;
  for (const chunk of [...locals,...central,end]) { result.set(chunk,position); position += chunk.length; }
  return result;
}
