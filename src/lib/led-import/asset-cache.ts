import { isDropboxUrl } from './catalogue-parser';
import type { AssetCandidate } from './import-review';

export interface AssetDiscovery {
  candidates: AssetCandidate[];
  sourceType: 'file' | 'folder';
}
type Request = <T>(body: Record<string, unknown>) => Promise<T>;
interface Entry<T> { promise: Promise<T>; created: number; value?: T }
const IMAGE_LIMIT = 10 * 1024 * 1024;
const TOKEN_LIFETIME = 23 * 60 * 60 * 1000;
const PREVIEW_BUDGET = 64 * 1024 * 1024;

/** Match backend shared-link normalization, preserving access keys and subpaths. */
export function assetLinkKey(value: string): string {
  const url = new URL(value.trim());
  url.hash = '';
  for (const key of ['dl', 'raw', 'subfolder_nav_tracking']) url.searchParams.delete(key);
  return url.toString();
}

/** One instance per upload: share content and pending requests, never field choices. */
export class ImportAssetCache {
  private listings = new Map<string, Entry<AssetDiscovery>>();
  private previews = new Map<string, Entry<{ previewUrl: string }>>();
  private previewBytes = 0;

  constructor(private request: Request, private legacy = false, private previewBudget = PREVIEW_BUDGET) {}

  private remember<T>(map: Map<string, Entry<T>>, key: string, load: () => Promise<T>): Entry<T> {
    const entry = map.get(key);
    if (entry && Date.now() - entry.created < TOKEN_LIFETIME) {
      map.delete(key); map.set(key, entry);
      return entry;
    }
    const next: Entry<T> = { created: Date.now(), promise: Promise.resolve().then(load) };
    map.set(key, next);
    next.promise.then(value => {
      if (map.get(key) === next) next.value = value;
    }, () => {
      // A failed old request must not evict its replacement after a refresh.
      if (map.get(key) === next) map.delete(key);
    });
    return next;
  }

  async discover(url: string, kind: 'image' | 'document'): Promise<AssetDiscovery> {
    if (!isDropboxUrl(url.trim())) throw new Error('Only public Dropbox file and folder collections are supported. Choose None of these to leave this field empty.');
    const key = assetLinkKey(url);
    // Document discovery includes every supported image and document. Reuse that
    // one listing for all three columns, applying image restrictions locally.
    const result = await this.remember(this.listings, key, async () => {
      const discovery = await this.request<AssetDiscovery>({ action: 'discover', url: key, kind: 'document', ...(this.legacy ? { legacy: true } : {}) });
      if (!Array.isArray(discovery?.candidates) || !['file','folder'].includes(discovery.sourceType)) throw new Error('Could not read the linked files. Retry discovery.');
      return discovery;
    }).promise;
    return {
      sourceType: result.sourceType,
      candidates: result.candidates.filter(candidate => kind !== 'image' || (candidate.mimeType.startsWith('image/') && candidate.size > 0 && candidate.size <= IMAGE_LIMIT)),
    };
  }

  preview(candidateId: string): Promise<{ previewUrl: string }> {
    const old = this.previews.get(candidateId);
    if (old && Date.now() - old.created >= TOKEN_LIFETIME) this.removePreview(candidateId);
    const entry = this.remember(this.previews, candidateId, async () => {
      const result = await this.request<{ previewUrl: string }>({ action: 'thumbnail', candidateId });
      if (typeof result?.previewUrl !== 'string' || !result.previewUrl) throw new Error('Image preview is unavailable.');
      return result;
    });
    if (entry !== old) {
      entry.promise.then(result => {
        if (this.previews.get(candidateId) !== entry) return;
        this.previewBytes += result.previewUrl.length * 2;
        // Bound retained data URLs. Evict the least recently used completed
        // preview; pending requests continue to deduplicate concurrent cards.
        for (const [id, cached] of this.previews) {
          if (this.previewBytes <= this.previewBudget) break;
          if (cached.value) this.removePreview(id);
        }
      }, () => {});
    }
    return entry.promise;
  }

  private removePreview(id: string) {
    const cached = this.previews.get(id);
    if (cached?.value) this.previewBytes -= cached.value.previewUrl.length * 2;
    this.previews.delete(id);
  }

  invalidate(url: string) {
    const key = assetLinkKey(url);
    const entry = this.listings.get(key);
    entry?.value?.candidates.forEach(candidate => this.removePreview(candidate.id));
    this.listings.delete(key);
  }

  clear() {
    this.listings.clear(); this.previews.clear(); this.previewBytes = 0;
  }
}
