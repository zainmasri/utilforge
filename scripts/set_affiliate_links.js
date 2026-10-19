/**
 * UtilForge Affiliate Referral URL Updater (`node scripts/set_affiliate_links.js <slug> <url>`)
 *
 * Updates a partner's destination URL in `src/registry/tools.js` AND pushes the live
 * override to Cloudflare KV (`UTILFORGE_REVENUE_KV` -> `config:affiliates`) so `/go/<slug>/`
 * redirects immediately without waiting for a full site rebuild.
 *
 * Usage:
 *   node scripts/set_affiliate_links.js supabase-postgres "https://supabase.com/?via=your_code"
 *   node scripts/set_affiliate_links.js --list
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG } from '../src/registry/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const TOOLS_FILE = path.join(ROOT_DIR, 'src/registry/tools.js');
const KV_NAMESPACE_ID = '2f26fb9f8b52414eb1a6ce4e2c2160c9';

const args = process.argv.slice(2);
const partners = SITE_CONFIG.monetization.affiliatePartners || [];

if (args.length === 0 || args[0] === '--list') {
  console.log('================================================================');
  console.log('🔗 UTILFORGE CONFIGURED /go/ AFFILIATE ROUTES');
  console.log('================================================================');
  for (const p of partners) {
    console.log(`• /go/${p.slug}/ (${p.name} — Est. $${p.estPayoutUsd} CPA)`);
    console.log(`  Current URL: ${p.destinationUrl}`);
  }
  console.log('----------------------------------------------------------------');
  console.log('To update a partner referral link live in KV + tools.js, run:');
  console.log('  node scripts/set_affiliate_links.js <slug> "<your_affiliate_url>"');
  console.log('================================================================');
  process.exit(0);
}

const [targetSlug, newUrl] = args;
const partner = partners.find((p) => p.slug === targetSlug);
if (!partner || !newUrl) {
  console.error(`Unknown partner slug "${targetSlug}" or missing URL. Run with --list to see valid slugs.`);
  process.exit(1);
}

// 1. Update src/registry/tools.js
let toolsSrc = fs.readFileSync(TOOLS_FILE, 'utf8');
toolsSrc = toolsSrc.replace(partner.destinationUrl, newUrl);
fs.writeFileSync(TOOLS_FILE, toolsSrc, 'utf8');
console.log(`✓ Updated ${targetSlug} in src/registry/tools.js -> ${newUrl}`);

// 2. Push override map to Cloudflare KV (config:affiliates)
const mapObj = {};
for (const p of partners) {
  mapObj[p.slug] = p.slug === targetSlug ? newUrl : p.destinationUrl;
}
try {
  execSync(
    `npx --yes wrangler kv key put --namespace-id=${KV_NAMESPACE_ID} "config:affiliates" '${JSON.stringify(mapObj)}' --remote`,
    { cwd: ROOT_DIR, stdio: 'inherit' }
  );
  console.log(`✓ Live Cloudflare KV override updated for /go/${targetSlug}/`);
} catch (err) {
  console.warn(`⚠️ KV CLI push skipped (${err.message}); run \`node build.js\` to bake into static /go/ HTML.`);
}
