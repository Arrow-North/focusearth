import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';
import { ImportFailure, IMAGE_LIMIT, DOCUMENT_LIMIT, dropboxUrl, requirePublicDropboxLink, mimeForName, eligible, validateBytes, readBounded, encode64, decode64, signCandidate, verifyCandidate, listCollection, type CandidateClaim, type DropboxEntry } from './support.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const env = (key: string) => Deno.env.get(key) || '';
const SUPABASE_URL = env('SUPABASE_URL');
const service = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}});
const secret = env('CATALOGUE_IMPORT_SIGNING_SECRET') || env('SUPABASE_SERVICE_ROLE_KEY');
const categories = ['fixtures','lamp','power-supply','control','accessories'];
let cachedToken = ''; let tokenExpires = 0;

async function dropboxToken(): Promise<string> {
  if (cachedToken && tokenExpires > Date.now()) return cachedToken;
  if (env('DROPBOX_REFRESH_TOKEN') && env('DROPBOX_APP_KEY') && env('DROPBOX_APP_SECRET')) {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({grant_type:'refresh_token',refresh_token:env('DROPBOX_REFRESH_TOKEN'),client_id:env('DROPBOX_APP_KEY'),client_secret:env('DROPBOX_APP_SECRET')}),
    });
    if (!response.ok) throw new ImportFailure('Dropbox connection could not be refreshed. Contact your administrator.',503);
    const token = await response.json(); cachedToken = token.access_token; tokenExpires = Date.now() + (Number(token.expires_in) - 60) * 1000;
    return cachedToken;
  }
  if (env('DROPBOX_ACCESS_TOKEN')) return env('DROPBOX_ACCESS_TOKEN');
  throw new ImportFailure('Dropbox is not configured. Configure the backend Dropbox connection before discovering linked files.',503);
}

async function dropbox(route: string, body: unknown, content = false): Promise<Response> {
  // Route and host are internal constants. Never fetch a caller-supplied URL.
  const token = await dropboxToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const headers: Record<string,string> = {Authorization:`Bearer ${token}`};
    if (content) headers['Dropbox-API-Arg'] = JSON.stringify(body).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
    else headers['Content-Type'] = 'application/json';
    const response = await fetch(`https://${content ? 'content' : 'api'}.dropboxapi.com/2/${route}`, {
      method:'POST',headers,body:content ? undefined : JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000),
    });
    if (response.ok) return response;
    await response.body?.cancel();
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, Math.min(3000, Math.max(500, Number(response.headers.get('retry-after') || 1) * 1000)))); continue;
    }
    throw new ImportFailure(response.status === 401 ? 'Dropbox connection expired. Reconnect Dropbox on the backend.' : `Dropbox file is unavailable for import (HTTP ${response.status}). Check the shared link and access permissions.`,422);
  }
  throw new ImportFailure('Dropbox is temporarily unavailable.',503);
}
async function api(route: string, body: unknown): Promise<unknown> { return (await dropbox(route,body)).json(); }

async function publicMetadata(url: string, path?: string): Promise<DropboxEntry> {
  const metadata = await api('sharing/get_shared_link_metadata', {url,...(path ? {path} : {})}) as DropboxEntry;
  requirePublicDropboxLink(metadata);
  return metadata;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new ImportFailure(`Invalid ${label}.`);
  return value as number;
}
function text(value: unknown, label: string, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ImportFailure(`Invalid ${label}.`);
  return value.trim();
}
function object(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ImportFailure('Invalid object.');
  return value as Record<string,unknown>;
}
async function supplier(companyId: unknown): Promise<number> {
  const id = integer(companyId,'supplier company');
  const {data,error} = await service.from('company').select('id').eq('id',id).eq('type','SU').or('is_deleted.is.null,is_deleted.eq.false').maybeSingle();
  if (error || !data) throw new ImportFailure('Select an existing supplier company before importing.');
  return id;
}
function category(value: unknown): string {
  if (typeof value !== 'string' || !categories.includes(value)) throw new ImportFailure('Invalid catalogue category.');
  return value;
}

