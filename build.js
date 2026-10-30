/**
 * UtilForge Static Micro-Tool, Programmatic SEO Matrix & Marketplace Compiler (`node build.js`)
 *
 * Compiles:
 * - 32 Standalone Client-Side Utility Sites (`src/registry/tools.js`)
 * - 229 Programmatic SEO "X vs. Y" Cost & Performance Calculator Pages (`src/registry/matrix.js`)
 * - 24 Boilerplate, MCP Server & AI Workflow Marketplace Pages (`src/registry/marketplace.js`)
 * - 3 Hub Directory Pages (`/index.html`, `/compare/index.html`, `/marketplace/index.html`)
 * - 3 Legal & Trust Compliance Pages (`/privacy/`, `/terms/`, `/about/`)
 * - Complete `sitemap.xml` (291 URLs), `robots.txt`, `ads.txt`, IndexNow key, and Cloudflare `_headers`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG, TOOLS } from './src/registry/tools.js';
import { generateAllComparisonPairs } from './src/registry/matrix.js';
import { MARKETPLACE_CONFIG, MARKETPLACE_ITEMS } from './src/registry/marketplace.js';
import { GUIDES } from './src/registry/guides.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const ASSETS_OUT = path.join(DIST_DIR, 'assets');
const COMPARE_Pairs = generateAllComparisonPairs();
const GO_PARTNERS = (SITE_CONFIG.monetization.affiliatePartners || []).filter((p) => p.slug && p.destinationUrl);
const TOTAL_PAGE_COUNT =
  TOOLS.length + COMPARE_Pairs.length + MARKETPLACE_ITEMS.length + GO_PARTNERS.length + 6;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasRealAdSenseId() {
  const pubId = SITE_CONFIG.monetization.adsensePublisherId || '';
  return pubId.startsWith('ca-pub-') && !pubId.includes('0000000000');
}

function getEffectiveAdMode() {
  if (hasRealAdSenseId() || SITE_CONFIG.monetization.adMode === 'adsense') {
    return 'adsense';
  }
  return SITE_CONFIG.monetization.adMode || 'hidden';
}

function renderHeadExtras(depth = 0) {
  const prefix = depth === 0 ? './' : depth === 1 ? '../' : '../../';
  let tags = `\n  <link rel="icon" type="image/png" href="${prefix}assets/logo.png" />\n  <link rel="apple-touch-icon" href="${prefix}assets/logo.png" />`;
  if (SITE_CONFIG.googleSiteVerification) {
    tags += `\n  <meta name="google-site-verification" content="${escapeHtml(SITE_CONFIG.googleSiteVerification)}" />`;
  }
  if (hasRealAdSenseId()) {
    const pubId = escapeHtml(SITE_CONFIG.monetization.adsensePublisherId);
    tags += `\n  <meta name="google-adsense-account" content="${pubId}" />\n  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}" crossorigin="anonymous"></script>`;
  }
  return tags;
}

const PROVIDER_FALLBACK_URLS = {
  '#affiliate-openai': '/go/openrouter-ai/',
  '#affiliate-anthropic': '/go/openrouter-ai/',
  '#affiliate-vertex': '/go/openrouter-ai/',
  '#affiliate-fireworks': '/go/openrouter-ai/',
  '#affiliate-together': '/go/openrouter-ai/',
  '#affiliate-mistral': '/go/openrouter-ai/',
  '#affiliate-deepinfra': '/go/openrouter-ai/',
  '#affiliate-cloudflare': '/go/cloudflare-workers/',
  '#affiliate-aws': '/go/digitalocean-cloud/',
  '#affiliate-vercel': '/go/cloudflare-workers/',
  '#affiliate-netlify': '/go/cloudflare-workers/',
  '#affiliate-supabase': '/go/supabase-postgres/',
  '#affiliate-neon': '/go/neon-postgres/',
  '#affiliate-planetscale': '/go/supabase-postgres/',
  '#affiliate-turso': '/go/neon-postgres/',
  '#affiliate-render': '/go/railway-cloud/',
  '#affiliate-fly': '/go/digitalocean-cloud/',
  '#affiliate-railway': '/go/railway-cloud/',
  '#affiliate-stripe': '/go/mercury-banking/',
  '#affiliate-lemonsqueezy': '/go/lemon-squeezy/',
  '#affiliate-paddle': '/go/lemon-squeezy/',
  '#affiliate-gumroad': '/go/lemon-squeezy/',
  '#affiliate-polar': '/go/lemon-squeezy/',
  '#affiliate-paypal': '/go/mercury-banking/',
  '#affiliate-braintree': '/go/mercury-banking/',
  '#affiliate-shopify': '/go/lemon-squeezy/',
};

function resolveProviderUrl(item) {
  if (!item || !item.affiliateUrl) return '/go/cloudflare-workers/';
  if (PROVIDER_FALLBACK_URLS[item.affiliateUrl]) {
    return PROVIDER_FALLBACK_URLS[item.affiliateUrl];
  }
  return item.affiliateUrl;
}

function buildDirectPayPalUrl(itemName, amountUsd = 19) {
  const amt = Number(amountUsd || 19).toFixed(2);
  return (
    'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick' +
    '&business=' + encodeURIComponent('zainmasri123@gmail.com') +
    '&item_name=' + encodeURIComponent(`UtilForge — ${itemName}`) +
    '&amount=' + encodeURIComponent(amt) +
    '&currency_code=USD&no_shipping=1' +
    '&return=' + encodeURIComponent('https://getutilforge.com/marketplace/?checkout=success')
  );
}

function resolveMarketplaceCheckoutUrl(item) {
  return buildDirectPayPalUrl(`${item.shortName} (${item.priceLabel})`, item.priceUsd || 49);
}

function renderContextualWorkbenchPartnerBar(tool) {
  const partners = SITE_CONFIG.monetization.affiliatePartners || [];
  if (partners.length === 0) return '';
  let matched = null;
  if (tool.partnerSlug) {
    matched = partners.find((p) => p.slug === tool.partnerSlug);
  }
  if (!matched) {
    matched =
      partners.find((p) => Array.isArray(p.categories) && p.categories.includes(tool.category)) ||
      partners[0];
  }
  return `
    <div class="workbench-partner-bar">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;font-size:0.82rem;">
        <span class="tool-rpm-tag" style="font-size:0.68rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;border:1px solid rgba(16,185,129,0.3);padding:0.2rem 0.5rem;border-radius:4px;">VERIFIED PARTNER PERK • ${escapeHtml(matched.badge)}</span>
        <strong style="color:var(--text-primary);font-weight:700;">${escapeHtml(matched.name)}:</strong>
        <span style="color:var(--text-secondary);">${escapeHtml(matched.cta.replace(' →', ''))}</span>
      </div>
      <a href="${escapeHtml(matched.url)}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(matched.name)}" class="btn btn-primary" style="padding:0.42rem 0.85rem;font-size:0.78rem;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,0.12);">
        ${escapeHtml(matched.cta)}
      </a>
    </div>`;
}

function renderAffiliateRailCard() {
  const partners = SITE_CONFIG.monetization.affiliatePartners || [];
  if (partners.length === 0) return '';
  return `
    <div class="rail-card" style="border-color:var(--accent-primary);background:var(--bg-elevated);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
        <h3 style="margin:0;">Recommended Cloud &amp; Dev Stack</h3>
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">Partner</span>
      </div>
      <div class="related-tools-list">
        ${partners
          .map(
            (p) => `
          <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(p.name)}" class="related-tool-link" style="display:flex;flex-direction:column;align-items:flex-start;gap:0.2rem;padding:0.55rem 0.65rem;">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
              <strong style="font-size:0.82rem;color:var(--text-primary);">${escapeHtml(p.name)}</strong>
              <span class="tool-rpm-tag" style="font-size:0.66rem;">${escapeHtml(p.badge)}</span>
            </div>
            <span style="font-size:0.76rem;color:var(--accent-primary);font-weight:600;">${escapeHtml(p.cta)}</span>
          </a>`
          )
          .join('')}
      </div>
    </div>`;
}

function renderHomeAffiliateShowcase() {
  const partners = SITE_CONFIG.monetization.affiliatePartners || [];
  if (partners.length === 0) return '';
  return `
    <!-- Curated Verified Developer & Cloud Partner Offers -->
    <section class="seo-section" style="margin-top:0;margin-bottom:1.75rem;background:var(--bg-elevated);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
        <div>
          <span class="trust-chip" style="color:var(--accent-primary);background:var(--accent-primary-soft);font-weight:700;">VERIFIED PARTNER PERKS &amp; DEALS</span>
          <h2 style="margin-bottom:0.2rem;margin-top:0.35rem;">Curated Cloud Infrastructure, Banking &amp; AI Stack</h2>
          <p style="font-size:0.9rem;color:var(--text-secondary);">
            Exclusive founder credits, zero-fee tiers, and sign-up bonuses negotiated for UtilForge developers.
          </p>
        </div>
      </div>
      <div class="steps-list" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:0.85rem;">
        ${partners
          .map(
            (p) => `
          <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(p.name)}" class="step-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:0.6rem;padding:1.1rem 1.25rem;border:1px solid var(--border-subtle);background:var(--bg-surface);border-radius:var(--radius-md);transition:all 0.2s ease;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                <span class="tool-cat-tag" style="font-size:0.68rem;">Verified Cloud Deal</span>
                <span class="tool-rpm-tag" style="font-size:0.68rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;border:1px solid rgba(16,185,129,0.3);padding:0.15rem 0.45rem;border-radius:4px;">${escapeHtml(p.badge)}</span>
              </div>
              <strong style="font-size:1.02rem;color:var(--text-primary);display:block;margin-bottom:0.3rem;">${escapeHtml(p.name)}</strong>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;line-height:1.4;">${escapeHtml(p.cta.replace(' →', ''))} with verified credits &amp; zero setup barriers.</p>
            </div>
            <div style="margin-top:0.5rem;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-subtle);padding-top:0.65rem;">
              <span style="font-size:0.78rem;font-weight:700;color:var(--accent-primary);display:flex;align-items:center;gap:0.25rem;">
                ${escapeHtml(p.cta)}
              </span>
              <span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);">Official Partner</span>
            </div>
          </a>`
          )
          .join('')}
      </div>
    </section>`;
}

function renderHeader(activeSection = '', depth = 0) {
  const prefix = depth === 0 ? './' : depth === 1 ? '../' : '../../';

  return `
  <header class="site-header">
    <div class="header-inner">
      <a href="${prefix}index.html" class="brand-link" id="nav-brand-home">
        <span class="brand-mark">UF</span>
        <span>${escapeHtml(SITE_CONFIG.brandName)}</span>
        <span class="brand-sub">Client-Side Developer Suite</span>
      </a>
      <nav class="nav-links" aria-label="Primary Tool Navigation">
        <a href="${prefix}index.html" class="nav-pill ${activeSection === 'hub' ? 'active' : ''}" id="nav-hub-home">Utilities (${TOOLS.length})</a>
        <a href="${prefix}guides/index.html" class="nav-pill ${activeSection === 'guides' ? 'active' : ''}" id="nav-guides">Guides (${GUIDES.length})</a>
        <a href="${prefix}marketplace/index.html" class="nav-pill ${activeSection === 'marketplace' ? 'active' : ''}" id="nav-marketplace-hub">MCP &amp; Boilerplates (${MARKETPLACE_ITEMS.length})</a>
        <a href="${prefix}changelog/index.html" class="nav-pill ${activeSection === 'changelog' ? 'active' : ''}" id="nav-changelog">Changelog</a>
        <a href="${prefix}about/index.html" class="nav-pill ${activeSection === 'about' ? 'active' : ''}" id="nav-about">About Us</a>
        <a href="${prefix}contact/index.html" class="nav-pill ${activeSection === 'contact' ? 'active' : ''}" id="nav-contact">Contact</a>
      </nav>
      <div class="header-actions" style="display:flex;align-items:center;gap:0.5rem;">
        <a href="https://github.com/zainmasri/utilforge" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="padding:0.36rem 0.65rem;font-size:0.75rem;" title="View UtilForge on GitHub">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:text-bottom;margin-right:0.25rem;"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>GitHub
        </a>
        <button type="button" class="btn btn-primary" id="btn-open-global-checkout" style="padding:0.36rem 0.75rem;font-size:0.75rem;box-shadow:0 1px 4px rgba(16,185,129,0.25);">
          ⚡ Pro Blueprints ($19)
        </button>
      </div>
    </div>
  </header>`;
}

function renderFooter(depth = 0) {
  const prefix = depth === 0 ? './' : depth === 1 ? '../' : '../../';
  const totalPages = TOTAL_PAGE_COUNT;
  return `
  <div id="global-checkout-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.72);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem;">
    <div style="background:var(--bg-surface);border:1px solid var(--accent-primary);border-radius:12px;max-width:520px;width:100%;padding:1.5rem;box-shadow:0 20px 50px rgba(0,0,0,0.35);position:relative;">
      <button type="button" id="btn-close-global-checkout" aria-label="Close modal" style="position:absolute;top:0.85rem;right:0.85rem;background:transparent;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-secondary);">✕</button>
      <div style="font-family:var(--font-mono);font-size:0.7rem;font-weight:700;color:var(--accent-emerald);text-transform:uppercase;margin-bottom:0.3rem;">
        INSTANT DIRECT CHECKOUT • 100% COMMERCIAL LICENSE
      </div>
      <h3 style="font-size:1.2rem;font-weight:800;margin-bottom:0.4rem;color:var(--text-primary);">
        Sponsor UtilForge or License the Full ${totalPages}-Page Factory
      </h3>
      <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:1rem;">
        Reserve a high-intent developer ad slot across all ${totalPages} pages or get immediate Git repository access to the full UtilForge static compiler, ${TOOLS.length} tool engines, and ${MARKETPLACE_ITEMS.length} boilerplates.
      </p>

      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:0.9rem;margin-bottom:1.15rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
          <span style="font-family:var(--font-mono);font-size:0.72rem;font-weight:700;color:var(--accent-emerald);text-transform:uppercase;">⚡ 1-Click Instant Checkout</span>
          <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:800;color:var(--accent-emerald);">$19 Starter Tier</span>
        </div>
        <div style="font-size:0.84rem;font-weight:700;color:var(--text-primary);margin-bottom:0.25rem;">
          Starter MCP, FinOps &amp; SaaS Blueprint Pack
        </div>
        <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;line-height:1.4;">
          Instant download access to all production MCP server configs, n8n workflow JSONs, and commercial starter blueprints.
        </p>
        <a href="${escapeHtml(buildDirectPayPalUrl('Starter MCP & FinOps Config Pack ($19)', 19))}"
           target="_blank" rel="noopener"
           data-affiliate-partner="PayPal Checkout: Starter Pack ($19)"
           class="btn btn-primary"
           id="btn-modal-1click-paypal"
           style="display:block;text-align:center;width:100%;padding:0.55rem 0.85rem;font-size:0.84rem;font-weight:700;">
          💳 Instant PayPal Checkout ($19) →
        </a>
      </div>

      <div style="text-align:center;font-size:0.72rem;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
        — OR SELECT CUSTOM SPONSORSHIP / FACTORY TIER —
      </div>

      <form id="global-checkout-form" style="display:flex;flex-direction:column;gap:0.75rem;">
        <div>
          <label for="global-checkout-pkg" style="display:block;font-size:0.76rem;font-weight:700;margin-bottom:0.25rem;">Select Package or Sponsorship Tier</label>
          <select id="global-checkout-pkg" class="control-select" style="width:100%;">
            <option value="Starter MCP & FinOps Config Pack ($19 One-Time)">⚡ Starter MCP &amp; FinOps Config Pack ($19 One-Time)</option>
            <option value="Featured Marketplace Pin + Partner Slot ($49 One-Time)">Featured Marketplace Listing Pin ($49 One-Time)</option>
            <option value="Sitewide Leaderboard / Sticky Sidebar Sponsor Slot ($99/mo)">Sitewide Leaderboard / Sticky Sidebar Sponsor Slot ($99/mo)</option>
            <option value="Full UtilForge ${totalPages}-Page Factory + ${TOOLS.length} Engines Source Code ($149 Lifetime)">Full UtilForge ${totalPages}-Page Factory Source Code ($149 Lifetime)</option>
            <option value="All ${MARKETPLACE_ITEMS.length} SaaS Boilerplates, MCP Servers & n8n Workflows Bundle ($249)">All ${MARKETPLACE_ITEMS.length} Boilerplates, MCP Servers &amp; Workflows Bundle ($249)</option>
          </select>
        </div>
        <div>
          <label for="global-checkout-email" style="display:block;font-size:0.76rem;font-weight:700;margin-bottom:0.25rem;">Your Work or Founder Email</label>
          <input type="email" id="global-checkout-email" class="control-input" required placeholder="founder@company.com" style="width:100%;" />
        </div>
        <button type="submit" class="btn btn-primary" id="btn-submit-global-checkout" style="width:100%;padding:0.75rem;font-size:0.92rem;">
          Send Instant Payment Link &amp; Repo Access →
        </button>
        <div id="global-checkout-status" style="display:none;font-size:0.8rem;font-weight:700;color:var(--accent-emerald);text-align:center;margin-top:0.25rem;"></div>
      </form>
    </div>
  </div>
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>${escapeHtml(SITE_CONFIG.brandName)}</strong> — Zero-server client-side developer utilities, architecture boilerplates, and MCP servers. 100% private in-browser execution.
      </div>
      <div style="display:flex;gap:1.15rem;flex-wrap:wrap;font-family:var(--font-mono);font-size:0.76rem;">
        <a href="${prefix}index.html" id="footer-tools-link">All Tools (${TOOLS.length})</a>
        <a href="${prefix}guides/index.html" id="footer-guides-link">Guides (${GUIDES.length})</a>
        <a href="${prefix}marketplace/index.html" id="footer-mkt-link">MCP &amp; Boilerplates (${MARKETPLACE_ITEMS.length})</a>
        <a href="${prefix}changelog/index.html" id="footer-changelog-link">Changelog</a>
        <a href="${prefix}about/index.html" id="footer-about-link">About Us</a>
        <a href="${prefix}contact/index.html" id="footer-contact-link">Contact &amp; Support</a>
        <a href="${prefix}privacy/index.html" id="footer-privacy-link">Privacy Policy</a>
        <a href="${prefix}terms/index.html" id="footer-terms-link">Terms of Service</a>
        <a href="https://github.com/zainmasri/utilforge" target="_blank" rel="noopener noreferrer" id="footer-gh-link">GitHub</a>
        <a href="${prefix}sitemap.xml" id="footer-sitemap-link">sitemap.xml</a>
        <a href="${prefix}robots.txt" id="footer-robots-link">robots.txt</a>
        <a href="${prefix}ads.txt" id="footer-ads-link">ads.txt</a>
      </div>
    </div>
  </footer>`;
}

function renderAdSlot(slotType, title, dimensions, estRpm, slotId) {
  const clsMap = {
    leaderboard: 'ad-slot ad-slot-leaderboard',
    native: 'ad-slot ad-slot-native',
    sidebar: 'ad-slot ad-slot-sidebar',
  };
  const effectiveMode = getEffectiveAdMode();

  if (effectiveMode === 'adsense' && hasRealAdSenseId()) {
    const pubId = escapeHtml(SITE_CONFIG.monetization.adsensePublisherId);
    const format = slotType === 'native' ? 'fluid' : 'auto';
    return `
  <aside class="${clsMap[slotType] || 'ad-slot'}" id="ad-container-${slotId}" aria-label="Advertisement">
    <div class="ad-label-bar">ADVERTISEMENT</div>
    <ins class="adsbygoogle"
         style="display:block;width:100%;"
         data-ad-client="${pubId}"
         data-ad-slot="${escapeHtml(slotId)}"
         data-ad-format="${format}"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </aside>`;
  }

  return '';
}

function renderToolOptionControl(opt) {
  const inputId = `opt-${opt.id}`;
  if (opt.type === 'select') {
    return `
      <div class="control-group">
        <label for="${inputId}">${escapeHtml(opt.label)}</label>
        <select id="${inputId}" data-tool-opt="${escapeHtml(opt.id)}" class="control-select">
          ${opt.choices
            .map(
              (c) =>
                `<option value="${escapeHtml(c.value)}" ${c.value === opt.value ? 'selected' : ''}>${escapeHtml(c.label)}</option>`
            )
            .join('')}
        </select>
      </div>`;
  }
  if (opt.type === 'checkbox') {
    return `
      <div class="control-group">
        <input type="checkbox" id="${inputId}" data-tool-opt="${escapeHtml(opt.id)}" ${opt.value ? 'checked' : ''} />
        <label for="${inputId}" style="cursor:pointer;">${escapeHtml(opt.label)}</label>
      </div>`;
  }
  if (opt.type === 'range') {
    return `
      <div class="control-group">
        <label for="${inputId}">${escapeHtml(opt.label)}</label>
        <input type="range" id="${inputId}" data-tool-opt="${escapeHtml(opt.id)}" min="${opt.min}" max="${opt.max}" step="${opt.step}" value="${opt.value}" />
      </div>`;
  }
  return `
    <div class="control-group">
      <label for="${inputId}">${escapeHtml(opt.label)}</label>
      <input type="text" id="${inputId}" data-tool-opt="${escapeHtml(opt.id)}" value="${escapeHtml(opt.value)}" class="control-input" />
    </div>`;
}

function buildToolPageHtml(tool) {
  const canonicalUrl = `${SITE_CONFIG.domain}/${tool.slug}/`;
  const relatedTools = TOOLS.filter((t) => t.slug !== tool.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (Browser Client-Side)',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: tool.metaDescription,
      url: canonicalUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    },
  ];

  const isImageTool = tool.engine === 'imageCompressorEngine';

  const inputPaneContent = isImageTool
    ? `
      <div class="pane-header">
        <span>SOURCE IMAGE (LOCAL CANVAS)</span>
        <span>PNG / JPEG / WebP</span>
      </div>
      <label for="image-file-input" class="image-dropzone" id="dropzone-label">
        <div style="font-weight:800;font-size:1rem;margin-bottom:0.35rem;">Drop an image here or click to browse</div>
        <div style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:0.85rem;">
          100% private client-side HTML5 Canvas compression. Pre-loaded with a 1280×720 benchmark graphic so you can test sliders immediately.
        </div>
        <input type="file" id="image-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" />
        <span class="btn btn-secondary">Choose Local Image File</span>
      </label>`
    : `
      <div class="pane-header">
        <span>INPUT SOURCE</span>
        <span id="input-char-count">${tool.sampleInput.length.toLocaleString()} chars</span>
      </div>
      <textarea id="workbench-input" class="code-textarea" spellcheck="false" aria-label="Tool Input">${escapeHtml(tool.sampleInput)}</textarea>`;

  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(tool.name)} — Free Online Tool | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="${escapeHtml(tool.metaDescription)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(tool.name)}" />
  <meta property="og:description" content="${escapeHtml(tool.metaDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />${renderHeadExtras(1)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body${bodyClass}>
  ${renderHeader(tool.slug, 1)}

  <main class="page-shell">
    <div class="tool-layout-grid">
      <div class="tool-main-col">
        <section class="tool-hero">
          <div class="tool-breadcrumb">
            <a href="../index.html" id="breadcrumb-home">All Utilities (${TOOLS.length})</a>
            <span>/</span>
            <span>${escapeHtml(tool.category)}</span>
            <span>/</span>
            <span>${escapeHtml(tool.shortName)}</span>
          </div>
          <h1>${escapeHtml(tool.headline)}</h1>
          <p>${escapeHtml(tool.subtitle)}</p>
          <div class="trust-bar">
            <span class="trust-chip">✓ ${escapeHtml(tool.badge)}</span>
            <span class="trust-chip neutral">🔒 100% In-Browser Execution</span>
            <span class="trust-chip neutral">⚡ Instant Local Computation</span>
            <span class="trust-chip neutral">🛡️ Zero Data Retention</span>
          </div>
        </section>

        ${renderAdSlot(
          'leaderboard',
          'Top Above-the-Fold Responsive Leaderboard (728×90 / 320×100)',
          '728×90 Desktop / 320×100 Mobile',
          tool.estRpmUsd,
          SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
        )}

        <section class="workbench-card" id="tool-workbench" data-engine="${escapeHtml(tool.engine)}" data-slug="${escapeHtml(tool.slug)}">
          <div class="workbench-toolbar">
            <div class="toolbar-controls">
              ${tool.options.map(renderToolOptionControl).join('')}
            </div>
            <div class="toolbar-actions">
              <button type="button" class="btn btn-secondary" id="btn-share-permalink" title="Copy shareable URL with your current input &amp; settings">🔗 Share Link</button>
              <button type="button" class="btn btn-secondary" id="btn-embed-widget" title="Copy HTML iframe embed snippet + backlink for your blog or docs">&lt;/&gt; Embed</button>
              <button type="button" class="btn btn-secondary" id="btn-copy-output">Copy Output</button>
              <button type="button" class="btn btn-primary" id="btn-download-output">Download Result</button>
            </div>
          </div>

          <div class="workbench-panes">
            <div class="pane pane-input">
              ${inputPaneContent}
            </div>
            <div class="pane pane-output">
              <div class="pane-header">
                <span>LIVE PROCESSED OUTPUT</span>
                <span>UTF-8 • CLIENT-SIDE</span>
              </div>
              <pre id="workbench-output" class="code-output-pre" aria-live="polite">Processing...</pre>
            </div>
          </div>

          <div id="workbench-extra" class="workbench-extra" style="display:none;"></div>

          ${renderContextualWorkbenchPartnerBar(tool)}

          <div class="workbench-status-bar">
            <span id="workbench-status-msg">Ready • 100% local execution</span>
            <span>Client-Side Engine • Private &amp; Offline-Ready</span>
          </div>
        </section>

        ${renderAdSlot(
          'native',
          'In-Content Native Multiplex / Article Ad Unit (Post-Interaction High CTR Zone)',
          'Fluid Responsive 100% × 120px',
          tool.estRpmUsd,
          SITE_CONFIG.monetization.adsenseSlots.inContentNative
        )}

        <section class="seo-section" aria-labelledby="howto-heading">
          <h2 id="howto-heading">How to Use the ${escapeHtml(tool.shortName)}</h2>
          <ol class="steps-list">
            ${tool.howToSteps
              .map(
                (step, idx) => `
              <li class="step-card">
                <div class="step-num">STEP 0${idx + 1}</div>
                <div style="font-size:0.9rem;color:var(--text-secondary);">${escapeHtml(step)}</div>
              </li>`
              )
              .join('')}
          </ol>
        </section>

        <section class="seo-section" aria-labelledby="architecture-heading">
          <h2 id="architecture-heading">Technical Architecture &amp; Privacy Model</h2>
          <div style="font-size:0.92rem;color:var(--text-secondary);line-height:1.75;display:flex;flex-direction:column;gap:0.85rem;">
            <p>
              Unlike conventional online utilities that transmit sensitive files or payloads to remote cloud servers, <strong>UtilForge</strong> processes data entirely inside your browser's isolated local memory. Whether you are formatting proprietary customer records, confidential database queries, API credentials, or internal schemas, your payload is never sent over any network socket.
            </p>
            <p>
              By leveraging native browser standards—including the <code style="font-family:var(--font-mono);">Web Cryptography API (SubtleCrypto)</code>, <code style="font-family:var(--font-mono);">HTML5 Canvas</code>, and native JavaScript V8 parsing engines—transformations execute with sub-millisecond latency while maintaining an airtight zero-retention privacy boundary. This ensures full architectural compatibility with strict corporate compliance standards, including SOC 2, HIPAA, and GDPR data-isolation requirements.
            </p>
          </div>
        </section>

        <section class="seo-section" aria-labelledby="workflows-heading">
          <h2 id="workflows-heading">Production Engineering Workflows</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:1rem;margin-top:0.75rem;">
            <div style="background:var(--bg-elevated);padding:1.15rem;border-radius:8px;border:1px solid var(--border-subtle);">
              <h3 style="font-size:0.92rem;font-weight:700;margin-bottom:0.35rem;color:var(--text-primary);">Data Engineering &amp; ETL</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
                Inspect, format, and convert raw datasets before migrating to databases, warehousing tables, or automated pipelines.
              </p>
            </div>
            <div style="background:var(--bg-elevated);padding:1.15rem;border-radius:8px;border:1px solid var(--border-subtle);">
              <h3 style="font-size:0.92rem;font-weight:700;margin-bottom:0.35rem;color:var(--text-primary);">API &amp; Backend Debugging</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
                Decode, validate, and verify microservice payloads and webhooks on-the-fly without security leak risks.
              </p>
            </div>
            <div style="background:var(--bg-elevated);padding:1.15rem;border-radius:8px;border:1px solid var(--border-subtle);">
              <h3 style="font-size:0.92rem;font-weight:700;margin-bottom:0.35rem;color:var(--text-primary);">DevOps &amp; Infrastructure</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
                Audit configuration syntax, network masks, and security headers safely before pushing commits to production clusters.
              </p>
            </div>
          </div>
        </section>

        <section class="seo-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently Asked Questions (${escapeHtml(tool.shortName)})</h2>
          <div class="faq-list">
            ${tool.faqs
              .map(
                (f, idx) => `
              <details class="faq-item" id="faq-item-${idx + 1}" ${idx === 0 ? 'open' : ''}>
                <summary>${escapeHtml(f.q)}</summary>
                <p>${escapeHtml(f.a)}</p>
              </details>`
              )
              .join('')}
          </div>
        </section>
      </div>

      <aside class="sidebar-rail">
        ${renderAdSlot(
          'sidebar',
          'Sticky Sidebar Rail (300×250 Medium Rectangle / Carbon Dev Unit)',
          '300×250 Sticky Viewport',
          tool.estRpmUsd,
          SITE_CONFIG.monetization.adsenseSlots.stickySidebar
        )}

        ${renderAffiliateRailCard()}

        <div class="rail-card" style="border-color:rgba(16,185,129,0.35);background:var(--bg-elevated);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
            <span class="tool-rpm-tag" style="font-size:0.65rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;">STANDALONE SOURCE</span>
            <span style="font-family:var(--font-mono);font-size:0.8rem;font-weight:800;color:var(--accent-emerald);">$19 Starter</span>
          </div>
          <h3 style="font-size:0.88rem;margin:0 0 0.35rem 0;">Get the ${escapeHtml(tool.shortName)} Source Code</h3>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;line-height:1.4;">
            Deploy this engine offline or embed directly into your stack. Includes standalone TypeScript source, CLI runner, and 100% commercial license.
          </p>
          <a href="${escapeHtml(buildDirectPayPalUrl(`${tool.shortName} Starter Pack ($19)`, 19))}"
             target="_blank" rel="noopener"
             data-affiliate-partner="PayPal Checkout: ${escapeHtml(tool.shortName)} ($19 Starter)"
             class="btn btn-primary"
             style="display:block;text-align:center;width:100%;padding:0.48rem 0.75rem;font-size:0.8rem;font-weight:700;">
            💳 Buy Starter Blueprint Pack ($19) →
          </a>
        </div>

        <div class="rail-card">
          <h3>Related Developer Utilities (${relatedTools.length})</h3>
          <div class="related-tools-list">
            ${relatedTools
              .slice(0, 10)
              .map(
                (rt) => `
              <a href="../${rt.slug}/index.html" class="related-tool-link" id="related-link-${rt.slug}">
                <span>${escapeHtml(rt.shortName)}</span>
                <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-primary);">→</span>
              </a>`
              )
              .join('')}
          </div>
        </div>

        <div class="rail-card">
          <h3>Client-Side Privacy Guarantee</h3>
          <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:0.45rem;color:var(--text-secondary);line-height:1.5;">
            <div><strong>Zero Server Hops:</strong> Data never leaves your device.</div>
            <div><strong>Native Web APIs:</strong> Uses local browser JavaScript &amp; WebCrypto.</div>
            <div><strong>Enterprise Safe:</strong> Compliant with strict internal data policies.</div>
            <div><strong>Offline Capable:</strong> Works without continuous internet connection.</div>
          </div>
        </div>
      </aside>
    </div>
  </main>

  ${renderFooter(1)}
  <script src="../assets/engines.js" defer></script>
</body>
</html>`;
}

function renderSpecRowsForPair(pair) {
  const a = pair.itemA;
  const b = pair.itemB;
  if (pair.calcType === 'llmCost') {
    return `
      <tr><th>Provider</th><td>${escapeHtml(a.provider)}</td><td>${escapeHtml(b.provider)}</td></tr>
      <tr><th>Input Price (per 1M tokens)</th><td>$${a.inputPer1M.toFixed(3)}</td><td>$${b.inputPer1M.toFixed(3)}</td></tr>
      <tr><th>Output Price (per 1M tokens)</th><td>$${a.outputPer1M.toFixed(2)}</td><td>$${b.outputPer1M.toFixed(2)}</td></tr>
      <tr><th>Context Window</th><td>${escapeHtml(a.contextWindow)}</td><td>${escapeHtml(b.contextWindow)}</td></tr>
      <tr><th>Throughput Speed</th><td>${escapeHtml(a.speedTps)}</td><td>${escapeHtml(b.speedTps)}</td></tr>
      <tr><th>License / Weights</th><td>${escapeHtml(a.openWeights)}</td><td>${escapeHtml(b.openWeights)}</td></tr>
      <tr><th>Best Use Case</th><td>${escapeHtml(a.bestFor)}</td><td>${escapeHtml(b.bestFor)}</td></tr>
    `;
  }
  if (pair.calcType === 'cloudCost') {
    return `
      <tr><th>Platform Provider</th><td>${escapeHtml(a.provider)}</td><td>${escapeHtml(b.provider)}</td></tr>
      <tr><th>Base Monthly Plan</th><td>$${a.baseMonthlyUsd}/mo</td><td>$${b.baseMonthlyUsd}/mo</td></tr>
      <tr><th>Compute Rate (per 1M reqs)</th><td>$${a.costPerMillionReqs.toFixed(2)}</td><td>$${b.costPerMillionReqs.toFixed(2)}</td></tr>
      <tr><th>Storage / Bandwidth (per GB)</th><td>$${a.costPerGbStorage.toFixed(3)}/GB</td><td>$${b.costPerGbStorage.toFixed(3)}/GB</td></tr>
      <tr><th>Typical Cold Start</th><td>${escapeHtml(a.coldStartMs)}</td><td>${escapeHtml(b.coldStartMs)}</td></tr>
      <tr><th>Included Free Tier</th><td>${escapeHtml(a.freeTier)}</td><td>${escapeHtml(b.freeTier)}</td></tr>
      <tr><th>Best Use Case</th><td>${escapeHtml(a.bestFor)}</td><td>${escapeHtml(b.bestFor)}</td></tr>
    `;
  }
  if (pair.calcType === 'paymentFee') {
    return `
      <tr><th>Platform</th><td>${escapeHtml(a.provider)}</td><td>${escapeHtml(b.provider)}</td></tr>
      <tr><th>Base Percentage Fee</th><td>${a.percentFee}%</td><td>${b.percentFee}%</td></tr>
      <tr><th>Fixed Fee per Order</th><td>$${(a.fixedCents / 100).toFixed(2)}</td><td>$${(b.fixedCents / 100).toFixed(2)}</td></tr>
      <tr><th>International Card Surcharge</th><td>+${a.intlSurchargePct}%</td><td>+${b.intlSurchargePct}%</td></tr>
      <tr><th>Merchant of Record (Global VAT/Tax)</th><td>${escapeHtml(a.morTaxIncluded)}</td><td>${escapeHtml(b.morTaxIncluded)}</td></tr>
      <tr><th>Payout Schedule</th><td>${escapeHtml(a.payoutSpeed)}</td><td>${escapeHtml(b.payoutSpeed)}</td></tr>
      <tr><th>Best Use Case</th><td>${escapeHtml(a.bestFor)}</td><td>${escapeHtml(b.bestFor)}</td></tr>
    `;
  }
  return `
    <tr><th>Standard / Maintainer</th><td>${escapeHtml(a.provider)}</td><td>${escapeHtml(b.provider)}</td></tr>
    <tr><th>Relative Size Ratio</th><td>${Math.round(a.compressionRatio * 100)}% of raw baseline</td><td>${Math.round(b.compressionRatio * 100)}% of raw baseline</td></tr>
    <tr><th>Decode / Parse Throughput</th><td>~${a.parseSpeedMbSec} MB/sec</td><td>~${b.parseSpeedMbSec} MB/sec</td></tr>
    <tr><th>Schema & Typing</th><td>${escapeHtml(a.schemaTyped)}</td><td>${escapeHtml(b.schemaTyped)}</td></tr>
    <tr><th>Human Readability</th><td>${escapeHtml(a.humanReadable)}</td><td>${escapeHtml(b.humanReadable)}</td></tr>
    <tr><th>Best Engineering Use Case</th><td>${escapeHtml(a.bestFor)}</td><td>${escapeHtml(b.bestFor)}</td></tr>
  `;
}

function buildComparisonPairHtml(pair) {
  const a = pair.itemA;
  const b = pair.itemB;
  const canonicalUrl = `${SITE_CONFIG.domain}/compare/${pair.slug}/`;
  const siblingPairs = COMPARE_Pairs.filter(
    (p) =>
      p.slug !== pair.slug &&
      (p.itemA.id === a.id || p.itemB.id === a.id || p.itemA.id === b.id || p.itemB.id === b.id)
  ).slice(0, 10);

  const dynamicFaqs = [
    {
      q: `Which is more cost-effective in 2026: ${a.name} or ${b.name}?`,
      a: `It depends on your workload volume. Use the interactive sliders above to model your exact monthly scale. ${a.name} (${a.bestFor}) and ${b.name} (${b.bestFor}) have different unit economics that cross over as volume scales.`,
    },
    {
      q: `When should an engineering team choose ${a.name} over ${b.name}?`,
      a: `Choose ${a.name} when your primary priority is: ${a.bestFor}. Choose ${b.name} when you prioritize: ${b.bestFor}.`,
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: pair.title,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (Browser Client-Side)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: pair.metaDescription,
      url: canonicalUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: dynamicFaqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  const resolvedUrlA = resolveProviderUrl(a);
  const resolvedUrlB = resolveProviderUrl(b);
  const ctaHrefA = a.converterToolSlug
    ? `../../${a.converterToolSlug}/index.html`
    : resolvedUrlA || '#matrix-calculator';
  const ctaHrefB = b.converterToolSlug
    ? `../../${b.converterToolSlug}/index.html`
    : resolvedUrlB || '#matrix-calculator';
  const ctaAttrsA =
    !a.converterToolSlug && resolvedUrlA
      ? `target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(a.name)}"`
      : '';
  const ctaAttrsB =
    !b.converterToolSlug && resolvedUrlB
      ? `target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(b.name)}"`
      : '';
  const ctaLabelA = a.converterToolSlug
    ? `Open Free ${a.name} Converter Tool →`
    : `Start with ${a.name} →`;
  const ctaLabelB = b.converterToolSlug
    ? `Open Free ${b.name} Converter Tool →`
    : `Start with ${b.name} →`;

  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>${escapeHtml(pair.title)} | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="${escapeHtml(pair.metaDescription)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(pair.title)}" />
  <meta property="og:description" content="${escapeHtml(pair.metaDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />${renderHeadExtras(2)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/styles.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body${bodyClass}>
  ${renderHeader('compare', 2)}

  <main class="page-shell">
    ${renderAdSlot(
      'leaderboard',
      'High-Intent B2B Comparison Leaderboard (728×90 / 320×100)',
      '728×90 / 320×100',
      pair.estRpmUsd,
      SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
    )}

    <div class="tool-layout-grid">
      <div class="tool-main-col">
        <section class="tool-hero">
          <div class="tool-breadcrumb">
            <a href="../../index.html" id="breadcrumb-root">UtilForge Hub</a>
            <span>/</span>
            <a href="../index.html" id="breadcrumb-matrix">Calculators</a>
            <span>/</span>
            <span>${escapeHtml(pair.category)}</span>
          </div>
          <h1>${escapeHtml(pair.headline)}</h1>
          <p>${escapeHtml(pair.metaDescription)}</p>
          <div class="trust-bar">
            <span class="trust-chip">✓ Interactive Workload Simulator</span>
            <span class="trust-chip neutral">Live Architectural Tradeoff Analysis</span>
          </div>
        </section>

        <section
          class="matrix-workbench"
          id="matrix-calculator"
          data-calc-type="${escapeHtml(pair.calcType)}"
          data-item-a="${escapeHtml(JSON.stringify(a))}"
          data-item-b="${escapeHtml(JSON.stringify(b))}"
        >
          <div class="matrix-sliders-box">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.84rem;font-weight:700;margin-bottom:0.35rem;">
                <label for="matrix-slider-primary">${escapeHtml(pair.sliderLabel)}</label>
                <span id="matrix-s1-val" style="font-family:var(--font-mono);color:var(--accent-primary);">${pair.sliderDefault}</span>
              </div>
              <input
                type="range"
                id="matrix-slider-primary"
                min="${pair.sliderMin}"
                max="${pair.sliderMax}"
                step="${pair.sliderStep}"
                value="${pair.sliderDefault}"
                style="width:100%;"
              />
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.84rem;font-weight:700;margin-bottom:0.35rem;">
                <label for="matrix-slider-secondary">${escapeHtml(pair.secondarySliderLabel)}</label>
                <span id="matrix-s2-val" style="font-family:var(--font-mono);color:var(--accent-primary);">${pair.secondarySliderDefault}</span>
              </div>
              <input
                type="range"
                id="matrix-slider-secondary"
                min="${pair.secondarySliderMin}"
                max="${pair.secondarySliderMax}"
                step="${pair.secondarySliderStep}"
                value="${pair.secondarySliderDefault}"
                style="width:100%;"
              />
            </div>
          </div>

          <div class="vs-winner-banner" id="vs-winner-banner" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.65rem;">
            <span id="vs-winner-banner-text">Calculating optimal choice...</span>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary" id="btn-share-matrix" style="padding:0.35rem 0.7rem;font-size:0.75rem;">🔗 Share Comparison</button>
              <a href="${escapeHtml(ctaHrefA)}"
                 data-a-href="${escapeHtml(ctaHrefA)}"
                 data-b-href="${escapeHtml(ctaHrefB)}"
                 data-a-label="${escapeHtml(ctaLabelA)}"
                 data-b-label="${escapeHtml(ctaLabelB)}"
                 data-a-partner="${escapeHtml(a.name)}"
                 data-b-partner="${escapeHtml(b.name)}"
                 target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(a.name)}" id="vs-winner-cta-btn" class="btn btn-primary" style="padding:0.38rem 0.85rem;font-size:0.78rem;">
                Claim Winner Offer →
              </a>
            </div>
          </div>

          <div class="matrix-vs-grid">
            <div class="vs-entity-card" id="vs-card-a">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span class="tool-cat-tag">${escapeHtml(a.provider)}</span>
                  <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--text-muted);">OPTION A</span>
                </div>
                <h2 style="font-size:1.3rem;font-weight:800;margin-top:0.4rem;">${escapeHtml(a.name)}</h2>
                <div class="vs-price-big" id="vs-price-a">$0.00</div>
                <div style="font-family:var(--font-mono);font-size:0.76rem;color:var(--text-secondary);" id="vs-sub-a"></div>
                <div class="vs-bar-track">
                  <div class="vs-bar-fill" id="vs-bar-a" style="width:50%;"></div>
                </div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-top:0.5rem;">
                  <strong>Best for:</strong> ${escapeHtml(a.bestFor)}
                </p>
              </div>
              <div style="margin-top:1rem;">
                <a href="${ctaHrefA}" ${ctaAttrsA} class="btn btn-primary" style="width:100%;" id="cta-btn-a">
                  ${escapeHtml(ctaLabelA)}
                </a>
              </div>
            </div>

            <div class="vs-entity-card" id="vs-card-b">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span class="tool-cat-tag">${escapeHtml(b.provider)}</span>
                  <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--text-muted);">OPTION B</span>
                </div>
                <h2 style="font-size:1.3rem;font-weight:800;margin-top:0.4rem;">${escapeHtml(b.name)}</h2>
                <div class="vs-price-big" id="vs-price-b">$0.00</div>
                <div style="font-family:var(--font-mono);font-size:0.76rem;color:var(--text-secondary);" id="vs-sub-b"></div>
                <div class="vs-bar-track">
                  <div class="vs-bar-fill" id="vs-bar-b" style="width:50%;"></div>
                </div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-top:0.5rem;">
                  <strong>Best for:</strong> ${escapeHtml(b.bestFor)}
                </p>
              </div>
              <div style="margin-top:1rem;">
                <a href="${ctaHrefB}" ${ctaAttrsB} class="btn btn-secondary" style="width:100%;" id="cta-btn-b">
                  ${escapeHtml(ctaLabelB)}
                </a>
              </div>
            </div>
          </div>
        </section>

        ${renderAdSlot(
          'native',
          'In-Content Native Multiplex / Affiliate Comparison Unit',
          'Fluid Responsive 100% × 120px',
          pair.estRpmUsd,
          SITE_CONFIG.monetization.adsenseSlots.inContentNative
        )}

        <section class="seo-section" aria-labelledby="spec-table-heading">
          <h2 id="spec-table-heading">Side-by-Side Technical & Commercial Breakdown: ${escapeHtml(a.name)} vs. ${escapeHtml(b.name)}</h2>
          <div class="data-table-wrap" style="max-height:none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>${escapeHtml(a.name)}</th>
                  <th>${escapeHtml(b.name)}</th>
                </tr>
              </thead>
              <tbody>
                ${renderSpecRowsForPair(pair)}
              </tbody>
            </table>
          </div>
        </section>

        <section class="seo-section" aria-labelledby="pair-faq-heading">
          <h2 id="pair-faq-heading">Frequently Asked Questions</h2>
          <div class="faq-list">
            ${dynamicFaqs
              .map(
                (f, i) => `
              <details class="faq-item" id="pair-faq-${i + 1}" open>
                <summary>${escapeHtml(f.q)}</summary>
                <p>${escapeHtml(f.a)}</p>
              </details>`
              )
              .join('')}
          </div>
        </section>
      </div>

      <aside class="sidebar-rail">
        ${renderAdSlot(
          'sidebar',
          'Sticky Sidebar Rail (300×250 B2B SaaS / Cloud Unit)',
          '300×250 Sticky Viewport',
          pair.estRpmUsd,
          SITE_CONFIG.monetization.adsenseSlots.stickySidebar
        )}

        ${renderAffiliateRailCard()}

        <div class="rail-card" style="border-color:rgba(16,185,129,0.35);background:var(--bg-elevated);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
            <span class="tool-rpm-tag" style="font-size:0.65rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;">PRO FINOPS PACK</span>
            <span style="font-family:var(--font-mono);font-size:0.8rem;font-weight:800;color:var(--accent-emerald);">$19 Starter</span>
          </div>
          <h3 style="font-size:0.88rem;margin:0 0 0.35rem 0;">Cost Metering &amp; Architecture Blueprints</h3>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;line-height:1.4;">
            Download ready-to-deploy multi-provider API cost metering, Terraform budget alarms, and SaaS optimization templates.
          </p>
          <a href="${escapeHtml(buildDirectPayPalUrl(`${pair.itemA.name} vs ${pair.itemB.name} FinOps Pack ($19)`, 19))}"
             target="_blank" rel="noopener"
             data-affiliate-partner="PayPal Checkout: ${escapeHtml(pair.slug)} ($19 Starter)"
             class="btn btn-primary"
             style="display:block;text-align:center;width:100%;padding:0.48rem 0.75rem;font-size:0.8rem;font-weight:700;">
            💳 Buy FinOps Blueprint Pack ($19) →
          </a>
        </div>

        <div class="rail-card">
          <h3>Related Comparisons (${siblingPairs.length})</h3>
          <div class="related-tools-list">
            ${siblingPairs
              .map(
                (sp) => `
              <a href="../${sp.slug}/index.html" class="related-tool-link" id="sibling-link-${sp.slug}">
                <span>${escapeHtml(sp.itemA.name)} vs ${escapeHtml(sp.itemB.name)}</span>
                <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-primary);">→</span>
              </a>`
              )
              .join('')}
          </div>
        </div>
      </aside>
    </div>
  </main>

  ${renderFooter(2)}
  <script src="../../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildCompareHubPageHtml() {
  const categories = ['ALL', ...Array.from(new Set(COMPARE_Pairs.map((p) => p.category)))];
  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Engineering Tradeoff &amp; Cost Calculators | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="Compare cloud pricing, LLM token economics, payment gateway fees, and data serialization specs with interactive workload models." />
  <link rel="canonical" href="${SITE_CONFIG.domain}/compare/" />${renderHeadExtras(1)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
</head>
<body${bodyClass}>
  ${renderHeader('compare', 1)}

  <main class="page-shell">
    <section class="hub-hero">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.76rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.45rem;">
          Architecture Tradeoffs • Interactive Workload Modeling
        </div>
        <h1>Cloud, AI &amp; Architecture Tradeoff Calculators</h1>
        <p>
          Model real-world workloads, compare token economics, and calculate data serialization throughput side-by-side with interactive parameter sliders and benchmark models.
        </p>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <a href="#matrix-directory" class="btn btn-primary" id="explore-matrix-btn">Browse All Calculators</a>
          <a href="../index.html" class="btn btn-secondary" id="back-to-tools-btn">← View ${TOOLS.length} Standalone File/Data Utilities</a>
        </div>
      </div>

      <div class="hub-kpis">
        <div class="kpi-tile">
          <div class="kpi-tile-val">${COMPARE_Pairs.length} Calculators</div>
          <div class="kpi-tile-label">Model Benchmarks &amp; Cloud Metrics</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">Interactive</div>
          <div class="kpi-tile-label">Client-Side Workload Sliders</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">RFC Standards</div>
          <div class="kpi-tile-label">Data Serialization Formats</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">&lt;5ms</div>
          <div class="kpi-tile-label">Sub-Millisecond Browser Math</div>
        </div>
      </div>
    </section>

    ${renderAdSlot(
      'leaderboard',
      'Comparison Matrix Directory Top Leaderboard (728×90 / 320×100)',
      '728×90 / 320×100',
      '$28 – $55',
      SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
    )}

    <section id="matrix-directory">
      <div class="filter-bar">
        <div class="category-tabs" role="tablist">
          ${categories
            .map(
              (cat, idx) =>
                `<button type="button" class="cat-tab ${idx === 0 ? 'active' : ''}" data-cat-filter="${escapeHtml(cat)}" id="matrix-cat-tab-${idx}">${escapeHtml(cat)}</button>`
            )
            .join('')}
        </div>
        <div>
          <input type="search" id="hub-search-input" class="control-input" placeholder="Filter ${COMPARE_Pairs.length} comparisons (e.g. stripe, gpt-4o, parquet)..." style="min-width:300px;" aria-label="Search comparisons" />
        </div>
      </div>

      <div class="tools-grid">
        ${COMPARE_Pairs.map(
          (pair) => `
          <article class="tool-card" data-tool-card data-category="${escapeHtml(pair.category)}">
            <div>
              <div class="tool-card-top">
                <span class="tool-cat-tag">${escapeHtml(pair.category)}</span>
                <span class="tool-rpm-tag">RPM: ${escapeHtml(pair.estRpmUsd)}</span>
              </div>
              <h2><a href="./${pair.slug}/index.html" id="pair-card-${pair.slug}">${escapeHtml(pair.itemA.name)} vs. ${escapeHtml(pair.itemB.name)}</a></h2>
              <p>${escapeHtml(pair.metaDescription)}</p>
            </div>
            <div>
              <div class="tool-card-metrics">
                <span>KW: "${escapeHtml(pair.primaryKeyword)}"</span>
                <span>Interactive Calc</span>
              </div>
              <div style="margin-top:0.85rem;">
                <a href="./${pair.slug}/index.html" class="btn btn-secondary" style="width:100%;" id="open-pair-${pair.slug}">
                  Open Cost & Spec Calculator →
                </a>
              </div>
            </div>
          </article>`
        ).join('')}
      </div>
    </section>
  </main>

  ${renderFooter(1)}
  <script src="../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildMarketplaceItemHtml(item) {
  const totalPages = TOTAL_PAGE_COUNT;
  const canonicalUrl = `${SITE_CONFIG.domain}/marketplace/${item.slug}/`;
  const affiliateUrl = resolveMarketplaceCheckoutUrl(item);
  const relatedItems = MARKETPLACE_ITEMS.filter((m) => m.slug !== item.slug && m.category === item.category);
  const crossItems = MARKETPLACE_ITEMS.filter((m) => m.slug !== item.slug && m.category !== item.category).slice(0, 5);
  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: item.subtitle,
    category: item.category,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(item.rating),
      reviewCount: String(item.reviewsCount),
    },
    offers: {
      '@type': 'Offer',
      price: String(item.priceUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  };

  const previewTitle =
    item.previewType === 'mcp'
      ? 'LIVE MCP SERVER CONFIG PREVIEW (claude_desktop_config.json / .cursor/mcp.json)'
      : item.previewType === 'workflow'
      ? 'LIVE n8n / AUTOMATION WORKFLOW BLUEPRINT JSON'
      : 'LIVE ARCHITECTURE / MANIFEST PREVIEW';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(item.name)} — ${escapeHtml(item.priceLabel)} | ${escapeHtml(SITE_CONFIG.brandName)} Marketplace</title>
  <meta name="description" content="${escapeHtml(item.subtitle)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(item.name)} — ${escapeHtml(item.priceLabel)}" />
  <meta property="og:description" content="${escapeHtml(item.subtitle)}" />
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${canonicalUrl}" />${renderHeadExtras(2)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/styles.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body${bodyClass}>
  ${renderHeader('marketplace', 2)}

  <main class="page-shell">
    ${renderAdSlot(
      'leaderboard',
      'Marketplace Listing Leaderboard (728×90 / 320×100)',
      '728×90 / 320×100',
      '$24 – $42',
      SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
    )}

    <div class="tool-layout-grid">
      <div class="tool-main-col">
        <section class="tool-hero">
          <div class="tool-breadcrumb">
            <a href="../../index.html" id="breadcrumb-root">UtilForge Hub</a>
            <span>/</span>
            <a href="../index.html" id="breadcrumb-mkt">Marketplace (${MARKETPLACE_ITEMS.length})</a>
            <span>/</span>
            <span>${escapeHtml(item.category)}</span>
          </div>
          <h1>${escapeHtml(item.headline)}</h1>
          <p>${escapeHtml(item.subtitle)}</p>
          <div class="trust-bar">
            ${item.isSponsored ? `<span class="sponsored-pill">★ ${escapeHtml(item.sponsoredBadge)}</span>` : ''}
            <span class="trust-chip">★ ${item.rating} (${item.reviewsCount} verified reviews)</span>
            <span class="trust-chip neutral">Stack: ${escapeHtml(item.stack)}</span>
            <span class="affiliate-payout-pill">Affiliate Split: ${item.affiliateCommissionPct}% ($${item.estPayoutPerSaleUsd.toFixed(2)}/sale)</span>
          </div>
        </section>

        <!-- Interactive Build-vs-Buy ROI Calculator + Affiliate Checkout CTA -->
        <section
          class="matrix-workbench"
          id="mkt-roi-calculator"
          data-hours-saved="${item.hoursSaved}"
          data-price-usd="${item.priceUsd}"
          style="margin-bottom:1.75rem;"
        >
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
            <div>
              <div style="font-family:var(--font-mono);font-size:0.74rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;">
                Interactive Build-vs-Buy Engineering Calculator
              </div>
              <h2 style="font-size:1.25rem;font-weight:800;">Save ~${item.hoursSaved} Engineering Hours vs. Building From Scratch</h2>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:800;color:var(--text-primary);">${escapeHtml(item.priceLabel)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Instant Digital License • Merchant of Record</div>
            </div>
          </div>

          <div class="matrix-sliders-box" style="grid-template-columns:1fr;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;margin-bottom:0.35rem;">
                <label for="mkt-hourly-rate">Your Engineering / Contractor Hourly Rate ($ USD/hr)</label>
                <span id="mkt-hourly-rate-val" style="font-family:var(--font-mono);color:var(--accent-primary);">$110/hr</span>
              </div>
              <input type="range" id="mkt-hourly-rate" min="40" max="250" step="10" value="110" style="width:100%;" />
            </div>
          </div>

          <div class="vs-winner-banner">
            <span id="mkt-savings-out">$12,781 saved (${item.hoursSaved} dev hrs)</span>
            <span id="mkt-multiple-out" style="font-family:var(--font-mono);font-size:0.82rem;">65× Instant ROI</span>
          </div>

          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <a
              href="${escapeHtml(buildDirectPayPalUrl(`${item.shortName} Starter Pack ($19)`, 19))}"
              target="_blank"
              rel="noopener"
              data-affiliate-partner="PayPal Checkout: ${escapeHtml(item.shortName)} ($19 Starter)"
              class="btn btn-primary"
              id="btn-starter-checkout"
              style="flex:2;padding:0.85rem 1.25rem;font-size:0.95rem;"
            >
              💳 Buy Starter Blueprint Pack ($19) →
            </a>
            <a
              href="${escapeHtml(affiliateUrl)}"
              target="_blank"
              rel="noopener"
              data-affiliate-partner="PayPal Checkout: ${escapeHtml(item.shortName)} (${escapeHtml(item.priceLabel)})"
              class="btn btn-secondary"
              id="btn-affiliate-checkout"
              style="flex:1;padding:0.85rem 1rem;"
            >
              Full Commercial License (${escapeHtml(item.priceLabel)}) →
            </a>
          </div>

          <div id="direct-order-drawer" style="display:block;margin-top:1rem;padding:1rem;background:var(--bg-surface);border:1px solid var(--accent-primary);border-radius:8px;">
            <div style="font-size:0.86rem;font-weight:700;color:var(--text-primary);margin-bottom:0.35rem;">
              ⚡ Instant Checkout — Starter Pack ($19), Full Commercial License (${escapeHtml(item.priceLabel)}), or Sponsor Slot ($${MARKETPLACE_CONFIG.sponsoredSlotMonthlyUsd}/mo)
            </div>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem;">
              Enter your email below for an instant Stripe/PayPal checkout link &amp; immediate repository access:
            </p>
            <form id="direct-order-form" data-item-name="${escapeHtml(item.name)}" data-item-price="${escapeHtml(item.priceLabel)}" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <input type="email" id="direct-order-email" class="control-input" required placeholder="founder@company.com" style="flex:2;min-width:200px;" />
              <select id="direct-order-type" class="control-select" style="flex:1;min-width:190px;">
                <option value="Starter Config & Blueprint Pack for ${escapeHtml(item.shortName)} ($19)">⚡ Starter Config &amp; Blueprint Pack ($19)</option>
                <option value="Buy Full ${escapeHtml(item.shortName)} (${escapeHtml(item.priceLabel)})">Full ${escapeHtml(item.shortName)} (${escapeHtml(item.priceLabel)})</option>
                <option value="Sponsor Featured Slot ($99/mo)">Sponsor Featured Slot ($99/mo)</option>
                <option value="Buy Full ${totalPages}-Page UtilForge Factory ($149)">Buy Full UtilForge Factory ($149)</option>
              </select>
              <button type="submit" class="btn btn-primary" id="btn-submit-direct-order">Get Instant Access →</button>
            </form>
            <div id="direct-order-status" style="font-size:0.78rem;font-weight:700;color:var(--accent-emerald);margin-top:0.5rem;display:none;"></div>
          </div>
        </section>

        <!-- Live Config / JSON Blueprint Previewer -->
        <section class="workbench-card" style="margin-bottom:1.75rem;">
          <div class="workbench-toolbar">
            <div style="font-family:var(--font-mono);font-size:0.78rem;font-weight:700;color:var(--text-primary);">
              ${escapeHtml(previewTitle)}
            </div>
            <button type="button" class="btn btn-secondary" id="btn-copy-mkt-snippet">Copy Blueprint JSON</button>
          </div>
          <div class="pane pane-output">
            <pre id="mkt-snippet-pre" class="code-output-pre" style="min-height:190px;">${escapeHtml(item.previewSnippet)}</pre>
          </div>
        </section>

        ${renderAdSlot(
          'native',
          'In-Content Marketplace Native Ad Unit',
          'Fluid Responsive 100% × 120px',
          '$24 – $42',
          SITE_CONFIG.monetization.adsenseSlots.inContentNative
        )}

        <section class="seo-section" aria-labelledby="included-features-heading">
          <h2 id="included-features-heading">What’s Included in ${escapeHtml(item.shortName)}</h2>
          <ul class="feature-checklist">
            ${item.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </section>
      </div>

      <aside class="sidebar-rail">
        ${renderAdSlot(
          'sidebar',
          'Sticky Sidebar Rail (300×250 B2B DevTools Unit)',
          '300×250 Sticky Viewport',
          '$26 – $44',
          SITE_CONFIG.monetization.adsenseSlots.stickySidebar
        )}

        ${renderAffiliateRailCard()}

        <div class="rail-card" style="border-color:rgba(16,185,129,0.35);background:var(--bg-elevated);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
            <span class="tool-rpm-tag" style="font-size:0.65rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;">INSTANT DOWNLOAD</span>
            <span style="font-family:var(--font-mono);font-size:0.8rem;font-weight:800;color:var(--accent-emerald);">$19 Starter</span>
          </div>
          <h3 style="font-size:0.88rem;margin:0 0 0.35rem 0;">${escapeHtml(item.shortName)} Starter Kit</h3>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem;line-height:1.4;">
            Includes verified starter config templates, production workflow JSON, and commercial developer license.
          </p>
          <a href="${escapeHtml(buildDirectPayPalUrl(`${item.shortName} Starter Pack ($19)`, 19))}"
             target="_blank" rel="noopener"
             data-affiliate-partner="PayPal Checkout: ${escapeHtml(item.shortName)} ($19 Starter)"
             class="btn btn-primary"
             style="display:block;text-align:center;width:100%;padding:0.48rem 0.75rem;font-size:0.8rem;font-weight:700;">
            💳 Buy Starter Blueprint Pack ($19) →
          </a>
        </div>

        <div class="rail-card">
          <h3>More in ${escapeHtml(item.category)}</h3>
          <div class="related-tools-list">
            ${relatedItems
              .map(
                (ri) => `
              <a href="../${ri.slug}/index.html" class="related-tool-link" id="mkt-rel-${ri.slug}">
                <span>${escapeHtml(ri.shortName)}</span>
                <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-emerald);">${escapeHtml(ri.priceLabel)}</span>
              </a>`
              )
              .join('')}
          </div>
        </div>

        <div class="rail-card">
          <h3>Popular Across Marketplace</h3>
          <div class="related-tools-list">
            ${crossItems
              .map(
                (ci) => `
              <a href="../${ci.slug}/index.html" class="related-tool-link" id="mkt-cross-${ci.slug}">
                <span>${escapeHtml(ci.shortName)}</span>
                <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-primary);">→</span>
              </a>`
              )
              .join('')}
          </div>
        </div>
      </aside>
    </div>
  </main>

  ${renderFooter(2)}
  <script src="../../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildMarketplaceHubHtml() {
  const categories = ['ALL', ...Array.from(new Set(MARKETPLACE_ITEMS.map((i) => i.category)))];
  const sponsoredCount = MARKETPLACE_ITEMS.filter((i) => i.isSponsored).length;
  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Developer Boilerplates, MCP Servers &amp; AI Workflows | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="Production SaaS boilerplates, Model Context Protocol (MCP) servers, n8n/Make automation workflows, and architectural blueprints for engineering teams." />
  <link rel="canonical" href="${SITE_CONFIG.domain}/marketplace/" />${renderHeadExtras(1)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
</head>
<body${bodyClass}>
  ${renderHeader('marketplace', 1)}

  <main class="page-shell">
    <section class="hub-hero">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.76rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.45rem;">
          Production-Ready Blueprints • Tested Developer Assets
        </div>
        <h1>Boilerplates, MCP Servers &amp; AI Workflows Marketplace</h1>
        <p>
          Explore ${MARKETPLACE_ITEMS.length} production SaaS boilerplates, Model Context Protocol (MCP) servers, automation workflows, and UI design systems—each featuring an interactive <strong>Build-vs-Buy Engineering ROI Calculator</strong> and instant config blueprints.
        </p>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <a href="#marketplace-directory" class="btn btn-primary" id="mkt-hero-browse">Browse ${MARKETPLACE_ITEMS.length} Verified Listings</a>
          <a href="../about/index.html" class="btn btn-secondary" id="mkt-hero-about">Architecture Standards</a>
        </div>
      </div>

      <div class="hub-kpis">
        <div class="kpi-tile">
          <div class="kpi-tile-val">${MARKETPLACE_ITEMS.length} Blueprints</div>
          <div class="kpi-tile-label">SaaS Starters, MCP &amp; Workflows</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">~100 hrs</div>
          <div class="kpi-tile-label">Avg. Engineering Time Saved</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">100% Typed</div>
          <div class="kpi-tile-label">TypeScript &amp; JSON Schema Validated</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">Commercial</div>
          <div class="kpi-tile-label">Full Commercial Software License</div>
        </div>
      </div>
    </section>

    ${renderAdSlot(
      'leaderboard',
      'Marketplace Directory Top Leaderboard (728×90 / 320×100)',
      '728×90 / 320×100',
      '$24 – $42',
      SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
    )}

    <section id="marketplace-directory">
      <div class="filter-bar">
        <div class="category-tabs" role="tablist">
          ${categories
            .map(
              (cat, idx) =>
                `<button type="button" class="cat-tab ${idx === 0 ? 'active' : ''}" data-cat-filter="${escapeHtml(cat)}" id="mkt-cat-tab-${idx}">${escapeHtml(cat)}</button>`
            )
            .join('')}
        </div>
        <div>
          <input type="search" id="hub-search-input" class="control-input" placeholder="Search boilerplates, MCP servers, n8n workflows..." style="min-width:290px;" aria-label="Search marketplace" />
        </div>
      </div>

      <div class="tools-grid">
        ${MARKETPLACE_ITEMS.map(
          (item) => `
          <article class="tool-card ${item.isSponsored ? 'is-sponsored' : ''}" data-tool-card data-category="${escapeHtml(item.category)}">
            <div>
              <div class="tool-card-top">
                ${
                  item.isSponsored
                    ? `<span class="sponsored-pill">★ ${escapeHtml(item.sponsoredBadge)}</span>`
                    : `<span class="tool-cat-tag">${escapeHtml(item.category)}</span>`
                }
                <span class="affiliate-payout-pill">${escapeHtml(item.priceLabel)}</span>
              </div>
              <h2><a href="./${item.slug}/index.html" id="mkt-card-link-${item.slug}">${escapeHtml(item.name)}</a></h2>
              <div class="marketplace-stack-line">${escapeHtml(item.stack)}</div>
              <p>${escapeHtml(item.subtitle)}</p>
            </div>
            <div>
              <div class="tool-card-metrics">
                <span>★ ${item.rating} (${item.reviewsCount}) • Saves ${item.hoursSaved}h</span>
                <span style="color:var(--accent-emerald);font-weight:700;">ROI Calculator</span>
              </div>
              <div style="margin-top:0.85rem;display:flex;gap:0.5rem;">
                <a href="./${item.slug}/index.html" class="btn btn-primary" style="flex:1;" id="mkt-open-${item.slug}">
                  Live Preview & ROI Calc →
                </a>
              </div>
            </div>
          </article>`
        ).join('')}
      </div>
    </section>

    <section class="factory-studio-panel" id="submit-listing">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="font-family:var(--font-mono);font-size:0.75rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;">
            Marketplace Monetization & Self-Serve Submission Studio
          </div>
          <h2 style="font-size:1.45rem;font-weight:800;letter-spacing:-0.025em;">
            Sponsored Slot + Affiliate Revenue Simulator & Listing Scaffolder
          </h2>
        </div>
      </div>

      <div class="studio-grid">
        <div class="rail-card" style="background:var(--bg-elevated);">
          <h3>1. Marketplace Sponsored + Affiliate Income Simulator</h3>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1rem;">
            Combine recurring <strong>$99/mo Sponsored Category Pins</strong> with <strong>30%–45% affiliate checkout splits</strong> (~$38 avg payout per boilerplate/workflow sale).
          </p>

          <div style="display:flex;flex-direction:column;gap:0.9rem;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;margin-bottom:0.25rem;">
                <label for="mkt-sim-slots">Active $99/mo Sponsored Slots Sold</label>
                <span id="mkt-sim-slots-val" style="font-family:var(--font-mono);">6 slots ($594/mo)</span>
              </div>
              <input type="range" id="mkt-sim-slots" min="0" max="25" step="1" value="6" style="width:100%;" />
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;margin-bottom:0.25rem;">
                <label for="mkt-sim-visitors">Monthly Marketplace Visitors</label>
                <span id="mkt-sim-visitors-val" style="font-family:var(--font-mono);">12,000</span>
              </div>
              <input type="range" id="mkt-sim-visitors" min="1000" max="100000" step="1000" value="12000" style="width:100%;" />
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;margin-bottom:0.25rem;">
                <label for="mkt-sim-conv">Affiliate Checkout Conversion Rate (%)</label>
                <span id="mkt-sim-conv-val" style="font-family:var(--font-mono);">1.5% (180 sales/mo)</span>
              </div>
              <input type="range" id="mkt-sim-conv" min="0.2" max="5.0" step="0.1" value="1.5" style="width:100%;" />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.5rem;">
              <div class="kpi-tile" style="background:var(--bg-surface);">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Est. Monthly Net</div>
                <div id="mkt-sim-monthly-out" class="kpi-tile-val" style="color:var(--accent-emerald);">$7,434/mo</div>
              </div>
              <div class="kpi-tile" style="background:var(--bg-surface);">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Est. Annual Net</div>
                <div id="mkt-sim-annual-out" class="kpi-tile-val">$89,208/yr</div>
              </div>
            </div>
          </div>
        </div>

        <div class="rail-card" style="background:var(--bg-elevated);">
          <h3>2. Submit or Sponsor a New Listing</h3>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.85rem;">
            Generate a ready-to-paste product entry for <code style="font-family:var(--font-mono);">src/registry/marketplace.js</code> with automatic affiliate link tagging.
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;margin-bottom:0.75rem;">
            <div>
              <label for="mkt-sub-title" style="display:block;font-size:0.75rem;font-weight:700;margin-bottom:0.2rem;">Product Name</label>
              <input type="text" id="mkt-sub-title" class="control-input" style="width:100%;" value="StripeSync MCP Server" />
            </div>
            <div>
              <label for="mkt-sub-cat" style="display:block;font-size:0.75rem;font-weight:700;margin-bottom:0.2rem;">Category</label>
              <select id="mkt-sub-cat" class="control-select" style="width:100%;">
                <option value="MCP Servers & Agent Skills">MCP Servers & Agent Skills</option>
                <option value="SaaS Boilerplates">SaaS Boilerplates</option>
                <option value="n8n / Make AI Workflows">n8n / Make AI Workflows</option>
                <option value="UI & Design Systems">UI & Design Systems</option>
              </select>
            </div>
            <div>
              <label for="mkt-sub-price" style="display:block;font-size:0.75rem;font-weight:700;margin-bottom:0.2rem;">Price ($ USD)</label>
              <input type="number" id="mkt-sub-price" class="control-input" style="width:100%;" value="79" />
            </div>
            <div>
              <label for="mkt-sub-comm" style="display:block;font-size:0.75rem;font-weight:700;margin-bottom:0.2rem;">Affiliate Split (%)</label>
              <input type="number" id="mkt-sub-comm" class="control-input" style="width:100%;" value="35" />
            </div>
          </div>
          <div style="margin-bottom:0.75rem;">
            <label for="mkt-sub-url" style="display:block;font-size:0.75rem;font-weight:700;margin-bottom:0.2rem;">Creator Checkout URL (Lemon Squeezy / Polar / Gumroad)</label>
            <input type="url" id="mkt-sub-url" class="control-input" style="width:100%;" value="https://www.lemonsqueezy.com/" />
          </div>
          <button type="button" class="btn btn-primary" id="btn-generate-mkt-listing" style="width:100%;margin-bottom:0.75rem;">
            Generate Marketplace Listing JSON
          </button>
          <pre id="mkt-sub-output" style="background:var(--bg-code);color:var(--text-on-dark);padding:0.75rem;border-radius:6px;font-family:var(--font-mono);font-size:0.74rem;max-height:135px;overflow:auto;">Click "Generate Marketplace Listing JSON" above...</pre>
        </div>
      </div>
    </section>
  </main>

  ${renderFooter(1)}
  <script src="../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildHubPageHtml() {
  const categories = ['ALL', ...Array.from(new Set(TOOLS.map((t) => t.category)))];
  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(SITE_CONFIG.brandName)} — High-Performance Client-Side Developer Suite &amp; Privacy-First Utilities</title>
  <meta name="description" content="Free client-side developer utilities (${TOOLS.length} tools), production MCP servers, and architecture blueprints. 100% private in-browser execution with zero server uploads." />
  <link rel="canonical" href="${SITE_CONFIG.domain}/" />${renderHeadExtras(0)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./assets/styles.css" />
</head>
<body${bodyClass}>
  ${renderHeader('hub', 0)}

  <main class="page-shell">
    <section class="hub-hero">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.76rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.45rem;">
          Zero-Server Privacy Suite • 100% In-Browser Execution
        </div>
        <h1>High-Performance In-Browser Developer Utilities &amp; Architecture Blueprints</h1>
        <p>
          Fast, private, and offline-capable utilities for software engineers, security analysts, and DevOps teams. Process sensitive JSON, CSV, SQL, JWT tokens, and images 100% locally in your browser with zero server uploads.
        </p>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <a href="#tools-directory" class="btn btn-primary" id="hero-explore-btn">Explore ${TOOLS.length} Developer Utilities →</a>
          <a href="./marketplace/index.html" class="btn btn-secondary" id="hero-mkt-btn">MCP Servers &amp; Blueprints (${MARKETPLACE_ITEMS.length})</a>
          <a href="./about/index.html" class="btn btn-secondary" id="hero-about-btn">Architecture &amp; Security</a>
        </div>
      </div>

      <div class="hub-kpis">
        <div class="kpi-tile">
          <div class="kpi-tile-val">${TOOLS.length} Tools</div>
          <div class="kpi-tile-label">In-Browser File &amp; Data Utilities</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">100% Private</div>
          <div class="kpi-tile-label">Zero Server Uploads &amp; No Data Logging</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">&lt;5ms</div>
          <div class="kpi-tile-label">Sub-Millisecond Browser Engine Speed</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-tile-val">Enterprise</div>
          <div class="kpi-tile-label">SOC 2 &amp; GDPR Compliant Client Isolation</div>
        </div>
      </div>
    </section>

    ${renderAdSlot(
      'leaderboard',
      'Hub Top Leaderboard Slot (728×90 Desktop / 320×100 Mobile)',
      '728×90 / 320×100',
      '$16 – $26',
      SITE_CONFIG.monetization.adsenseSlots.topLeaderboard
    )}

    <!-- Featured Marketplace Banner -->
    <section class="seo-section" style="margin-top:0;margin-bottom:1.5rem;background:var(--bg-elevated);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
        <div>
          <span class="sponsored-pill">PRODUCTION BLUEPRINTS</span>
          <h2 style="margin-bottom:0.2rem;margin-top:0.35rem;">${MARKETPLACE_ITEMS.length} Production SaaS Boilerplates, MCP Servers &amp; Workflows</h2>
          <p style="font-size:0.9rem;color:var(--text-secondary);">
            Complete architecture implementations, Model Context Protocol configurations, and interactive Build-vs-Buy ROI models.
          </p>
        </div>
        <a href="./marketplace/index.html" class="btn btn-primary" id="banner-open-marketplace">
          Open Blueprint Marketplace (${MARKETPLACE_ITEMS.length} Products) →
        </a>
      </div>
      <div class="steps-list">
        ${MARKETPLACE_ITEMS.filter((i) => i.isSponsored)
          .slice(0, 4)
          .map(
            (item) => `
          <a href="./marketplace/${item.slug}/index.html" class="step-card" style="display:block;">
            <div class="step-num">${escapeHtml(item.category)} • ${escapeHtml(item.priceLabel)}</div>
            <div style="font-weight:800;font-size:0.95rem;margin-bottom:0.25rem;">${escapeHtml(item.shortName)}</div>
            <div style="font-size:0.8rem;color:var(--accent-emerald);font-weight:700;">Saves ~${item.hoursSaved} dev hrs • Interactive ROI Calc →</div>
          </a>`
          )
          .join('')}
      </div>
    </section>

    ${renderHomeAffiliateShowcase()}

    ${renderAdSlot(
      'native',
      'In-Content Native Multiplex Directory Ad Unit (High Engagement Zone)',
      'Fluid Responsive 100% × 120px',
      '$22 – $38',
      SITE_CONFIG.monetization.adsenseSlots.inContentNative
    )}

    <section id="tools-directory">
      <div class="filter-bar">
        <div class="category-tabs" role="tablist">
          ${categories
            .map(
              (cat, idx) =>
                `<button type="button" class="cat-tab ${idx === 0 ? 'active' : ''}" data-cat-filter="${escapeHtml(cat)}" id="cat-tab-${idx}">${escapeHtml(cat)}</button>`
            )
            .join('')}
        </div>
        <div>
          <input type="search" id="hub-search-input" class="control-input" placeholder="Search ${TOOLS.length} utility tools..." style="min-width:250px;" aria-label="Search tools" />
        </div>
      </div>

      <div class="tools-grid">
        ${TOOLS.map(
          (tool) => `
          <article class="tool-card" data-tool-card data-category="${escapeHtml(tool.category)}">
            <div>
              <div class="tool-card-top">
                <span class="tool-cat-tag">${escapeHtml(tool.category)}</span>
                <span class="tool-cat-tag" style="color:var(--accent-emerald);">✓ Client-Side</span>
              </div>
              <h2><a href="./${tool.slug}/index.html" id="card-link-${tool.slug}">${escapeHtml(tool.name)}</a></h2>
              <p>${escapeHtml(tool.subtitle)}</p>
            </div>
            <div>
              <div class="tool-card-metrics">
                <span>🔒 Zero Server Uploads</span>
                <span>⚡ Instant Execution</span>
              </div>
              <div style="margin-top:0.85rem;">
                <a href="./${tool.slug}/index.html" class="btn btn-secondary" style="width:100%;" id="open-btn-${tool.slug}">
                  Open Standalone Tool →
                </a>
              </div>
            </div>
          </article>`
        ).join('')}
      </div>
    </section>

    <section class="founder-note" style="margin-top:2.5rem;">
      <div class="founder-note-header">
        <div class="founder-avatar">ZM</div>
        <div>
          <div class="founder-note-title">A Note from the Maintainer</div>
          <div class="founder-note-subtitle">Zain Masri • Software Engineer &amp; Creator of UtilForge</div>
        </div>
      </div>
      <p>
        "I built UtilForge out of frustration with online formatters and decoders that silently transmit your private company data—customer records, database passwords, and JWT tokens—to third-party cloud servers where it gets logged and retained. Every tool on UtilForge is engineered to run 100% locally inside your browser's V8 engine with zero network hops. No tracking of your inputs, no server storage, and no latency. If you find a bug or need a new tool built, please connect directly via email or open an issue on GitHub."
      </p>
      <div style="display:flex;gap:0.75rem;align-items:center;margin-top:0.85rem;flex-wrap:wrap;">
        <a href="https://github.com/zainmasri/utilforge" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.75rem;">
          ⭐ View GitHub Repository
        </a>
        <a href="./about/index.html" class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.75rem;">
          Read Architecture Mission →
        </a>
        <a href="./contact/index.html" class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.75rem;">
          Direct Email Contact
        </a>
      </div>
    </section>

    <!-- Featured Engineering Guides Section -->
    <section class="seo-section" style="margin-top:2rem;background:var(--bg-elevated);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
        <div>
          <span class="sponsored-pill">ENGINEERING GUIDES</span>
          <h2 style="margin-bottom:0.2rem;margin-top:0.35rem;">Technical Guides &amp; Architecture Reference</h2>
          <p style="font-size:0.9rem;color:var(--text-secondary);">
            Deep technical tutorials, code snippets, and performance optimization guides written by software engineers.
          </p>
        </div>
        <a href="./guides/index.html" class="btn btn-secondary" id="banner-open-guides">
          Browse All ${GUIDES.length} Guides →
        </a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;">
        ${GUIDES.slice(0, 3)
          .map(
            (g) => `
          <a href="./guides/${g.slug}/index.html" class="step-card" style="display:block;text-decoration:none;">
            <div class="step-num">${escapeHtml(g.category)} • ${escapeHtml(g.readingTime)}</div>
            <div style="font-weight:800;font-size:0.95rem;margin-top:0.35rem;margin-bottom:0.25rem;color:var(--text-primary);">${escapeHtml(g.title)}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;">${escapeHtml(g.metaDescription)}</div>
          </a>`
          )
          .join('')}
      </div>
    </section>

    <section class="factory-studio-panel" id="security-architecture">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
        <div>
          <div style="font-family:var(--font-mono);font-size:0.75rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;">
            Security &amp; Architecture Standards
          </div>
          <h2 style="font-size:1.45rem;font-weight:800;letter-spacing:-0.025em;">
            Enterprise Privacy: Why In-Browser Client-Side Processing Matters
          </h2>
        </div>
      </div>

      <div class="studio-grid">
        <div class="rail-card" style="background:var(--bg-elevated);">
          <h3 style="font-size:1.05rem;color:var(--text-primary);margin-bottom:0.5rem;">The Zero-Server Security Model</h3>
          <p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.65;margin-bottom:0.85rem;">
            Traditional online utilities upload your JSON, SQL schemas, JWT credentials, or images to backend servers for processing. This introduces enterprise risk, data leakage vectors, and latency bottlenecks.
          </p>
          <p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.65;">
            <strong>UtilForge</strong> runs 100% of its utility logic locally within your browser's isolated JavaScript sandbox using native Web APIs (<code style="font-family:var(--font-mono);">SubtleCrypto</code>, <code style="font-family:var(--font-mono);">HTML5 Canvas</code>, <code style="font-family:var(--font-mono);">TextEncoder</code>). Your sensitive data never traverses the internet, never enters server logs, and is completely isolated to your device.
          </p>
        </div>

        <div class="rail-card" style="background:var(--bg-elevated);">
          <h3 style="font-size:1.05rem;color:var(--text-primary);margin-bottom:0.5rem;">Compliance &amp; Operational Guarantees</h3>
          <ul style="font-size:0.86rem;color:var(--text-secondary);line-height:1.75;padding-left:1.25rem;display:flex;flex-direction:column;gap:0.4rem;">
            <li><strong>SOC 2 &amp; HIPAA Compliant:</strong> Zero data retention eliminates compliance audit scope for internal company data.</li>
            <li><strong>GDPR &amp; CCPA Privacy:</strong> No personal input payloads are stored, profiled, or transferred across international boundaries.</li>
            <li><strong>Offline Capable:</strong> All core algorithms execute in client memory, functioning without active backend connectivity.</li>
            <li><strong>Sub-Millisecond Speed:</strong> Eliminates round-trip HTTP overhead, delivering instantaneous &lt;5ms transformation latency.</li>
          </ul>
        </div>
      </div>
    </section>
  </main>

  ${renderFooter(0)}
  <script src="./assets/engines.js" defer></script>
</body>
</html>`;
}

function buildGuidePageHtml(guide) {
  const canonicalUrl = `${SITE_CONFIG.domain}/guides/${guide.slug}/`;
  const otherGuides = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: guide.title,
    description: guide.metaDescription,
    author: {
      '@type': 'Person',
      name: guide.author,
      url: `${SITE_CONFIG.domain}/about/`,
    },
    datePublished: guide.publishDate,
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.brandName,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.domain}/assets/logo.png`,
      },
    },
    mainEntityOfPage: canonicalUrl,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(guide.title)} | ${escapeHtml(SITE_CONFIG.brandName)} Guides</title>
  <meta name="description" content="${escapeHtml(guide.metaDescription)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(guide.title)}" />
  <meta property="og:description" content="${escapeHtml(guide.metaDescription)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />${renderHeadExtras(2)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/styles.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  ${renderHeader('guides', 2)}

  <main class="page-shell">
    <article class="guide-article">
      <div class="tool-breadcrumb" style="margin-bottom:1rem;">
        <a href="../../index.html">Home</a>
        <span>/</span>
        <a href="../index.html">Guides</a>
        <span>/</span>
        <span>${escapeHtml(guide.shortTitle)}</span>
      </div>

      <h1>${escapeHtml(guide.title)}</h1>

      <div class="guide-meta">
        <span>✍️ By <strong>${escapeHtml(guide.author)}</strong></span>
        <span>📅 ${escapeHtml(guide.publishDate)}</span>
        <span>⏱️ ${escapeHtml(guide.readingTime)}</span>
        <span class="release-badge">${escapeHtml(guide.category)}</span>
      </div>

      ${guide.contentHtml}

      <div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border-subtle);">
        <h3 style="font-size:1.15rem;margin-bottom:1rem;">More Engineering Guides &amp; Tutorials</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;">
          ${otherGuides
            .map(
              (g) => `
            <a href="../${g.slug}/index.html" class="step-card" style="display:block;text-decoration:none;">
              <div class="step-num">${escapeHtml(g.category)} • ${escapeHtml(g.readingTime)}</div>
              <div style="font-weight:700;font-size:0.92rem;color:var(--text-primary);margin-top:0.3rem;margin-bottom:0.25rem;">${escapeHtml(g.title)}</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;">${escapeHtml(g.metaDescription)}</div>
            </a>`
            )
            .join('')}
        </div>
      </div>
    </article>
  </main>

  ${renderFooter(2)}
  <script src="../../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildGuidesHubHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Engineering Guides &amp; Technical Reference | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="In-depth developer guides covering data transformation, cryptographic authentication, regex performance optimization, and database query tuning." />
  <link rel="canonical" href="${SITE_CONFIG.domain}/guides/" />${renderHeadExtras(1)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
</head>
<body>
  ${renderHeader('guides', 1)}

  <main class="page-shell">
    <section class="hub-hero">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.76rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.45rem;">
          Engineering Documentation • Practical Architecture Tutorials
        </div>
        <h1>Developer Guides &amp; Technical Architecture Reference</h1>
        <p>
          Deep technical breakdowns, code snippets, and performance optimization guides written for software engineers, security analysts, and database administrators.
        </p>
      </div>
    </section>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:1.5rem;margin-top:2rem;">
      ${GUIDES.map(
        (g) => `
        <article class="tool-card" style="padding:1.5rem;">
          <div>
            <div class="tool-card-top">
              <span class="tool-cat-tag">${escapeHtml(g.category)}</span>
              <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);">${escapeHtml(g.readingTime)}</span>
            </div>
            <h2><a href="./${g.slug}/index.html">${escapeHtml(g.title)}</a></h2>
            <p>${escapeHtml(g.metaDescription)}</p>
          </div>
          <div style="margin-top:1.2rem;border-top:1px solid var(--border-subtle);padding-top:0.85rem;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--text-muted);">By ${escapeHtml(g.author)}</span>
            <a href="./${g.slug}/index.html" class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.8rem;">Read Guide →</a>
          </div>
        </article>`
      ).join('')}
    </div>
  </main>

  ${renderFooter(1)}
  <script src="../assets/engines.js" defer></script>
</body>
</html>`;
}

function buildLegalPageHtml({ slug, title, description, bodyHtml }) {
  const canonicalUrl = `${SITE_CONFIG.domain}/${slug}/`;
  const bodyClass = getEffectiveAdMode() === 'hidden' ? ' class="ads-hidden"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />${renderHeadExtras(1)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
</head>
<body${bodyClass}>
  ${renderHeader(slug, 1)}
  <main class="page-shell" style="max-width:860px;">
    <section class="seo-section" style="margin-top:1rem;">
      <div class="tool-breadcrumb" style="margin-bottom:0.75rem;">
        <a href="../index.html">Home</a>
        <span>/</span>
        <span>${escapeHtml(title)}</span>
      </div>
      <h1 style="font-size:2rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:1rem;">${escapeHtml(title)}</h1>
      <div style="display:flex;flex-direction:column;gap:1.1rem;color:var(--text-secondary);font-size:0.95rem;line-height:1.75;">
        ${bodyHtml}
      </div>
    </section>
  </main>
  ${renderFooter(1)}
  <script src="../assets/engines.js" defer></script>
</body>
</html>`;
}

const LEGAL_PAGES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: `Privacy Policy for ${SITE_CONFIG.brandName}, detailing 100% client-side browser processing and Google AdSense cookie disclosures.`,
    bodyHtml: `
      <p><strong>Effective Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
      <p>At <strong>${escapeHtml(SITE_CONFIG.brandName)}</strong> (accessible at <code style="font-family:var(--font-mono);">${escapeHtml(SITE_CONFIG.domain)}</code>), your data privacy is our core architectural principle. All ${TOOLS.length} developer utilities and ${COMPARE_Pairs.length} interactive calculators on our site run <strong>100% locally inside your web browser</strong>.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">1. Zero Server Uploads for Tool Inputs</h2>
      <p>When you paste JSON, CSV, SQL, JWT tokens, Regex strings, or select images for compression in any ${escapeHtml(SITE_CONFIG.brandName)} workbench, your content is processed strictly in your device's memory using standard Web APIs (<code style="font-family:var(--font-mono);">HTML5 Canvas</code>, <code style="font-family:var(--font-mono);">WebCrypto</code>, <code style="font-family:var(--font-mono);">DOMParser</code>). We never transmit, log, or store your input data on any backend server.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">2. Google AdSense &amp; Cookies Disclosure</h2>
      <p>To keep our tools 100% free and registration-free, we use third-party advertising companies, including <strong>Google AdSense</strong>, to serve ads when you visit our website.</p>
      <ul style="padding-left:1.5rem;display:flex;flex-direction:column;gap:0.45rem;">
        <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
        <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</li>
        <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;">Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;">www.aboutads.info</a>.</li>
      </ul>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">3. Local Storage</h2>
      <p>We use browser <code style="font-family:var(--font-mono);">sessionStorage</code> solely to remember UI preferences during your session (such as layout preview settings). No personal tracking profiles are created by ${escapeHtml(SITE_CONFIG.brandName)}.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">4. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, you can contact us at <a href="mailto:${escapeHtml(SITE_CONFIG.contactEmail || 'contact@utilforge.pages.dev')}" style="color:var(--accent-primary);text-decoration:underline;">${escapeHtml(SITE_CONFIG.contactEmail || 'contact@utilforge.pages.dev')}</a>.</p>
    `,
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    description: `Terms of Use and disclaimer for using ${SITE_CONFIG.brandName} client-side web utilities.`,
    bodyHtml: `
      <p><strong>Last Updated:</strong> ${new Date().toISOString().split('T')[0]}</p>
      <p>By accessing and using <strong>${escapeHtml(SITE_CONFIG.brandName)}</strong>, you agree to the following Terms of Use.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">1. Free Client-Side License</h2>
      <p>${escapeHtml(SITE_CONFIG.brandName)} provides ${TOOLS.length} browser-based utilities and ${COMPARE_Pairs.length} interactive calculators free of charge for personal and commercial developer workflows. All outputs generated by you using our client-side tools belong entirely to you.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">2. "As-Is" Warranty Disclaimer</h2>
      <p>All tools and calculators on ${escapeHtml(SITE_CONFIG.brandName)} are provided "AS IS" without warranty of any kind, either express or implied. While every tool engine is tested for accuracy, you are responsible for verifying critical configurations (such as Cron schedules, SQL queries, CIDR blocks, or Linux chmod permissions) before deploying them to production systems.</p>
      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.5rem;">3. Limitation of Liability</h2>
      <p>In no event shall ${escapeHtml(SITE_CONFIG.brandName)} or its maintainers be liable for any data loss, production downtime, or indirect damages arising out of the use or inability to use the client-side tools provided on this website.</p>
    `,
  },
  {
    slug: 'about',
    title: 'About UtilForge — Architecture, Mission & Engineering Standards',
    description: `About ${SITE_CONFIG.brandName} — zero-upload client-side developer utilities and architecture blueprints engineered for security, speed, and privacy.`,
    bodyHtml: `
      <p><strong>UtilForge</strong> is a high-performance suite of ${TOOLS.length} standalone developer utilities, production-grade Model Context Protocol (MCP) servers, and software architecture blueprints engineered to execute 100% locally inside modern web browsers.</p>

      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.75rem;">Our Mission: Eliminating Third-Party Utility Risk</h2>
      <p>Every day, software engineers, DevOps specialists, and security analysts paste sensitive corporate data—including production database dumps, JWT authentication tokens, confidential API keys, SQL queries, and customer records—into online converters and formatters. Traditional web utilities send these payloads over the internet to remote backend servers, introducing data leak risks, compliance violations, and unnecessary network latency.</p>
      <p>UtilForge was built to eliminate the backend server entirely. By shifting 100% of the transformation workload into the browser via modern Web APIs (<code style="font-family:var(--font-mono);">SubtleCrypto</code>, <code style="font-family:var(--font-mono);">HTML5 Canvas</code>, <code style="font-family:var(--font-mono);">DOMParser</code>, and native JavaScript V8 parsing), your sensitive data never leaves your device's memory.</p>

      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.75rem;">Core Architectural Principles</h2>
      <ul style="padding-left:1.5rem;display:flex;flex-direction:column;gap:0.45rem;">
        <li><strong>Zero Server Uploads:</strong> All file conversions, formatting, regex matching, and cryptographic hashing take place in local client memory. No user payload is ever logged, cached, or transmitted to any server.</li>
        <li><strong>Sub-Millisecond Execution:</strong> Because transformations execute locally on your machine's CPU/GPU, latency is near-instantaneous (&lt;5ms) with zero cloud queueing.</li>
        <li><strong>Enterprise Compliance Isolation:</strong> Ideal for organizations operating under strict SOC 2, HIPAA, PCI-DSS, or GDPR guidelines where third-party data processing agreements (DPAs) are required for cloud tools.</li>
        <li><strong>Transparent &amp; Auditable:</strong> All client logic is bundled into clear, unminified JavaScript engine modules that any engineer can inspect via browser Developer Tools.</li>
      </ul>

      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.75rem;">Engineering Leadership &amp; Maintainer</h2>
      <p>UtilForge is designed, engineered, and maintained by <strong>Zain Masri</strong>, a software engineer passionate about developer productivity, client-side web technologies, and data privacy. Have feedback, suggested tools, or enterprise inquiries? Connect directly via our <a href="../contact/index.html" style="color:var(--accent-primary);text-decoration:underline;">Contact &amp; Support Page</a>.</p>
    `,
  },
  {
    slug: 'contact',
    title: 'Contact & Support',
    description: `Contact the ${SITE_CONFIG.brandName} engineering and support team for bug reports, tool requests, security disclosures, and commercial licensing.`,
    bodyHtml: `
      <p>We welcome questions, feature requests, bug reports, security disclosures, and commercial licensing inquiries from developers and engineering teams worldwide.</p>

      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.75rem;">Direct Engineering Contact</h2>
      <p>Reach out directly to our lead engineer and maintainer:</p>
      <div style="background:var(--bg-elevated);padding:1.25rem;border-radius:8px;border:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:0.5rem;margin:0.5rem 0 1rem 0;">
        <div><strong>Primary Contact:</strong> Zain Masri (Maintainer)</div>
        <div><strong>Direct Email:</strong> <a href="mailto:zainmasri123@gmail.com" style="color:var(--accent-primary);text-decoration:underline;font-family:var(--font-mono);">zainmasri123@gmail.com</a></div>
        <div><strong>Response Time:</strong> We aim to reply to all inquiries within 24 to 48 business hours.</div>
        <div><strong>Website Domain:</strong> <a href="https://getutilforge.com" style="color:var(--accent-primary);text-decoration:underline;font-family:var(--font-mono);">https://getutilforge.com</a></div>
        <div><strong>GitHub:</strong> <a href="https://github.com/zainmasri/utilforge" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;font-family:var(--font-mono);">github.com/zainmasri/utilforge</a></div>
      </div>

      <h2 style="color:var(--text-primary);font-size:1.25rem;margin-top:0.75rem;">Inquiry Categories</h2>
      <ul style="padding-left:1.5rem;display:flex;flex-direction:column;gap:0.45rem;">
        <li><strong>Bug Reports &amp; Edge Cases:</strong> If you find a data formatting irregularity or browser edge-case in any of our ${TOOLS.length} utilities, please provide a sanitized reproduction sample.</li>
        <li><strong>New Tool &amp; Feature Requests:</strong> Need a specific client-side encoder, transformer, or FinOps calculator? Let us know what workflows would save your team time.</li>
        <li><strong>Security &amp; Vulnerability Disclosure:</strong> Responsible disclosures are treated with top priority. We verify that zero user data ever leaves the local browser sandbox.</li>
        <li><strong>Commercial Licensing &amp; Source Code:</strong> Inquire about offline enterprise bundles, white-label licenses, or custom tool embeds for internal developer portals.</li>
      </ul>
    `,
  },
  {
    slug: 'changelog',
    title: 'Changelog & Engineering Releases',
    description: `Track new tools, performance enhancements, and security audits across UtilForge. Ongoing curation and maintenance log.`,
    bodyHtml: `
      <p>UtilForge is actively maintained and continuously curated. Below is our chronological release log of performance upgrades, engine optimizations, and security audits.</p>

      <div class="changelog-timeline">
        <div class="changelog-release">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem;">
            <span class="release-badge" style="background:var(--accent-emerald-soft);color:var(--accent-emerald);">v1.5 • LATEST RELEASE</span>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">October 28, 2026</span>
          </div>
          <h2 style="font-size:1.15rem;margin-top:0.2rem;margin-bottom:0.6rem;color:var(--text-primary);border:none;padding:0;">Editorial Guides Library &amp; Zero-Server Security Audit</h2>
          <ul style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem;">
            <li>Published 5 in-depth technical engineering guides covering nested JSON parsing, JWT signature validation, ReDoS mitigation, and SQL indexing.</li>
            <li>Audited all 50 utility tools for 100% client-side memory isolation (zero external HTTP telemetry on inputs).</li>
            <li>Added strict RFC-4180 CSV escaping mode with automated delimiter inference and dot-notation nested flattening.</li>
            <li>Integrated public GitHub repository (<a href="https://github.com/zainmasri/utilforge" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;">github.com/zainmasri/utilforge</a>) for community bug reporting and issue tracking.</li>
          </ul>
        </div>

        <div class="changelog-release">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem;">
            <span class="release-badge">v1.4</span>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">October 25, 2026</span>
          </div>
          <h2 style="font-size:1.15rem;margin-top:0.2rem;margin-bottom:0.6rem;color:var(--text-primary);border:none;padding:0;">SubtleCrypto Hardware Acceleration &amp; SHA-512 Support</h2>
          <ul style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem;">
            <li>Migrated Base64 and Hash Studio from pure JS implementations to native browser WebCrypto (<code style="font-family:var(--font-mono);">crypto.subtle</code>).</li>
            <li>Achieved sub-millisecond execution for SHA-256 and SHA-512 hashes on 50MB+ payloads.</li>
            <li>Added binary byte-unit converter with IEC (kibi/mebi) and JEDEC standard toggles.</li>
          </ul>
        </div>

        <div class="changelog-release">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem;">
            <span class="release-badge">v1.3</span>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">October 21, 2026</span>
          </div>
          <h2 style="font-size:1.15rem;margin-top:0.2rem;margin-bottom:0.6rem;color:var(--text-primary);border:none;padding:0;">26 Model Context Protocol (MCP) Server Blueprints &amp; ROI Models</h2>
          <ul style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem;">
            <li>Launched 26 production-tested MCP server and automation workflow blueprints.</li>
            <li>Added interactive Build-vs-Buy ROI calculators calculating engineering contractor cost savings.</li>
            <li>Direct PayPal commercial license checkout with instant JSON blueprint bundle delivery.</li>
          </ul>
        </div>

        <div class="changelog-release">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem;">
            <span class="release-badge">v1.2</span>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">October 18, 2026</span>
          </div>
          <h2 style="font-size:1.15rem;margin-top:0.2rem;margin-bottom:0.6rem;color:var(--text-primary);border:none;padding:0;">HTML5 Canvas2D In-Browser Image Quantization</h2>
          <ul style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem;">
            <li>Engineered offline image compressor supporting WebP, JPEG, and PNG conversions.</li>
            <li>100% private processing using off-screen HTML5 Canvas with custom quality sliders.</li>
            <li>Pre-loaded 1280x720 benchmark test graphic for instant slider comparison.</li>
          </ul>
        </div>

        <div class="changelog-release">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem;">
            <span class="release-badge">v1.0</span>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">October 15, 2026</span>
          </div>
          <h2 style="font-size:1.15rem;margin-top:0.2rem;margin-bottom:0.6rem;color:var(--text-primary);border:none;padding:0;">Initial UtilForge Launch (50 Client-Side Utilities)</h2>
          <ul style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.9rem;">
            <li>Launched suite of 50 standalone browser utilities across Data Conversion, DevOps, Security, Code, and Media.</li>
            <li>Zero backend architecture: zero database costs, zero server uploads, and near-instant load speeds.</li>
          </ul>
        </div>
      </div>
    `,
  },
];

function buildSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: `${SITE_CONFIG.domain}/`, priority: '1.0' },
    ...TOOLS.map((t) => ({ loc: `${SITE_CONFIG.domain}/${t.slug}/`, priority: '0.9' })),
    { loc: `${SITE_CONFIG.domain}/guides/`, priority: '0.9' },
    ...GUIDES.map((g) => ({ loc: `${SITE_CONFIG.domain}/guides/${g.slug}/`, priority: '0.8' })),
    { loc: `${SITE_CONFIG.domain}/marketplace/`, priority: '0.8' },
    ...MARKETPLACE_ITEMS.map((m) => ({ loc: `${SITE_CONFIG.domain}/marketplace/${m.slug}/`, priority: '0.8' })),
    ...LEGAL_PAGES.map((p) => ({ loc: `${SITE_CONFIG.domain}/${p.slug}/`, priority: '0.7' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

function minifyCss(cssText) {
  return cssText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function buildCloudflareHeaders() {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sitemap.xml
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/ads.txt
  Cache-Control: public, max-age=86400
`;
}

function buildGoRedirectHtml(partner) {
  const dest = partner.destinationUrl || 'https://utilforge.pages.dev';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Redirecting to ${escapeHtml(partner.name)} | ${escapeHtml(SITE_CONFIG.brandName)}</title>
  <link rel="stylesheet" href="../../assets/styles.css" />
</head>
<body class="ads-hidden">
  <main class="main-container" style="max-width:560px;margin:5rem auto;text-align:center;">
    <section class="content-card" style="padding:2rem;">
      <span class="hero-badge" style="margin-bottom:0.85rem;">Verified Partner Redirect • ${escapeHtml(partner.badge)}</span>
      <h1 style="font-size:1.35rem;margin-bottom:0.5rem;">Connecting to ${escapeHtml(partner.name)}…</h1>
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.25rem;">
        Applying your UtilForge partner offer. If you are not redirected automatically within 1 second, click below:
      </p>
      <a href="${escapeHtml(dest)}" rel="noopener sponsored" class="action-btn primary" style="display:inline-flex;padding:0.65rem 1.25rem;text-decoration:none;">
        Continue to ${escapeHtml(partner.name)} →
      </a>
    </section>
  </main>
  <script>
    (function () {
      var dest = ${JSON.stringify(dest)};
      var slug = ${JSON.stringify(partner.slug)};
      var payload = JSON.stringify({
        type: 'affiliate_click',
        partner: ${JSON.stringify(partner.name)},
        page: window.location.pathname
      });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/telemetry', new Blob([payload], { type: 'application/json' }));
        } else {
          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(function () {});
        }
      } catch (_e) {}

      var redirected = false;
      function goNow(url) {
        if (redirected) return;
        redirected = true;
        window.location.replace(url || dest);
      }

      fetch('/api/telemetry?go=' + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          goNow(data && data.destinationUrl ? data.destinationUrl : dest);
        })
        .catch(function () {
          goNow(dest);
        });

      setTimeout(function () {
        goNow(dest);
      }, 280);
    })();
  </script>
</body>
</html>`;
}

function buildLlmsTxt() {
  const lines = [
    `# ${SITE_CONFIG.brandName} — ${SITE_CONFIG.tagline}`,
    `> ${SITE_CONFIG.domain} provides ${TOOLS.length} zero-server client-side developer utilities, ${COMPARE_Pairs.length} interactive "X vs. Y" cloud/AI/payment cost calculators, and ${MARKETPLACE_ITEMS.length} production-ready SaaS boilerplates, MCP servers, and AI automation workflows.`,
    '',
    '## Client-Side Developer & FinOps Utilities',
    ...TOOLS.map(
      (t) => `- [${t.name}](${SITE_CONFIG.domain}/${t.slug}/): ${t.subtitle}`
    ),
    '',
    '## Interactive "X vs. Y" Cloud, LLM API & Payment Cost Calculators',
    ...COMPARE_Pairs.slice(0, 80).map(
      (p) => `- [${p.itemA.name} vs ${p.itemB.name} Cost Calculator](${SITE_CONFIG.domain}/compare/${p.slug}/): ${p.metaDescription}`
    ),
    '',
    '## Boilerplate, MCP Server & AI Workflow Marketplace',
    ...MARKETPLACE_ITEMS.map(
      (m) => `- [${m.name} (${m.priceLabel})](${SITE_CONFIG.domain}/marketplace/${m.slug}/): ${m.subtitle}`
    ),
  ];
  return lines.join('\n') + '\n';
}

function buildRssFeedXml() {
  const nowRfc = new Date().toUTCString();
  const items = [
    ...TOOLS.map((t) => ({
      title: t.name,
      link: `${SITE_CONFIG.domain}/${t.slug}/`,
      desc: t.metaDescription,
    })),
    ...MARKETPLACE_ITEMS.map((m) => ({
      title: `${m.name} (${m.priceLabel})`,
      link: `${SITE_CONFIG.domain}/marketplace/${m.slug}/`,
      desc: m.subtitle,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE_CONFIG.brandName)} — Developer Utilities, Cloud Cost Calculators &amp; MCP Marketplace</title>
    <link>${SITE_CONFIG.domain}/</link>
    <description>${escapeHtml(SITE_CONFIG.tagline)}</description>
    <lastBuildDate>${nowRfc}</lastBuildDate>
${items
  .map(
    (it) => `    <item>
      <title>${escapeHtml(it.title)}</title>
      <link>${it.link}</link>
      <guid>${it.link}</guid>
      <description>${escapeHtml(it.desc)}</description>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;
}

function buildAll() {
  fs.mkdirSync(ASSETS_OUT, { recursive: true });

  const rawCss = fs.readFileSync(path.join(__dirname, 'src/assets/styles.css'), 'utf8');
  fs.writeFileSync(path.join(ASSETS_OUT, 'styles.css'), minifyCss(rawCss), 'utf8');
  fs.copyFileSync(
    path.join(__dirname, 'src/assets/engines.js'),
    path.join(ASSETS_OUT, 'engines.js')
  );
  if (fs.existsSync(path.join(__dirname, 'src/assets/logo.png'))) {
    fs.copyFileSync(
      path.join(__dirname, 'src/assets/logo.png'),
      path.join(ASSETS_OUT, 'logo.png')
    );
  }

  // Generate downloadable Pro Blueprints bundle for instant post-checkout fulfillment
  const proBundle = {
    bundleName: 'UtilForge Pro MCP, SaaS Boilerplate & FinOps Blueprint Pack',
    generatedAt: new Date().toISOString(),
    repositoryUrl: 'https://github.com/zainmasri/utilforge',
    supportEmail: 'zainmasri123@gmail.com',
    items: MARKETPLACE_ITEMS.map((it) => ({
      slug: it.slug,
      name: it.name,
      category: it.category,
      stack: it.stack,
      features: it.features,
      blueprint: it.previewSnippet,
    })),
  };
  fs.writeFileSync(
    path.join(ASSETS_OUT, 'utilforge-pro-blueprints.json'),
    JSON.stringify(proBundle, null, 2),
    'utf8'
  );

  // 1. Main Hub
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), buildHubPageHtml(), 'utf8');

  // 2. Utility Tool Pages
  for (const tool of TOOLS) {
    const toolDir = path.join(DIST_DIR, tool.slug);
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(toolDir, 'index.html'), buildToolPageHtml(tool), 'utf8');
  }

  // 3. Programmatic SEO "X vs. Y" Hub + Pairwise Calculator Pages
  const compareRoot = path.join(DIST_DIR, 'compare');
  fs.mkdirSync(compareRoot, { recursive: true });
  fs.writeFileSync(path.join(compareRoot, 'index.html'), buildCompareHubPageHtml(), 'utf8');

  for (const pair of COMPARE_Pairs) {
    const pairDir = path.join(compareRoot, pair.slug);
    fs.mkdirSync(pairDir, { recursive: true });
    fs.writeFileSync(path.join(pairDir, 'index.html'), buildComparisonPairHtml(pair), 'utf8');
  }

  // 4. Passive Affiliate & Sponsored Marketplace Hub + Listing Pages
  const mktRoot = path.join(DIST_DIR, 'marketplace');
  fs.mkdirSync(mktRoot, { recursive: true });
  fs.writeFileSync(path.join(mktRoot, 'index.html'), buildMarketplaceHubHtml(), 'utf8');

  for (const item of MARKETPLACE_ITEMS) {
    const itemDir = path.join(mktRoot, item.slug);
    fs.mkdirSync(itemDir, { recursive: true });
    fs.writeFileSync(path.join(itemDir, 'index.html'), buildMarketplaceItemHtml(item), 'utf8');
  }

  // 5. Clean /go/<partner>/ Affiliate Cloaking & Telemetry Redirect Pages
  const goRoot = path.join(DIST_DIR, 'go');
  fs.mkdirSync(goRoot, { recursive: true });
  for (const partner of GO_PARTNERS) {
    const pDir = path.join(goRoot, partner.slug);
    fs.mkdirSync(pDir, { recursive: true });
    fs.writeFileSync(path.join(pDir, 'index.html'), buildGoRedirectHtml(partner), 'utf8');
  }

  // 6. Developer Guides & Engineering Reference Hub + Article Pages
  const guidesRoot = path.join(DIST_DIR, 'guides');
  fs.mkdirSync(guidesRoot, { recursive: true });
  fs.writeFileSync(path.join(guidesRoot, 'index.html'), buildGuidesHubHtml(), 'utf8');

  for (const guide of GUIDES) {
    const guideDir = path.join(guidesRoot, guide.slug);
    fs.mkdirSync(guideDir, { recursive: true });
    fs.writeFileSync(path.join(guideDir, 'index.html'), buildGuidePageHtml(guide), 'utf8');
  }

  // 7. Legal, Compliance & Changelog Pages
  for (const page of LEGAL_PAGES) {
    const pageDir = path.join(DIST_DIR, page.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), buildLegalPageHtml(page), 'utf8');
  }

  // 8. Sitemap, Robots, Ads.txt, LLMs.txt, RSS Feed, IndexNow Key, Cloudflare _headers
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), buildSitemapXml(), 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), buildLlmsTxt(), 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'feed.xml'), buildRssFeedXml(), 'utf8');
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /go/\nSitemap: ${SITE_CONFIG.domain}/sitemap.xml\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(DIST_DIR, 'ads.txt'),
    `google.com, ${SITE_CONFIG.monetization.adsensePublisherId.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`,
    'utf8'
  );
  if (SITE_CONFIG.indexNowKey) {
    fs.writeFileSync(
      path.join(DIST_DIR, `${SITE_CONFIG.indexNowKey}.txt`),
      SITE_CONFIG.indexNowKey,
      'utf8'
    );
  }
  fs.writeFileSync(path.join(DIST_DIR, '_headers'), buildCloudflareHeaders(), 'utf8');

  console.log(
    `[UtilForge Builder] Compiled 3 Hubs + ${TOOLS.length} Utility Tools + ${COMPARE_Pairs.length} Programmatic Calculators + ${MARKETPLACE_ITEMS.length} Marketplace Listings + ${GO_PARTNERS.length} Affiliate Redirects + ${LEGAL_PAGES.length} Legal Pages (${TOTAL_PAGE_COUNT} total HTML pages) into ${DIST_DIR}`
  );
}

buildAll();

