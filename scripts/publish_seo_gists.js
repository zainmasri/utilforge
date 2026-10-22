#!/usr/bin/env node
/**
 * Publishes high-intent developer reference Gists on gist.github.com (DR96)
 * with direct canonical links to UtilForge interactive calculators & MCP marketplace listings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

const GISTS = [
  {
    filename: 'llm-api-pricing-comparison-2026.md',
    description: '2026 LLM API Pricing & Token Cost Benchmark (GPT-4o, o3-mini, Claude 3.7 Sonnet, DeepSeek R1, Gemini 2.5)',
    content: `# 2026 LLM API Pricing & Token Cost Benchmark (Per 1M Tokens)

Interactive calculators for custom token workloads & prompt caching:
- **Interactive Multi-Model Token Cost Estimator:** https://utilforge.pages.dev/llm-token-cost-estimator/
- **Reasoning Models (OpenAI o1 / o3-mini vs DeepSeek R1 vs Claude 3.7):** https://utilforge.pages.dev/reasoning-llm-token-cost-calculator/
- **GPT-4o vs GPT-4o Mini Cost Simulator:** https://utilforge.pages.dev/compare/gpt-4o-vs-gpt-4o-mini/
- **Full 292 Cloud & AI Comparison Matrix:** https://utilforge.pages.dev/compare/

| Model | Provider | Input / 1M Tokens | Output / 1M Tokens | Cached Input | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GPT-4o** | OpenAI | $2.50 | $10.00 | $1.25 | Multimodal flagship |
| **GPT-4o Mini** | OpenAI | $0.15 | $0.60 | $0.075 | High-volume classification & RAG |
| **OpenAI o3-mini** | OpenAI | $1.10 | $4.40 | $0.55 | Fast STEM & code reasoning |
| **Claude 3.7 Sonnet** | Anthropic | $3.00 | $15.00 | $0.30 | Agentic coding & MCP tool use |
| **DeepSeek R1** | DeepSeek / OpenRouter | $0.55 | $2.19 | $0.14 | Open-weights chain-of-thought reasoning |
| **DeepSeek V3** | DeepSeek / OpenRouter | $0.27 | $1.10 | $0.07 | Cost-efficient general generation |
| **Gemini 2.5 Flash** | Google | $0.15 | $0.60 | $0.0375 | Long-context 1M token pipelines |
`
  },
  {
    filename: 'supabase-vs-aws-rds-vs-neon-postgres-cost-2026.md',
    description: 'AWS RDS vs Supabase vs Neon Serverless PostgreSQL Cost Breakdown & Storage Egress Calculator',
    content: `# AWS RDS vs. Supabase vs. Neon Serverless PostgreSQL Pricing Breakdown (2026)

Run your exact compute hours, storage GB, and IOPS in the browser:
- **Interactive Postgres Cloud Cost Calculator:** https://utilforge.pages.dev/aws-rds-vs-supabase-neon-cost-calculator/
- **Supabase Pro vs. Neon Serverless Direct Comparison:** https://utilforge.pages.dev/compare/supabase-pro-vs-neon-serverless/
- **Vector Database & pgvector Cost Estimator:** https://utilforge.pages.dev/rag-vector-db-cost-estimator/
- **AWS S3 vs. Cloudflare R2 Zero-Egress Calculator:** https://utilforge.pages.dev/aws-s3-vs-cloudflare-r2-egress-calculator/

| Provider | Base Plan | Compute Scaling | Storage / GB-mo | Point-in-Time Recovery | Scale-to-Zero |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Supabase Pro** | $25/mo | Dedicated Micro–16XL | $0.125/GB | 7+ days | No (Always-on + Auth/Realtime/Storage) |
| **Neon Launch/Scale** | $19/mo | Autoscaling CU (0.25–56 CU) | $0.35/GB | Instant Branching | Yes (5 min idle suspend) |
| **AWS RDS (db.t4g.medium)** | ~$54/mo | Fixed Instance + Multi-AZ 2x | $0.115/GB gp3 | Automated Backups | No (+ $0.09/GB NAT/Egress fees) |
`
  },
  {
    filename: 'stripe-revenue-analytics-mcp-server-blueprint.md',
    description: 'Stripe Revenue, Churn & MRR Analytics Model Context Protocol (MCP) Server Blueprint for Claude Desktop & Cursor',
    content: `# Stripe Revenue, Churn & MRR Analytics MCP Server Configuration

Full commercial MCP Server & SaaS Boilerplate directory:
- **Stripe Revenue & Churn Analytics MCP Server:** https://utilforge.pages.dev/marketplace/stripe-revenue-analytics-mcp/
- **B2B SaaS Net Dollar Retention (NDR) & Churn Calculator:** https://utilforge.pages.dev/b2b-saas-churn-net-dollar-retention-calculator/
- **SaaS LTV:CAC & Cash Runway Calculator:** https://utilforge.pages.dev/saas-ltv-cac-calculator/
- **Stripe vs. Lemon Squeezy vs. PayPal Fee Calculator:** https://utilforge.pages.dev/stripe-paypal-fee-calculator/
- **Browse All 26 MCP Servers, Boilerplates & n8n Workflows:** https://utilforge.pages.dev/marketplace/

## Quickstart \`claude_desktop_config.json\`
\`\`\`json
{
  "mcpServers": {
    "stripe-revenue-analytics": {
      "command": "npx",
      "args": ["-y", "@utilforge/stripe-analytics-mcp"],
      "env": {
        "STRIPE_RESTRICTED_READ_KEY": "rk_live_your_read_only_key"
      }
    }
  }
}
\`\`\`
`
  }
];

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uf-gists-'));
for (const g of GISTS) {
  const filePath = path.join(tmpDir, g.filename);
  fs.writeFileSync(filePath, g.content, 'utf8');
  try {
    const out = execSync(`gh gist create "${filePath}" --public --desc "${g.description}"`, {
      encoding: 'utf8',
    }).trim();
    console.log(`✓ Published Public Gist: ${out}`);
  } catch (err) {
    console.error(`Failed gist ${g.filename}:`, err.message);
  }
}
