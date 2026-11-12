/** Runtime migration checks without a live Supabase project.
 * Run npm ci and npm run test:catalogue-import:sql. PGLITE_MODULE optionally
 * selects a separate PGlite installation when validating with external tools.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const admin = '10000000-0000-4000-8000-000000000001';
const ordinary = '10000000-0000-4000-8000-000000000002';
const disabled = '10000000-0000-4000-8000-000000000003';
const upload = '20000000-0000-4000-8000-000000000001';
const image = 'https://example.supabase.co/storage/v1/object/public/catalogue-assets/image.png';
const details = { description: 'Imported lamp', productImage: image, importedAssets: { productImage: { url: image, path: 'admin/import/image.png' } }, sourceValues: { 'Order Code': 'ABC' } };

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects (id serial PRIMARY KEY,bucket_id text,name text);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY,type text,enabled boolean,is_deleted boolean);
    CREATE TABLE public.company (id integer PRIMARY KEY,type text,is_deleted boolean);
    CREATE TABLE public.product (
      id serial PRIMARY KEY,user_id uuid,company_id integer,project_id integer,report_id integer,estimate_su_id integer,
      airtable_record varchar(255) NOT NULL,airtable_colum_name varchar(255) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL,updated_at timestamptz
    );
    INSERT INTO profiles VALUES ('${admin}','SUPERADMIN',true,false),('${ordinary}','Au',true,false),('${disabled}','SUPERADMIN',false,false);
    INSERT INTO company VALUES (1,'SU',false),(2,'SU',false),(3,'REU',false),(4,'SU',true);
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261112000000_catalogue_import.sql', import.meta.url), 'utf8'));
  return db;
}
async function commit(db, overrides = {}) {
  const value = { actor: admin, importId: upload, rowId: 'Lamps:4', company: 1, category: 'lamp', code: 'ABC', details, decision: 'create', existingId: null, updatedAt: null, ...overrides };
  const result = await db.query(`SELECT public.fn_commit_catalogue_import_row($1::uuid,$2::uuid,$3::text,$4::integer,$5::text,$6::text,$7::jsonb,$8::text,$9::integer,$10::timestamptz) AS result`, [value.actor,value.importId,value.rowId,value.company,value.category,value.code,JSON.stringify(value.details),value.decision,value.existingId,value.updatedAt]);
  return result.rows[0].result;
}

test('catalogue migration executes and enforces authorization, images, duplicates and retries at runtime', async t => {
  const db = await database();
  try {
    await t.test('RPC is not executable by authenticated or anonymous callers', async () => {
      const permissions = await db.query("SELECT has_function_privilege('authenticated','public.fn_commit_catalogue_import_row(uuid,uuid,text,integer,text,text,jsonb,text,integer,timestamptz)','EXECUTE') AS authenticated, has_function_privilege('anon','public.fn_commit_catalogue_import_row(uuid,uuid,text,integer,text,text,jsonb,text,integer,timestamptz)','EXECUTE') AS anon");
      assert.deepEqual(permissions.rows[0], { authenticated: false, anon: false });
      await db.exec("SET request.jwt.claim.role = 'authenticated'");
      await assert.rejects(commit(db), /Only the import backend/);
      await db.exec("SET request.jwt.claim.role = 'service_role'");
    });
    await t.test('backend actor must be active superadmin and company must be an active supplier', async () => {
      await assert.rejects(commit(db, { actor: ordinary }), /active super admin/);
      await assert.rejects(commit(db, { actor: disabled }), /active super admin/);
      await assert.rejects(commit(db, { company: 3 }), /Supplier company/);
      await assert.rejects(commit(db, { company: 4 }), /Supplier company/);
    });
    await t.test('mandatory image must have a matching saved asset manifest', async () => {
      await assert.rejects(commit(db, { details: {} }), /saved product image/);
      await assert.rejects(commit(db, { details: { productImage: image, importedAssets: {} } }), /saved product image/);
      await assert.rejects(commit(db, { details: { productImage: image, importedAssets: {productImage:{url:'wrong'}} } }), /saved product image/);
    });
    let created;
    await t.test('create writes catalogue and retry returns same product without another insert', async () => {
      created = await commit(db);
      assert.equal(created.status, 'created');
      const replay = await commit(db, { details: { ...details, description: 'Retry changed text' } });
      assert.equal(replay.productId, created.productId); assert.equal(replay.replayed, true);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM product')).rows[0].count, 1);
      const product = (await db.query('SELECT * FROM product WHERE id=$1', [created.productId])).rows[0];
      assert.equal(product.details.description, 'Imported lamp');
      assert.deepEqual(product.details.sourceValues, { 'Order Code': 'ABC' });
    });
    await t.test('changed retry identity and unreviewed case-insensitive duplicates are rejected', async () => {
      await assert.rejects(commit(db, { company: 2 }), /identity changed/);
      await assert.rejects(commit(db, { rowId: 'Lamps:5', code: ' abc ' }), /Duplicate detected/);
      await assert.rejects(commit(db, { rowId: 'Lamps:5', decision: 'unresolved' }), /Invalid catalogue import row/);
    });
    await t.test('update requires the reviewed target and current timestamp', async () => {
      const product = (await db.query('SELECT * FROM product WHERE id=$1', [created.productId])).rows[0];
      await assert.rejects(commit(db, {rowId:'Lamps:6',decision:'update',existingId:created.productId,updatedAt:null}), /changed since preview/);
      await assert.rejects(commit(db, {rowId:'Lamps:6',decision:'update',existingId:999,updatedAt:product.updated_at}), /target changed/);
      const updated = await commit(db, {rowId:'Lamps:6',decision:'update',existingId:created.productId,updatedAt:product.updated_at,details:{...details,description:'Updated lamp'}});
      assert.equal(updated.status,'updated'); assert.equal(updated.productId,created.productId);
      assert.equal((await db.query('SELECT details FROM product WHERE id=$1',[created.productId])).rows[0].details.description,'Updated lamp');
    });
    await t.test('same order code in another supplier or category is independent', async () => {
      assert.equal((await commit(db,{company:2,rowId:'Lamps:7'})).status,'created');
      assert.equal((await commit(db,{category:'fixtures',rowId:'Fixtures:4'})).status,'created');
    });
    await t.test('import audit rows use RLS and no authenticated table privileges', async () => {
      const result = await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.catalogue_import_rows'::regclass");
      assert.equal(result.rows[0].relrowsecurity,true);
      const permissions = await db.query("SELECT has_table_privilege('authenticated','public.catalogue_import_rows','SELECT,INSERT,UPDATE,DELETE') AS allowed");
      assert.equal(permissions.rows[0].allowed,false);
    });
  } finally { await db.close(); }
});
