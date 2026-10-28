/**
 * UtilForge Developer Guides & Engineering Reference Registry (`src/registry/guides.js`)
 *
 * In-depth technical guides and architectural tutorials written with authentic developer
 * insights, reproducible code snippets, and deep domain explanations.
 */

export const GUIDES = [
  {
    slug: 'flatten-nested-json-python-node',
    title: 'How to Flatten and Parse Deeply Nested JSON in Python, jq, and Node.js',
    shortTitle: 'Flatten Nested JSON in Python, jq & Node',
    category: 'Data Engineering',
    readingTime: '7 min read',
    publishDate: '2026-10-28',
    author: 'Zain Masri',
    metaDescription:
      'A complete engineering guide to un-nesting arbitrary JSON hierarchies into tabular CSV formats with dot notation, recursive algorithms, and streaming parsers.',
    relatedToolSlug: 'json-to-csv',
    relatedToolName: 'JSON ↔ CSV Converter & Nested Flattener',
    contentHtml: `
      <p>Modern APIs—including Stripe, GitHub, Salesforce, and Kubernetes audit logs—frequently return deeply nested, polymorphic JSON objects. While hierarchical documents are natural for object-oriented application code, loading them into analytical databases (PostgreSQL, BigQuery, Snowflake) or spreadsheet reports requires systematic <strong>flattening into a 2-dimensional tabular structure</strong>.</p>

      <p>In this guide, we examine three production-grade methods for flattening nested JSON payloads using Python, command-line <code>jq</code>, and streaming Node.js, alongside key edge-case strategies for handling nested arrays and key collisions.</p>

      <h2>1. The Problem: Hierarchical JSON vs. Relational Columns</h2>
      <p>Consider an enterprise webhook event with nested billing details, address objects, and metadata tags:</p>

      <pre><code class="language-json">{
  "event_id": "evt_98214",
  "customer": {
    "name": "Sarah Connor",
    "contact": { "email": "sarah@cyberdyne.io", "verified": true }
  },
  "billing": {
    "plan": "Enterprise",
    "mrr_usd": 490,
    "discounts": [{ "code": "FOUNDER_20", "percent": 20 }]
  }
}</code></pre>

      <p>To convert this record into CSV or a database table without data loss, we represent parent-child relationships using <strong>dot notation</strong>: <code>customer.contact.email</code> and <code>billing.plan</code>.</p>

      <h2>2. Python: Pure Recursive Flattening vs. pandas.json_normalize</h2>
      <p>For ad-hoc scripts or ETL pipelines, Python provides two solid approaches depending on whether you want a zero-dependency solution or DataFrame integration.</p>

      <h3>A. Zero-Dependency Recursive Flattener</h3>
      <p>This pure-Python function traverses arbitrary dictionary depth and joins keys with a configurable separator:</p>

      <pre><code class="language-python">def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            # Flatten primitive lists or serialize array of objects
            if all(isinstance(item, (str, int, float, bool)) for item in v):
                items.append((new_key, "; ".join(map(str, v))))
            else:
                items.append((new_key, v))
        else:
            items.append((new_key, v))
    return dict(items)

# Example Usage:
raw_event = {"customer": {"name": "Alex", "geo": {"country": "DE"}}}
print(flatten_dict(raw_event))
# Output: {'customer.name': 'Alex', 'customer.geo.country': 'DE'}</code></pre>

      <h3>B. Using pandas for Batch Records</h3>
      <p>When working with thousands of records, <code>pandas.json_normalize</code> applies C-level optimizations:</p>

      <pre><code class="language-python">import json
import pandas as pd

with open("events.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Normalize nested dictionaries into flat columns
df = pd.json_normalize(data, sep='.')
df.to_csv("events_flattened.csv", index=False)</code></pre>

      <h2>3. Fast CLI Filtering with jq</h2>
      <p>For DevOps pipelines and shell scripts, <code>jq</code> is unmatched in speed for transforming JSON streams directly on the terminal:</p>

      <pre><code class="language-bash"># Un-nest all scalar values into a key-value map using dot paths
cat webhook.json | jq -r '
  [paths(scalars) as $p | {
    key: ($p | map(tostring) | join(".")),
    value: getpath($p)
  }] | from_entries
'</code></pre>

      <h2>4. Node.js Streaming Parser for 500MB+ Payloads</h2>
      <p>When handling massive multi-gigabyte log dumps in Node.js, loading the entire payload into <code>JSON.parse()</code> will trigger an out-of-memory exception. Instead, use a generator-based line streamer:</p>

      <pre><code class="language-javascript">import fs from 'node:fs';
import readline from 'node:readline';

function flattenObject(obj, prefix = '', sep = '.') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? prefix + sep + key : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, newKey, sep));
    } else {
      result[newKey] = Array.isArray(val) ? JSON.stringify(val) : val;
    }
  }
  return result;
}

// Stream JSONL records line by line without memory bloat
const rl = readline.createInterface({
  input: fs.createReadStream('heavy_audit.jsonl'),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  const flatRecord = flattenObject(JSON.parse(line));
  // Pipe to CSV writer...
});</code></pre>

      <h2>5. Critical Edge Cases to Plan For</h2>
      <ul>
        <li><strong>Arrays of Objects:</strong> If a customer has multiple order items, flattening to a single CSV row requires a choice: either duplicate parent attributes (cross-product unnesting) or serialize the item array as a JSON string cell.</li>
        <li><strong>Delimiter Collisions:</strong> If object keys contain dots (e.g., <code>"user.id"</code>), configure your separator to an underscore (<code>_</code>) or double colon (<code>::</code>) to avoid ambiguous field reconstruction.</li>
        <li><strong>RFC-4180 Escaping:</strong> Always ensure values containing quotes, line breaks, or commas are wrapped in standard double quotes.</li>
      </ul>

      <div class="callout-box">
        <h3>⚡ Need to Convert or Flatten JSON Right Now?</h3>
        <p>You can run our 100% client-side <strong>JSON ↔ CSV Converter</strong> directly in your browser. It automatically unwraps nested hierarchies, generates RFC-4180 compliant CSV, and guarantees zero server uploads of your private data.</p>
        <p><a href="../json-to-csv/index.html" class="btn btn-primary">Open Free JSON ↔ CSV Converter →</a></p>
      </div>
    `,
  },
  {
    slug: 'jwt-security-signature-verification-guide',
    title: 'Demystifying JSON Web Tokens: Structure, Signature Verification & Security Pitfalls',
    shortTitle: 'JWT Architecture, Signatures & Security Pitfalls',
    category: 'Security & Auth',
    readingTime: '8 min read',
    publishDate: '2026-10-28',
    author: 'Zain Masri',
    metaDescription:
      'A practical guide to JSON Web Tokens (JWT): header anatomy, HMAC vs RSA signatures, token tampering prevention, and client-side cryptographic inspection.',
    relatedToolSlug: 'jwt-decoder',
    relatedToolName: 'JWT Decoder & Claims Inspector',
    contentHtml: `
      <p>JSON Web Tokens (RFC 7519) are the standard mechanism for stateless authentication across modern microservices, SPAs, and API gateways. However, because JWTs are simply <strong>Base64URL-encoded strings</strong>, developers frequently confuse token signing with token encryption—leading to severe security vulnerabilities such as credential leakage and unverified claims processing.</p>

      <p>In this guide, we break down the anatomy of a JWT, examine how cryptographic signatures work under the hood, and audit the most common implementation vulnerabilities observed in production systems.</p>

      <h2>1. The Anatomical Breakdown of a JWT</h2>
      <p>A JSON Web Token consists of three distinct parts separated by period (<code>.</code>) delimiters:</p>

      <pre><code class="language-text">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzIiwibmFtZSI6IkFsZXgiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mjk5MDAwMDB9.s1G...[signature]
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^
              1. Header                                              2. Payload                                   3. Signature</code></pre>

      <ul>
        <li><strong>Header:</strong> Specifies the token type (<code>typ: "JWT"</code>) and the cryptographic signing algorithm (<code>alg: "HS256"</code> or <code>alg: "RS256"</code>).</li>
        <li><strong>Payload:</strong> Contains claims about the subject (user ID, tenant, email, scopes) alongside standard timestamps (<code>iat</code>: issued at, <code>exp</code>: expiration, <code>nbf</code>: not before).</li>
        <li><strong>Signature:</strong> The cryptographic proof generated by hashing the header and payload with a secret key or signing with a private RSA/ECDSA key.</li>
      </ul>

      <h2>2. Symmetric (HMAC) vs. Asymmetric (RSA/ECDSA) Signing</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Symmetric (HS256 / HS512)</th>
            <th>Asymmetric (RS256 / ES256)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Keys Used</strong></td>
            <td>Single shared secret string</td>
            <td>Private key to sign, Public key to verify</td>
          </tr>
          <tr>
            <td><strong>Verification Trust</strong></td>
            <td>Any service verifying the token can also forge it</td>
            <td>Microservices verify tokens using only the public key</td>
          </tr>
          <tr>
            <td><strong>Best Use Case</strong></td>
            <td>Monolithic backends &amp; internal microservices</td>
            <td>OAuth2 / OIDC, Auth0, Supabase, multi-tenant APIs</td>
          </tr>
        </tbody>
      </table>

      <h2>3. The Most Dangerous JWT Security Vulnerabilities</h2>

      <h3>A. The "Algorithm None" Exploit (CVE-2015-9235)</h3>
      <p>The JWT specification originally permitted an algorithm called <code>"none"</code> for un-signed debugging tokens. Malicious actors realized they could decode an existing token, elevate their role to <code>"role": "admin"</code>, set <code>"alg": "none"</code> in the header, strip the signature, and submit it to vulnerable authentication libraries that accepted unsigned tokens as valid.</p>
      <p><strong>Remediation:</strong> Explicitly whitelist allowed signing algorithms on your verification endpoints (e.g. <code>jwt.verify(token, secret, { algorithms: ['HS256'] })</code>).</p>

      <h3>B. The Key Confusion Attack (HMAC vs. RSA)</h3>
      <p>If an API expects an RS256 token signed with a private key, an attacker might obtain the server's public RSA certificate (often published openly at <code>/.well-known/jwks.json</code>), re-sign the token using HMAC-SHA256 with the public key as the symmetric secret, and change the header to <code>"alg": "HS256"</code>. If the verification routine does not enforce algorithm matching, it verifies the signature against the public key string and grants unauthorized access.</p>

      <h3>C. Confusing Encoding with Encryption</h3>
      <p>A standard JWT is <strong>Base64URL-encoded, NOT encrypted</strong>. Anyone with access to the raw token string (via network interception, browser local storage, or server logs) can inspect every claim in plain text. Never store database connection strings, passwords, or unencrypted Social Security / credit card numbers inside a standard JWT payload.</p>

      <h2>4. Verifying JWT Signatures Locally in Browser JavaScript (WebCrypto)</h2>
      <p>You can verify a token's HMAC-SHA256 signature locally inside modern browsers without uploading secrets to any remote server:</p>

      <pre><code class="language-javascript">async function verifyJwtHmac(token, secretString) {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  const dataToSign = new TextEncoder().encode(headerB64 + '.' + payloadB64);
  
  // Convert secret into CryptoKey
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretString),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Decode signature from base64url
  const signatureBytes = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0)
  );

  return await crypto.subtle.verify('HMAC', key, signatureBytes, dataToSign);
}</code></pre>

      <div class="callout-box">
        <h3>🔍 Inspect &amp; Audit JWT Claims Securely</h3>
        <p>Need to verify expiration dates, check issued claims, or debug token headers without risking token exposure to external servers? Use our <strong>Client-Side JWT Decoder &amp; Claims Inspector</strong>. Everything is parsed 100% in local memory.</p>
        <p><a href="../jwt-decoder/index.html" class="btn btn-primary">Open Free JWT Decoder →</a></p>
      </div>
    `,
  },
  {
    slug: 'regex-catastrophic-backtracking-optimization',
    title: 'High-Performance Regular Expressions: Preventing ReDoS & Catastrophic Backtracking',
    shortTitle: 'Preventing ReDoS & Catastrophic Backtracking',
    category: 'Code & Performance',
    readingTime: '7 min read',
    publishDate: '2026-10-28',
    author: 'Zain Masri',
    metaDescription:
      'Learn how NFA regex engines execute, why nested quantifiers trigger catastrophic backtracking (ReDoS), and how to write linear-time regular expressions.',
    relatedToolSlug: 'regex-tester',
    relatedToolName: 'Regex Tester & Pattern Debugger',
    contentHtml: `
      <p>Regular expressions are among the most ubiquitous tools in software engineering, used for input sanitization, log parsing, tokenization, and routing. However, behind innocent-looking patterns like <code>(a+)+$</code> lurks an algorithmic trap: <strong>catastrophic backtracking</strong>.</p>

      <p>When an engineered non-matching string is supplied to a vulnerable regex, the execution time explodes exponentially ($O(2^n)$), freezing the single-threaded Node.js event loop or saturating CPU worker threads. In this guide, we explore how Nondeterministic Finite Automata (NFA) engines work and how to write production-safe patterns.</p>

      <h2>1. How NFA Engines Backtrack Under the Hood</h2>
      <p>Most programming languages—including JavaScript, Python, Ruby, Java, and PHP—use NFA-based regex engines. Unlike DFA (Deterministic Finite Automaton) engines which run in linear $O(n)$ time regardless of pattern complexity, NFA engines support rich features like backreferences, capturing groups, and lookaround assertions by systematically exploring alternate match paths.</p>

      <p>Consider the classic pattern:</p>
      <pre><code class="language-text">^(a+)+$</code></pre>

      <p>When tested against a matching string like <code>"aaaa"</code>, the engine succeeds quickly. But test it against a slightly failing string:</p>
      <pre><code class="language-text">"aaaaaaaaaaaaaaaaaaaaaaaaaX"</code></pre>

      <p>The engine attempts to match every possible combination of grouping the <code>a</code>'s:</p>
      <ul>
        <li>Group 1: <code>[aaaa]</code>, Group 2: failed at <code>X</code></li>
        <li>Group 1: <code>[aaa]</code>, Group 2: <code>[a]</code>, failed at <code>X</code></li>
        <li>Group 1: <code>[aa]</code>, Group 2: <code>[aa]</code>, failed at <code>X</code></li>
        <li>Group 1: <code>[aa]</code>, Group 2: <code>[a]</code>, Group 3: <code>[a]</code>, failed at <code>X</code></li>
      </ul>
      <p>For a string of just 30 characters, the engine evaluates over <strong>1,073,741,824 permutations</strong> before reporting failure. A single request can peg a server CPU core at 100% for minutes.</p>

      <h2>2. Identifying Vulnerable Regex Smells (Evil Regex Patterns)</h2>
      <p>A pattern is susceptible to catastrophic backtracking if it satisfies three structural criteria:</p>
      <ol>
        <li><strong>Nested Quantifiers:</strong> A quantifier inside another quantified group, e.g., <code>(x+)*</code>, <code>(a|b+)*</code>, or <code>(a*)*</code>.</li>
        <li><strong>Overlapping Alternatives:</strong> The engine has multiple ways to match the exact same character sequence (e.g. <code>(a|a)+</code>).</li>
        <li><strong>Anchored Suffix Mismatch:</strong> A failing character at the end of the input string forcing the engine to exhaustively check every branch.</li>
      </ol>

      <h2>3. Real-World Case Study: The Broken Email Validator</h2>
      <p>Many legacy web applications validate email addresses with variations of this pattern:</p>
      <pre><code class="language-text">^([a-zA-Z0-9_.\\-])+@(([a-zA-Z0-9\\-])+\\.)+([a-zA-Z0-9]{2,4})+$</code></pre>

      <p>Notice <code>(([a-zA-Z0-9\\-])+\\.)+</code>: it contains an inner quantifier <code>+</code> inside an outer quantifier <code>+</code>. An input like:</p>
      <pre><code class="language-text">user@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!</code></pre>
      <p>will completely crash standard Node.js Express server threads through Regular Expression Denial of Service (ReDoS).</p>

      <h2>4. Practical Optimization Techniques</h2>

      <h3>A. Eliminate Nested Quantifiers</h3>
      <p>Refactor composite groups into mutually exclusive character classes. Instead of <code>(a+)+</code>, use <code>a+</code>.</p>

      <h3>B. Use Possessive Quantifiers and Atomic Groups</h3>
      <p>In languages that support them (Java, PCRE, Python regex module), possessive quantifiers (<code>a++</code>) and atomic groups <code>(?>a+)</code> tell the engine: <em>"Once you match these characters, never give them up or backtrack."</em></p>

      <h3>C. Atomic Lookahead Simulation in JavaScript</h3>
      <p>Because native JavaScript ECMAScript regex lacks native atomic groups, you can simulate atomic behavior using lookahead assertions (which discard backtrack states upon matching):</p>
      <pre><code class="language-javascript">// Standard backtracking pattern (vulnerable)
const badRegex = /^(a+)+$/;

// Atomic lookahead emulation in JavaScript
const safeRegex = /^(?=(a+))\\1+$/;</code></pre>

      <h3>D. Always Enforce Input Length Boundaries</h3>
      <p>Never run untrusted user inputs through an unconstrained regex without first checking <code>input.length &lt; 500</code>. Limiting maximum input length caps the theoretical permutations to safe milliseconds.</p>

      <div class="callout-box">
        <h3>🧪 Test &amp; Benchmark Your Regex in Real-Time</h3>
        <p>Safely inspect regular expressions, test capture groups, and validate input matching with zero server latency using our <strong>Client-Side Regex Tester &amp; Debugger</strong>.</p>
        <p><a href="../regex-tester/index.html" class="btn btn-primary">Open Free Regex Tester →</a></p>
      </div>
    `,
  },
  {
    slug: 'client-side-browser-security-data-privacy',
    title: 'Zero-Server Web Architecture: Why In-Browser Processing is Essential for Enterprise Compliance',
    shortTitle: 'Zero-Server Architecture & Enterprise Privacy',
    category: 'Architecture & Privacy',
    readingTime: '6 min read',
    publishDate: '2026-10-28',
    author: 'Zain Masri',
    metaDescription:
      'Why client-side in-browser developer utilities protect corporate data, eliminate third-party leakage vectors, and comply with SOC 2, HIPAA, and GDPR isolation requirements.',
    relatedToolSlug: 'base64-hash-studio',
    relatedToolName: 'Base64 & Hash Studio (SHA-256/512)',
    contentHtml: `
      <p>In modern engineering organizations, data isolation and supply-chain security have become top operational priorities. Development teams operate under rigorous compliance frameworks—including <strong>SOC 2 Type II, HIPAA, ISO 27001, and GDPR</strong>. Yet every day, developers routinely paste production database extracts, customer JSON records, and cryptographic credentials into generic third-party web formatters.</p>

      <p>This article examines the structural risks of server-backed developer tools and outlines the architecture of <strong>zero-server client-side web applications</strong>.</p>

      <h2>1. The Hidden Supply-Chain Vulnerability of Web Utilities</h2>
      <p>When you use a conventional online JSON formatter, SQL beautifier, or image compressor, your browser typically sends an HTTP POST request carrying your payload to a remote cloud server. This model introduces critical enterprise vulnerabilities:</p>

      <ul>
        <li><strong>Server-Side Request Logging:</strong> Web application firewalls (WAFs), reverse proxies (Nginx/Cloudflare), and application servers automatically log request bodies or URIs into centralized logging systems (Datadog, CloudWatch). If you formatted a JSON string containing PII or an API key, that credential is now permanently retained in third-party logs.</li>
        <li><strong>Data Sovereignty Violations:</strong> Under GDPR and cross-border data transfer laws, sending European user data to an unverified US-based utility server without a formal Data Processing Agreement (DPA) constitutes an active compliance violation.</li>
        <li><strong>Third-Party Breach Surface:</strong> Small, unvetted utility sites frequently run vulnerable outdated backends, making them prime targets for credential scrapers and man-in-the-middle exploits.</li>
      </ul>

      <h2>2. How Modern Web APIs Enable True Zero-Server Execution</h2>
      <p>A decade ago, browser sandboxes were too limited to handle complex file parsing, cryptography, or media manipulation, forcing developers to rely on server-side Python or PHP scripts. Today, standard Web APIs allow high-performance operations to execute <strong>100% locally on the user's device</strong>:</p>

      <table class="data-table">
        <thead>
          <tr>
            <th>Workflow</th>
            <th>Legacy Server-Side Method</th>
            <th>Modern Client-Side Web API</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cryptographic Hashing</strong></td>
            <td>Upload string to server OpenSSL</td>
            <td><code>crypto.subtle.digest('SHA-256', buffer)</code></td>
          </tr>
          <tr>
            <td><strong>Image Compression &amp; WebP</strong></td>
            <td>Upload to ImageMagick container</td>
            <td><code>HTML5 Canvas2D</code> + <code>toBlob('image/webp', quality)</code></td>
          </tr>
          <tr>
            <td><strong>CSV &amp; JSON Parsing</strong></td>
            <td>Python pandas / backend worker</td>
            <td><code>Web Workers</code> + native V8 JavaScript engines</td>
          </tr>
          <tr>
            <td><strong>Text Encoding &amp; Binary</strong></td>
            <td>Buffer allocation on Node backend</td>
            <td><code>TextEncoder</code> / <code>TextDecoder</code> API</td>
          </tr>
        </tbody>
      </table>

      <h2>3. The Enterprise Benefits of Client-Side Isolation</h2>
      <ol>
        <li><strong>Zero Data Retention:</strong> Because your payload never leaves the local browser tab's RAM, there are zero server logs, zero databases, and zero caches created. Closing the tab completely wipes the data.</li>
        <li><strong>Sub-Millisecond Response Times:</strong> Eliminating round-trip network hops reduces latency from 200–500ms down to sub-5ms local CPU execution.</li>
        <li><strong>Offline &amp; Air-Gapped Compatibility:</strong> Once the static HTML and JavaScript assets are cached via Service Workers or browser cache, tools function seamlessly in offline environments or secure air-gapped workstations.</li>
        <li><strong>Auditability:</strong> Unminified, client-side JavaScript can be audited directly by your security team in Chrome/Firefox Developer Tools to verify that no network requests are dispatched during tool execution.</li>
      </ol>

      <div class="callout-box">
        <h3>🛡️ UtilForge's Core Security Commitment</h3>
        <p>Every tool across the <strong>UtilForge</strong> platform is architected around this zero-server principle. Your inputs are never transmitted, never recorded, and never monetized through data brokers. Fast, private, and 100% browser-native.</p>
        <p><a href="../about/index.html" class="btn btn-primary">Read Our Architectural Mission &amp; Standards →</a></p>
      </div>
    `,
  },
  {
    slug: 'sql-formatting-index-performance-guide',
    title: 'SQL Query Formatting & Index Optimization: A Practical Guide for Database Engineers',
    shortTitle: 'SQL Formatting & Index Performance Guide',
    category: 'Database Engineering',
    readingTime: '8 min read',
    publishDate: '2026-10-28',
    author: 'Zain Masri',
    metaDescription:
      'Learn best practices for structuring readable SQL, understanding EXPLAIN ANALYZE execution plans, and optimizing B-Tree composite indexes.',
    relatedToolSlug: 'sql-formatter',
    relatedToolName: 'SQL Formatter & Query Beautifier',
    contentHtml: `
      <p>In high-throughput database systems, poorly structured queries do more than create readability headaches during code reviews—they frequently obscure catastrophic performance bottlenecks. A missing composite index or an accidental function wrapper around a <code>WHERE</code> clause can cause a query to pivot from an index scan (O(log n)) into a multi-million-row sequential table scan (O(n)).</p>

      <p>In this guide, we explore industry-standard SQL formatting conventions that improve maintainability and dive into real-world query optimization strategies for PostgreSQL and MySQL.</p>

      <h2>1. Clean SQL Formatting Conventions</h2>
      <p>Clean formatting is not just aesthetic; it makes execution logic and join hierarchies immediately obvious during debugging:</p>

      <ul>
        <li><strong>Capitalize Core Keywords:</strong> Keep standard ANSI SQL clauses (<code>SELECT</code>, <code>FROM</code>, <code>WHERE</code>, <code>GROUP BY</code>, <code>ORDER BY</code>, <code>HAVING</code>) in uppercase, while keeping table and column names in lowercase snake_case.</li>
        <li><strong>One Column Per Line:</strong> In <code>SELECT</code> projections, place each attribute on its own line with leading commas. This minimizes git merge conflict diffs when columns are added or removed.</li>
        <li><strong>Explicit Join Conditions:</strong> Always use explicit <code>INNER JOIN ... ON</code> syntax. Never use comma joins (<code>FROM users, orders WHERE ...</code>) which obscure cross-join hazards.</li>
        <li><strong>Prefer Common Table Expressions (CTEs) over Deep Subqueries:</strong> Decompose multi-step queries into readable <code>WITH</code> blocks.</li>
      </ul>

      <pre><code class="language-sql">-- Readable, maintainable enterprise SQL structure
WITH monthly_cohort AS (
  SELECT
    user_id,
    DATE_TRUNC('month', created_at) AS signup_month
  FROM users
  WHERE status = 'active'
)
SELECT
  c.signup_month,
  COUNT(DISTINCT c.user_id) AS total_users,
  COALESCE(SUM(p.amount_usd), 0.00) AS total_revenue
FROM monthly_cohort c
LEFT JOIN payments p 
  ON p.user_id = c.user_id 
  AND p.status = 'succeeded'
GROUP BY c.signup_month
ORDER BY c.signup_month DESC;</code></pre>

      <h2>2. Demystifying EXPLAIN (ANALYZE, BUFFERS)</h2>
      <p>Before optimizing any query, run <code>EXPLAIN (ANALYZE, BUFFERS)</code> in PostgreSQL to observe the real execution path rather than guessing:</p>

      <pre><code class="language-text">Seq Scan on orders (cost=0.00..1845.20 rows=452 width=32) (actual time=0.045..12.340 rows=430 loops=1)
  Filter: (created_at >= '2026-01-01'::date)
  Rows Removed by Filter: 89570
  Buffers: shared hit=842 read=124
Planning Time: 0.182 ms
Execution Time: 12.450 ms</code></pre>

      <p>Key metrics to audit:</p>
      <ul>
        <li><strong>Seq Scan vs. Index Scan:</strong> A sequential scan means the database examined every single page on disk. For large tables (&gt;100k rows), this indicates a missing or unusable index.</li>
        <li><strong>Rows Removed by Filter:</strong> If the database read 90,000 rows only to discard 89,570, your index did not narrow down the dataset early enough.</li>
        <li><strong>Buffers (Shared Read):</strong> "Read" indicates blocks fetched from physical disk (slow), whereas "Hit" indicates memory cache access.</li>
      </ul>

      <h2>3. The Leftmost Prefix Rule for Composite Indexes</h2>
      <p>When indexing multiple columns (e.g. <code>CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at);</code>), column order is critical. A composite B-tree index is sorted lexicographically like a phone book:</p>

      <ul>
        <li><code>WHERE user_id = 42</code> → <strong>Uses Index</strong></li>
        <li><code>WHERE user_id = 42 AND status = 'paid'</code> → <strong>Uses Index</strong></li>
        <li><code>WHERE status = 'paid'</code> → <strong>CANNOT Use Index</strong> (violates leftmost prefix)</li>
      </ul>
      <p><strong>Rule of thumb:</strong> Place equality filter columns first, followed by range filter columns (e.g. timestamps or amounts).</p>

      <h2>4. The SARGable Query Principle (Search Argument Able)</h2>
      <p>Wrapping indexed columns inside functions prevents the query planner from using standard B-Tree indexes:</p>

      <pre><code class="language-sql">-- BAD: Non-SARGable (Forces full table scan because function must run on every row)
SELECT * FROM users WHERE LOWER(email) = 'alex@example.com';

-- GOOD: Use functional index OR normalize at write time
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- BAD: Math on indexed timestamp column
SELECT * FROM subscriptions WHERE created_at + INTERVAL '30 days' < NOW();

-- GOOD: Isolate the column on one side of operator
SELECT * FROM subscriptions WHERE created_at < NOW() - INTERVAL '30 days';</code></pre>

      <div class="callout-box">
        <h3>✨ Format &amp; Beautify Complex SQL Queries Locally</h3>
        <p>Clean up messy SQL queries, format subqueries, and align keywords with our <strong>Client-Side SQL Formatter &amp; Query Beautifier</strong>. Fast, private, and 100% in-browser.</p>
        <p><a href="../sql-formatter/index.html" class="btn btn-primary">Open Free SQL Formatter →</a></p>
      </div>
    `,
  },
];