async function discover(body: Record<string,unknown>, userId: string) {
  const url = dropboxUrl(body.url);
  const kind = body.kind === 'image' ? 'image' : body.kind === 'document' ? 'document' : undefined;
  if (!kind) throw new ImportFailure('Invalid linked file kind.');
  const metadata = await publicMetadata(url);
  if (!['file','folder'].includes(metadata['.tag'])) throw new ImportFailure('Dropbox URL does not reference a file or folder.');
  const entries = metadata['.tag'] === 'folder' ? await listCollection(url,api) : [{entry:metadata,path:undefined}];
  const candidates = [];
  for (const {entry,path} of entries) {
    if (!eligible(entry.name,Number(entry.size),kind) || entry.is_downloadable === false) continue;
    if (body.legacy === true && !['image/jpeg','image/png','image/webp','image/gif','application/pdf'].includes(mimeForName(entry.name)!)) continue;
    const claim: CandidateClaim = {userId,url,path,name:entry.name,mimeType:mimeForName(entry.name)!,size:Number(entry.size),revision:entry.rev,expires:Date.now()+24*60*60*1000};
    candidates.push({id:await signCandidate(claim,secret),name:path ? path.slice(1) : entry.name,mimeType:claim.mimeType,size:claim.size});
  }
  return {sourceType:metadata['.tag'],candidates};
}

async function thumbnail(body: Record<string,unknown>, userId: string) {
  const claim = await verifyCandidate(body.candidateId,userId,secret);
  if (!claim.mimeType.startsWith('image/')) throw new ImportFailure('Only image candidates have thumbnails.');
  await publicMetadata(claim.url,claim.path);
  const response = await dropbox('files/get_thumbnail_v2',{resource:{'.tag':'link',url:claim.url,...(claim.path ? {path:claim.path} : {})},format:'jpeg',size:'w256h256',mode:'bestfit'},true);
  const bytes = await readBounded(response,1024*1024);
  validateBytes(bytes,'image/jpeg');
  return {previewUrl:`data:image/jpeg;base64,${encode64(bytes)}`};
}

async function downloadSelected(claim: CandidateClaim): Promise<Uint8Array> {
  await publicMetadata(claim.url,claim.path);
  const response = await dropbox('sharing/get_shared_link_file',{url:claim.url,...(claim.path?{path:claim.path}:{})},true);
  const bytes = await readBounded(response,claim.mimeType.startsWith('image/')?IMAGE_LIMIT:DOCUMENT_LIMIT);
  let metadata: {rev?:string;size?:number} = {};
  try { metadata = JSON.parse(response.headers.get('Dropbox-API-Result') || '{}'); } catch { throw new ImportFailure('Dropbox returned invalid file metadata.'); }
  if (bytes.length!==claim.size || (claim.revision && metadata.rev!==claim.revision)) throw new ImportFailure('Selected Dropbox file changed since preview. Discover and select it again.');
  validateBytes(bytes,claim.mimeType);
  return bytes;
}

/** Mirror an independently selected collection file for the asset-to-CSV utility. */
async function storeAsset(body: Record<string,unknown>, userId: string) {
  const companyId = integer(body.companyId,'company');
  const type = text(body.luminaireType,'luminaire type');
  if (!['fixtures','lamps','power-supplies','controls','accessories'].includes(type)) throw new ImportFailure('Invalid luminaire type.');
  const field = text(body.field,'attachment field');
  if (!['specifications','installationInstructions','productImage'].includes(field)) throw new ImportFailure('Invalid attachment field.');
  const productId = text(body.productId,'product ID');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) throw new ImportFailure('Invalid product ID.');
  const {data:company,error} = await service.from('company').select('id,name').eq('id',companyId).or('is_deleted.is.null,is_deleted.eq.false').maybeSingle();
  if (error || !company || typeof company.name !== 'string') throw new ImportFailure('Select an existing company before importing.');
  const claim = await verifyCandidate(body.candidateId,userId,secret);
  if (dropboxUrl(body.url)!==dropboxUrl(claim.url)) throw new ImportFailure('Selected file does not match this hyperlink. Discover and select its files again.');
  if (!['image/jpeg','image/png','image/webp','image/gif','application/pdf'].includes(claim.mimeType) || (field==='productImage' && !claim.mimeType.startsWith('image/'))) throw new ImportFailure('Choose a supported image or PDF for this field.');
  const bytes = await downloadSelected(claim);
  const slug = company.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'unknown';
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,24);
  const extension = claim.name.split('.').pop()!.toLowerCase();
  const suffix = field==='specifications'?'-spec':field==='installationInstructions'?'-install':'';
  // Content-addressed names make retries stable and different choices immutable.
  const objectKey = `${slug}/${type}/${productId}${suffix}-${digest}.${extension}`;
  const uploaded = await service.storage.from('leds').upload(objectKey,bytes,{contentType:claim.mimeType,upsert:true,cacheControl:'3600'});
  if (uploaded.error) throw new ImportFailure(`Could not save selected file: ${uploaded.error.message}`,500);
  return {publicUrl:service.storage.from('leds').getPublicUrl(objectKey).data.publicUrl,objectKey,bucket:'leds'};
}

