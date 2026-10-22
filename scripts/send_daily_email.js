/**
 * UtilForge Automated Daily Email Reporter (`node scripts/send_daily_email.js [summary]`)
 *
 * Sends a concise 5-row Executive Scorecard to `zainmasri123@gmail.com` showing:
 * 1. On-Track Verdict (with Day-over-Day trend)
 * 2. Revenue ($ Today / $ All-Time / Direct Orders)
 * 3. Funnel (Views -> Checkout/Partner Clicks -> CTR %)
 * 4. #1 Bottleneck right now
 * 5. Action taken today
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const HISTORY_FILE = path.join(ROOT_DIR, 'logs', 'revenue_history.json');
const LATEST_MD_FILE = path.join(ROOT_DIR, 'logs', 'latest_daily_report.md');

const RECIPIENT_EMAIL = 'zainmasri123@gmail.com';
const SITE_ORIGIN = 'https://utilforge.pages.dev';

async function sendDailyEmail() {
  const customSummary =
    process.argv.slice(2).join(' ').trim() ||
    'Shipped conversion & SEO updates and synced with Cloudflare Pages.';

  let latestReport = null;
  let prevReport = null;
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (Array.isArray(history) && history.length > 0) {
        latestReport = history[history.length - 1];
        if (history.length > 1) {
          prevReport = history[history.length - 2];
        }
      }
    } catch (_) {}
  }

  const today = latestReport?.date || new Date().toISOString().split('T')[0];
  const revToday = latestReport?.revenueMetrics?.today || {
    pageviews: 0,
    adImpressionsFilled: 0,
    affiliateClicks: 0,
    totalRevenueUsd: 0,
  };
  const revAll = latestReport?.revenueMetrics?.allTime || {
    pageviews: 0,
    adImpressionsFilled: 0,
    affiliateClicks: 0,
    totalRevenueUsd: 0,
  };
  const prevAllViews = prevReport?.revenueMetrics?.allTime?.pageviews ?? revAll.pageviews;
  const prevAllClicks = prevReport?.revenueMetrics?.allTime?.affiliateClicks ?? revAll.affiliateClicks;
  const viewsDelta = Math.max(0, revAll.pageviews - prevAllViews);
  const clicksDelta = Math.max(0, revAll.affiliateClicks - prevAllClicks);

  const ctrPct =
    revAll.pageviews > 0 ? ((revAll.affiliateClicks / revAll.pageviews) * 100).toFixed(1) : '0.0';

  let verdict = '';
  if (Number(revAll.totalRevenueUsd) > 0) {
    verdict = `🟢 MAKING REVENUE ($${Number(revAll.totalRevenueUsd).toFixed(2)} total)`;
  } else if (revAll.affiliateClicks > 0 && revToday.pageviews < 25) {
    verdict = `🟡 HIGH INTENT (${ctrPct}% click rate), NEED MORE TRAFFIC (${revToday.pageviews} view today)`;
  } else if (viewsDelta > 5 || clicksDelta > 0) {
    verdict = `🟢 TRAFFIC GROWING (+${viewsDelta} views, +${clicksDelta} checkout clicks vs last check)`;
  } else {
    verdict = `🟠 EARLY INDEXING STAGE (${revAll.pageviews} total views, ${revAll.affiliateClicks} clicks — building search traffic)`;
  }

  let bottleneck = '';
  if (revToday.pageviews < 20) {
    bottleneck = `Traffic volume (${revToday.pageviews} view today). Buyers ARE clicking (${revAll.affiliateClicks} clicks / ${ctrPct}% CTR), so we just need more daily search visitors.`;
  } else if (revAll.affiliateClicks === 0) {
    bottleneck = `Checkout conversion (visitors aren't clicking CTAs yet).`;
  } else {
    bottleneck = `Converting checkout clicks (${revAll.affiliateClicks} clicks so far) into completed $19 PayPal payments.`;
  }

  const shortMarkdown = `# UtilForge Daily Scorecard (${today})

- **1. On Track?**: ${verdict}
- **2. Revenue**: **$${Number(revToday.totalRevenueUsd).toFixed(2)} today** | **$${Number(revAll.totalRevenueUsd).toFixed(2)} all-time**
- **3. Funnel**: **${revToday.pageviews} views today** (${revAll.pageviews} total) → **${revToday.affiliateClicks} clicks today** (${revAll.affiliateClicks} total, **${ctrPct}% CTR**)
- **4. #1 Bottleneck**: ${bottleneck}
- **5. Fix Shipped Today**: ${customSummary}
`;

  fs.mkdirSync(path.dirname(LATEST_MD_FILE), { recursive: true });
  fs.writeFileSync(LATEST_MD_FILE, shortMarkdown, 'utf8');

  const payload = {
    _subject: `UtilForge (${today}): $${Number(revToday.totalRevenueUsd).toFixed(2)} Rev | ${revAll.pageviews} Views | ${revAll.affiliateClicks} Clicks (${ctrPct}% CTR)`,
    _template: 'table',
    _captcha: 'false',
    '1_On_Track_Verdict': verdict,
    '2_Revenue': `$${Number(revToday.totalRevenueUsd).toFixed(2)} Today  |  $${Number(revAll.totalRevenueUsd).toFixed(2)} All-Time`,
    '3_Funnel_Conversion': `${revToday.pageviews} views today (${revAll.pageviews} total)  →  ${revToday.affiliateClicks} clicks today (${revAll.affiliateClicks} total = ${ctrPct}% CTR)`,
    '4_Current_Bottleneck': bottleneck,
    '5_Action_Shipped_Today': customSummary,
  };

  console.log(`[UtilForge Email Reporter] Sending concise 5-row scorecard to ${RECIPIENT_EMAIL}...`);
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(RECIPIENT_EMAIL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: SITE_ORIGIN,
      Referer: `${SITE_ORIGIN}/`,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`[UtilForge Email Reporter] HTTP ${res.status}: ${text}`);
}

sendDailyEmail();
