#!/usr/bin/env node
/**
 * Creates 2 high-search-volume satellite repositories on github.com/zainmasri
 * with GitHub Topics and rich Markdown comparison tables linking to https://utilforge.pages.dev.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const SATELLITES = [
  {
    name: 'awesome-llm-and-cloud-pricing-calculators',
    description: '2026 Interactive LLM API Token Cost, Cloud GPU (H100/A100), Serverless & Postgres FinOps Calculators — Live at https://utilforge.pages.dev',
    homepage: 'https://utilforge.pages.dev/compare/',
    topics: ['llm-pricing', 'finops', 'cost-calculator', 'deepseek-r1', 'openai-api', 'cloud-gpu', 'supabase', 'cloudflare-workers', 'serverless', 'awesome-list'],
    readme: `# Awesome LLM API, Cloud GPU & FinOps Cost Calculators (2026)

[![Live Calculators](https://img.shields.io/badge/Live_Calculators-381_Interactive_Pages-10b981?style=for-the-badge)](https://utilforge.pages.dev)
[![Comparison Matrix](https://img.shields.io/badge/X_vs_Y_Matrix-292_Calculators-2563eb?style=for-the-badge)](https://utilforge.pages.dev/compare/)
[![MCP & SaaS Marketplace](https://img.shields.io/badge/MCP_&_SaaS_Blueprints-26_Listings-f59e0b?style=for-the-badge)](https://utilforge.pages.dev/marketplace/)

A curated collection of **100% client-side, zero-server FinOps cost calculators** and **292 interactive X-vs-Y cloud/AI comparison simulators** for engineering leaders, AI builders, and SaaS founders.

---

## 🧠 1. LLM API Token & Cloud GPU Inference Calculators

| Interactive Calculator | Models / Providers Covered | Launch URL |
| :--- | :--- | :--- |
| **Cloud GPU Inference & Fine-Tuning Cost Calculator** | RunPod vs Lambda Labs vs Modal vs CoreWeave (H100, A100, L40S, RTX 4090) | **[Open Calculator →](https://utilforge.pages.dev/cloud-gpu-inference-cost-calculator/)** |
| **Reasoning LLM Token Cost Calculator** | OpenAI o1 / o3-mini vs DeepSeek R1 vs Claude 3.7 Sonnet (Thinking Tokens) | **[Open Calculator →](https://utilforge.pages.dev/reasoning-llm-token-cost-calculator/)** |
| **Multi-Model LLM Prompt Token Counter & Cost Estimator** | GPT-4o, GPT-4o-mini, Claude 3.5, Gemini 2.5, DeepSeek V3, Llama 3.3 | **[Open Calculator →](https://utilforge.pages.dev/llm-token-cost-estimator/)** |
| **Vector Database & RAG Embedding Cost Estimator** | Pinecone Serverless vs Supabase pgvector vs Qdrant Cloud vs Milvus | **[Open Calculator →](https://utilforge.pages.dev/rag-vector-db-cost-estimator/)** |
| **GPT-4o vs. GPT-4o Mini Workload Simulator** | Direct API token split & annual savings calculator | **[Open Calculator →](https://utilforge.pages.dev/compare/gpt-4o-vs-gpt-4o-mini/)** |
| **DeepSeek V3 vs. OpenAI o3-mini Cost Simulator** | Open-weights vs frontier reasoning token economics | **[Open Calculator →](https://utilforge.pages.dev/compare/deepseek-v3-vs-openai-o3-mini/)** |

---

## ☁️ 2. Serverless Compute, PostgreSQL & Object Storage Calculators

| Interactive Calculator | Stack Compared | Launch URL |
| :--- | :--- | :--- |
| **Supabase vs. Neon Database Branching & Serverless Compute Calculator** | Copy-on-write ephemeral PR branches, scale-to-zero CU hours & storage | **[Open Calculator →](https://utilforge.pages.dev/supabase-vs-neon-serverless-branching-cost-calculator/)** |
| **AWS RDS vs. Supabase vs. Neon PostgreSQL Cost Calculator** | Multi-AZ RDS vs Managed Postgres compute, IOPS & NAT egress | **[Open Calculator →](https://utilforge.pages.dev/aws-rds-vs-supabase-neon-cost-calculator/)** |
| **AWS Lambda vs. Cloudflare Workers Compute & Concurrency Calculator** | GB-s duration vs V8 Isolate CPU-ms billing & cold start overhead | **[Open Calculator →](https://utilforge.pages.dev/aws-lambda-vs-cloudflare-workers-cost-calculator/)** |
| **Vercel Pro vs. Cloudflare Workers & Pages Bandwidth Calculator** | Fast Origin Transfer, Edge Invocations & Seat licensing | **[Open Calculator →](https://utilforge.pages.dev/vercel-vs-cloudflare-pricing-calculator/)** |
| **AWS S3 vs. Cloudflare R2 Zero-Egress Storage Calculator** | Class A/B operations + $0.09/GB S3 egress vs $0 R2 egress | **[Open Calculator →](https://utilforge.pages.dev/aws-s3-vs-cloudflare-r2-egress-calculator/)** |

---

## 💳 3. SaaS Unit Economics, Billing & Founder Finance Calculators

- **[Stripe Billing vs. Chargebee vs. Maxio Subscription Cost Calculator](https://utilforge.pages.dev/stripe-billing-vs-chargebee-invoicing-calculator/)**
- **[Stripe vs. PayPal vs. Lemon Squeezy Net Payout & MoR Fee Calculator](https://utilforge.pages.dev/stripe-paypal-fee-calculator/)**
- **[B2B SaaS Net Dollar Retention (NDR), Logo Churn & Expansion ARR Calculator](https://utilforge.pages.dev/b2b-saas-churn-net-dollar-retention-calculator/)**
- **[SaaS LTV:CAC, Burn Multiple & Cash Runway Calculator](https://utilforge.pages.dev/saas-ltv-cac-calculator/)**
- **[SAFE Note & Seed Round Founder Equity Dilution Calculator](https://utilforge.pages.dev/startup-equity-dilution-calculator/)**
- **[Freelance Engineer Hourly Rate, 1099 Tax & S-Corp Take-Home Calculator](https://utilforge.pages.dev/freelance-rate-tax-calculator/)**

👉 **[Explore All 381 Tools, Comparison Calculators & MCP Blueprints at utilforge.pages.dev →](https://utilforge.pages.dev)**
`
  },
  {
    name: 'mcp-server-and-saas-blueprints',
    description: 'Production Model Context Protocol (MCP) Server Configs, Claude Desktop & Cursor Blueprints, n8n AI Workflows & SaaS Boilerplates — https://utilforge.pages.dev/marketplace/',
    homepage: 'https://utilforge.pages.dev/marketplace/',
    topics: ['mcp', 'mcp-server', 'model-context-protocol', 'claude-desktop', 'cursor-ai', 'n8n-workflows', 'saas-boilerplate', 'stripe', 'supabase', 'cloudflare-workers'],
    readme: `# Production MCP Server Blueprints, Claude Desktop Configs & SaaS Boilerplates

[![Explore Marketplace](https://img.shields.io/badge/Explore_Marketplace-26_Verified_Blueprints-10b981?style=for-the-badge)](https://utilforge.pages.dev/marketplace/)
[![Download Starter Pack](https://img.shields.io/badge/Starter_Blueprint_Pack-$19_Instant_Access-2563eb?style=for-the-badge)](https://utilforge.pages.dev/marketplace/stripe-revenue-analytics-mcp/)

Ready-to-deploy **Model Context Protocol (MCP) servers**, **n8n / Make AI agent workflows**, and **Next.js / Cloudflare Workers / Supabase SaaS boilerplates** with interactive **Build-vs-Buy Engineering ROI Calculators** and copyable JSON blueprints.

---

## 🔌 Featured Model Context Protocol (MCP) Servers

1. **[Stripe Revenue, Churn & MRR Analytics MCP Server](https://utilforge.pages.dev/marketplace/stripe-revenue-analytics-mcp/)** — Query live MRR, cohort retention, and failed dunning invoices from Claude Desktop or Cursor.
2. **[PostgreSQL Read-Only Schema & Query Auditor MCP Server](https://utilforge.pages.dev/marketplace/postgres-readonly-audit-mcp/)** — Safe read-only SQL execution, EXPLAIN ANALYZE indexing suggestions, and RLS policy auditing.
3. **[Cloudflare Workers, D1 & R2 Ops Wrangler MCP Server](https://utilforge.pages.dev/marketplace/cloudflare-ops-wrangler-mcp/)** — Inspect Workers logs, D1 SQLite tables, KV namespaces, and R2 buckets via natural language.
4. **[Cloudflare R2 Zero-Egress S3 Bucket Migrator MCP Server](https://utilforge.pages.dev/marketplace/cloudflare-r2-zero-egress-migrator-mcp/)** — Automate zero-downtime AWS S3 to Cloudflare R2 migration and presigned URL verification.
5. **[BigQuery + DuckDB Cloud FinOps Cost Optimizer MCP Server](https://utilforge.pages.dev/marketplace/bigquery-duckdb-finops-mcp/)** — Detect unpartitioned full-table scans and offload cold analytics to local DuckDB Parquet.
6. **[Playwright Visual Regression & Accessibility QA MCP Server](https://utilforge.pages.dev/marketplace/playwright-visual-qa-mcp/)** — Autonomous DOM snapshot diffing, WCAG contrast checks, and broken-link auditing.

---

## 🚀 Full-Stack SaaS Boilerplates & n8n AI Workflows

- **[ShipStack Pro — Next.js 15 + Stripe + Supabase AI SaaS Starter](https://utilforge.pages.dev/marketplace/shipfast-nextjs-saas/)**
- **[EdgeFlare Kit — Cloudflare Workers + D1 + R2 Zero-Server-Bill SaaS Kit](https://utilforge.pages.dev/marketplace/cloudflare-edge-saas-kit/)**
- **[FastAPI + Next.js LangGraph Multi-Agent SaaS Starter](https://utilforge.pages.dev/marketplace/fastapi-nextjs-ai-agent-starter/)**
- **[n8n Stripe Failed Payment & Churn Recovery AI Concierge](https://utilforge.pages.dev/marketplace/n8n-stripe-churn-recovery-concierge/)**
- **[n8n B2B Inbound Lead Enrichment & Slack Router](https://utilforge.pages.dev/marketplace/n8n-b2b-lead-enrichment-router/)**
- **[UtilForge 381-Page Programmatic SEO & Micro-Tool Factory Engine](https://utilforge.pages.dev/marketplace/utilforge-programmatic-seo-factory/)**

👉 **[Browse All 26 Blueprints & Download the $19 Starter Pack at utilforge.pages.dev/marketplace/ →](https://utilforge.pages.dev/marketplace/)**
`
  }
];

for (const sat of SATELLITES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sat-${sat.name}-`));
  fs.writeFileSync(path.join(dir, 'README.md'), sat.readme, 'utf8');
  try {
    execSync(`git init -b main && git add README.md && git commit -m "Initial commit: ${sat.name}"`, { cwd: dir, stdio: 'ignore' });
    try {
      execSync(
        `gh repo create zainmasri/${sat.name} --public --description "${sat.description}" --homepage "${sat.homepage}" --source=. --remote=origin --push`,
        { cwd: dir, stdio: 'inherit' }
      );
    } catch (_) {
      execSync(`git remote add origin https://github.com/zainmasri/${sat.name}.git || true`, { cwd: dir, stdio: 'ignore' });
      execSync(`git push -u origin main --force`, { cwd: dir, stdio: 'inherit' });
    }
    const topicFlags = sat.topics.map((t) => `--add-topic ${t}`).join(' ');
    execSync(`gh repo edit zainmasri/${sat.name} ${topicFlags}`, { cwd: dir, stdio: 'inherit' });
    console.log(`✓ Live Repository Ready: https://github.com/zainmasri/${sat.name}`);
  } catch (err) {
    console.error(`Error with ${sat.name}:`, err.message);
  }
}
