/**
 * Seed script for Focus Earth local development.
 *
 * Run via:  npx tsx supabase/seed.ts
 *
 * Requires a running local Supabase instance (`supabase start`).
 * Uses the service_role key to bypass RLS and create auth users.
 *
 * Environment variables (or fallback to local defaults):
 *   SUPABASE_URL              – default http://127.0.0.1:54321
 *   SUPABASE_SERVICE_ROLE_KEY – from `supabase status`
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "http://127.0.0.1:54321";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_SERVICE_KEY ??
  // Default local dev key from `supabase start`
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "password123";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAuthUser(
  email: string,
  meta: Record<string, string>,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });

  if (!error) return data.user.id;

  // User already exists from a previous seed run — look up their ID
  if (error.message.includes("already been registered") || error.message.includes("already registered")) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw new Error(`createAuthUser lookup(${email}): ${listErr.message}`);
    const existing = list.users.find((u) => u.email === email);
    if (existing) return existing.id;
  }

  throw new Error(`createAuthUser(${email}): ${error.message}`);
}

async function insert<T extends Record<string, unknown>>(
  table: string,
  rows: T | T[],
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows as never, { ignoreDuplicates: true })
    .select();
  if (error) {
    const msg = error?.message || error?.code || error?.details
      || JSON.stringify(error, Object.getOwnPropertyNames(error as object))
      || 'unknown error';
    throw new Error(`insert(${table}): ${msg}`);
  }
  return data as T[];
}

async function update(
  table: string,
  match: Record<string, unknown>,
  fields: Record<string, unknown>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from(table).update(fields as never);
  for (const [k, v] of Object.entries(match)) {
    query = query.eq(k, v);
  }
  const { error } = await query;
  if (error) {
    const msg = error?.message || error?.code || error?.details || JSON.stringify(error) || 'unknown error';
    throw new Error(`update(${table}): ${msg}`);
  }
}

/** Wait for auth trigger to create profile rows before updating them */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Return an ISO date string N months ago with a random day offset */
function monthsAgo(n: number, dayOffset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const USERS = [
  // Admins
  { email: "superadmin@focusearth.com", meta: { first_name: "Focus", last_name: "Admin", phone: "555-0001", type: "SUPERADMIN" } },
  { email: "sysadmin@focusearth.com", meta: { first_name: "Sarah", last_name: "Chen", phone: "555-0002", type: "Sa" } },
  { email: "sysadmin2@focusearth.com", meta: { first_name: "James", last_name: "Wright", phone: "555-0003", type: "Sa" } },
  { email: "admin@focusearth.com", meta: { first_name: "Alex", last_name: "Rivera", phone: "555-0004", type: "Au" } },
  { email: "admin2@focusearth.com", meta: { first_name: "Lisa", last_name: "Park", phone: "555-0005", type: "Au" } },
  // Real Estate
  { email: "reu@focusearth.com", meta: { first_name: "Pete", last_name: "Musser", phone: "555-0010", type: "Reu" } },
  { email: "reu2@focusearth.com", meta: { first_name: "Ben", last_name: "Brown", phone: "555-0011", type: "Reu" } },
  { email: "reu3@focusearth.com", meta: { first_name: "Diana", last_name: "Torres", phone: "555-0012", type: "Reu" } },
  { email: "reu4@focusearth.com", meta: { first_name: "Kevin", last_name: "Patel", phone: "555-0013", type: "Reu" } },
  { email: "reu5@focusearth.com", meta: { first_name: "Maria", last_name: "Garcia", phone: "555-0014", type: "Reu" } },
  // Suppliers
  { email: "su@focusearth.com", meta: { first_name: "Michael", last_name: "Haeflich", phone: "555-0020", type: "Su" } },
  { email: "su2@focusearth.com", meta: { first_name: "Zebin", last_name: "Lin", phone: "555-0021", type: "Su" } },
  { email: "su3@focusearth.com", meta: { first_name: "Rachel", last_name: "Kim", phone: "555-0022", type: "Su" } },
  { email: "su4@focusearth.com", meta: { first_name: "Tom", last_name: "Jackson", phone: "555-0023", type: "Su" } },
  // Electricians
  { email: "eu@focusearth.com", meta: { first_name: "Narek", last_name: "Simonyan", phone: "555-0030", type: "Eu" } },
  { email: "eu2@focusearth.com", meta: { first_name: "Carlos", last_name: "Mendez", phone: "555-0031", type: "Eu" } },
  { email: "eu3@focusearth.com", meta: { first_name: "Jake", last_name: "Wilson", phone: "555-0032", type: "Eu" } },
  // Guests
  { email: "guest@focusearth.com", meta: { first_name: "Dong", last_name: "Ke", phone: "555-0040", type: "Gu" } },
  { email: "guest2@focusearth.com", meta: { first_name: "Amy", last_name: "Nguyen", phone: "555-0041", type: "Gu" } },
  { email: "guest3@focusearth.com", meta: { first_name: "Robert", last_name: "Davis", phone: "555-0042", type: "Gu" } },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding Focus Earth database...\n");

  // ── 1. Create auth users (triggers fn_on_auth_user_created → profile) ──
  console.log("Creating users...");
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const id = await createAuthUser(u.email, u.meta);
    userIds[u.email] = id;
    console.log(`  ✓ ${u.meta.first_name} ${u.meta.last_name} (${u.meta.type}) — ${u.email}`);
  }

  // Enable all profiles and set titles
  // Wait for the auth trigger (fn_on_auth_user_created) to finish
  // creating profile rows before we try to update them.
  console.log("\nWaiting for auth trigger to create profiles...");
  await sleep(3000);

  console.log("Enabling profiles...");
  for (const u of USERS) {
    const uid = userIds[u.email];
    if (!uid) { console.warn(`  ⚠ No ID for ${u.email}, skipping`); continue; }

    // Go through the auth admin API — avoids PostgREST triggers on the profiles table
    const { error } = await supabase.auth.admin.updateUserById(uid, {
      user_metadata: { ...u.meta, enabled: true, title: titleForType(u.meta.type) },
    });

    if (error) {
      console.error(`  ✗ ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✓ ${u.meta.first_name} ${u.meta.last_name}`);
    }
  }

  // Shorthand IDs
  const superadminId = userIds["superadmin@focusearth.com"];
  const sysadminId = userIds["sysadmin@focusearth.com"];
  const sysadmin2Id = userIds["sysadmin2@focusearth.com"];
  const adminId = userIds["admin@focusearth.com"];
  const admin2Id = userIds["admin2@focusearth.com"];
  const reuId = userIds["reu@focusearth.com"];
  const reu2Id = userIds["reu2@focusearth.com"];
  const reu3Id = userIds["reu3@focusearth.com"];
  const reu4Id = userIds["reu4@focusearth.com"];
  const reu5Id = userIds["reu5@focusearth.com"];
  const suId = userIds["su@focusearth.com"];
  const su2Id = userIds["su2@focusearth.com"];
  const su3Id = userIds["su3@focusearth.com"];
  const su4Id = userIds["su4@focusearth.com"];
  const euId = userIds["eu@focusearth.com"];
  const eu2Id = userIds["eu2@focusearth.com"];
  const eu3Id = userIds["eu3@focusearth.com"];
  const guestId = userIds["guest@focusearth.com"];

  // ── 2. Geographic data ─────────────────────────────────────────────────
  console.log("\nSeeding geographic data...");
  const states = await insert("state", [
    { name: "California", abbreviation: "CA" },
    { name: "New York", abbreviation: "NY" },
    { name: "Texas", abbreviation: "TX" },
    { name: "Florida", abbreviation: "FL" },
    { name: "Illinois", abbreviation: "IL" },
    { name: "Washington", abbreviation: "WA" },
    { name: "Arizona", abbreviation: "AZ" },
    { name: "Colorado", abbreviation: "CO" },
    { name: "Georgia", abbreviation: "GA" },
    { name: "Oregon", abbreviation: "OR" },
  ]);
  console.log(`  ✓ ${states.length} states`);

  const stateByAbbr = Object.fromEntries(
    states.map((s: any) => [s.abbreviation, s.id]),
  );

  const cities = await insert("city", [
    { state_id: stateByAbbr["CA"], name: "Los Angeles" },
    { state_id: stateByAbbr["CA"], name: "San Francisco" },
    { state_id: stateByAbbr["CA"], name: "San Diego" },
    { state_id: stateByAbbr["NY"], name: "New York City" },
    { state_id: stateByAbbr["NY"], name: "Buffalo" },
    { state_id: stateByAbbr["TX"], name: "Houston" },
    { state_id: stateByAbbr["TX"], name: "Austin" },
    { state_id: stateByAbbr["TX"], name: "Dallas" },
    { state_id: stateByAbbr["FL"], name: "Miami" },
    { state_id: stateByAbbr["FL"], name: "Orlando" },
    { state_id: stateByAbbr["IL"], name: "Chicago" },
    { state_id: stateByAbbr["WA"], name: "Seattle" },
    { state_id: stateByAbbr["AZ"], name: "Phoenix" },
    { state_id: stateByAbbr["CO"], name: "Denver" },
    { state_id: stateByAbbr["GA"], name: "Atlanta" },
    { state_id: stateByAbbr["OR"], name: "Portland" },
  ]);
  console.log(`  ✓ ${cities.length} cities`);

  // ── 3. Companies ───────────────────────────────────────────────────────
  console.log("\nSeeding companies...");

  const companiesData = [
    {
      owner_id: reuId, admin_user_id: superadminId,
      name: "Focus Earth Real Estate", type: "REU",
      address: "123 Main Street", address2: "Suite 100",
      state: "CA", city: "Los Angeles", zip_code: "90001",
      service_areas: [{ state: "CA", city: "Los Angeles" }, { state: "CA", city: "San Francisco" }],
      company_sub_type: "Commercial Real Estate",
    },
    {
      owner_id: reu3Id, admin_user_id: adminId,
      name: "Pacific Properties Group", type: "REU",
      address: "500 Bay Rd", address2: null,
      state: "CA", city: "San Diego", zip_code: "92101",
      service_areas: [{ state: "CA", city: "San Diego" }, { state: "AZ", city: "Phoenix" }],
      company_sub_type: "Multi-Family",
    },
    {
      owner_id: reu4Id, admin_user_id: admin2Id,
      name: "Lone Star Realty", type: "REU",
      address: "800 Commerce St", address2: "Floor 12",
      state: "TX", city: "Dallas", zip_code: "75201",
      service_areas: [{ state: "TX", city: "Dallas" }, { state: "TX", city: "Houston" }, { state: "TX", city: "Austin" }],
      company_sub_type: "Industrial Real Estate",
    },
    {
      owner_id: reu5Id, admin_user_id: superadminId,
      name: "Sunshine Properties", type: "REU",
      address: "222 Ocean Drive", address2: null,
      state: "FL", city: "Miami", zip_code: "33139",
      service_areas: [{ state: "FL", city: "Miami" }, { state: "FL", city: "Orlando" }],
      company_sub_type: "Hospitality",
    },
    {
      owner_id: suId, admin_user_id: superadminId,
      name: "Bright LED Supplies", type: "SU",
      address: "456 Innovation Blvd", address2: "Building C",
      state: "TX", city: "Houston", zip_code: "77001",
      service_areas: [{ state: "CA" }, { state: "TX" }, { state: "NY" }],
      company_sub_type: "LED Manufacturer",
    },
    {
      owner_id: su3Id, admin_user_id: adminId,
      name: "EcoLux Lighting", type: "SU",
      address: "300 Green Ave", address2: null,
      state: "IL", city: "Chicago", zip_code: "60601",
      service_areas: [{ state: "IL" }, { state: "WI" }, { state: "IN" }, { state: "OH" }],
      company_sub_type: "LED Distributor",
    },
    {
      owner_id: su4Id, admin_user_id: admin2Id,
      name: "NovaBright Technologies", type: "SU",
      address: "1200 Tech Park", address2: "Suite 400",
      state: "WA", city: "Seattle", zip_code: "98101",
      service_areas: [{ state: "WA" }, { state: "OR" }, { state: "CA" }],
      company_sub_type: "Smart Lighting Systems",
    },
    {
      owner_id: euId, admin_user_id: superadminId,
      name: "Volt Electric Services", type: "EU",
      address: "789 Power Ave", address2: null,
      state: "FL", city: "Miami", zip_code: "33101",
      service_areas: [{ state: "FL" }, { state: "GA" }],
      company_sub_type: "Licensed Electrician",
    },
    {
      owner_id: eu2Id, admin_user_id: adminId,
      name: "Spark Solutions Electric", type: "EU",
      address: "450 Circuit Rd", address2: null,
      state: "TX", city: "Austin", zip_code: "78701",
      service_areas: [{ state: "TX" }, { state: "OK" }, { state: "NM" }],
      company_sub_type: "Commercial Electrician",
    },
    {
      owner_id: eu3Id, admin_user_id: admin2Id,
      name: "PowerLine Contractors", type: "EU",
      address: "600 Wire St", address2: "Unit B",
      state: "NY", city: "New York City", zip_code: "10001",
      service_areas: [{ state: "NY" }, { state: "NJ" }, { state: "CT" }, { state: "PA" }],
      company_sub_type: "Industrial Electrician",
    },
  ];

  const defaultPriorities = [
    { name: "Office", percentage: 30, color: "#ec4899" },
    { name: "Industrial", percentage: 20, color: "#f97316" },
    { name: "Retail", percentage: 15, color: "#06b6d4" },
    { name: "Multi Family", percentage: 10, color: "#84cc16" },
    { name: "Hospitality", percentage: 10, color: "#14b8a6" },
    { name: "Parking", percentage: 5, color: "#f59e0b" },
    { name: "Horticulture", percentage: 0, color: "#eab308" },
    { name: "Healthcare", percentage: 5, color: "#3b82f6" },
    { name: "Data Center", percentage: 5, color: "#a855f7" },
    { name: "Other", percentage: 0, color: "#22c55e" },
  ];

  const allCompanies: any[] = [];
  for (const c of companiesData) {
    const [row] = await insert("company", [{
      ...c,
      notes: `Seed company: ${c.name}`,
      image: null,
      property_priorities: defaultPriorities,
      seen: true,
      status: 1,
      website: `${c.name.toLowerCase().replace(/\s+/g, "")}.com`,
      country: "USA",
      is_deleted: false,
    }]);
    allCompanies.push(row);
    console.log(`  ✓ ${c.name} (${c.type})`);
  }

  const companyByName = Object.fromEntries(allCompanies.map((c: any) => [c.name, c]));
  const companyREU = companyByName["Focus Earth Real Estate"];
  const companyREU2 = companyByName["Pacific Properties Group"];
  const companyREU3 = companyByName["Lone Star Realty"];
  const companyREU4 = companyByName["Sunshine Properties"];
  const companySU = companyByName["Bright LED Supplies"];
  const companySU2 = companyByName["EcoLux Lighting"];
  const companySU3 = companyByName["NovaBright Technologies"];
  const companyEU = companyByName["Volt Electric Services"];
  const companyEU2 = companyByName["Spark Solutions Electric"];
  const companyEU3 = companyByName["PowerLine Contractors"];

  // Associate users to companies
  console.log("\nLinking users to companies...");
  await update("profiles", { id: reuId }, { associated_to_company_id: companyREU.id });
  await update("profiles", { id: reu2Id }, { associated_to_company_id: companyREU.id });
  await update("profiles", { id: reu3Id }, { associated_to_company_id: companyREU2.id });
  await update("profiles", { id: reu4Id }, { associated_to_company_id: companyREU3.id });
  await update("profiles", { id: reu5Id }, { associated_to_company_id: companyREU4.id });
  await update("profiles", { id: suId }, { associated_to_company_id: companySU.id });
  await update("profiles", { id: su2Id }, { associated_to_company_id: companySU.id });
  await update("profiles", { id: su3Id }, { associated_to_company_id: companySU2.id });
  await update("profiles", { id: su4Id }, { associated_to_company_id: companySU3.id });
  await update("profiles", { id: euId }, { associated_to_company_id: companyEU.id });
  await update("profiles", { id: eu2Id }, { associated_to_company_id: companyEU2.id });
  await update("profiles", { id: eu3Id }, { associated_to_company_id: companyEU3.id });
  console.log("  ✓ Users linked");

  // ── 4. Projects ────────────────────────────────────────────────────────
  console.log("\nSeeding projects...");
  const projectsData = [
    {
      company_id: companyREU.id, user_id: reuId,
      title: "Downtown Office Retrofit", property_type: "Office", property_size: "45000",
      city: "Los Angeles", state: "CA", zip_code: 90012, status: "in_progress", status_admin: "approved",
      priority_admin: true, cost_per_kilowatt_hour: "0.22", sales_tax: "9.5", operation_days_per_year: 260,
    },
    {
      company_id: companyREU.id, user_id: reuId,
      title: "Industrial Warehouse Upgrade", property_type: "Industrial", property_size: "120000",
      city: "Houston", state: "TX", zip_code: 77049, status: "new", status_admin: "pending",
      priority_admin: false, cost_per_kilowatt_hour: "0.11", sales_tax: "8.25", operation_days_per_year: 365,
    },
    {
      company_id: companyREU.id, user_id: reu2Id,
      title: "Hospitality Lobby Renovation", property_type: "Hospitality", property_size: "8000",
      city: "Miami", state: "FL", zip_code: 33139, status: "proposal", status_admin: "approved",
      priority_admin: false, cost_per_kilowatt_hour: "0.13", sales_tax: "7.0", operation_days_per_year: 365,
    },
    {
      company_id: companyREU2.id, user_id: reu3Id,
      title: "San Diego Retail Complex", property_type: "Retail", property_size: "32000",
      city: "San Diego", state: "CA", zip_code: 92101, status: "in_progress", status_admin: "approved",
      priority_admin: true, cost_per_kilowatt_hour: "0.20", sales_tax: "8.75", operation_days_per_year: 365,
    },
    {
      company_id: companyREU2.id, user_id: reu3Id,
      title: "Phoenix Multi-Family Housing", property_type: "Multi Family", property_size: "65000",
      city: "Phoenix", state: "AZ", zip_code: 85001, status: "proposal", status_admin: "approved",
      priority_admin: false, cost_per_kilowatt_hour: "0.12", sales_tax: "5.6", operation_days_per_year: 365,
    },
    {
      company_id: companyREU3.id, user_id: reu4Id,
      title: "Dallas Data Center LED Upgrade", property_type: "Data Center", property_size: "55000",
      city: "Dallas", state: "TX", zip_code: 75201, status: "in_progress", status_admin: "approved",
      priority_admin: true, cost_per_kilowatt_hour: "0.09", sales_tax: "8.25", operation_days_per_year: 365,
    },
    {
      company_id: companyREU3.id, user_id: reu4Id,
      title: "Houston Medical Center Lighting", property_type: "Healthcare", property_size: "42000",
      city: "Houston", state: "TX", zip_code: 77030, status: "new", status_admin: "pending",
      priority_admin: false, cost_per_kilowatt_hour: "0.11", sales_tax: "8.25", operation_days_per_year: 365,
    },
    {
      company_id: companyREU4.id, user_id: reu5Id,
      title: "Miami Beach Resort Retrofit", property_type: "Hospitality", property_size: "28000",
      city: "Miami", state: "FL", zip_code: 33140, status: "in_progress", status_admin: "approved",
      priority_admin: false, cost_per_kilowatt_hour: "0.13", sales_tax: "7.0", operation_days_per_year: 365,
    },
    {
      company_id: companyREU4.id, user_id: reu5Id,
      title: "Orlando Parking Garage Lights", property_type: "Parking", property_size: "18000",
      city: "Orlando", state: "FL", zip_code: 32801, status: "completed", status_admin: "approved",
      priority_admin: false, cost_per_kilowatt_hour: "0.12", sales_tax: "7.0", operation_days_per_year: 365,
    },
    {
      company_id: companyREU.id, user_id: reuId,
      title: "Chicago Office Tower Phase 1", property_type: "Office", property_size: "78000",
      city: "Chicago", state: "IL", zip_code: 60601, status: "proposal", status_admin: "approved",
      priority_admin: true, cost_per_kilowatt_hour: "0.14", sales_tax: "10.25", operation_days_per_year: 260,
    },
    {
      company_id: companyREU2.id, user_id: reu3Id,
      title: "Seattle Warehouse Conversion", property_type: "Industrial", property_size: "95000",
      city: "Seattle", state: "WA", zip_code: 98101, status: "new", status_admin: "pending",
      priority_admin: false, cost_per_kilowatt_hour: "0.10", sales_tax: "10.1", operation_days_per_year: 365,
    },
    {
      company_id: companyREU3.id, user_id: reu4Id,
      title: "Austin Tech Campus Retrofit", property_type: "Office", property_size: "110000",
      city: "Austin", state: "TX", zip_code: 78701, status: "in_progress", status_admin: "approved",
      priority_admin: true, cost_per_kilowatt_hour: "0.10", sales_tax: "8.25", operation_days_per_year: 260,
    },
  ];

  // Full luminaire records (Airtable-style), reused across areas where the
  // same physical fixture spec appears in multiple areas.
  const surfaceGarageLuminaire = {
    id: "b872abf6-325e-480f-8160-de901d9913fe",
    qty: "200",
    ledType: false,
    areaName: "Parking Lot",
    airtableId: "rec3UAgmM11UYVH18",
    controlType: "Daylight Sensor",
    fixtureLens: "Frosted",
    lampWattage: "36",
    controlModel: "O9484",
    fixtureDepth: "12",
    fixtureMount: "Surface",
    fixtureStyle: "Garage",
    fixtureWidth: "24",
    lampCategory: "T Series",
    lampExisting: {
      CRI: "85",
      Name: "T8 32W",
      Type: "T8",
      Notes: "Additional reference: https://www.homedepot.com/p/Philips-32-Watt-48-in-Alto-Linear-T8-Type-A-Fluorescent-Tube-Light-Bulb-Cool-White-4100K-10-Pack-479709/303811630",
      "PPU ($)": 4.17,
      wattage: 36,
      Category: "T Series (Tubular)",
      "Base Type": "Medium Bipin",
      Application: "Outdoor, Indoor, Garage, Other",
      "Wattage MAX": 32,
      "Wattage MIN": 32,
      "Base Category": "Fluorescent Pin",
      "Category-Type": "T Series (Tubular)-T8",
      "Lifetime (hrs)": 24000,
      "Base Category-Type": "Fluorescent Pin-Medium Bipin",
      "Directional Lumens": "1,560",
      "Recycling Cost ($)": 0.25,
      "Mercury/System (mg)": 10,
      "Resource Hyperlinks": "https://www.amazon.com/Philips-281550-F32T8-TL841-ALTO-32-Watt-T8-lumens-2-950-4100K/dp/B00913IAN6/ref=pd_day0fbt_hardlines_d_sccl_1/134-4288916-6118539?pd_rd_w=HiDzX&content-id=amzn1.sym.06aea998-aa9c-454e-b467-b476407c7977&pf_rd_p=06aea998-aa9c-454e-b467-b476407c7977&pf_rd_r=FKS72NV4HQ257GNA5JGM&pd_rd_wg=hQilP&pd_rd_r=cabb73e7-0372-4d90-b436-83e7f376701f&pd_rd_i=B00913IAN6&th=1",
      "Installation Time (hrs)": 0.04,
      "Installation Time (min)": 2,
      "Dimensions - Width (inches)": "1",
      "Dimensions - Length (inches)": "48",
    },
    lampLensType: "Frosted",
    fixtureLength: "48",
    accessoryTypeA: "Protective Lens Cover",
    accessoryTypeB: "",
    accessoryTypeC: "",
    controlDimming: "50%",
    lampPerFixture: "2",
    accessoryColorA: "Black",
    accessoryColorB: "",
    accessoryColorC: "",
    accessoryDepthA: "",
    accessoryDepthB: "",
    accessoryDepthC: "",
    accessoryWidthA: "24",
    accessoryWidthB: "",
    accessoryWidthC: "",
    controlExisting: {
      Name: "timer",
      Type: "Timer",
      "PPU ($)": 14,
      wattage: 0,
      "Lifetime (hrs)": 45000,
      "Recycling Cost ($)": 0.75,
      "Installation Time (hrs)": 0.2,
      "Installation Time (min)": 12,
    },
    controlRecordId: "",
    fixtureDiameter: "",
    fixtureExisting: {
      Name: "test",
      Mount: "Suspended",
      Style: "Troffer",
      "PPU ($)": 5,
      wattage: 0,
      Application: "Outdoor, Indoor, Garage, Other",
      "Depth MAX (in)": 120,
      "Depth MIN (in)": 0.1,
      "Lifetime (hrs)": 10000,
      "Width MAX (in)": 120,
      "Width MIN (in)": 0.1,
      "Length MAX (in)": 120,
      "Length MIN (in)": 0.1,
      "Diameter MAX (in)": 120,
      "Diameter MIN (in)": 0.1,
      "Recycling Cost ($)": 0.33,
      "Installation Time (hrs)": 0.25,
      "Installation Time (min)": 15,
    },
    lampDescription: "T Series T8 Fluorescent Pin Medium Bipin 36W 5000K T83650K",
    lampProductCode: "T83650K",
    powerQTYFixture: ".25",
    powerSupplyType: "Emergency",
    accessoryLengthA: "48",
    accessoryLengthB: "",
    accessoryLengthC: "",
    lampBaseCategory: "Fluorescent Pin",
    lampCategoryType: "T8",
    lampPricePerUnit: "5",
    powerSupplyModel: "E Series",
    accessoryExisting: {
      Name: "test",
      "PPU ($)": 5,
      wattage: 0,
      "Depth MAX (in)": "120",
      "Depth MIN (in)": 0.01,
      "Lifetime (hrs)": 30000,
      "Width MAX (in)": 120,
      "Width MIN (in)": 0.1,
      "Length MAX (in)": 120,
      "Length MIN (in)": 0.01,
      "Diameter MAX (in)": "120",
      "Diameter MIN (in)": 0.01,
      "Recycling Cost ($)": 0.33,
      "Installation Time (hrs)": 0.13,
      "Installation Time (min)": 8,
    },
    accessoryRecordId: "",
    controlQTYFixture: ".5",
    powerPricePerUnit: "5",
    accessoryDiameterA: "",
    accessoryDiameterB: "",
    accessoryDiameterC: "",
    controlDescription: "Daylight Sensor Photo Sense Ltd. 50% O9484",
    fixtureApplication: "Garage",
    fixtureDescription: "\"48\"x\"24\"x12 Surface Garage",
    fixtureMountHeight: "12",
    illuminationReport: null,
    controlManufacturer: "Photo Sense Ltd.",
    controlPricePerUnit: "5",
    fixturePricePerUnit: "10",
    powerSupplyExisting: {
      Name: "standard",
      Type: "Standard, Other",
      "PPU ($)": 10,
      wattage: 0,
      "Added Wattage": 3,
      "Lifetime (hrs)": 45000,
      "Recycling Cost ($)": 1,
      "Installation Time (hrs)": 0.13,
      "Installation Time (min)": 8,
    },
    lampBaseCategoryType: "Medium Bipin",
    lampColorTemperature: "5000",
    accessoryDescriptionA: "Protective Lens Cover Protecz Unltd. Black B4948",
    accessoryDescriptionB: "",
    accessoryDescriptionC: "",
    accessoryProductCodeA: "B4948",
    accessoryProductCodeB: "",
    accessoryProductCodeC: "",
    accessoryManufacturerA: "Protecz Unltd.",
    accessoryManufacturerB: "",
    accessoryManufacturerC: "",
    accessoryPricePerUnitA: "5",
    accessoryPricePerUnitB: "",
    accessoryPricePerUnitC: "",
    powerSupplyDescription: "Emergency Emergent Corp. E Series-E2984",
    powerSupplyProductCode: "E2984",
    powerSupplyManufacturer: "Emergent Corp.",
    accessoryDescriptionAQty: "1",
    accessoryDescriptionBQty: "",
    accessoryDescriptionCQty: "",
    wattage: "36",
  };

  const recessedCanLuminaire = {
    id: "765657ea-13c7-4c5b-8877-6aa96771e182",
    qty: "75",
    ledType: false,
    areaName: "Front Desk",
    airtableId: "rec5y9xcuxf7yeW3t",
    controlType: "Daylight Sensor",
    fixtureLens: "Frosted",
    lampWattage: "100",
    controlModel: "CTY-029",
    fixtureDepth: "12",
    fixtureMount: "Recessed",
    fixtureStyle: "Can",
    fixtureWidth: "15",
    lampCategory: "PAR Series (Parabolic Aluminized Reflector)",
    lampExisting: {
      CRI: "80",
      Name: "PAR36 100W",
      Type: "PAR36",
      Notes: "Exact base type: Screw Terminal  ",
      "PPU ($)": 6.97,
      wattage: 100,
      Category: "PAR Series (Parabolic Aluminized Reflector)",
      "Base Type": "Screw Terminal M-P",
      Application: "Outdoor, Indoor, Garage, Other",
      "Wattage MAX": 50,
      "Wattage MIN": 50,
      "Base Category": "Specialty",
      "Category-Type": "PAR Series (Parabolic Aluminized Reflector)-PAR36",
      "Lifetime (hrs)": 25,
      "Base Category-Type": "Specialty-Screw Terminal M-P",
      "Recycling Cost ($)": 0.25,
      "Mercury/System (mg)": 0,
      "Resource Hyperlinks": "https://www.1000bulbs.com/product/96205/AIRL-4509.html",
      "Installation Time (hrs)": 0.04,
      "Installation Time (min)": 2,
      "Dimensions - Width (inches)": "4.4",
      "Dimensions - Length (inches)": "2.4",
    },
    lampLensType: "Frosted",
    fixtureLength: "14",
    accessoryTypeA: "Protective Lens Cover",
    accessoryTypeB: "",
    accessoryTypeC: "",
    controlDimming: "13",
    lampPerFixture: "1",
    accessoryColorA: "Blue",
    accessoryColorB: "",
    accessoryColorC: "",
    accessoryDepthA: "13",
    accessoryDepthB: "",
    accessoryDepthC: "",
    accessoryWidthA: "12",
    accessoryWidthB: "",
    accessoryWidthC: "",
    controlExisting: {
      Name: "timer",
      Type: "Timer",
      "PPU ($)": 14,
      wattage: 0,
      "Lifetime (hrs)": 45000,
      "Recycling Cost ($)": 0.75,
      "Installation Time (hrs)": 0.2,
      "Installation Time (min)": 12,
    },
    controlRecordId: "",
    fixtureDiameter: "6",
    fixtureExisting: {
      Name: "test",
      Mount: "Suspended",
      Style: "Troffer",
      "PPU ($)": 5,
      wattage: 0,
      Application: "Outdoor, Indoor, Garage, Other",
      "Depth MAX (in)": 120,
      "Depth MIN (in)": 0.1,
      "Lifetime (hrs)": 10000,
      "Width MAX (in)": 120,
      "Width MIN (in)": 0.1,
      "Length MAX (in)": 120,
      "Length MIN (in)": 0.1,
      "Diameter MAX (in)": 120,
      "Diameter MIN (in)": 0.1,
      "Recycling Cost ($)": 0.33,
      "Installation Time (hrs)": 0.25,
      "Installation Time (min)": 15,
    },
    lampDescription: "PAR Series (Parabolic Aluminized Reflector) PAR36 Screw E-26 100W 3500K PAR3610035K",
    lampProductCode: "PAR3610035K",
    powerQTYFixture: "1",
    powerSupplyType: "Standard",
    accessoryLengthA: "13",
    accessoryLengthB: "",
    accessoryLengthC: "",
    lampBaseCategory: "Screw",
    lampCategoryType: "PAR36",
    lampPricePerUnit: "5",
    powerSupplyModel: "P Series",
    accessoryExisting: {
      Name: "test",
      "PPU ($)": 5,
      wattage: 0,
      "Depth MAX (in)": "120",
      "Depth MIN (in)": 0.01,
      "Lifetime (hrs)": 30000,
      "Width MAX (in)": 120,
      "Width MIN (in)": 0.1,
      "Length MAX (in)": 120,
      "Length MIN (in)": 0.01,
      "Diameter MAX (in)": "120",
      "Diameter MIN (in)": 0.01,
      "Recycling Cost ($)": 0.33,
      "Installation Time (hrs)": 0.13,
      "Installation Time (min)": 8,
    },
    accessoryRecordId: "",
    controlQTYFixture: "12",
    powerPricePerUnit: "5",
    accessoryDiameterA: "12",
    accessoryDiameterB: "",
    accessoryDiameterC: "",
    controlDescription: "Daylight Sensor PS INC. 13 CTY-029",
    fixtureApplication: "Indoor",
    fixtureDescription: "\"14\"x\"15\"x6x12 Recessed Can",
    fixtureMountHeight: "18",
    illuminationReport: null,
    controlManufacturer: "PS INC.",
    controlPricePerUnit: "25",
    fixturePricePerUnit: "5",
    powerSupplyExisting: {
      Name: "standard",
      Type: "Standard, Other",
      "PPU ($)": 10,
      wattage: 0,
      "Added Wattage": 3,
      "Lifetime (hrs)": 45000,
      "Recycling Cost ($)": 1,
      "Installation Time (hrs)": 0.13,
      "Installation Time (min)": 8,
    },
    lampBaseCategoryType: "E-26",
    lampColorTemperature: "3500",
    accessoryDescriptionA: "Protective Lens Cover PSI INC Blue PC-0020",
    accessoryDescriptionB: "",
    accessoryDescriptionC: "",
    accessoryProductCodeA: "PC-0020",
    accessoryProductCodeB: "",
    accessoryProductCodeC: "",
    accessoryManufacturerA: "PSI INC",
    accessoryManufacturerB: "",
    accessoryManufacturerC: "",
    accessoryPricePerUnitA: "16",
    accessoryPricePerUnitB: "",
    accessoryPricePerUnitC: "",
    powerSupplyDescription: "Standard PS Inc. P Series-P48509",
    powerSupplyProductCode: "P48509",
    powerSupplyManufacturer: "PS Inc.",
    accessoryDescriptionAQty: "3",
    accessoryDescriptionBQty: "",
    accessoryDescriptionCQty: "",
    wattage: "100",
  };

  const defaultAreas = [
    {
      id: "d7c8db56-04d4-47c6-a129-3c17d286824a",
      airtableId: "recFdmGsz9cU8ZcwY",
      image: "avatar374146-lobby-copy.jpg",
      title: "Front Desk",
      application: "Indoor",
      ceiling_height: "18",
      ceilingHeight: "18",
      daily_usage: "24",
      dailyUsage: "24",
      area_sqft: "10000",
      areaSqFt: "10000",
      voltage: "120V",
      dimming: "",
      installation_surface: "Wood",
      installationSurface: "Wood",
      control_type: "Wall Switch",
      controlType: "Wall Switch",
      ingress_protection: "IP 54",
      ingressProtection: "IP 54",
      illuminationReport: null,
      notes: "soften the scene",
      luminaires: [surfaceGarageLuminaire, recessedCanLuminaire],
    },
    {
      id: "469b39aa-d58a-431b-914f-49bbb0166595",
      airtableId: "rec23dE2ktEMTnZLt",
      image: "avatar186228-garage-parking.png",
      title: "Parking Lot",
      application: "Garage",
      ceiling_height: "14",
      ceilingHeight: "14",
      daily_usage: "24",
      dailyUsage: "24",
      area_sqft: "100000",
      areaSqFt: "100000",
      voltage: "120V",
      dimming: "",
      installation_surface: "Concrete",
      installationSurface: "Concrete",
      control_type: "Photocell",
      controlType: "Photocell",
      ingress_protection: "IP 65",
      ingressProtection: "IP 65",
      illuminationReport: null,
      notes: "Sensors near the pay stations",
      luminaires: [surfaceGarageLuminaire],
    },
  ];

  const projects: any[] = [];
  for (const p of projectsData) {
    const [row] = await insert("project", [{
      ...p,
      address: `${Math.floor(Math.random() * 9000) + 100} ${p.title.split(" ")[0]} St`,
      address2: null,
      areas: defaultAreas,
      notes: { general: `Seed project: ${p.title}` },
      bidding: false,
      archived: false,
    }]);
    projects.push(row);
    console.log(`  ✓ ${p.title}`);
  }

  // Link users to projects
  await insert("user_project", projects.map((p: any, i: number) => ({
    user_id: projectsData[i].user_id,
    project_id: p.id,
  })));

  // ── 5. Reports ─────────────────────────────────────────────────────────
  console.log("\nSeeding reports...");

  // ProposalItem[] shape the calculate-report edge function reads.
  // custom_pricing is null on all reports so the calculation runs.
  const seedProposal = [
    {
      title: "Front Desk",
      application: "Indoor",
      dailyUsage: "24",
      areaSqFt: "10000",
      controlType: "Wall Switch",
      luminaires: [
        {
          qty: "200",
          lampPerFixture: "2",
          lampWattage: "36",
          lampPricePerUnit: "5",
          powerPricePerUnit: "5",
          controlDescription: "None",
          lampExisting: {
            CRI: "85",
            "Directional Lumens": "1560",
            "Lifetime (hrs)": 24000,
            "Installation Time (hrs)": 0.04,
            "Installation Time (min)": 2,
            "Mercury/System (mg)": 10,
            "PPU ($)": 4.17,
          },
          powerSupplyExisting: {
            "Expected Lifetime (Hours)": 45000,
            "PPU ($)": 10,
          },
          recommendedFixtureQty: "200",
          recommendedLampQty: "1",
          recommendedLamp: {
            Wattage: "18",
            Lumens: "2200",
            CRI: "85",
            "L70 Lifetime (hours)": "50000",
            "Price Per Unit ($)": "22.00",
            "Volume Tier 1 PPU ($)": "19.50",
            "Volume Tier 2 PPU ($)": "17.00",
            "Approx. Installation Time (minutes)": "10",
            "Approx. Delivery (days)": "14",
            controlRecomendedDescription: "None",
            "Color Tunable": "No",
          },
          recommendedPowerSupply: { "Price Per Unit ($)": "0", "L70 Lifetime (hours)": "0" },
        },
        {
          qty: "75",
          lampPerFixture: "1",
          lampWattage: "100",
          lampPricePerUnit: "5",
          powerPricePerUnit: "5",
          controlDescription: "None",
          lampExisting: {
            CRI: "80",
            "Directional Lumens": "1200",
            "Lifetime (hrs)": 25,
            "Installation Time (hrs)": 0.04,
            "Installation Time (min)": 2,
            "Mercury/System (mg)": 0,
            "PPU ($)": 6.97,
          },
          powerSupplyExisting: {
            "Expected Lifetime (Hours)": 45000,
            "PPU ($)": 10,
          },
          recommendedFixtureQty: "75",
          recommendedLampQty: "1",
          recommendedLamp: {
            Wattage: "10",
            Lumens: "1000",
            CRI: "90",
            "L70 Lifetime (hours)": "50000",
            "Price Per Unit ($)": "35.00",
            "Volume Tier 1 PPU ($)": "31.00",
            "Volume Tier 2 PPU ($)": "27.00",
            "Approx. Installation Time (minutes)": "8",
            "Approx. Delivery (days)": "7",
            controlRecomendedDescription: "None",
            "Color Tunable": "No",
          },
          recommendedPowerSupply: { "Price Per Unit ($)": "0", "L70 Lifetime (hours)": "0" },
        },
      ],
    },
    {
      title: "Parking Lot",
      application: "Garage",
      dailyUsage: "24",
      areaSqFt: "100000",
      controlType: "Photocell",
      luminaires: [
        {
          qty: "200",
          lampPerFixture: "2",
          lampWattage: "36",
          lampPricePerUnit: "5",
          powerPricePerUnit: "5",
          controlDescription: "Photocell",
          lampExisting: {
            CRI: "85",
            "Directional Lumens": "1560",
            "Lifetime (hrs)": 24000,
            "Installation Time (hrs)": 0.04,
            "Installation Time (min)": 2,
            "Mercury/System (mg)": 10,
            "PPU ($)": 4.17,
          },
          powerSupplyExisting: {
            "Expected Lifetime (Hours)": 45000,
            "PPU ($)": 10,
          },
          recommendedFixtureQty: "200",
          recommendedLampQty: "1",
          recommendedLamp: {
            Wattage: "40",
            Lumens: "4000",
            CRI: "80",
            "L70 Lifetime (hours)": "100000",
            "Price Per Unit ($)": "45.00",
            "Volume Tier 1 PPU ($)": "40.00",
            "Volume Tier 2 PPU ($)": "35.00",
            "Approx. Installation Time (minutes)": "20",
            "Approx. Delivery (days)": "7",
            controlRecomendedDescription: "Photocell",
            "Color Tunable": "No",
          },
          recommendedPowerSupply: { "Price Per Unit ($)": "0", "L70 Lifetime (hours)": "0" },
        },
      ],
    },
  ];

  const reportsData = [
    { project_idx: 0, created_by: reuId, status: "active", name: "Office Retrofit Proposal A", system_price: "145000", led_price: "98000", approved: true, active: true },
    { project_idx: 0, created_by: suId, status: "active", name: "Office Retrofit Proposal B", system_price: "172000", led_price: "118000", approved: false, active: true },
    { project_idx: 1, created_by: reuId, status: "draft", name: "Warehouse High-Bay Proposal", system_price: "225000", led_price: "180000", approved: false, active: true },
    { project_idx: 2, created_by: reu2Id, status: "active", name: "Lobby Lighting Plan", system_price: "38000", led_price: "25000", approved: true, active: true },
    { project_idx: 3, created_by: reu3Id, status: "active", name: "Retail LED Replacement", system_price: "85000", led_price: "62000", approved: true, active: true },
    { project_idx: 4, created_by: reu3Id, status: "active", name: "Multi-Family Common Areas", system_price: "112000", led_price: "78000", approved: false, active: true },
    { project_idx: 5, created_by: reu4Id, status: "active", name: "Data Center Efficiency Plan", system_price: "195000", led_price: "145000", approved: true, active: true },
    { project_idx: 6, created_by: reu4Id, status: "draft", name: "Medical Center Initial Assessment", system_price: "155000", led_price: "110000", approved: false, active: true },
    { project_idx: 7, created_by: reu5Id, status: "active", name: "Resort Ambient Lighting", system_price: "72000", led_price: "48000", approved: true, active: true },
    { project_idx: 8, created_by: reu5Id, status: "active", name: "Parking LED Conversion", system_price: "45000", led_price: "32000", approved: true, active: true },
    { project_idx: 9, created_by: reuId, status: "active", name: "Chicago Tower Phase 1", system_price: "280000", led_price: "195000", approved: false, active: true },
    { project_idx: 10, created_by: reu3Id, status: "draft", name: "Warehouse Conversion Prelim", system_price: "165000", led_price: "120000", approved: false, active: true },
    { project_idx: 11, created_by: reu4Id, status: "active", name: "Austin Campus Retrofit Plan", system_price: "320000", led_price: "240000", approved: true, active: true },
  ];

  const reports: any[] = [];
  for (let i = 0; i < reportsData.length; i++) {
    const r = reportsData[i];
    const [row] = await insert("report", [{
      project_id: projects[r.project_idx].id,
      created_by_id: r.created_by,
      status: r.status,
      notes: `Seed report: ${r.name}`,
      sort_id: i + 1,
      proposal: seedProposal,
      custom_pricing: null,
      proposal_name: r.name,
      system_price: r.system_price,
      led_price: r.led_price,
      cost_year: "3.0",
      payback: "2.5",
      bidding: false,
      etadays: "30",
      rebates: String(Math.floor(Number(r.system_price) * 0.08)),
      shipping: String(Math.floor(Number(r.system_price) * 0.025)),
      tax: "8.5",
      kwreduced: String(10000 + i * 5000),
      approved: r.approved,
      active: r.active,
    }]);
    reports.push(row);
    console.log(`  ✓ ${r.name}`);
  }

  // ── 6. Estimates ───────────────────────────────────────────────────────
  console.log("\nSeeding estimates...");

  // --- REU Estimates ---
  const reuEstimatesData = [
    { report_idx: 0, company: companyREU, user_reu: reuId, admin: adminId, ref: "REU-2026-001", is_order: true, fulfilled: false, created: monthsAgo(5) },
    { report_idx: 3, company: companyREU, user_reu: reu2Id, admin: adminId, ref: "REU-2026-002", is_order: true, fulfilled: true, created: monthsAgo(4) },
    { report_idx: 4, company: companyREU2, user_reu: reu3Id, admin: admin2Id, ref: "REU-2026-003", is_order: true, fulfilled: true, created: monthsAgo(3) },
    { report_idx: 5, company: companyREU2, user_reu: reu3Id, admin: adminId, ref: "REU-2026-004", is_order: false, fulfilled: false, created: monthsAgo(3, 10) },
    { report_idx: 6, company: companyREU3, user_reu: reu4Id, admin: superadminId, ref: "REU-2026-005", is_order: true, fulfilled: false, created: monthsAgo(2) },
    { report_idx: 7, company: companyREU3, user_reu: reu4Id, admin: admin2Id, ref: "REU-2026-006", is_order: false, fulfilled: false, created: monthsAgo(2, 5) },
    { report_idx: 8, company: companyREU4, user_reu: reu5Id, admin: superadminId, ref: "REU-2026-007", is_order: true, fulfilled: true, created: monthsAgo(1) },
    { report_idx: 9, company: companyREU4, user_reu: reu5Id, admin: adminId, ref: "REU-2026-008", is_order: true, fulfilled: true, created: monthsAgo(1, 10) },
    { report_idx: 10, company: companyREU, user_reu: reuId, admin: adminId, ref: "REU-2026-009", is_order: false, fulfilled: false, created: monthsAgo(0, -5) },
    { report_idx: 12, company: companyREU3, user_reu: reu4Id, admin: admin2Id, ref: "REU-2026-010", is_order: true, fulfilled: false, created: monthsAgo(0) },
    // Extra spread across months
    { report_idx: 2, company: companyREU, user_reu: reuId, admin: adminId, ref: "REU-2025-011", is_order: false, fulfilled: false, created: monthsAgo(6) },
    { report_idx: 11, company: companyREU2, user_reu: reu3Id, admin: adminId, ref: "REU-2025-012", is_order: false, fulfilled: false, created: monthsAgo(7) },
  ];

  const reuEstimates: any[] = [];
  for (const e of reuEstimatesData) {
    const [row] = await insert("estimate_reu", [{
      report_id: reports[e.report_idx].id,
      company_id: e.company.id,
      user_reu_id: e.user_reu,
      user_admin_consultant_id: e.admin,
      reference: e.ref,
      reu_approved: e.is_order,
      reu_signature: e.is_order ? "Signed" : null,
      reu_signature_date: e.is_order ? "2026-01-10" : null,
      admin_signature: e.is_order ? "Admin Signed" : null,
      admin_signature_date: e.is_order ? "2026-01-12" : null,
      reu_notes: `Seed estimate ${e.ref}`,
      sales_tax: "8.5",
      rebates: "5000",
      shipping: "2000",
      deposit_amount: "10000",
      deposit_due: "Net 15",
      remainder_due: "Net 30",
      remainder_amount: "30000",
      is_order: e.is_order,
      is_estimate: true,
      is_shipping: e.is_order,
      shipping_status: e.is_order ? "delivered" : null,
      is_invoice: e.fulfilled,
      is_receipt: e.fulfilled,
      marked_fulfilled: e.fulfilled,
      archived: false,
      created_at: e.created,
      luminaires: [
        { name: "LED Panel", quantity: 20 + Math.floor(Math.random() * 30), wattage: "40", unit_price: "185" },
        { name: "Downlight", quantity: 10 + Math.floor(Math.random() * 20), wattage: "15", unit_price: "95" },
      ],
    }]);
    reuEstimates.push(row);
    console.log(`  ✓ ${e.ref} (REU - ${e.is_order ? "order" : "estimate"}${e.fulfilled ? ", fulfilled" : ""})`);
  }

  // --- SU Estimates ---
  const suEstimatesData = [
    { report_idx: 0, company: companySU, reu_est_idx: 0, user_su: suId, user_reu: reuId, admin: adminId, ref: "SU-2026-001", is_order: true, fulfilled: false, created: monthsAgo(5, 2) },
    { report_idx: 3, company: companySU, reu_est_idx: 1, user_su: suId, user_reu: reu2Id, admin: adminId, ref: "SU-2026-002", is_order: true, fulfilled: true, created: monthsAgo(4, 3) },
    { report_idx: 4, company: companySU2, reu_est_idx: 2, user_su: su3Id, user_reu: reu3Id, admin: admin2Id, ref: "SU-2026-003", is_order: true, fulfilled: true, created: monthsAgo(3, 2) },
    { report_idx: 5, company: companySU2, reu_est_idx: 3, user_su: su3Id, user_reu: reu3Id, admin: adminId, ref: "SU-2026-004", is_order: false, fulfilled: false, created: monthsAgo(3, 12) },
    { report_idx: 6, company: companySU, reu_est_idx: 4, user_su: su2Id, user_reu: reu4Id, admin: superadminId, ref: "SU-2026-005", is_order: true, fulfilled: false, created: monthsAgo(2, 3) },
    { report_idx: 8, company: companySU3, reu_est_idx: 6, user_su: su4Id, user_reu: reu5Id, admin: superadminId, ref: "SU-2026-006", is_order: true, fulfilled: true, created: monthsAgo(1, 2) },
    { report_idx: 9, company: companySU3, reu_est_idx: 7, user_su: su4Id, user_reu: reu5Id, admin: adminId, ref: "SU-2026-007", is_order: true, fulfilled: true, created: monthsAgo(1, 12) },
    { report_idx: 12, company: companySU, reu_est_idx: 9, user_su: suId, user_reu: reu4Id, admin: admin2Id, ref: "SU-2026-008", is_order: true, fulfilled: false, created: monthsAgo(0, 2) },
    { report_idx: 1, company: companySU, reu_est_idx: null, user_su: suId, user_reu: reuId, admin: adminId, ref: "SU-2025-099", is_order: false, fulfilled: false, created: monthsAgo(8) },
    { report_idx: 2, company: companySU2, reu_est_idx: 10, user_su: su3Id, user_reu: reuId, admin: adminId, ref: "SU-2026-009", is_order: false, fulfilled: false, created: monthsAgo(6, 2) },
    { report_idx: 10, company: companySU, reu_est_idx: 8, user_su: su2Id, user_reu: reuId, admin: adminId, ref: "SU-2026-010", is_order: false, fulfilled: false, created: monthsAgo(0, -3) },
  ];

  const suEstimates: any[] = [];
  for (const e of suEstimatesData) {
    const [row] = await insert("estimate", [{
      report_id: reports[e.report_idx].id,
      company_id: e.company.id,
      estimate_reu_id: e.reu_est_idx !== null ? reuEstimates[e.reu_est_idx].id : null,
      user_su_id: e.user_su,
      user_reu_id: e.user_reu,
      user_admin_consultant_id: e.admin,
      reference: e.ref,
      su_approved: e.is_order,
      su_signature: e.is_order ? "Signed" : null,
      su_signature_date: e.is_order ? "2026-01-11" : null,
      admin_signature: e.is_order ? "Admin Signed" : null,
      admin_signature_date: e.is_order ? "2026-01-12" : null,
      su_notes: `Seed estimate ${e.ref}`,
      sales_tax: "8.5",
      rebates: "3000",
      shipping: "1500",
      deposit_amount: "8000",
      deposit_due: "Net 15",
      remainder_due: "Net 30",
      remainder_amount: "24000",
      is_order: e.is_order,
      is_estimate: true,
      is_shipping: e.fulfilled,
      is_invoice: e.fulfilled,
      is_receipt: e.fulfilled,
      marked_fulfilled: e.fulfilled,
      archived: e.ref === "SU-2025-099",
      order_uid: e.is_order ? `ORD-${e.ref}` : null,
      created_at: e.created,
      luminaires: [
        { name: "LED Panel", quantity: 15 + Math.floor(Math.random() * 25), wattage: "40", unit_price: "185" },
      ],
    }]);
    suEstimates.push(row);
    console.log(`  ✓ ${e.ref} (SU - ${e.is_order ? "order" : "estimate"}${e.fulfilled ? ", fulfilled" : ""})`);
  }

  // --- EU Estimates + Electrician Bids ---
  console.log("\nSeeding electrician estimates and bids...");
  const euEstimatesData = [
    { project_idx: 0, company: companyEU, user: euId, reu_est_idx: 0 },
    { project_idx: 3, company: companyEU, user: euId, reu_est_idx: 2 },
    { project_idx: 5, company: companyEU2, user: eu2Id, reu_est_idx: 4 },
    { project_idx: 7, company: companyEU, user: euId, reu_est_idx: 6 },
    { project_idx: 8, company: companyEU, user: euId, reu_est_idx: 7 },
    { project_idx: 3, company: companyEU2, user: eu2Id, reu_est_idx: 2 },
    { project_idx: 0, company: companyEU3, user: eu3Id, reu_est_idx: 0 },
    { project_idx: 11, company: companyEU2, user: eu2Id, reu_est_idx: 9 },
    { project_idx: 5, company: companyEU3, user: eu3Id, reu_est_idx: 4 },
    { project_idx: 9, company: companyEU3, user: eu3Id, reu_est_idx: 10 },
  ];

  const bidStatuses = ["awarded", "pending", "rejected", "awarded", "awarded", "pending", "rejected", "awarded", "pending", "awarded"];

  const euEstimates: any[] = [];
  for (let i = 0; i < euEstimatesData.length; i++) {
    const e = euEstimatesData[i];
    const [row] = await insert("estimate_eu", [{
      user_id: e.user,
      project_id: projects[e.project_idx].id,
      estimate_reu_id: reuEstimates[e.reu_est_idx].id,
      company_id: e.company.id,
      reference: `EU-2026-${String(i + 1).padStart(3, "0")}`,
    }]);
    euEstimates.push(row);

    const bidTotal = 15000 + Math.floor(Math.random() * 35000);
    const labor = Math.floor(bidTotal * 0.55);
    const materials = Math.floor(bidTotal * 0.25);
    const permits = Math.floor(bidTotal * 0.05);
    const tax = Math.floor(bidTotal * 0.08);
    const disposal = bidTotal - labor - materials - permits - tax;

    await insert("electrician_bids", [{
      project_id: projects[e.project_idx].id,
      estimate_eu_id: row.id,
      report_id: reports[e.project_idx < reports.length ? e.project_idx : 0].id,
      user_id: e.user,
      labor: String(labor),
      materials: String(materials),
      permits: String(permits),
      tax: String(tax),
      disposal: String(disposal),
      availability: "2-3 weeks",
      total: String(bidTotal),
      bid_status: bidStatuses[i],
      company_name: e.company.name,
      seen: true,
    }]);

    console.log(`  ✓ EU-2026-${String(i + 1).padStart(3, "0")} → bid ${bidStatuses[i]} ($${bidTotal.toLocaleString()})`);
  }

  // ── 7. Products ────────────────────────────────────────────────────────
  console.log("\nSeeding products...");

  // 10 templates × 5 categories × 3 supplier companies = 150 products.
  // All are recommended products (is_existing = false), batch-inserted per company.

  type ProdTpl = { record: string; category: string; basePpu: number; details: Record<string, unknown> };

  const LAMP_TPLS: ProdTpl[] = [
    { record: "T8 LED 4ft 18W 4000K Direct Wire",        category: "lamp", basePpu:  22, details: { type: "T8",    category: "T Series",   baseType: "Medium Bipin", wattage: "18", colorTemperature: "4000", cri: "80", lifetimeHrs: 50000, directionalLumens: "2200", recyclingCost: 0.25, installTimeHrs: 0.17, installTimeMin: 10, wattageMin: 18, wattageMax: 18, dimensionWidth: "1",     dimensionLength: "48"   } },
    { record: "T8 LED 4ft 15W 5000K Ballast Compatible", category: "lamp", basePpu:  18, details: { type: "T8",    category: "T Series",   baseType: "Medium Bipin", wattage: "15", colorTemperature: "5000", cri: "82", lifetimeHrs: 50000, directionalLumens: "1800", recyclingCost: 0.25, installTimeHrs: 0.08, installTimeMin:  5, wattageMin: 15, wattageMax: 15, dimensionWidth: "1",     dimensionLength: "48"   } },
    { record: "T5 LED 2ft 10W 3500K",                    category: "lamp", basePpu:  15, details: { type: "T5",    category: "T Series",   baseType: "Mini Bipin",   wattage: "10", colorTemperature: "3500", cri: "80", lifetimeHrs: 50000, directionalLumens: "1100", recyclingCost: 0.20, installTimeHrs: 0.13, installTimeMin:  8, wattageMin: 10, wattageMax: 10, dimensionWidth: "0.625", dimensionLength: "24"   } },
    { record: "PAR30 LED 15W 3000K Dimmable",            category: "lamp", basePpu:  28, details: { type: "PAR30", category: "PAR Series", baseType: "E26 Medium",   wattage: "15", colorTemperature: "3000", cri: "90", lifetimeHrs: 25000, directionalLumens: "1050", recyclingCost: 0.25, installTimeHrs: 0.05, installTimeMin:  3, wattageMin: 15, wattageMax: 15, dimensionWidth: "3.75",  dimensionLength: "3.75" } },
    { record: "PAR38 LED 23W 4000K",                     category: "lamp", basePpu:  35, details: { type: "PAR38", category: "PAR Series", baseType: "E26 Medium",   wattage: "23", colorTemperature: "4000", cri: "82", lifetimeHrs: 25000, directionalLumens: "1600", recyclingCost: 0.25, installTimeHrs: 0.05, installTimeMin:  3, wattageMin: 23, wattageMax: 23, dimensionWidth: "4.75",  dimensionLength: "4.75" } },
    { record: "A19 LED 9W 2700K Dimmable",               category: "lamp", basePpu:   8, details: { type: "A19",   category: "A Series",   baseType: "E26 Medium",   wattage: "9",  colorTemperature: "2700", cri: "80", lifetimeHrs: 15000, directionalLumens: "800",  recyclingCost: 0.15, installTimeHrs: 0.03, installTimeMin:  2, wattageMin:  9, wattageMax:  9, dimensionWidth: "2.37",  dimensionLength: "4.33" } },
    { record: "A19 LED 12W 3000K",                       category: "lamp", basePpu:  10, details: { type: "A19",   category: "A Series",   baseType: "E26 Medium",   wattage: "12", colorTemperature: "3000", cri: "80", lifetimeHrs: 15000, directionalLumens: "1100", recyclingCost: 0.15, installTimeHrs: 0.03, installTimeMin:  2, wattageMin: 12, wattageMax: 12, dimensionWidth: "2.37",  dimensionLength: "4.33" } },
    { record: "MR16 LED 7W 3000K",                       category: "lamp", basePpu:  12, details: { type: "MR16",  category: "MR Series",  baseType: "GU5.3 Bipin",  wattage: "7",  colorTemperature: "3000", cri: "90", lifetimeHrs: 25000, directionalLumens: "500",  recyclingCost: 0.15, installTimeHrs: 0.05, installTimeMin:  3, wattageMin:  7, wattageMax:  7, dimensionWidth: "2",     dimensionLength: "1.97" } },
    { record: "BR30 LED 13W 5000K",                      category: "lamp", basePpu:  12, details: { type: "BR30",  category: "BR Series",  baseType: "E26 Medium",   wattage: "13", colorTemperature: "5000", cri: "80", lifetimeHrs: 15000, directionalLumens: "650",  recyclingCost: 0.15, installTimeHrs: 0.03, installTimeMin:  2, wattageMin: 13, wattageMax: 13, dimensionWidth: "3.75",  dimensionLength: "4.5"  } },
    { record: "PL LED 13W 4100K 2-Pin",                  category: "lamp", basePpu:  20, details: { type: "PL",    category: "PL Series",  baseType: "G24d-1 2-Pin", wattage: "13", colorTemperature: "4100", cri: "82", lifetimeHrs: 30000, directionalLumens: "900",  recyclingCost: 0.20, installTimeHrs: 0.08, installTimeMin:  5, wattageMin: 13, wattageMax: 13, dimensionWidth: "1.5",   dimensionLength: "5.5"  } },
  ];

  const FIXTURE_TPLS: ProdTpl[] = [
    { record: "2x4 LED Panel 40W 4000K DLC",         category: "fixtures", basePpu: 185, details: { style: "Panel",    mount: "Recessed", lens: "Diffused",  depth: "3.5", width: "24", length: "48", diameter: "",   application: "Indoor",              lifetimeHrs:  50000, recyclingCost: 0.50, installTimeHrs: 0.33, installTimeMin: 20, depthMin: 3,  depthMax:  5, widthMin: 23.5, widthMax: 24.5, lengthMin: 47.5, lengthMax: 48.5, diameterMin:  0, diameterMax:  0 } },
    { record: "2x2 LED Panel 30W 4000K",             category: "fixtures", basePpu: 150, details: { style: "Panel",    mount: "Recessed", lens: "Diffused",  depth: "3.5", width: "24", length: "24", diameter: "",   application: "Indoor",              lifetimeHrs:  50000, recyclingCost: 0.40, installTimeHrs: 0.25, installTimeMin: 15, depthMin: 3,  depthMax:  5, widthMin: 23.5, widthMax: 24.5, lengthMin: 23.5, lengthMax: 24.5, diameterMin:  0, diameterMax:  0 } },
    { record: "2x4 LED Troffer 50W 5000K",           category: "fixtures", basePpu: 210, details: { style: "Troffer",  mount: "Recessed", lens: "Prismatic", depth: "5",   width: "24", length: "48", diameter: "",   application: "Indoor",              lifetimeHrs:  60000, recyclingCost: 0.50, installTimeHrs: 0.42, installTimeMin: 25, depthMin: 4,  depthMax:  6, widthMin: 23.5, widthMax: 24.5, lengthMin: 47.5, lengthMax: 48.5, diameterMin:  0, diameterMax:  0 } },
    { record: '6" LED Recessed Downlight 15W 3500K', category: "fixtures", basePpu:  95, details: { style: "Can",      mount: "Recessed", lens: "Clear",     depth: "8",   width: "6",  length: "6",  diameter: "6",  application: "Indoor",              lifetimeHrs:  50000, recyclingCost: 0.30, installTimeHrs: 0.25, installTimeMin: 15, depthMin: 7,  depthMax: 10, widthMin:  5.5, widthMax:  6.5, lengthMin:  5.5, lengthMax:  6.5, diameterMin:  5, diameterMax:  7 } },
    { record: '4" LED Recessed Downlight 10W 3000K', category: "fixtures", basePpu:  75, details: { style: "Can",      mount: "Recessed", lens: "Clear",     depth: "6",   width: "4",  length: "4",  diameter: "4",  application: "Indoor",              lifetimeHrs:  50000, recyclingCost: 0.25, installTimeHrs: 0.20, installTimeMin: 12, depthMin: 5,  depthMax:  8, widthMin:  3.5, widthMax:  4.5, lengthMin:  3.5, lengthMax:  4.5, diameterMin:  3, diameterMax:  5 } },
    { record: "LED Linear Strip 4ft 30W 4000K",      category: "fixtures", basePpu:  65, details: { style: "Strip",    mount: "Surface",  lens: "Clear",     depth: "2",   width: "3",  length: "48", diameter: "",   application: "Indoor, Garage",      lifetimeHrs:  50000, recyclingCost: 0.35, installTimeHrs: 0.25, installTimeMin: 15, depthMin: 1,  depthMax:  3, widthMin:  2,   widthMax:  4,   lengthMin: 47,   lengthMax: 49,   diameterMin:  0, diameterMax:  0 } },
    { record: "LED UFO High Bay 100W 5000K",         category: "fixtures", basePpu: 280, details: { style: "High Bay", mount: "Pendant",  lens: "Clear",     depth: "9",   width: "15", length: "15", diameter: "15", application: "Industrial, Warehouse",lifetimeHrs: 100000, recyclingCost: 1.00, installTimeHrs: 0.50, installTimeMin: 30, depthMin: 8,  depthMax: 12, widthMin: 14,   widthMax: 16,   lengthMin: 14,   lengthMax: 16,   diameterMin: 12, diameterMax: 18 } },
    { record: "LED Wall Pack 40W 5000K",             category: "fixtures", basePpu: 110, details: { style: "Wall Pack",mount: "Wall",     lens: "Clear",     depth: "4",   width: "8",  length: "12", diameter: "",   application: "Outdoor",             lifetimeHrs:  70000, recyclingCost: 0.60, installTimeHrs: 0.33, installTimeMin: 20, depthMin: 3,  depthMax:  6, widthMin:  7,   widthMax:  9,   lengthMin: 11,   lengthMax: 13,   diameterMin:  0, diameterMax:  0 } },
    { record: "LED Flood Light 50W 5000K",           category: "fixtures", basePpu: 120, details: { style: "Flood",    mount: "Mounted",  lens: "Clear",     depth: "3",   width: "8",  length: "10", diameter: "",   application: "Outdoor",             lifetimeHrs:  50000, recyclingCost: 0.60, installTimeHrs: 0.33, installTimeMin: 20, depthMin: 2,  depthMax:  5, widthMin:  7,   widthMax:  9,   lengthMin:  9,   lengthMax: 11,   diameterMin:  0, diameterMax:  0 } },
    { record: "LED Track Head 30W 3000K",            category: "fixtures", basePpu:  85, details: { style: "Track",    mount: "Track",    lens: "Clear",     depth: "5",   width: "4",  length: "7",  diameter: "",   application: "Indoor, Retail",      lifetimeHrs:  50000, recyclingCost: 0.35, installTimeHrs: 0.17, installTimeMin: 10, depthMin: 4,  depthMax:  7, widthMin:  3,   widthMax:  5,   lengthMin:  6,   lengthMax:  8,   diameterMin:  0, diameterMax:  0 } },
  ];

  const CONTROL_TPLS: ProdTpl[] = [
    { record: "PIR Occupancy Sensor 360° Ceiling",      category: "control", basePpu:  45, details: { type: "Occupancy Sensor",    model: "PIR-360-C",  dimming: "On/Off", lifetimeHrs: 50000, recyclingCost: 0.50, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Daylight Sensor 0-10V Photo Control",    category: "control", basePpu:  55, details: { type: "Daylight Sensor",      model: "DS-010V",    dimming: "0-10V",  lifetimeHrs: 50000, recyclingCost: 0.50, installTimeHrs: 0.20, installTimeMin: 12 } },
    { record: "0-10V Dimmer Module 120/277V",           category: "control", basePpu:  42, details: { type: "Dimmer",               model: "DIM-010V",   dimming: "0-10V",  lifetimeHrs: 50000, recyclingCost: 0.40, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "7-Day Programmable Timer Control",       category: "control", basePpu:  35, details: { type: "Timer",                model: "TIMER-7D",   dimming: "On/Off", lifetimeHrs: 45000, recyclingCost: 0.50, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Photocell Dusk-to-Dawn 120V",            category: "control", basePpu:  28, details: { type: "Photocell",            model: "PC-120V",    dimming: "On/Off", lifetimeHrs: 60000, recyclingCost: 0.30, installTimeHrs: 0.13, installTimeMin:  8 } },
    { record: "Passive Infrared Motion Sensor Wall",    category: "control", basePpu:  38, details: { type: "Motion Sensor",        model: "PIR-WALL",   dimming: "On/Off", lifetimeHrs: 50000, recyclingCost: 0.40, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "DALI Controller 64-Channel",             category: "control", basePpu: 185, details: { type: "DALI Controller",      model: "DALI-64CH",  dimming: "DALI",   lifetimeHrs: 75000, recyclingCost: 1.00, installTimeHrs: 0.75, installTimeMin: 45 } },
    { record: "Bluetooth Mesh Lighting Controller",     category: "control", basePpu:  95, details: { type: "Bluetooth Controller", model: "BT-MESH",    dimming: "0-10V",  lifetimeHrs: 50000, recyclingCost: 0.50, installTimeHrs: 0.33, installTimeMin: 20 } },
    { record: "Wireless RF Dimmer 0-10V",               category: "control", basePpu:  65, details: { type: "Wireless Dimmer",      model: "RF-DIM",     dimming: "0-10V",  lifetimeHrs: 50000, recyclingCost: 0.40, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Microwave Motion Sensor 360° Ceiling",   category: "control", basePpu:  52, details: { type: "Microwave Sensor",     model: "MW-360",     dimming: "On/Off", lifetimeHrs: 60000, recyclingCost: 0.40, installTimeHrs: 0.25, installTimeMin: 15 } },
  ];

  const POWER_SUPPLY_TPLS: ProdTpl[] = [
    { record: "Constant Current LED Driver 350mA 40W", category: "power-supply", basePpu:  38, details: { type: "Constant Current",  model: "CC-350-40",   productCode: "CC350MA40W",  addedWattage: 2, lifetimeHrs: 50000, recyclingCost: 0.75, installTimeHrs: 0.17, installTimeMin: 10 } },
    { record: "Constant Current LED Driver 700mA 50W", category: "power-supply", basePpu:  45, details: { type: "Constant Current",  model: "CC-700-50",   productCode: "CC700MA50W",  addedWattage: 2, lifetimeHrs: 50000, recyclingCost: 0.75, installTimeHrs: 0.17, installTimeMin: 10 } },
    { record: "Constant Voltage LED Driver 12V 60W",   category: "power-supply", basePpu:  42, details: { type: "Constant Voltage",  model: "CV-12V-60",   productCode: "CV12V60W",    addedWattage: 3, lifetimeHrs: 50000, recyclingCost: 0.75, installTimeHrs: 0.17, installTimeMin: 10 } },
    { record: "Constant Voltage LED Driver 24V 100W",  category: "power-supply", basePpu:  65, details: { type: "Constant Voltage",  model: "CV-24V-100",  productCode: "CV24V100W",   addedWattage: 4, lifetimeHrs: 50000, recyclingCost: 1.00, installTimeHrs: 0.20, installTimeMin: 12 } },
    { record: "0-10V Dimmable LED Driver 40W",         category: "power-supply", basePpu:  48, details: { type: "0-10V Dimmable",   model: "DIM-010V-40", productCode: "DIM010V40W",  addedWattage: 2, lifetimeHrs: 50000, recyclingCost: 0.75, installTimeHrs: 0.20, installTimeMin: 12 } },
    { record: "DALI Dimmable LED Driver 50W",          category: "power-supply", basePpu:  75, details: { type: "DALI Dimmable",    model: "DALI-50W",    productCode: "DALI50W",     addedWattage: 2, lifetimeHrs: 60000, recyclingCost: 1.00, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Emergency LED Driver 10W 90min",        category: "power-supply", basePpu:  95, details: { type: "Emergency",        model: "EM-10-90",    productCode: "EM10W90M",    addedWattage: 0, lifetimeHrs: 50000, recyclingCost: 1.00, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Emergency LED Driver 20W 90min",        category: "power-supply", basePpu: 125, details: { type: "Emergency",        model: "EM-20-90",    productCode: "EM20W90M",    addedWattage: 0, lifetimeHrs: 50000, recyclingCost: 1.00, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Programmable LED Driver 75W",           category: "power-supply", basePpu:  85, details: { type: "Programmable",     model: "PROG-75W",    productCode: "PROG75W",     addedWattage: 3, lifetimeHrs: 75000, recyclingCost: 1.00, installTimeHrs: 0.33, installTimeMin: 20 } },
    { record: "HID Replacement LED Driver 100W",       category: "power-supply", basePpu: 110, details: { type: "HID Replacement",  model: "HID-100W",    productCode: "HIDREPL100W", addedWattage: 5, lifetimeHrs: 50000, recyclingCost: 1.00, installTimeHrs: 0.33, installTimeMin: 20 } },
  ];

  const ACCESSORY_TPLS: ProdTpl[] = [
    { record: "Surface Mount Kit 2x4 Panel",          category: "accessories", basePpu: 15, details: { typeA: "Mount Kit",            descriptionA: "Surface Mount Kit 2x4 Panel",           productCodeA: "SMK-2X4",     qtyA: "1", lifetimeHrs:     0, recyclingCost: 0.10, installTimeHrs: 0.17, installTimeMin: 10 } },
    { record: "Pendant Mount Kit Adjustable 6ft",     category: "accessories", basePpu: 22, details: { typeA: "Mount Kit",            descriptionA: "Pendant Mount Kit Adjustable Cable 6ft", productCodeA: "PMK-ADJ6",    qtyA: "1", lifetimeHrs:     0, recyclingCost: 0.15, installTimeHrs: 0.20, installTimeMin: 12 } },
    { record: "Protective Lens Cover Clear 2x4",      category: "accessories", basePpu: 18, details: { typeA: "Protective Lens Cover", descriptionA: "Protective Lens Cover Clear 2x4ft",      productCodeA: "PLC-CLR-2X4", qtyA: "1", lifetimeHrs: 30000, recyclingCost: 0.10, installTimeHrs: 0.08, installTimeMin:  5 } },
    { record: "Protective Lens Cover Frosted 2x4",    category: "accessories", basePpu: 20, details: { typeA: "Protective Lens Cover", descriptionA: "Protective Lens Cover Frosted 2x4ft",    productCodeA: "PLC-FRS-2X4", qtyA: "1", lifetimeHrs: 30000, recyclingCost: 0.10, installTimeHrs: 0.08, installTimeMin:  5 } },
    { record: "Wire Guard 4ft Linear Fixture",        category: "accessories", basePpu: 12, details: { typeA: "Wire Guard",           descriptionA: "Wire Guard 4ft for Linear Fixtures",     productCodeA: "WG-4FT",      qtyA: "1", lifetimeHrs:     0, recyclingCost: 0.20, installTimeHrs: 0.13, installTimeMin:  8 } },
    { record: "Diffuser Lens Opal 2x4",               category: "accessories", basePpu: 25, details: { typeA: "Diffuser Lens",        descriptionA: "Diffuser Lens Opal 2x4ft",               productCodeA: "DL-OPL-2X4",  qtyA: "1", lifetimeHrs: 30000, recyclingCost: 0.10, installTimeHrs: 0.08, installTimeMin:  5 } },
    { record: "PIR Occupancy Sensor Add-on Module",   category: "accessories", basePpu: 35, details: { typeA: "Sensor Add-on",        descriptionA: "PIR Occupancy Sensor Add-on Module",     productCodeA: "PIR-ADDON",   qtyA: "1", lifetimeHrs: 50000, recyclingCost: 0.30, installTimeHrs: 0.17, installTimeMin: 10 } },
    { record: "Photocell Add-on Dusk-to-Dawn",        category: "accessories", basePpu: 20, details: { typeA: "Sensor Add-on",        descriptionA: "Photocell Add-on Dusk-to-Dawn 120V",     productCodeA: "PC-ADDON",    qtyA: "1", lifetimeHrs: 60000, recyclingCost: 0.20, installTimeHrs: 0.13, installTimeMin:  8 } },
    { record: "Emergency Battery Pack 90min 10W",     category: "accessories", basePpu: 45, details: { typeA: "Emergency Battery",    descriptionA: "Emergency Battery Pack 90min 10W",       productCodeA: "EBP-10-90",   qtyA: "1", lifetimeHrs: 50000, recyclingCost: 1.00, installTimeHrs: 0.25, installTimeMin: 15 } },
    { record: "Vandal Guard Steel 4ft",               category: "accessories", basePpu: 28, details: { typeA: "Vandal Guard",         descriptionA: "Vandal Guard Steel 4ft Linear",          productCodeA: "VG-STL-4FT",  qtyA: "1", lifetimeHrs:     0, recyclingCost: 0.25, installTimeHrs: 0.17, installTimeMin: 10 } },
  ];

  const ALL_TPLS: ProdTpl[] = [
    ...LAMP_TPLS,
    ...FIXTURE_TPLS,
    ...CONTROL_TPLS,
    ...POWER_SUPPLY_TPLS,
    ...ACCESSORY_TPLS,
  ];

  // Supplier companies keep their specific manufacturer label and price tier.
  const SUPPLIER_COMPANIES = [
    { company: companySU,  userId: suId,  mfr: "BrightLED",  priceMult: 1.0 },
    { company: companySU2, userId: su3Id, mfr: "EcoLux",     priceMult: 0.9 },
    { company: companySU3, userId: su4Id, mfr: "NovaBright", priceMult: 1.1 },
  ];

  const suCompanyIds = new Set(SUPPLIER_COMPANIES.map((s) => s.company.id));

  // Mirrors the individual build*Section helpers in LuminaireEditModal.tsx
  function buildProductDescription(category: string, d: Record<string, unknown>, mfr: string): string {
    const str = (v: unknown) => (v != null && v !== "" ? String(v) : "");
    switch (category) {
      case "lamp":
        return [
          "LED",
          str(d.category),
          str(d.type),
          str(d.baseCategory),
          str(d.baseCategoryType),
          d.wattage       ? `${d.wattage}W`            : "",
          d.colorTemperature ? `${d.colorTemperature}K` : "",
          str(d.lensType),
          str(d.productCode),
        ].filter(Boolean).join(" ");
      case "fixtures": {
        const dims = [d.length, d.width, d.depth, d.diameter].map(str).filter(Boolean);
        return [...(dims.length ? [dims.join("x")] : []), str(d.mount), str(d.style)]
          .filter(Boolean).join(" ");
      }
      case "power-supply":
        return [str(d.type), mfr, str(d.model), str(d.productCode)].filter(Boolean).join(" ");
      case "control":
        return [str(d.type), mfr, str(d.dimming), str(d.model)].filter(Boolean).join(" ");
      case "accessories":
        return [str(d.typeA), mfr, str(d.productCodeA)].filter(Boolean).join(" ");
      default:
        return "";
    }
  }

  const productRows: any[] = [];

  function makeProductBatch(
    tpls: ProdTpl[],
    companyId: number,
    userId: string,
    mfr: string,
    priceMult: number,
  ) {
    return tpls.map((tpl) => {
      const ppu = Math.round(tpl.basePpu * priceMult * 100) / 100;
      const description = buildProductDescription(tpl.category, tpl.details, mfr);
      return {
        user_id:             userId,
        company_id:          companyId,
        project_id:          null,
        report_id:           null,
        estimate_su_id:      null,
        airtable_record:     tpl.record,
        airtable_base:       "appFocusEarth2026",
        airtable_colum_name: tpl.category,
        is_existing:         false,
        details: { ...tpl.details, manufacturer: mfr, pricePerUnit: String(ppu), ppu, description },
        created_at:          monthsAgo(2),
      };
    });
  }

  // SU companies — preserve existing manufacturer labels and pricing
  for (const { company, userId, mfr, priceMult } of SUPPLIER_COMPANIES) {
    const inserted = await insert("product", makeProductBatch(ALL_TPLS, company.id, userId, mfr, priceMult));
    productRows.push(...inserted);
    console.log(`  ✓ ${inserted.length} products → ${company.name}`);
  }

  // All remaining companies (REU, EU) — also get 50 products each
  const OTHER_PRICE_MULTS = [1.0, 0.95, 1.05, 0.9, 1.1, 0.85, 1.15];
  const otherCompanies = allCompanies.filter((c: any) => !suCompanyIds.has(c.id));
  for (let i = 0; i < otherCompanies.length; i++) {
    const company = otherCompanies[i];
    const priceMult = OTHER_PRICE_MULTS[i % OTHER_PRICE_MULTS.length];
    const inserted = await insert("product", makeProductBatch(ALL_TPLS, company.id, company.owner_id, company.name, priceMult));
    productRows.push(...inserted);
    console.log(`  ✓ ${inserted.length} products → ${company.name}`);
  }

  console.log(`  ✓ ${productRows.length} products total (${ALL_TPLS.length} per company × ${allCompanies.length} companies)`);

  // ── 8. Activities ──────────────────────────────────────────────────────
  console.log("\nSeeding activities...");

  const activityRows: any[] = [];

  // User registrations
  for (const u of USERS) {
    activityRows.push({
      user_id: userIds[u.email],
      user_name: `${u.meta.first_name} ${u.meta.last_name}`,
      user_type: u.meta.type,
      action: 19,
      action_id: activityRows.length + 1,
      project_title: null,
      sender_name: null,
    });
  }

  // Company creations
  for (const c of allCompanies) {
    activityRows.push({
      user_id: c.owner_id,
      user_name: USERS.find(u => userIds[u.email] === c.owner_id)?.meta.first_name + " " + USERS.find(u => userIds[u.email] === c.owner_id)?.meta.last_name,
      user_type: USERS.find(u => userIds[u.email] === c.owner_id)?.meta.type ?? "Reu",
      action: 14,
      action_id: c.id,
      company_id: c.id,
      project_title: null,
      sender_name: null,
    });
  }

  // Project creations
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const pd = projectsData[i];
    const user = USERS.find(u => userIds[u.email] === pd.user_id)!;
    activityRows.push({
      user_id: pd.user_id,
      user_name: `${user.meta.first_name} ${user.meta.last_name}`,
      user_type: user.meta.type,
      action: 2,
      action_id: p.id,
      project_id: p.id,
      project_title: pd.title,
      sender_name: null,
    });
  }

  // Estimate creations (REU)
  for (let i = 0; i < reuEstimates.length; i++) {
    const e = reuEstimatesData[i];
    const user = USERS.find(u => userIds[u.email] === e.user_reu || u.email.startsWith("reu"))!;
    activityRows.push({
      user_id: e.user_reu,
      user_name: `${user.meta.first_name} ${user.meta.last_name}`,
      user_type: "Reu",
      action: 6,
      action_id: reuEstimates[i].id,
      estimate_reu_id: reuEstimates[i].id,
      project_title: projectsData[e.report_idx < projectsData.length ? e.report_idx : 0]?.title ?? "Project",
      sender_name: null,
    });
  }

  // Estimate creations (SU)
  for (let i = 0; i < suEstimates.length; i++) {
    const e = suEstimatesData[i];
    const user = USERS.find(u => userIds[u.email] === e.user_su)!;
    activityRows.push({
      user_id: e.user_su,
      user_name: `${user.meta.first_name} ${user.meta.last_name}`,
      user_type: "Su",
      action: 6,
      action_id: suEstimates[i].id,
      estimate_id: suEstimates[i].id,
      project_title: projectsData[e.report_idx < projectsData.length ? e.report_idx : 0]?.title ?? "Project",
      sender_name: null,
    });
  }

  // Order creations
  for (let i = 0; i < suEstimatesData.length; i++) {
    if (!suEstimatesData[i].is_order) continue;
    const e = suEstimatesData[i];
    const user = USERS.find(u => userIds[u.email] === e.user_su)!;
    activityRows.push({
      user_id: e.user_su,
      user_name: `${user.meta.first_name} ${user.meta.last_name}`,
      user_type: "Su",
      action: 8,
      action_id: suEstimates[i].id,
      estimate_id: suEstimates[i].id,
      project_title: projectsData[e.report_idx < projectsData.length ? e.report_idx : 0]?.title ?? "Project",
      sender_name: null,
    });
  }

  // Extra activities spread across admin users
  const adminUsers = [
    { id: superadminId, name: "Focus Admin", type: "SUPERADMIN" },
    { id: sysadminId, name: "Sarah Chen", type: "Sa" },
    { id: sysadmin2Id, name: "James Wright", type: "Sa" },
    { id: adminId, name: "Alex Rivera", type: "Au" },
    { id: admin2Id, name: "Lisa Park", type: "Au" },
  ];
  for (const admin of adminUsers) {
    for (let j = 0; j < 5 + Math.floor(Math.random() * 10); j++) {
      activityRows.push({
        user_id: admin.id,
        user_name: admin.name,
        user_type: admin.type,
        action: [2, 6, 7, 8, 14][j % 5],
        action_id: j + 100,
        project_title: projects[j % projects.length].title,
        sender_name: null,
      });
    }
  }

  const activities = await insert("activity", activityRows);
  console.log(`  ✓ ${activities.length} activities`);

  // ── 9. Notifications ───────────────────────────────────────────────────
  console.log("\nSeeding notifications...");
  const notificationRows = [
    { receiver_id: superadminId, user_id: reuId, company_id: companyREU.id, sender_name: "Pete Musser", seen: false, description: "Pete Musser submitted Focus Earth Real Estate for review", status: 16 },
    { receiver_id: superadminId, user_id: suId, company_id: companySU.id, sender_name: "Michael Haeflich", seen: false, description: "Michael Haeflich submitted Bright LED Supplies for review", status: 16 },
    { receiver_id: reuId, user_id: suId, company_id: companySU.id, project_id: projects[0].id, estimate_id: suEstimates[0].id, sender_name: "Michael Haeflich", seen: false, description: "Michael Haeflich created estimate SU-2026-001", status: 6 },
    { receiver_id: adminId, user_id: reuId, company_id: companyREU.id, estimate_reu_id: reuEstimates[0].id, sender_name: "Pete Musser", seen: true, description: "Pete Musser approved REU-2026-001", status: 7 },
    { receiver_id: reuId, user_id: adminId, company_id: companyREU.id, estimate_reu_id: reuEstimates[0].id, sender_name: "Alex Rivera", seen: true, description: "Alex Rivera counter-signed REU-2026-001", status: 7 },
    { receiver_id: reuId, user_id: suId, estimate_id: suEstimates[0].id, sender_name: "Michael Haeflich", seen: false, description: "Order ORD-SU-2026-001 created", status: 8 },
    { receiver_id: superadminId, user_id: reu2Id, company_id: companyREU.id, project_id: projects[2].id, sender_name: "Ben Brown", seen: false, description: "Ben Brown created Hospitality Lobby Renovation", status: 2 },
    { receiver_id: superadminId, user_id: euId, company_id: companyEU.id, sender_name: "Narek Simonyan", seen: false, description: "Narek Simonyan submitted Volt Electric Services", status: 16 },
    { receiver_id: superadminId, user_id: eu2Id, company_id: companyEU2.id, sender_name: "Carlos Mendez", seen: false, description: "Carlos Mendez submitted Spark Solutions Electric", status: 16 },
    { receiver_id: reu3Id, user_id: su3Id, company_id: companySU2.id, project_id: projects[3].id, sender_name: "Rachel Kim", seen: false, description: "Rachel Kim created estimate SU-2026-003", status: 6 },
    { receiver_id: reu4Id, user_id: su2Id, company_id: companySU.id, project_id: projects[5].id, sender_name: "Zebin Lin", seen: false, description: "Zebin Lin created estimate SU-2026-005", status: 6 },
    { receiver_id: reu5Id, user_id: su4Id, company_id: companySU3.id, project_id: projects[7].id, sender_name: "Tom Jackson", seen: false, description: "Tom Jackson created estimate SU-2026-006", status: 6 },
  ];
  const notifications = await insert("notification", notificationRows);
  console.log(`  ✓ ${notifications.length} notifications`);

  // ── 10. Messages ───────────────────────────────────────────────────────
  console.log("\nSeeding messages...");
  const messageRows = [
    { sender_id: reuId, receiver_id: suId, message: "Hi Michael, can you confirm availability on the 2x4 Troffers? We need 48 units." },
    { sender_id: suId, receiver_id: reuId, message: "Hi Pete, yes we have them in stock. 4-week lead time." },
    { sender_id: reuId, receiver_id: adminId, message: "Alex, the downtown office estimate is ready for your review." },
    { sender_id: adminId, receiver_id: reuId, message: "Signed. Everything looks good. Let's proceed." },
    { sender_id: reu3Id, receiver_id: su3Id, message: "Rachel, do you have the retail LED panels in 3500K?" },
    { sender_id: su3Id, receiver_id: reu3Id, message: "Yes Diana, we can ship those within 2 weeks." },
    { sender_id: reu4Id, receiver_id: su2Id, message: "Zebin, need a quote for data center high-bays." },
    { sender_id: su2Id, receiver_id: reu4Id, message: "Kevin, I'll have that ready by tomorrow." },
    { sender_id: reu5Id, receiver_id: su4Id, message: "Tom, can NovaBright handle the resort ambient lighting?" },
    { sender_id: su4Id, receiver_id: reu5Id, message: "Absolutely Maria, our smart system is perfect for hospitality." },
    { sender_id: euId, receiver_id: reuId, message: "Pete, the downtown office installation is on schedule." },
    { sender_id: eu2Id, receiver_id: reu3Id, message: "Diana, we can start the retail complex next week." },
    { sender_id: eu3Id, receiver_id: adminId, message: "Alex, bid submitted for downtown office." },
    { sender_id: adminId, receiver_id: eu3Id, message: "Thanks Jake, we'll review and get back to you." },
    { sender_id: superadminId, receiver_id: adminId, message: "Alex, please review the new company submissions." },
    { sender_id: superadminId, receiver_id: admin2Id, message: "Lisa, can you handle the Austin campus approval?" },
    { sender_id: admin2Id, receiver_id: superadminId, message: "On it. Will have it reviewed by end of day." },
    { sender_id: sysadminId, receiver_id: superadminId, message: "System health check complete. All good." },
    { sender_id: superadminId, receiver_id: sysadminId, message: "Great, thanks Sarah." },
    { sender_id: sysadmin2Id, receiver_id: adminId, message: "Alex, I've updated the user permissions." },
  ];
  const messages = await insert("messages", messageRows);
  console.log(`  ✓ ${messages.length} messages`);

  // ── 11. User Platform Usage ────────────────────────────────────────────
  console.log("\nSeeding platform usage...");
  const now = new Date().toISOString();
  const usageRows = USERS.map((u, i) => ({
    user_id: userIds[u.email],
    total: [120, 95, 45, 210, 85, 180, 65, 55, 40, 150, 300, 75, 90, 110, 250, 130, 70, 25, 15, 10][i],
    created_at: now,
    updated_at: now,
  }));
  const usage = await insert("user_platform_usage", usageRows);
  console.log(`  ✓ ${usage.length} platform usage records`);

  // ── 12. User Catalogue Counts ──────────────────────────────────────────
  console.log("\nSeeding catalogue counts...");
  const catalogueRows = [
    { user_id: superadminId, fixture: 30, lamp: 15, control: 10, power_supply: 8, accessory: 5, companies: 10, updated_at: now },
    { user_id: sysadminId, fixture: 20, lamp: 10, control: 8, power_supply: 5, accessory: 3, companies: 5, updated_at: now },
    { user_id: sysadmin2Id, fixture: 12, lamp: 6, control: 4, power_supply: 3, accessory: 2, companies: 3, updated_at: now },
    { user_id: adminId, fixture: 25, lamp: 12, control: 9, power_supply: 7, accessory: 4, companies: 8, updated_at: now },
    { user_id: admin2Id, fixture: 18, lamp: 8, control: 6, power_supply: 4, accessory: 3, companies: 6, updated_at: now },
    { user_id: suId, fixture: 45, lamp: 20, control: 15, power_supply: 12, accessory: 8, companies: 2, updated_at: now },
    { user_id: su2Id, fixture: 30, lamp: 14, control: 10, power_supply: 8, accessory: 5, companies: 1, updated_at: now },
    { user_id: su3Id, fixture: 35, lamp: 16, control: 12, power_supply: 9, accessory: 6, companies: 1, updated_at: now },
    { user_id: su4Id, fixture: 28, lamp: 10, control: 8, power_supply: 6, accessory: 4, companies: 1, updated_at: now },
  ];
  const catalogues = await insert("user_catalogue_counts", catalogueRows);
  console.log(`  ✓ ${catalogues.length} catalogue count records`);

  // ── 13. Refresh materialized views ─────────────────────────────────────
  console.log("\nRefreshing materialized views...");
  const { error: refreshError } = await supabase.rpc("fn_refresh_analytics_views");
  if (refreshError) {
    console.log(`  ⚠ Could not refresh views (run manually): ${refreshError.message}`);
  } else {
    console.log("  ✓ Analytics materialized views refreshed");
  }

  // ── Done ───────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials (all use password: password123):");
  console.log("─────────────────────────────────────────────────");
  for (const u of USERS) {
    console.log(`  ${u.meta.type.padEnd(10)} ${u.email}`);
  }
  console.log("");
  console.log("Summary:");
  console.log(`  ${USERS.length} users, ${allCompanies.length} companies, ${projects.length} projects`);
  console.log(`  ${reports.length} reports, ${reuEstimates.length} REU estimates, ${suEstimates.length} SU estimates`);
  console.log(`  ${euEstimates.length} EU estimates with bids, ${productRows.length} products`);
  console.log(`  ${activities.length} activities, ${messages.length} messages`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function titleForType(type: string): string {
  switch (type) {
    case "SUPERADMIN": return "Super Administrator";
    case "Sa": return "System Administrator";
    case "Au": return "Account Manager";
    case "Reu": return "Real Estate Manager";
    case "Su": return "Supplier Manager";
    case "Eu": return "Electrician";
    case "Gu": return "Guest";
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
