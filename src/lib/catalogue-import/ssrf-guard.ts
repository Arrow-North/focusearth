/**
 * SSRF guard for the `resolve-led-asset` edge function.
 *
 * The function fetches URLs pasted into a spreadsheet by a user, so every one
 * of them is attacker-controlled input aimed at a server that sits inside a
 * private network with an instance-metadata endpoint. This module is the only
 * thing between that input and `fetch`.
 *
 * Shared with the browser bundle, so — like `link-classifier.ts` — it is
 * dependency free, side-effect free, and touches no browser-only or Deno-only
 * global at module scope. `Deno.resolveDns` is feature-detected at call time.
 */

/** Thrown for any URL the guard refuses to let `fetch` see. */
export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
    // Keeps `instanceof` working if this file is ever downlevelled past ES2015.
    Object.setPrototypeOf(this, BlockedUrlError.prototype);
  }
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal'];

// ─── IP literals ────────────────────────────────────────────────────────────

/**
 * True for loopback, link-local, RFC1918, CGNAT, multicast/reserved and the
 * cloud metadata address, in both IPv4 and IPv6 notation (IPv4-mapped and
 * IPv4-compatible IPv6 forms such as `::ffff:127.0.0.1` included).
 * Returns false for anything that is not a parseable IP literal.
 */
