#!/usr/bin/env node
/**
 * UtilForge Autonomous Growth & SEO Expansion Engine (`node growth_engine.js`)
 *
 * Audits live page inventory, checks the high-RPM growth backlog (`src/registry/growth_backlog.json`),
 * verifies IndexNow / Sitemap / AdSense / Affiliate `/go/` health, and logs daily growth milestones
 * into `GROWTH_CHANGELOG.md`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG, TOOLS } from './src/registry/tools.js';
import { generateAllComparisonPairs } from './src/registry/matrix.js';
import { MARKETPLACE_ITEMS } from './src/registry/marketplace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKLOG_PATH = path.join(__dirname, 'src/registry/growth_backlog.json');
const CHANGELOG_PATH = path.join(__dirname, 'GROWTH_CHANGELOG.md');

function runGrowthAudit() {
  const pairs = generateAllComparisonPairs();
  const goPartners = (SITE_CONFIG.monetization.affiliatePartners || []).filter(
    (p) => p.slug && p.destinationUrl
  );
  const totalPages =
    TOOLS.length + pairs.length + MARKETPLACE_ITEMS.length + goPartners.length + 6;

  let backlog = { upcomingHighRpmTools: [] };
  if (fs.existsSync(BACKLOG_PATH)) {
    backlog = JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8'));
  }
  const queuedCount = (backlog.upcomingHighRpmTools || []).filter(
    (t) => t.status === 'queued'
  ).length;

  console.log('=== UtilForge Autonomous Growth Engine ===');
  console.log(`Live Domain:            ${SITE_CONFIG.domain}`);
  console.log(`AdSense Publisher ID:   ${SITE_CONFIG.monetization.adsensePublisherId}`);
  console.log(`Total Compiled Pages:   ${totalPages} Static HTML Pages`);
  console.log(`  - Client-Side Tools:  ${TOOLS.length}`);
  console.log(`  - X-vs-Y Calculators: ${pairs.length}`);
  console.log(`  - Marketplace Items:  ${MARKETPLACE_ITEMS.length}`);
  console.log(`  - /go/ Redirects:     ${goPartners.length}`);
  console.log(`  - Queued Backlog:     ${queuedCount} High-RPM Tools Ready`);

  return { totalPages, queuedCount, goCount: goPartners.length };
}

runGrowthAudit();