async function duplicates(body: Record<string,unknown>) {
  const companyId = await supplier(body.companyId);
  if (!Array.isArray(body.rows) || body.rows.length > 10000) throw new ImportFailure('Preview supports up to 10,000 rows per file.');
  const rows = body.rows.map(value => { const row = object(value); return {rowId:text(row.rowId,'row ID'),category:category(row.category),orderCode:text(row.orderCode,'order code')}; });
  const matches: Array<{id:number;updated_at:string|null;details:Record<string,unknown>;airtable_colum_name:string}> = [];
  // Page explicitly: Supabase's default result cap must never hide duplicates.
  for (let offset = 0; ; offset += 1000) {
    const {data,error} = await service.from('product').select('id,updated_at,details,airtable_colum_name').eq('company_id',companyId).is('project_id',null).is('report_id',null).is('estimate_su_id',null).order('id').range(offset,offset+999);
    if (error) throw new ImportFailure('Could not check catalogue duplicates.',500);
    matches.push(...data);
    if (data.length < 1000) break;
    if (offset >= 100000) throw new ImportFailure('Supplier catalogue is too large for this preview. Contact your administrator.');
  }
  const index = new Map<string,typeof matches>();
  for (const product of matches) {
    const key = `${product.airtable_colum_name}:${String(product.details.orderCode||'').trim().toLowerCase()}`;
    index.set(key,[...(index.get(key)||[]),product]);
  }
  return {duplicates:rows.map(row => ({rowId:row.rowId,matches:(index.get(`${row.category}:${row.orderCode.toLowerCase()}`)||[]).map(product=>({id:product.id,updatedAt:product.updated_at,details:product.details}))}))};
}

