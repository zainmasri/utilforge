/**
 * UtilForge Automated IndexNow Search Engine Pinger (`node scripts/ping_indexnow.js`)
 *
 * Reads all URLs from `dist/sitemap.xml` and submits them in a single batch POST
 * to `https://api.indexnow.org/indexnow` using `SITE_CONFIG.indexNowKey` so Bing,
 * Yandex, Naver, Seznam, and Yep index all new and updated tools/calculators immediately.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG } from '../src/registry/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = path.resolve(__dirname, '..', 'dist', 'sitemap.xml');

async function pingIndexNow() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('[IndexNow] dist/sitemap.xml not found. Run `node build.js` first.');
    process.exit(1);
  }

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const host = new URL(SITE_CONFIG.domain).host;
  const key = SITE_CONFIG.indexNowKey;
  const keyLocation = `${SITE_CONFIG.domain}/${key}.txt`;

  const payload = {
    host,
    key,
    keyLocation,
    urlList,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
  ];

  console.log(`[IndexNow] Submitting ${urlList.length} URLs for ${host} across ${endpoints.length} search engines...`);
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log(
        `[IndexNow → ${new URL(endpoint).host}] HTTP ${res.status} (${res.ok ? 'ACCEPTED' : 'RESPONSE'}): ${urlList.length} URLs submitted. ${text.slice(0, 80)}`
      );
    } catch (err) {
      console.error(`[IndexNow → ${endpoint}] Request failed: ${err.message}`);
    }
  }
}

pingIndexNow();