export function isPrivateIp(ip: string): boolean {
  const value = stripBrackets((ip || '').trim().toLowerCase());
  if (!value) return false;

  if (!value.includes(':')) {
    const v4 = parseIpv4(value);
    return v4 ? isPrivateIpv4(v4) : false;
  }

  const v6 = parseIpv6(value);
  if (!v6) return false;

  const allZeroHigh = v6.slice(0, 5).every((group) => group === 0);

  // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (IPv4-compatible).
  if (allZeroHigh && (v6[5] === 0xffff || v6[5] === 0)) {
    const embedded = [v6[6] >> 8, v6[6] & 0xff, v6[7] >> 8, v6[7] & 0xff];
    const isUnspecified = v6.every((group) => group === 0);
    const isLoopbackV6 = allZeroHigh && v6[5] === 0 && v6[6] === 0 && v6[7] === 1;
    if (isUnspecified || isLoopbackV6) return true;
    // ::<low bits> that are not a real embedded address (e.g. ::2) are reserved.
    if (v6[5] === 0 && v6[6] === 0) return true;
    return isPrivateIpv4(embedded);
  }

  if ((v6[0] & 0xfe00) === 0xfc00) return true; // fc00::/7  unique local
  if ((v6[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((v6[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site local (deprecated)
  if ((v6[0] & 0xff00) === 0xff00) return true; // ff00::/8  multicast

  return false;
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // 127/8 loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 169 && b === 254) return true; // 169.254/16, incl. 169.254.169.254
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0/24 IETF
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
  if (a >= 224) return true; // multicast, reserved, 255.255.255.255
  return false;
}

/** Strict dotted quad. Rejects octal-looking and short forms on purpose. */
function parseIpv4(value: string): number[] | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

/** Returns the 8 16-bit groups, or null when `value` is not a valid IPv6. */
function parseIpv6(value: string): number[] | null {
  let text = value;

  const zone = text.indexOf('%');
  if (zone !== -1) text = text.slice(0, zone);
  if (!text.includes(':')) return null;

  // Fold a trailing dotted-quad into two hex groups.
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const high = ((v4[0] << 8) | v4[1]).toString(16);
    const low = ((v4[2] << 8) | v4[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(':') : [];
  const tailGroups = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  let groups: string[];
  if (halves.length === 2) {
    const fill = 8 - head.length - tailGroups.length;
    if (fill < 1) return null;
    groups = head.concat(new Array(fill).fill('0'), tailGroups);
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const out: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    out.push(parseInt(group, 16));
  }
  return out;
}

/** Hostnames that a resolver might read as a number rather than a name. */
function looksNumeric(host: string): boolean {
  return host.includes(':') || /^[0-9.]+$/.test(host) || /^0x[0-9a-f]+$/.test(host);
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

// ─── Hostname policy ────────────────────────────────────────────────────────

/**
 * True for hostnames that must never be fetched: loopback and mDNS/intranet
 * names, the cloud metadata name, and any IP literal that is private or is
 * written in a numeric form we cannot verify (`2130706433`, `0x7f000001`,
 * `0177.0.0.1` — all of which resolve to 127.0.0.1 in a permissive client).
 */
export function isBlockedHostname(hostname: string): boolean {
  const host = stripBrackets((hostname || '').trim().toLowerCase()).replace(/\.$/, '');
  if (!host) return true;

  if (BLOCKED_HOSTNAMES.has(host)) return true;
  for (const suffix of BLOCKED_SUFFIXES) {
    if (host.endsWith(suffix)) return true;
  }

  if (looksNumeric(host)) {
    if (isPrivateIp(host)) return true;
    // A numeric host we could not parse as a strict IP literal is blocked:
    // some resolvers accept forms this guard does not model.
    return !isParsableIp(host);
  }

  return false;
}

function isParsableIp(host: string): boolean {
  const value = stripBrackets(host);
  return value.includes(':') ? parseIpv6(value) !== null : parseIpv4(value) !== null;
}

// ─── Assertions ─────────────────────────────────────────────────────────────

/**
 * Synchronous gate: scheme, credentials and hostname policy.
 * Returns the parsed URL so the caller can reuse it; throws BlockedUrlError.
 */
export function assertPublicHttpUrl(raw: string): URL {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw new BlockedUrlError('Blocked empty URL');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BlockedUrlError(`Blocked unparseable URL: "${clip(trimmed)}"`);
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new BlockedUrlError(
      `Blocked scheme "${protocol.replace(':', '')}" (only http and https are allowed)`,
    );
  }
  if (url.username || url.password) {
    throw new BlockedUrlError('Blocked URL with embedded credentials');
  }

  const host = stripBrackets(url.hostname).toLowerCase();
  if (!host) throw new BlockedUrlError('Blocked URL with no hostname');
  if (isBlockedHostname(host)) {
    throw new BlockedUrlError(`Blocked private or internal host "${host}"`);
  }

  return url;
}

type DenoLike = {
  resolveDns?: (query: string, recordType: string) => Promise<string[]>;
};

/** Feature-detect the Deno global at call time; absent in the browser bundle. */
function getResolveDns(): DenoLike['resolveDns'] | null {
  const deno = (globalThis as { Deno?: DenoLike }).Deno;
  if (typeof deno === 'undefined' || deno === null) return null;
  const resolveDns = deno.resolveDns;
  return typeof resolveDns === 'function' ? resolveDns.bind(deno) : null;
}

/**
 * Everything `assertPublicHttpUrl` checks, plus an A/AAAA lookup when
 * `Deno.resolveDns` exists, rejecting if any resolved address is private.
 *
 * CAVEAT — this narrows DNS rebinding, it does not eliminate it. Resolution
 * happens twice: once here, and again inside `fetch`. An attacker controlling
 * an authoritative server with a near-zero TTL can answer with a public
 * address for our check and a private one for the fetch. Closing the gap for
 * real requires resolving once and connecting to that pinned address (a custom
 * dialer/HTTP client), which the Deno `fetch` API does not expose. Treat this
 * as defence in depth on top of network egress rules, not as a complete fix.
 *
 * A hostname that resolves to nothing is allowed through — the fetch that
 * follows will simply fail — and a DNS error on one record type is not fatal,
 * since an A-only host legitimately has no AAAA record.
 */
export async function assertPublicHttpUrlWithDns(raw: string): Promise<URL> {
  const url = assertPublicHttpUrl(raw);

  const host = stripBrackets(url.hostname).toLowerCase();
  // Literal addresses were fully validated synchronously; nothing to resolve.
  if (looksNumeric(host)) return url;

  const resolveDns = getResolveDns();
  if (!resolveDns) return url;

  const addresses: string[] = [];
  for (const recordType of ['A', 'AAAA']) {
    try {
      const found = await resolveDns(host, recordType);
      if (Array.isArray(found)) addresses.push(...found);
    } catch {
      // NXDOMAIN / no record of this type / resolver permission denied.
    }
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new BlockedUrlError(
        `Blocked host "${host}" — it resolves to the private address ${address}`,
      );
    }
  }

  return url;
}

function clip(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