async function commit(body: Record<string,unknown>, userId: string) {
  const companyId = await supplier(body.companyId); const cat = category(body.category); const code = text(body.orderCode,'order code');
  const importId = text(body.importId,'import ID'); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId)) throw new ImportFailure('Invalid import ID.');
  const rowId = text(body.rowId,'row ID');
  if (!['create','update','skip'].includes(String(body.decision))) throw new ImportFailure('Choose how to handle this row.');
  if (body.decision === 'skip') return {status:'skipped'};
  const {data:company,error:companyError} = await service.from('company').select('name').eq('id',companyId).single();
  if (companyError || !company) throw new ImportFailure('Supplier company is not available.');
  const details: Record<string,unknown> = {...object(body.details),orderCode:code,supplier:company.name};
  // Audit markers and asset manifests are generated by this backend, never accepted from a caller.
  delete details.omittedAssets;
  delete details.importedAssets;
  if (JSON.stringify(details).length > 256*1024) throw new ImportFailure('Row details are too large.');
  // A retry after an interrupted response returns the prior result before downloading assets again.
  const {data:prior,error:priorError} = await service.from('catalogue_import_rows').select('result,company_id,category,order_code').eq('actor_id',userId).eq('import_id',importId).eq('row_id',rowId).maybeSingle();
  if (priorError) throw new ImportFailure('Import migration is not installed or the import log is unavailable.',500);
  if (prior) {
    if (prior.company_id !== companyId || prior.category !== cat || prior.order_code !== code) throw new ImportFailure('Import row identity changed. Start a new import.');
    return prior.result;
  }
  if (!Array.isArray(body.attachments) || body.attachments.length > 50) throw new ImportFailure('Invalid linked file selections.');
  const selections = body.attachments.map(value => { const entry = object(value); return {field:text(entry.field,'attachment field',100),candidateId:entry.candidateId}; });
  if (new Set(selections.map(entry=>entry.field)).size !== selections.length || selections.some(entry=>!/^\w[\w-]*$/.test(entry.field) || ['__proto__','constructor','prototype','sourceValues','importedAssets','omittedAssets','orderCode'].includes(entry.field))) throw new ImportFailure('Invalid or duplicate attachment field.');
  if (body.omittedFields !== undefined && (!Array.isArray(body.omittedFields) || body.omittedFields.length > 50)) throw new ImportFailure('Invalid declined field choices.');
  const omitted = (body.omittedFields as unknown[] | undefined ?? []).map(value=>text(value,'declined field',100));
  if (new Set(omitted).size !== omitted.length || omitted.some(field=>!/^\w[\w-]*$/.test(field) || ['__proto__','constructor','prototype','sourceValues','importedAssets','omittedAssets','orderCode'].includes(field) || selections.some(selection=>selection.field===field))) throw new ImportFailure('A linked field must have exactly one selected file or an explicit None choice.');
  const manual = body.manualImage ? object(body.manualImage) : undefined;
  if (!manual && !omitted.includes('productImage') && !selections.some(entry=>entry.field==='productImage')) throw new ImportFailure('Product image is unavailable for import. Select an image, upload one manually, or explicitly choose None.');
  if (manual && (omitted.includes('productImage') || selections.some(entry=>entry.field==='productImage'))) throw new ImportFailure('Choose one product image source or None.');
  const claims = await Promise.all(selections.map(async selection=>({...selection,claim:await verifyCandidate(selection.candidateId,userId,secret)})));
  if (claims.some(entry=>entry.field==='productImage' && !entry.claim.mimeType.startsWith('image/'))) throw new ImportFailure('A valid product image is required.');
  // A folder used by two different columns still requires a separate choice for each field.
  // Source links also preserve Excel hyperlinks whose displayed cell value is a label.
  if (!Array.isArray(body.sourceLinks) || body.sourceLinks.length > 50) throw new ImportFailure('Original linked fields are required.');
  const sourceLinks = body.sourceLinks.map(value=>object(value));
  if (new Set(sourceLinks.map(link=>link.detailKey)).size !== sourceLinks.length) throw new ImportFailure('Duplicate source link fields.');
  for (const link of sourceLinks) {
    const field = text(link.detailKey,'source link field',100);
    if (omitted.includes(field)) continue;
    if (field==='productImage' && manual) continue;
    const chosen = claims.find(entry=>entry.field===field);
    if (!chosen || dropboxUrl(link.url)!==dropboxUrl(chosen.claim.url)) throw new ImportFailure(`Select a file for every linked field before importing (${field}).`);
  }
  if (claims.some(entry=>!sourceLinks.some(link=>link.detailKey===entry.field))) throw new ImportFailure('File selection does not match the source linked fields.');
  if (omitted.some(field=>field!=='productImage' && !sourceLinks.some(link=>link.detailKey===field))) throw new ImportFailure('Declined choice does not match a source linked field.');
  const omittedAssets: Record<string,unknown> = {};
  const aliases: Record<string,string[]> = {productImage:['image','productImageHyperlink'],productSpecifications:['productSpecificationsHyperlink'],installationInstructions:['installationInstructionsHyperlink']};
  for (const field of omitted) {
    const original = sourceLinks.find(link=>link.detailKey===field)?.url;
    if (typeof original === 'string' && original.length > 4096) throw new ImportFailure('Original linked URL is too long.');
    details[field] = '';
    omittedAssets[field] = {reason:'admin_declined',sourceUrl:typeof original==='string'?original:null};
    for (const alias of aliases[field] || []) details[alias]='';
  }
  details.omittedAssets = omittedAssets;
  const paths: string[] = []; const assets: Record<string,unknown> = {};
  let preservePaths = false;
  const attemptId = crypto.randomUUID();
  async function store(field: string, name: string, mime: string, bytes: Uint8Array, sourceUrl: string|null) {
    validateBytes(bytes,mime);
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120);
    const path = `${userId}/${importId}/${attemptId}/${field}_${safeName}`;
    const {error} = await service.storage.from('catalogue-assets').upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'3600'});
    if (error) throw new ImportFailure(`Could not save ${field}: ${error.message}`,500);
    paths.push(path);
    const url = service.storage.from('catalogue-assets').getPublicUrl(path).data.publicUrl;
    details[field] = url; assets[field] = {url,path,name,sourceUrl};
    for (const alias of aliases[field] || []) details[alias]=url;
  }
  try {
    for (const {field,claim} of claims) {
      // Recheck the selected child: a public folder can contain restricted files,
      // and the link's visibility may have changed after discovery.
      const bytes = await downloadSelected(claim);
      await store(field,claim.name,claim.mimeType,bytes,claim.url);
    }
    if (manual) {
      const name = text(manual.name,'image filename'); const mime = text(manual.mimeType,'image type',100);
      if (!mime.startsWith('image/') || mimeForName(name)!==mime || typeof manual.base64!=='string' || manual.base64.length>Math.ceil(IMAGE_LIMIT/3)*4+4) throw new ImportFailure('Manual image must be JPEG, PNG, GIF, or WebP, at most 10 MB.');
      await store('productImage',name,mime,decode64(manual.base64),null);
    }
    (details as Record<string,unknown>).importedAssets = assets;
    // Once the RPC starts, an interrupted transport is ambiguous: SQL may already have committed.
    preservePaths = true;
    const {data,error} = await service.rpc('fn_commit_catalogue_import_row',{
      p_actor_id:userId,p_import_id:importId,p_row_id:rowId,p_company_id:companyId,p_category:cat,p_order_code:code,p_details:details,p_decision:body.decision,
      p_existing_product_id:body.existingProductId ?? null,p_existing_updated_at:body.existingUpdatedAt ?? null,
    });
    if (error) {
      const confirmation = await service.from('catalogue_import_rows').select('result').eq('actor_id',userId).eq('import_id',importId).eq('row_id',rowId).maybeSingle();
      if (confirmation.data) {
        const savedPaths: string[] = confirmation.data.result.assetPaths || [];
        const unreferenced = paths.filter(path=>!savedPaths.includes(path));
        if (unreferenced.length) await service.storage.from('catalogue-assets').remove(unreferenced);
        return confirmation.data.result;
      }
      // A PostgreSQL exception guarantees rollback. Network/proxy errors do not.
      preservePaths = !/^[0-9A-Z]{5}$/.test(error.code || '');
      throw new ImportFailure(error.message.includes('preview') || error.message.includes('Duplicate') ? error.message : `Could not confirm catalogue row. Retry this row safely: ${error.message}`,409);
    }
    if (data.replayed && paths.length) await service.storage.from('catalogue-assets').remove(paths);
    return data;
  } catch (error) {
    if (paths.length && !preservePaths) {
      const cleanup = await service.storage.from('catalogue-assets').remove(paths);
      if (cleanup.error) console.error('Catalogue import asset cleanup failed', {importId,rowId,paths});
    }
    throw error;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok',{headers:cors});
  const reply = (value:unknown,status=200) => new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
  try {
    if (request.method !== 'POST') throw new ImportFailure('Use POST.',405);
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new ImportFailure('Sign in to import catalogue files.',401);
    const {data:{user},error} = await service.auth.getUser(authorization.slice(7));
    if (error || !user) throw new ImportFailure('Session is invalid or expired.',401);
    const {data:profile,error:profileError} = await service.from('profiles').select('type,enabled,is_deleted').eq('id',user.id).maybeSingle();
    if (profileError || profile?.type!=='SUPERADMIN' || !profile.enabled || profile.is_deleted) throw new ImportFailure('Only an active super admin may import catalogue files.',403);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new ImportFailure('Use a JSON request.');
    const bytes = await readBounded(new Response(request.body),16*1024*1024);
    let body: Record<string,unknown>;
    try { body = object(JSON.parse(new TextDecoder().decode(bytes))); } catch { throw new ImportFailure('Invalid JSON request.'); }
    const result = body.action==='discover' ? await discover(body,user.id)
      : body.action==='thumbnail' ? await thumbnail(body,user.id)
      : body.action==='duplicates' ? await duplicates(body)
      : body.action==='store-asset' ? await storeAsset(body,user.id)
      : body.action==='commit' ? await commit(body,user.id)
      : (()=>{throw new ImportFailure('Unknown catalogue import action.');})();
    return reply(result);
  } catch (error) {
    if (error instanceof ImportFailure) return reply({error:error.message},error.status);
    console.error('Catalogue import request failed',error instanceof Error ? error.message : 'Unknown error');
    return reply({error:'Catalogue import failed. Retry or contact your administrator.'},500);
  }
});
