/**
 * Cloudflare Pages Function: /api/telemetry
 * Tracks real-time monetization metrics in UTILFORGE_REVENUE_KV:
 * - Pageviews per tool / comparison calculator
 * - Filled vs. unfilled Google AdSense slot impressions
 * - Affiliate link clicks (Sidebar partner rail + X-vs-Y calculator CTAs)
 * - Estimated AdSense + Affiliate revenue ($ USD)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

async function loadStats(kv, key) {
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    // ignore parse error
  }
  return {
    updatedAt: new Date().toISOString(),
    pageviews: 0,
    toolUses: 0,
    adRequests: 0,
    adFilled: 0,
    affiliateClicks: 0,
    estAdsenseRevenueUsd: 0,
    estAffiliateRevenueUsd: 0,
    totalEstRevenueUsd: 0,
    byPage: {},
    byPartner: {},
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function sanitizeBucket(bucket) {
  if (!bucket) return bucket;
  // Outbound link clicks are traffic events, not settled revenue.
  // Do not report synthetic $1.85/click estimates as actual USD revenue.
  bucket.estAffiliateRevenueUsd = 0;
  if ((bucket.adFilled || 0) === 0) {
    bucket.estAdsenseRevenueUsd = 0;
  }
  bucket.totalEstRevenueUsd = Number(
    ((bucket.estAdsenseRevenueUsd || 0) + (bucket.estAffiliateRevenueUsd || 0)).toFixed(4)
  );
  if (bucket.byPage && typeof bucket.byPage === 'object') {
    for (const pageStats of Object.values(bucket.byPage)) {
      if ((pageStats.adFilled || 0) === 0) {
        pageStats.estRevenueUsd = 0;
      }
    }
  }
  return bucket;
}

export async function onRequestGet(context) {
  const kv = context.env?.UTILFORGE_REVENUE_KV;
  const url = new URL(context.request.url);
  const partnerSlug = url.searchParams.get('go');

  if (partnerSlug && kv) {
    try {
      const overridesRaw = await kv.get('config:affiliates');
      if (overridesRaw) {
        const overrides = JSON.parse(overridesRaw);
        if (overrides[partnerSlug]) {
          return new Response(JSON.stringify({ status: 'ok', destinationUrl: overrides[partnerSlug] }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (_) {}
    return new Response(JSON.stringify({ status: 'default' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const today = getTodayKey();
  const [allTimeRaw, dailyRaw, leadsRaw] = await Promise.all([
    loadStats(kv, 'stats:all_time'),
    loadStats(kv, `stats:day:${today}`),
    kv ? kv.get('leads:orders').catch(() => null) : Promise.resolve(null),
  ]);
  const allTime = sanitizeBucket(allTimeRaw);
  const daily = sanitizeBucket(dailyRaw);
  let orderLeads = [];
  try {
    if (leadsRaw) orderLeads = JSON.parse(leadsRaw);
  } catch (_) {}

  return new Response(
    JSON.stringify(
      {
        status: 'ok',
        kvBound: Boolean(kv),
        date: today,
        today: daily,
        allTime,
        orderLeadsCount: orderLeads.length,
        recentOrderLeads: orderLeads.slice(-10),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function onRequestPost(context) {
  const kv = context.env?.UTILFORGE_REVENUE_KV;
  if (!kv) {
    return new Response(JSON.stringify({ status: 'no_kv' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch (_) {
    return new Response(JSON.stringify({ status: 'invalid_json' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const eventType = String(body.type || 'pageview');
  const page = String(body.page || '/').slice(0, 120);
  const partner = String(body.partner || '').slice(0, 80);
  const today = getTodayKey();

  const [allTimeRaw, dailyRaw] = await Promise.all([
    loadStats(kv, 'stats:all_time'),
    loadStats(kv, `stats:day:${today}`),
  ]);
  const allTime = sanitizeBucket(allTimeRaw);
  const daily = sanitizeBucket(dailyRaw);

  for (const bucket of [allTime, daily]) {
    bucket.updatedAt = new Date().toISOString();
    if (!bucket.byPage[page]) {
      bucket.byPage[page] = {
        pageviews: 0,
        toolUses: 0,
        adFilled: 0,
        affiliateClicks: 0,
        estRevenueUsd: 0,
      };
    }
    const p = bucket.byPage[page];

    if (eventType === 'pageview') {
      bucket.pageviews += 1;
      p.pageviews += 1;
    } else if (eventType === 'tool_use') {
      bucket.toolUses += 1;
      p.toolUses += 1;
    } else if (eventType === 'ad_filled') {
      bucket.adRequests += 1;
      bucket.adFilled += 1;
      p.adFilled += 1;
    } else if (eventType === 'ad_unfilled') {
      bucket.adRequests += 1;
    } else if (eventType === 'affiliate_click' || eventType === 'order_lead') {
      bucket.affiliateClicks += 1;
      p.affiliateClicks += 1;
      if (partner) {
        bucket.byPartner[partner] = (bucket.byPartner[partner] || 0) + 1;
      }
    }

    bucket.totalEstRevenueUsd = Number(
      ((bucket.estAdsenseRevenueUsd || 0) + (bucket.estAffiliateRevenueUsd || 0)).toFixed(4)
    );
  }

  const writes = [
    kv.put('stats:all_time', JSON.stringify(allTime)),
    kv.put(`stats:day:${today}`, JSON.stringify(daily)),
  ];

  if (eventType === 'order_lead' && body.email) {
    try {
      const existingRaw = await kv.get('leads:orders');
      const leads = existingRaw ? JSON.parse(existingRaw) : [];
      leads.push({
        createdAt: new Date().toISOString(),
        email: String(body.email).slice(0, 120),
        packageType: String(body.packageType || partner).slice(0, 120),
        page,
      });
      writes.push(kv.put('leads:orders', JSON.stringify(leads.slice(-200))));
    } catch (_) {}
  }

  await Promise.all(writes);

  return new Response(JSON.stringify({ status: 'recorded', eventType }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
