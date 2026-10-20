# UtilForge Autonomous Growth & Revenue Changelog

All daily programmatic SEO expansions, high-CPM tool additions, affiliate redirect activations, and revenue optimizations are logged below.

## 2026-10-20 — 375-Page Expansion + Reasoning LLM & Serverless Cost Calculators + Winner CTA Optimization
- **Total Static Pages Compiled**: **375 HTML Pages** (`3 Hubs + 42 Client-Side Tools + 292 X-vs-Y Calculators + 26 Marketplace Listings + 9 /go/ Affiliate Routers + 3 Legal Pages`)
- **2 New High-CPM Client-Side Utility Tools Added ($42–$88 AdSense RPM Tier)**:
  1. `/reasoning-llm-token-cost-calculator/` — Reasoning LLM Cost Calculator (OpenAI o1 / o3-mini vs DeepSeek R1 vs Claude 3.7 Sonnet) (`$52–$88 RPM`, 145K est. monthly searches)
  2. `/vercel-vs-cloudflare-pricing-calculator/` — Vercel vs Cloudflare Workers & Pages Compute & Bandwidth Cost Calculator (`$42–$75 RPM`, 98K est. monthly searches)
- **Affiliate CTA & Ad Viewability Optimizations**:
  - Wired dynamic winner CTA attributes (`data-a-href`, `data-b-href`, `data-a-partner`, `data-b-partner`) and primary button styling on all 292 X-vs-Y comparison calculators so the most cost-effective provider's affiliate link dynamically highlights as the primary CTA.
  - Added explicit `partnerSlug` routing for high-traffic tools (`/image-compressor/`, `/rag-vector-db-cost-estimator/`, `/llm-token-cost-estimator/`) to pair users directly with the highest-converting cloud/AI affiliate partner.
  - Enhanced `.ad-slot ins.adsbygoogle` layout geometry (`width: 100%; min-height: inherit; display: block;`) to maximize Google AdSense Active View viewability without CLS.

## 2026-10-17 — 300-Page Milestone + High-CPM Fintech/AI Expansion
- **Total Static Pages Compiled**: **300 HTML Pages** (`3 Hubs + 36 Client-Side Tools + 229 X-vs-Y Calculators + 24 Marketplace Listings + 5 /go/ Affiliate Routers + 3 Legal Pages`)
- **4 New High-CPM Fintech & AI Client-Side Tools Added ($32–$82 AdSense RPM Tier)**:
  1. `/freelance-rate-tax-calculator/` — Freelance Hourly Rate, 1099 Tax & S-Corp Take-Home Calculator (`$38–$65 RPM`)
  2. `/saas-ltv-cac-calculator/` — SaaS MRR, LTV:CAC, Burn Multiple & Cash Runway Calculator (`$45–$78 RPM`)
  3. `/llm-token-cost-estimator/` — LLM Prompt Token Counter & Multi-Model API Cost Estimator (`$32–$54 RPM`)
  4. `/svg-qr-code-studio/` — Zero-Server SVG QR Code & Wi-Fi / vCard Payload Studio (`$18–$28 RPM`)
- **5 Clean `/go/<partner>/` Affiliate Cloaking & Telemetry Redirect Routes Deployed**:
  - `/go/cloudflare-workers/` → Cloudflare Workers & Pages (`$35` est. CPA)
  - `/go/mercury-banking/` → Mercury Startup Banking (`$150` est. CPA)
  - `/go/gusto-payroll/` → Gusto S-Corp & Contractor Payroll (`$100` est. CPA)
  - `/go/openrouter-ai/` → OpenRouter Unified LLM API (`$40` est. CPA)
  - `/go/supabase-postgres/` → Supabase Managed Postgres (`$45` est. CPA)
- **Live Revenue Telemetry & Daily Email**:
  - Cloudflare KV (`UTILFORGE_REVENUE_KV`) tracking `pageview`, `ad_filled`, `ad_unfilled`, and `affiliate_click` across all 300 pages.
  - Daily email report active via `scripts/send_daily_email.js` → `zainmasri123@gmail.com`.
