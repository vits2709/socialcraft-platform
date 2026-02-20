#!/usr/bin/env node
/**
 * Script di deploy automatico — CityQuest
 *
 * Esegue in ordine:
 *  1. Migrations SQL (002–005) via Supabase Management API
 *  2. Set secrets Edge Function (ANTHROPIC_API_KEY)
 *  3. Deploy Edge Function validate-receipt
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx ANTHROPIC_API_KEY=sk-ant-xxx node scripts/deploy.mjs
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_REF = "avqnelunisrsrjuqrgwc";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!ACCESS_TOKEN) {
  console.error(
    "\n❌ Manca SUPABASE_ACCESS_TOKEN\n" +
    "   Ottienilo da: https://supabase.com/dashboard/account/tokens\n" +
    "   Poi rilancia: SUPABASE_ACCESS_TOKEN=sbp_xxx ANTHROPIC_API_KEY=sk-ant-xxx node scripts/deploy.mjs\n"
  );
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error(
    "\n❌ Manca ANTHROPIC_API_KEY\n" +
    "   Ottienila da: https://console.anthropic.com/account/keys\n" +
    "   Poi rilancia: SUPABASE_ACCESS_TOKEN=sbp_xxx ANTHROPIC_API_KEY=sk-ant-xxx node scripts/deploy.mjs\n"
  );
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

async function runSQL(sql, label) {
  process.stdout.write(`  ⏳ ${label}... `);
  const res = await fetch(`${API}/database/query`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌\n     HTTP ${res.status}: ${text.slice(0, 300)}`);
    return false;
  }
  console.log("✅");
  return true;
}

async function runMigration(filename) {
  const path = join(ROOT, "supabase", "migrations", filename);
  let sql;
  try {
    sql = readFileSync(path, "utf8");
  } catch {
    console.log(`  ⚠️  ${filename} non trovato — saltato`);
    return;
  }
  await runSQL(sql, filename);
}

async function setSecret(name, value) {
  process.stdout.write(`  ⏳ Set secret ${name}... `);
  const res = await fetch(`${API}/secrets`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify([{ name, value }]),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌\n     ${text.slice(0, 200)}`);
    return false;
  }
  console.log("✅");
  return true;
}

async function deployFunction() {
  // Usa Supabase CLI (deve essere installato) per il deploy della Edge Function
  // Il CLI usa il token dal file di configurazione globale
  process.stdout.write(`  ⏳ Deploy Edge Function validate-receipt... `);
  try {
    execSync(
      `supabase functions deploy validate-receipt --no-verify-jwt --project-ref ${PROJECT_REF}`,
      {
        cwd: ROOT,
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    console.log("✅");
    return true;
  } catch (e) {
    const msg = e.stderr?.toString() || e.message;
    console.error(`❌\n     ${msg.slice(0, 300)}`);
    return false;
  }
}

async function main() {
  console.log("\n🚀 CityQuest Deploy Script\n" + "=".repeat(40));

  // ── 1. Migrations ──────────────────────────────
  console.log("\n📦 Esecuzione migrations...");
  const migrations = [
    "002_receipt_ai_columns.sql",
    "003_activity_feed.sql",
    "004_push_subscriptions.sql",
    "005_weekly_rankings.sql",
  ];
  for (const m of migrations) {
    await runMigration(m);
  }

  // ── 2. Secrets Edge Function ───────────────────
  console.log("\n🔑 Impostazione secrets Supabase...");
  await setSecret("ANTHROPIC_API_KEY", ANTHROPIC_KEY);

  // ── 3. Deploy Edge Function ────────────────────
  console.log("\n⚡ Deploy Edge Function...");
  await deployFunction();

  console.log("\n✅ Deploy completato!\n");
  console.log("Prossimi passi:");
  console.log("  • Verifica su Supabase Dashboard → Edge Functions che validate-receipt sia attiva");
  console.log("  • Testa il check-in da /checkin/[slug]");
  console.log("  • Il cron job weekly_rankings va abilitato manualmente (vedi migration 005)");
}

main().catch((e) => {
  console.error("\n❌ Errore fatale:", e.message);
  process.exit(1);
});
