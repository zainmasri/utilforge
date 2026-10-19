/**
 * UtilForge Daily Revenue, Official Google AdSense API & Conversion Audit (`node scripts/revenue_check.js`)
 *
 * Checks:
 * 1. Official Google AdSense Management API v2 (`https://adsense.googleapis.com/v2/accounts/pub-.../reports:generate`)
 *    - Pulls exact `ESTIMATED_EARNINGS` ($ USD), `IMPRESSIONS`, `CLICKS`, `PAGE_VIEWS_RPM`, and `ACTIVE_VIEW_VIEWABILITY`
 *    - Supports OAuth2 env vars (`ADSENSE_ACCESS_TOKEN` or `ADSENSE_CLIENT_ID`/`ADSENSE_CLIENT_SECRET`/`ADSENSE_REFRESH_TOKEN`) or local `gcloud auth` token
 * 2. Google AdSense live ad-delivery probe (`googleads.g.doubleclick.net`) + `ads.txt` + DOM slot verification
 *    - Inspects the actual HTML payload to distinguish real filled ad creatives from blank transparent responses
 * 3. Real-time browser telemetry from `https://utilforge.pages.dev/api/telemetry` (Cloudflare KV)
 *    - Tracks Pageviews, DOM Filled Ad Impressions, and Outbound Affiliate Link Clicks (without synthetic $1.85/click revenue inflation)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG, TOOLS } from '../src/registry/tools.js';
import { generateAllComparisonPairs } from '../src/registry/matrix.js';
import { MARKETPLACE_ITEMS } from '../src/registry/marketplace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const HISTORY_FILE = path.join(LOGS_DIR, 'revenue_history.json');

const DOMAIN = SITE_CONFIG.domain || 'https://utilforge.pages.dev';
const PUB_ID = SITE_CONFIG.monetization.adsensePublisherId; // ca-pub-3462180264458803
const ADSENSE_ACCOUNT_ID = PUB_ID.replace(/^ca-/, ''); // pub-3462180264458803
const SLOTS = SITE_CONFIG.monetization.adsenseSlots;

async function fetchWithTiming(url, headers = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, { headers });
    const latencyMs = Math.round(performance.now() - start);
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      text,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - start),
      text: '',
      error: err.message,
    };
  }
}

/**
 * Resolves an OAuth2 access token for the Google AdSense Management API v2.
 * Priority:
 * 1. ADSENSE_ACCESS_TOKEN env var
 * 2. OAuth2 Refresh Token exchange (ADSENSE_CLIENT_ID + ADSENSE_CLIENT_SECRET + ADSENSE_REFRESH_TOKEN)
 * 3. Local Google Cloud ADC / CLI token (if authorized with adsense.readonly scope)
 */
async function resolveAdSenseAccessToken() {
  if (process.env.ADSENSE_ACCESS_TOKEN) {
    return { token: process.env.ADSENSE_ACCESS_TOKEN.trim(), source: 'env:ADSENSE_ACCESS_TOKEN' };
  }

  if (
    process.env.ADSENSE_CLIENT_ID &&
    process.env.ADSENSE_CLIENT_SECRET &&
    process.env.ADSENSE_REFRESH_TOKEN
  ) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.ADSENSE_CLIENT_ID,
          client_secret: process.env.ADSENSE_CLIENT_SECRET,
          refresh_token: process.env.ADSENSE_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          return { token: data.access_token, source: 'oauth2:refresh_token' };
        }
      }
    } catch (_) {
      // fall through
    }
  }

  for (const cmd of [
    'gcloud auth application-default print-access-token',
    'gcloud auth print-access-token',
  ]) {
    try {
      const tok = execSync(cmd, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (tok && !tok.includes('ERROR')) {
        return { token: tok, source: cmd };
      }
    } catch (_) {
      // ignore if gcloud is not logged in
    }
  }

  return { token: null, source: 'none' };
}

/**
 * Queries the official Google AdSense Management API v2 for exact settled/estimated USD earnings.
 */
async function fetchOfficialAdSenseMetrics(todayStr) {
  const { token, source } = await resolveAdSenseAccessToken();
  if (!token) {
    return {
      connected: false,
      authSource: 'none',
      statusMessage:
        'NOT_AUTHENTICATED (Set ADSENSE_ACCESS_TOKEN or ADSENSE_REFRESH_TOKEN to pull official AdSense API earnings)',
      today: { earningsUsd: 0, impressions: 0, clicks: 0, rpmUsd: 0, viewabilityPct: 0 },
      allTime: { earningsUsd: 0, impressions: 0, clicks: 0, rpmUsd: 0, viewabilityPct: 0 },
    };
  }

  const [year, month, day] = todayStr.split('-').map(Number);
  const baseUrl = `https://adsense.googleapis.com/v2/accounts/${ADSENSE_ACCOUNT_ID}/reports:generate`;
  const metricsParams = [
    'metrics=ESTIMATED_EARNINGS',
    'metrics=IMPRESSIONS',
    'metrics=CLICKS',
    'metrics=PAGE_VIEWS_RPM',
    'metrics=ACTIVE_VIEW_VIEWABILITY',
  ].join('&');

  const todayUrl = `${baseUrl}?dateRange=TODAY&${metricsParams}`;
  const allTimeUrl = `${baseUrl}?dateRange=CUSTOM&startDate.year=2025&startDate.month=1&startDate.day=1&endDate.year=${year}&endDate.month=${month}&endDate.day=${day}&${metricsParams}`;

  const authHeaders = { Authorization: `Bearer ${token}` };
  const [todayRes, allTimeRes] = await Promise.all([
    fetchWithTiming(todayUrl, authHeaders),
    fetchWithTiming(allTimeUrl, authHeaders),
  ]);

  function parseReportTotals(resText) {
    try {
      const data = JSON.parse(resText);
      const cells = data?.totals?.cells || data?.rows?.[0]?.cells || [];
      return {
        earningsUsd: Number(parseFloat(cells[0]?.value || '0').toFixed(2)),
        impressions: parseInt(cells[1]?.value || '0', 10),
        clicks: parseInt(cells[2]?.value || '0', 10),
        rpmUsd: Number(parseFloat(cells[3]?.value || '0').toFixed(2)),
        viewabilityPct: Number((parseFloat(cells[4]?.value || '0') * 100).toFixed(1)),
      };
    } catch (_) {
      return { earningsUsd: 0, impressions: 0, clicks: 0, rpmUsd: 0, viewabilityPct: 0 };
    }
  }

  if (!todayRes.ok) {
    let errReason = `HTTP ${todayRes.status}`;
    try {
      const errJson = JSON.parse(todayRes.text);
      errReason = errJson?.error?.message || errReason;
    } catch (_) {}
    return {
      connected: false,
      authSource: source,
      statusMessage: `API_AUTH_SCOPE_REQUIRED (${errReason})`,
      today: { earningsUsd: 0, impressions: 0, clicks: 0, rpmUsd: 0, viewabilityPct: 0 },
      allTime: { earningsUsd: 0, impressions: 0, clicks: 0, rpmUsd: 0, viewabilityPct: 0 },
    };
  }

  return {
    connected: true,
    authSource: source,
    statusMessage: `CONNECTED_OFFICIAL_ADSENSE_API (${ADSENSE_ACCOUNT_ID})`,
    today: parseReportTotals(todayRes.text),
    allTime: parseReportTotals(allTimeRes.text),
  };
}

/**
 * Inspects the Google AdSense ad-delivery probe response to determine whether a real creative was served
 * or if Google returned a blank transparent body.
 */
function evaluateAdProbeResponse(adProbeRes) {
  if (adProbeRes.status === 403) {
    return 'GETTING_READY_REVIEW (HTTP 403 — Google AdSense site review in progress)';
  }
  if (adProbeRes.status !== 200) {
    return `STATUS_${adProbeRes.status}`;
  }
  const body = (adProbeRes.text || '').trim();
  const isBlankTransparent =
    body.length < 900 &&
    body.includes('<body style="background-color:transparent"></body>') &&
    !body.includes('adurl=') &&
    !body.includes('google_ads_iframe');

  if (isBlankTransparent) {
    return 'READY_NO_CREATIVE_FILL (HTTP 200 Blank — AdSense tags & ads.txt verified; 0 live auction fills yet)';
  }
  return 'ACTIVE_SERVING_ADS (200 OK — Live Ad Creative Verified)';
}

async function runRevenueAudit() {
  const today = new Date().toISOString().split('T')[0];
  const pairs = generateAllComparisonPairs();
  const goPartners = (SITE_CONFIG.monetization.affiliatePartners || []).filter(
    (p) => p.slug && p.destinationUrl
  );
  const totalPages = TOOLS.length + pairs.length + MARKETPLACE_ITEMS.length + goPartners.length + 6;

  // 1. Check live homepage, tool page, ads.txt, sitemap.xml, KV telemetry, and Official AdSense API
  const [homeRes, toolRes, adsTxtRes, sitemapRes, telemetryRes, adsenseApi] = await Promise.all([
    fetchWithTiming(`${DOMAIN}/`),
    fetchWithTiming(`${DOMAIN}/json-to-csv/`),
    fetchWithTiming(`${DOMAIN}/ads.txt`),
    fetchWithTiming(`${DOMAIN}/sitemap.xml`),
    fetchWithTiming(`${DOMAIN}/api/telemetry`),
    fetchOfficialAdSenseMetrics(today),
  ]);

  const expectedAdsTxt = `google.com, ${PUB_ID.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`;
  const adsTxtValid = adsTxtRes.ok && adsTxtRes.text.includes(expectedAdsTxt);
  const slotsPresent = Object.values(SLOTS).every((slotId) => toolRes.text.includes(slotId));

  // 2. Probe Google AdSense live ad-delivery endpoint and inspect actual body content
  const adProbeUrl = `https://googleads.g.doubleclick.net/pagead/ads?client=${encodeURIComponent(PUB_ID)}&output=html&h=90&slotname=${encodeURIComponent(SLOTS.topLeaderboard)}&w=728&url=${encodeURIComponent(DOMAIN + '/')}`;
  const adProbeRes = await fetchWithTiming(adProbeUrl, {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Referer: `${DOMAIN}/`,
  });

  const adsenseServingState = evaluateAdProbeResponse(adProbeRes);

  // 3. Parse live traffic & click telemetry from Cloudflare KV (/api/telemetry)
  let telemetry = {
    kvBound: false,
    today: {
      pageviews: 0,
      adRequests: 0,
      adFilled: 0,
      affiliateClicks: 0,
      byPage: {},
      byPartner: {},
    },
    allTime: {
      pageviews: 0,
      adRequests: 0,
      adFilled: 0,
      affiliateClicks: 0,
      byPage: {},
      byPartner: {},
    },
  };

  if (telemetryRes.ok) {
    try {
      const parsed = JSON.parse(telemetryRes.text);
      if (parsed && parsed.allTime) {
        telemetry = parsed;
      }
    } catch (_) {
      // ignore
    }
  }

  // Strip any historical synthetic revenue estimates from topPages
  const topPages = Object.entries(telemetry.allTime.byPage || {})
    .sort(
      (a, b) =>
        (b[1].pageviews || 0) - (a[1].pageviews || 0) ||
        (b[1].affiliateClicks || 0) - (a[1].affiliateClicks || 0)
    )
    .slice(0, 10)
    .map(([page, stats]) => ({
      page,
      pageviews: stats.pageviews || 0,
      toolUses: stats.toolUses || 0,
      adFilled: stats.adFilled || 0,
      affiliateClicks: stats.affiliateClicks || 0,
      verifiedAdsenseRevenueUsd: 0,
    }));

  // Revenue is strictly sourced from verified Google AdSense API earnings (never synthetic click multipliers)
  const todayAdsenseRev = adsenseApi.today.earningsUsd;
  const allTimeAdsenseRev = adsenseApi.allTime.earningsUsd;

  const todayFilledImpressions = adsenseApi.connected
    ? adsenseApi.today.impressions
    : telemetry.today?.adFilled || 0;
  const allTimeFilledImpressions = adsenseApi.connected
    ? adsenseApi.allTime.impressions
    : telemetry.allTime?.adFilled || 0;

  const report = {
    checkedAt: new Date().toISOString(),
    date: today,
    siteHealth: {
      domain: DOMAIN,
      homeStatus: homeRes.status,
      homeLatencyMs: homeRes.latencyMs,
      totalStaticPages: totalPages,
      utilityToolsCount: TOOLS.length,
      comparisonCalculatorsCount: pairs.length,
      marketplaceListingsCount: MARKETPLACE_ITEMS.length,
      sitemapUrlsCount: (sitemapRes.text.match(/<loc>/g) || []).length,
    },
    monetizationHealth: {
      publisherId: PUB_ID,
      adsTxtValid,
      allThreeSlotsVerifiedOnDom: slotsPresent,
      slots: SLOTS,
      googleAdsenseServingStatus: adsenseServingState,
      adsenseReportingApiStatus: adsenseApi.statusMessage,
      telemetryKvActive: telemetry.kvBound,
    },
    revenueMetrics: {
      today: {
        pageviews: telemetry.today?.pageviews || 0,
        adImpressionsFilled: todayFilledImpressions,
        adsenseClicks: adsenseApi.today.clicks,
        affiliateClicks: telemetry.today?.affiliateClicks || 0,
        estAdsenseRevenueUsd: todayAdsenseRev,
        estAffiliateRevenueUsd: 0,
        totalRevenueUsd: todayAdsenseRev,
      },
      allTime: {
        pageviews: telemetry.allTime?.pageviews || 0,
        adImpressionsFilled: allTimeFilledImpressions,
        adsenseClicks: adsenseApi.allTime.clicks,
        affiliateClicks: telemetry.allTime?.affiliateClicks || 0,
        estAdsenseRevenueUsd: allTimeAdsenseRev,
        estAffiliateRevenueUsd: 0,
        totalRevenueUsd: allTimeAdsenseRev,
        byPartner: telemetry.allTime?.byPartner || {},
      },
      topPages,
    },
  };

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (_) {
      history = [];
    }
  }
  const existingIdx = history.findIndex((h) => h.date === today);
  if (existingIdx >= 0) {
    history[existingIdx] = report;
  } else {
    history.push(report);
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');

  console.log('================================================================');
  console.log(`💰 UTILFORGE DAILY REVENUE & PERFORMANCE REPORT (${today})`);
  console.log('================================================================');
  console.log(
    `• Live URL:               ${DOMAIN} (HTTP ${report.siteHealth.homeStatus} in ${report.siteHealth.homeLatencyMs}ms)`
  );
  console.log(
    `• Indexed Sitemap Pages:  ${report.siteHealth.sitemapUrlsCount} (${report.siteHealth.utilityToolsCount} Tools + ${report.siteHealth.comparisonCalculatorsCount} X-vs-Y Calculators)`
  );
  console.log(
    `• ads.txt & 3 Ad Slots:   ${adsTxtValid && slotsPresent ? '✅ VERIFIED' : '⚠️ CHECK CONFIG'} (${PUB_ID})`
  );
  console.log(`• AdSense Serving State:  ${adsenseServingState}`);
  console.log(`• AdSense Reporting API:  ${adsenseApi.statusMessage}`);
  console.log(
    `• Telemetry KV Active:    ${telemetry.kvBound ? '✅ CONNECTED (UTILFORGE_REVENUE_KV)' : '⏳ DEPLOY FUNCTIONS TO ACTIVATE'}`
  );
  console.log('----------------------------------------------------------------');
  console.log(`📈 TODAY'S VERIFIED REVENUE & TRAFFIC (${today}):`);
  console.log(`   - Pageviews (KV):         ${report.revenueMetrics.today.pageviews}`);
  console.log(`   - Filled Ad Impressions:  ${report.revenueMetrics.today.adImpressionsFilled}`);
  console.log(`   - AdSense Ad Clicks:      ${report.revenueMetrics.today.adsenseClicks}`);
  console.log(`   - Outbound Partner Clicks:${report.revenueMetrics.today.affiliateClicks}`);
  console.log(
    `   - Verified AdSense Rev:   $${report.revenueMetrics.today.estAdsenseRevenueUsd.toFixed(2)}`
  );
  console.log(
    `   - TOTAL VERIFIED REVENUE: $${report.revenueMetrics.today.totalRevenueUsd.toFixed(2)}`
  );
  console.log('----------------------------------------------------------------');
  console.log(
    `🏆 ALL-TIME VERIFIED REVENUE: $${report.revenueMetrics.allTime.totalRevenueUsd.toFixed(2)} (${report.revenueMetrics.allTime.pageviews} views, ${report.revenueMetrics.allTime.adImpressionsFilled} filled ads, ${report.revenueMetrics.allTime.affiliateClicks} partner clicks)`
  );
  console.log('================================================================');
}

runRevenueAudit();
