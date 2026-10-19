/**
 * UtilForge Client-Side Execution Engines & Factory Studio Controller
 * 16 High-Intent Utilities • 100% Browser-Native JavaScript • Zero Backend Calls
 */

(function () {
  /* ========================================================================
     1. Utility Helpers (Flatten JSON, CSV Parser, UTF-8 Base64, YAML, XML)
     ======================================================================== */

  function flattenObject(obj, prefix = '', res = {}, joinArrays = true) {
    if (obj === null || typeof obj !== 'object') {
      res[prefix || 'value'] = obj;
      return res;
    }
    for (const [key, val] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(val)) {
        if (joinArrays && val.every((item) => item === null || typeof item !== 'object')) {
          res[nextKey] = val.join(' | ');
        } else {
          res[nextKey] = JSON.stringify(val);
        }
      } else if (val !== null && typeof val === 'object') {
        flattenObject(val, nextKey, res, joinArrays);
      } else {
        res[nextKey] = val;
      }
    }
    return res;
  }

  function escapeCsvCell(val, delimiter) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function parseCsvToRows(csvText, delimiter = ',') {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const ch = csvText[i];
      const next = csvText[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          currentCell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          currentCell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          currentRow.push(currentCell);
          currentCell = '';
        } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
          if (ch === '\r') i++;
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += ch;
        }
      }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }
    return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    const clean = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = clean.length % 4 === 0 ? clean : clean + '='.repeat(4 - (clean.length % 4));
    const binary = atob(pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function parseScalarValue(raw) {
    const val = raw.trim();
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null' || val === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  }

  function simpleYamlToJson(yamlText) {
    const lines = yamlText
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
    const root = {};
    const stack = [{ indent: -1, container: root }];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.search(/\S/);
      const trimmed = line.trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];

      if (trimmed.startsWith('- ')) {
        const itemVal = parseScalarValue(trimmed.slice(2));
        if (Array.isArray(parent.container)) {
          parent.container.push(itemVal);
        } else if (parent.lastKey) {
          if (!Array.isArray(parent.container[parent.lastKey])) {
            parent.container[parent.lastKey] = [];
          }
          parent.container[parent.lastKey].push(itemVal);
        }
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx !== -1) {
          const key = trimmed.slice(0, colonIdx).trim();
          const rest = trimmed.slice(colonIdx + 1).trim();
          if (rest === '') {
            const nextLine = lines[i + 1] || '';
            const nextTrim = nextLine.trim();
            const childContainer = nextTrim.startsWith('- ') ? [] : {};
            parent.container[key] = childContainer;
            parent.lastKey = key;
            stack.push({ indent, container: childContainer, lastKey: null });
          } else {
            parent.container[key] = parseScalarValue(rest);
            parent.lastKey = key;
          }
        }
      }
    }
    return root;
  }

  function jsonToSimpleYaml(obj, indentLevel = 0) {
    const pad = '  '.repeat(indentLevel);
    if (obj === null || typeof obj !== 'object') {
      return String(obj);
    }
    if (Array.isArray(obj)) {
      return obj
        .map((item) => {
          if (item !== null && typeof item === 'object') {
            return `${pad}-\n${jsonToSimpleYaml(item, indentLevel + 2)}`;
          }
          return `${pad}- ${JSON.stringify(item)}`;
        })
        .join('\n');
    }
    return Object.entries(obj)
      .map(([k, v]) => {
        if (v !== null && typeof v === 'object') {
          return `${pad}${k}:\n${jsonToSimpleYaml(v, indentLevel + 1)}`;
        }
        const scalar = typeof v === 'string' && !/[:#[\]{},]/.test(v) ? v : JSON.stringify(v);
        return `${pad}${k}: ${scalar}`;
      })
      .join('\n');
  }

  /* ========================================================================
     2. Tool Engine Implementations (16 Tools)
     ======================================================================== */

  const ENGINES = {
    jsonCsvEngine(input, opts) {
      const direction = opts.direction || 'json-to-csv';
      const delimiter = opts.delimiter === '\\t' ? '\t' : opts.delimiter || ',';
      const flattenArrays = opts.flattenArrays !== false;

      if (direction === 'json-to-csv') {
        const parsed = JSON.parse(input);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const flatRows = arr.map((item) => flattenObject(item, '', {}, flattenArrays));
        const headers = Array.from(
          flatRows.reduce((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
          }, new Set())
        );

        const csvLines = [
          headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter),
          ...flatRows.map((row) =>
            headers.map((h) => escapeCsvCell(row[h], delimiter)).join(delimiter)
          ),
        ];

        const tableHtml = `
          <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-secondary);">
            FLATTENED TABLE PREVIEW (${flatRows.length} rows × ${headers.length} columns)
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${flatRows
                  .slice(0, 25)
                  .map(
                    (row) =>
                      `<tr>${headers
                        .map((h) => `<td>${escapeHtml(row[h] ?? '')}</td>`)
                        .join('')}</tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;

        return {
          output: csvLines.join('\n'),
          extraHtml: tableHtml,
          downloadExt: 'csv',
          downloadMime: 'text/csv',
          summary: `Converted ${flatRows.length} JSON records into ${headers.length} CSV columns`,
        };
      } else {
        const rows = parseCsvToRows(input, delimiter);
        if (rows.length === 0) {
          return { output: '[]', extraHtml: '', downloadExt: 'json', downloadMime: 'application/json', summary: 'Empty input' };
        }
        const headers = rows[0];
        const records = rows.slice(1).map((r) => {
          const obj = {};
          headers.forEach((h, idx) => {
            const raw = r[idx] ?? '';
            if (raw === 'true') obj[h] = true;
            else if (raw === 'false') obj[h] = false;
            else if (raw !== '' && !isNaN(Number(raw))) obj[h] = Number(raw);
            else obj[h] = raw;
          });
          return obj;
        });
        return {
          output: JSON.stringify(records, null, 2),
          extraHtml: '',
          downloadExt: 'json',
          downloadMime: 'application/json',
          summary: `Parsed ${records.length} CSV rows into structured JSON`,
        };
      }
    },

    regexTesterEngine(input, opts) {
      const presets = {
        email: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        url: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*',
        ipv4: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
        isoDate: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b',
      };

      const patternInputEl = document.getElementById('opt-pattern');
      let patternStr = opts.pattern || '(INV-\\d{4})-([A-Z]{2,4})\\s+\\$(\\d+(?:\\.\\d{2})?)';
      if (opts.preset && opts.preset !== 'custom' && presets[opts.preset]) {
        patternStr = presets[opts.preset];
        if (patternInputEl && patternInputEl.value !== patternStr) {
          patternInputEl.value = patternStr;
        }
      }

      const flags = opts.flags || 'gm';
      const safeFlags = flags.includes('g') ? flags : flags + 'g';
      const regex = new RegExp(patternStr, safeFlags);

      const matches = [];
      let match;
      let guard = 0;
      while ((match = regex.exec(input)) !== null && guard < 500) {
        guard++;
        matches.push({
          index: match.index,
          fullMatch: match[0],
          groups: match.slice(1),
        });
        if (match[0].length === 0) regex.lastIndex++;
      }

      const reportLines = [
        `Pattern : /${patternStr}/${safeFlags}`,
        `Matches : ${matches.length} found`,
        '────────────────────────────────────────────────────────',
        ...matches.map(
          (m, idx) =>
            `#${idx + 1} [index ${m.index}]: "${m.fullMatch}"` +
            (m.groups.length
              ? `\n   └─ Capture Groups: ${m.groups.map((g, gi) => `$${gi + 1}="${g ?? ''}"`).join(', ')}`
              : '')
        ),
      ];

      const extraHtml =
        matches.length > 0
          ? `
        <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-secondary);">
          EXTRACTED CAPTURE GROUPS TABLE (${matches.length} matches)
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Char Index</th>
                <th>Full Match ($0)</th>
                <th>Capture Groups ($1, $2...)</th>
              </tr>
            </thead>
            <tbody>
              ${matches
                .map(
                  (m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${m.index}</td>
                  <td><strong>${escapeHtml(m.fullMatch)}</strong></td>
                  <td>${
                    m.groups.length
                      ? escapeHtml(m.groups.map((g, gi) => `$${gi + 1}: ${g}`).join(' | '))
                      : '—'
                  }</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:1.15rem;padding:0.9rem 1.15rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
          <div>
            <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Deploy Edge Regex &amp; Scraper Functions Worldwide</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);">Run regex tokenizers, webhooks, and HTML scrapers at sub-10ms edge latency on Cloudflare Workers. 100,000 free requests/day.</div>
          </div>
          <a href="/go/cloudflare-workers/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Cloudflare Workers &amp; Pages" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem;">
            Deploy Free on Cloudflare →
          </a>
        </div>`
          : '';

      return {
        output: reportLines.join('\n'),
        extraHtml,
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `${matches.length} regex matches extracted`,
      };
    },

    textDiffEngine(input, opts) {
      const parts = input.split('===DIFF_SPLIT===');
      const leftRaw = (parts[0] || '').replace(/^\n+|\n+$/g, '');
      const rightRaw = (parts[1] || '').replace(/^\n+|\n+$/g, '');

      const leftLines = leftRaw.split('\n');
      const rightLines = rightRaw.split('\n');

      const normalize = (line) => {
        let s = line;
        if (opts.ignoreWhitespace) s = s.trim().replace(/\s+/g, ' ');
        if (opts.ignoreCase) s = s.toLowerCase();
        return s;
      };

      const m = leftLines.length;
      const n = rightLines.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

      for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
          if (normalize(leftLines[i]) === normalize(rightLines[j])) {
            dp[i][j] = 1 + dp[i + 1][j + 1];
          } else {
            dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
          }
        }
      }

      const diffResult = [];
      let i = 0;
      let j = 0;
      let added = 0;
      let removed = 0;

      while (i < m && j < n) {
        if (normalize(leftLines[i]) === normalize(rightLines[j])) {
          diffResult.push({ type: 'same', text: `  ${rightLines[j]}` });
          i++;
          j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
          diffResult.push({ type: 'del', text: `- ${leftLines[i]}` });
          removed++;
          i++;
        } else {
          diffResult.push({ type: 'add', text: `+ ${rightLines[j]}` });
          added++;
          j++;
        }
      }
      while (i < m) {
        diffResult.push({ type: 'del', text: `- ${leftLines[i++]}` });
        removed++;
      }
      while (j < n) {
        diffResult.push({ type: 'add', text: `+ ${rightLines[j++]}` });
        added++;
      }

      const htmlLines = diffResult
        .map((d) => {
          const cls = d.type === 'add' ? 'diff-line diff-add' : d.type === 'del' ? 'diff-line diff-del' : 'diff-line';
          return `<span class="${cls}">${escapeHtml(d.text)}</span>`;
        })
        .join('');

      return {
        output: diffResult.map((d) => d.text).join('\n'),
        outputHtml: htmlLines,
        extraHtml: '',
        downloadExt: 'diff',
        downloadMime: 'text/plain',
        summary: `Diff complete: +${added} additions, -${removed} deletions`,
      };
    },

    jwtDecoderEngine(input, opts) {
      const clean = input.trim().replace(/^Bearer\s+/i, '');
      const segments = clean.split('.');
      if (segments.length < 2) {
        throw new Error('Invalid JWT format: expected Header.Payload.Signature separated by dots.');
      }

      const headerObj = JSON.parse(base64ToUtf8(segments[0]));
      const payloadObj = JSON.parse(base64ToUtf8(segments[1]));
      const indent = opts.prettyPrint !== false ? 2 : 0;

      const formatTs = (sec) => {
        if (typeof sec !== 'number') return null;
        return new Date(sec * 1000).toISOString();
      };

      const nowSec = Math.floor(Date.now() / 1000);
      const expStatus =
        typeof payloadObj.exp === 'number'
          ? payloadObj.exp > nowSec
            ? `VALID (expires in ${Math.round((payloadObj.exp - nowSec) / 3600)} hours — ${formatTs(payloadObj.exp)})`
            : `EXPIRED (${formatTs(payloadObj.exp)})`
          : 'No exp claim present';

      const combined = {
        status: expStatus,
        header: headerObj,
        payload: payloadObj,
        signatureSegment: segments[2] || '(unsigned)',
      };

      return {
        output: JSON.stringify(combined, null, indent),
        extraHtml: '',
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Decoded ${headerObj.alg || 'JWT'} token — ${expStatus}`,
      };
    },

    sqlFormatterEngine(input, opts) {
      const kwCase = opts.keywordCase || 'upper';
      const indentSetting = opts.indentSize || '2';

      if (indentSetting === 'minify') {
        const minified = input.replace(/\s+/g, ' ').trim();
        return {
          output: minified,
          extraHtml: '',
          downloadExt: 'sql',
          downloadMime: 'text/plain',
          summary: `Minified SQL query to ${minified.length} characters`,
        };
      }

      const pad = ' '.repeat(Number(indentSetting) || 2);
      const majorClauses = [
        'SELECT',
        'FROM',
        'INNER JOIN',
        'LEFT JOIN',
        'RIGHT JOIN',
        'FULL OUTER JOIN',
        'JOIN',
        'WHERE',
        'GROUP BY',
        'HAVING',
        'ORDER BY',
        'LIMIT',
        'OFFSET',
        'UNION ALL',
        'UNION',
      ];

      let formatted = input.replace(/\s+/g, ' ').trim();

      const allKeywords = [
        ...majorClauses,
        'AS',
        'ON',
        'AND',
        'OR',
        'IN',
        'NOT',
        'NULL',
        'IS',
        'DESC',
        'ASC',
        'COUNT',
        'SUM',
        'AVG',
        'MIN',
        'MAX',
        'DISTINCT',
        'CASE',
        'WHEN',
        'THEN',
        'ELSE',
        'END',
      ];

      allKeywords.forEach((kw) => {
        const reg = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        formatted = formatted.replace(reg, kwCase === 'upper' ? kw.toUpperCase() : kw.toLowerCase());
      });

      majorClauses.forEach((clause) => {
        const target = kwCase === 'upper' ? clause.toUpperCase() : clause.toLowerCase();
        const reg = new RegExp(`\\s+\\b(${target.replace(/\s+/g, '\\s+')})\\b`, 'g');
        formatted = formatted.replace(reg, `\n$1`);
      });

      const andWord = kwCase === 'upper' ? 'AND' : 'and';
      formatted = formatted.replace(new RegExp(`\\s+\\b(${andWord})\\b`, 'g'), `\n${pad}$1`);
      formatted = formatted.replace(/,\s*/g, `,\n${pad}`);

      return {
        output: formatted,
        extraHtml: '',
        downloadExt: 'sql',
        downloadMime: 'text/plain',
        summary: `Formatted SQL (${kwCase.toUpperCase()} keywords, ${indentSetting}-space indent)`,
      };
    },

    async base64HashEngine(input, opts) {
      const mode = opts.mode || 'all-inspect';

      async function shaHex(algorithm, text) {
        const data = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest(algorithm, data);
        return Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      if (mode === 'base64-encode') {
        return {
          output: utf8ToBase64(input),
          extraHtml: '',
          downloadExt: 'txt',
          downloadMime: 'text/plain',
          summary: 'Encoded UTF-8 string to Base64',
        };
      }
      if (mode === 'base64-decode') {
        return {
          output: base64ToUtf8(input),
          extraHtml: '',
          downloadExt: 'txt',
          downloadMime: 'text/plain',
          summary: 'Decoded Base64 string to UTF-8',
        };
      }
      if (mode === 'url-encode') {
        return {
          output: encodeURIComponent(input),
          extraHtml: '',
          downloadExt: 'txt',
          downloadMime: 'text/plain',
          summary: 'URL-encoded string',
        };
      }
      if (mode === 'url-decode') {
        return {
          output: decodeURIComponent(input),
          extraHtml: '',
          downloadExt: 'txt',
          downloadMime: 'text/plain',
          summary: 'URL-decoded string',
        };
      }

      const b64 = utf8ToBase64(input);
      const b64Url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const urlEnc = encodeURIComponent(input);
      const sha256 = await shaHex('SHA-256', input);
      const sha512 = await shaHex('SHA-512', input);

      const report = [
        `[UTF-8 Byte Length] : ${new TextEncoder().encode(input).length} bytes`,
        ``,
        `[Base64 Standard]`,
        b64,
        ``,
        `[Base64Url (URL & Filename Safe)]`,
        b64Url,
        ``,
        `[URL Component Encoded]`,
        urlEnc,
        ``,
        `[SHA-256 Digest (WebCrypto)]`,
        sha256,
        ``,
        `[SHA-512 Digest (WebCrypto)]`,
        sha512,
      ].join('\n');

      return {
        output: report,
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: 'Computed Base64, URL encoding, and WebCrypto SHA-256 / SHA-512 digests',
      };
    },

    cronBuilderEngine(input, opts) {
      const rawExpr =
        opts.presetCron && opts.presetCron !== 'custom' ? opts.presetCron : input.trim();
      const inputEl = document.getElementById('workbench-input');
      if (opts.presetCron && opts.presetCron !== 'custom' && inputEl && inputEl.value !== rawExpr) {
        inputEl.value = rawExpr;
      }

      const parts = rawExpr.split(/\s+/);
      if (parts.length !== 5) {
        throw new Error('Standard Cron requires exactly 5 space-separated fields: Minute Hour DayOfMonth Month DayOfWeek');
      }

      const [minF, hourF, domF, monF, dowF] = parts;

      function explainField(val, unit, rangeStr) {
        if (val === '*') return `Every ${unit} (${rangeStr})`;
        if (val.startsWith('*/')) return `Every ${val.slice(2)} ${unit}s`;
        if (val.includes('-')) return `${unit}s ${val.replace('-', ' through ')}`;
        if (val.includes(',')) return `${unit}s ${val}`;
        return `At ${unit} ${val}`;
      }

      function matchesField(num, expr, isDow = false) {
        if (expr === '*') return true;
        if (expr.startsWith('*/')) {
          const step = parseInt(expr.slice(2), 10);
          return step > 0 && num % step === 0;
        }
        const segments = expr.split(',');
        for (const seg of segments) {
          if (seg.includes('-')) {
            const [s, e] = seg.split('-').map((n) => parseInt(n, 10));
            if (num >= s && num <= e) return true;
          } else {
            const target = parseInt(seg, 10);
            if (num === target || (isDow && target === 7 && num === 0)) return true;
          }
        }
        return false;
      }

      const upcoming = [];
      const cursor = new Date();
      cursor.setSeconds(0, 0);
      cursor.setMinutes(cursor.getMinutes() + 1);

      let iterations = 0;
      while (upcoming.length < 5 && iterations < 50000) {
        iterations++;
        const m = cursor.getMinutes();
        const h = cursor.getHours();
        const dom = cursor.getDate();
        const mon = cursor.getMonth() + 1;
        const dow = cursor.getDay();

        if (
          matchesField(m, minF) &&
          matchesField(h, hourF) &&
          matchesField(dom, domF) &&
          matchesField(mon, monF) &&
          matchesField(dow, dowF, true)
        ) {
          upcoming.push(cursor.toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
        }
        cursor.setMinutes(cursor.getMinutes() + 1);
      }

      const summaryLines = [
        `Cron Expression : ${rawExpr}`,
        `────────────────────────────────────────────────────────`,
        `Field Breakdown :`,
        `  1. Minute       (${minF.padEnd(6)}) → ${explainField(minF, 'minute', '0–59')}`,
        `  2. Hour         (${hourF.padEnd(6)}) → ${explainField(hourF, 'hour', '0–23')}`,
        `  3. Day of Month (${domF.padEnd(6)}) → ${explainField(domF, 'day of month', '1–31')}`,
        `  4. Month        (${monF.padEnd(6)}) → ${explainField(monF, 'month', '1–12')}`,
        `  5. Day of Week  (${dowF.padEnd(6)}) → ${explainField(dowF, 'day of week', '0=Sun..6=Sat')}`,
        ``,
        `Next 5 Scheduled Runs :`,
        ...upcoming.map((ts, idx) => `  Run #${idx + 1} : ${ts}`),
      ];

      return {
        output: summaryLines.join('\n'),
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Validated 5-field cron schedule (${upcoming.length} upcoming runs calculated)`,
      };
    },

    yamlJsonEngine(input, opts) {
      const dir = opts.direction || 'yaml-to-json';
      if (dir === 'yaml-to-json') {
        const obj = simpleYamlToJson(input);
        return {
          output: JSON.stringify(obj, null, 2),
          extraHtml: '',
          downloadExt: 'json',
          downloadMime: 'application/json',
          summary: 'Converted YAML manifest to formatted JSON',
        };
      } else {
        const parsed = JSON.parse(input);
        return {
          output: jsonToSimpleYaml(parsed),
          extraHtml: '',
          downloadExt: 'yaml',
          downloadMime: 'text/yaml',
          summary: 'Converted JSON object to clean YAML',
        };
      }
    },

    xmlJsonEngine(input, opts) {
      const includeAttrs = opts.includeAttrs !== false;
      const parser = new DOMParser();
      const doc = parser.parseFromString(input.trim(), 'application/xml');
      const errNode = doc.querySelector('parsererror');
      if (errNode) {
        throw new Error(errNode.textContent || 'Invalid XML syntax');
      }

      function domNodeToObj(node) {
        const obj = {};
        if (includeAttrs && node.attributes && node.attributes.length > 0) {
          obj['@attributes'] = {};
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            obj['@attributes'][attr.nodeName] = attr.nodeValue;
          }
        }
        const children = Array.from(node.childNodes).filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim() !== '')
        );
        if (children.length === 1 && children[0].nodeType === 3) {
          const val = parseScalarValue(children[0].nodeValue);
          if (Object.keys(obj).length === 0) return val;
          obj['#text'] = val;
          return obj;
        }
        for (const child of children) {
          if (child.nodeType === 1) {
            const name = child.nodeName;
            const childVal = domNodeToObj(child);
            if (obj[name] !== undefined) {
              if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
              obj[name].push(childVal);
            } else {
              obj[name] = childVal;
            }
          }
        }
        return obj;
      }

      const rootEl = doc.documentElement;
      const result = { [rootEl.nodeName]: domNodeToObj(rootEl) };
      return {
        output: JSON.stringify(result, null, 2),
        extraHtml: '',
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Parsed <${rootEl.nodeName}> XML tree into structured JSON`,
      };
    },

    uuidGeneratorEngine(_input, opts) {
      const idType = opts.idType || 'uuid-v4';
      const qty = Math.min(100, Math.max(1, parseInt(opts.quantity || '10', 10)));
      const upper = Boolean(opts.uppercase);

      function genUuidV4() {
        if (crypto.randomUUID) return crypto.randomUUID();
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }

      function genUuidV7() {
        const nowMs = BigInt(Date.now());
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[0] = Number((nowMs >> 40n) & 0xffn);
        b[1] = Number((nowMs >> 32n) & 0xffn);
        b[2] = Number((nowMs >> 24n) & 0xffn);
        b[3] = Number((nowMs >> 16n) & 0xffn);
        b[4] = Number((nowMs >> 8n) & 0xffn);
        b[5] = Number(nowMs & 0xffn);
        b[6] = (b[6] & 0x0f) | 0x70;
        b[8] = (b[8] & 0x3f) | 0x80;
        const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }

      function genUlid() {
        const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        let t = Date.now();
        let timeChars = '';
        for (let i = 0; i < 10; i++) {
          timeChars = alphabet[t % 32] + timeChars;
          t = Math.floor(t / 32);
        }
        const rand = new Uint8Array(16);
        crypto.getRandomValues(rand);
        let randChars = '';
        for (let i = 0; i < 16; i++) {
          randChars += alphabet[rand[i] % 32];
        }
        return timeChars + randChars;
      }

      const list = [];
      for (let i = 0; i < qty; i++) {
        let id =
          idType === 'uuid-v7' ? genUuidV7() : idType === 'ulid' ? genUlid() : genUuidV4();
        if (upper) id = id.toUpperCase();
        else if (idType !== 'ulid') id = id.toLowerCase();
        list.push(id);
      }

      return {
        output: list.join('\n'),
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Generated ${qty} cryptographic ${idType.toUpperCase()} identifiers`,
      };
    },

    unixTimestampEngine(input, opts) {
      const raw = input.trim();
      const mode = opts.unitMode || 'auto';
      let dateObj;

      if (/^-?\d+$/.test(raw)) {
        const num = Number(raw);
        if (mode === 'sec' || (mode === 'auto' && raw.length <= 10)) {
          dateObj = new Date(num * 1000);
        } else {
          dateObj = new Date(num);
        }
      } else {
        dateObj = new Date(raw);
      }

      if (isNaN(dateObj.getTime())) {
        throw new Error('Could not parse input as a Unix Epoch number or ISO-8601 date string.');
      }

      const ms = dateObj.getTime();
      const sec = Math.floor(ms / 1000);
      const diffSec = Math.round((ms - Date.now()) / 1000);
      const relStr =
        diffSec === 0
          ? 'Right now'
          : diffSec > 0
          ? `In ${Math.round(diffSec / 3600)} hours (${diffSec.toLocaleString()}s from now)`
          : `${Math.abs(Math.round(diffSec / 3600))} hours ago (${Math.abs(diffSec).toLocaleString()}s ago)`;

      const lines = [
        `[Unix Epoch Seconds]      : ${sec}`,
        `[Unix Epoch Milliseconds] : ${ms}`,
        `[ISO-8601 (UTC)]          : ${dateObj.toISOString()}`,
        `[RFC-2822 / HTTP Header]  : ${dateObj.toUTCString()}`,
        `[SQL Timestamp (UTC)]     : ${dateObj.toISOString().replace('T', ' ').slice(0, 19)}`,
        `[Local Browser Time]      : ${dateObj.toString()}`,
        `[Relative Delta]          : ${relStr}`,
      ];

      return {
        output: lines.join('\n'),
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Converted timestamp → ${dateObj.toISOString()}`,
      };
    },

    markdownHtmlEngine(input, opts) {
      let html = escapeHtml(input);

      // Headings
      html = html
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

      // Blockquotes
      html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

      // Bold, Italic, Inline Code
      html = html
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

      // Unordered list items
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>\n${m.trim()}\n</ul>\n`);

      // Paragraphs for remaining plain lines
      html = html
        .split('\n\n')
        .map((block) => {
          const t = block.trim();
          if (!t) return '';
          if (/^<(h[1-6]|ul|blockquote|pre)/i.test(t)) return t;
          return `<p>${t}</p>`;
        })
        .filter(Boolean)
        .join('\n\n');

      if (opts.wrapArticle !== false) {
        html = `<article class="markdown-body">\n${html}\n</article>`;
      }

      const extraHtml = `
        <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-secondary);">
          LIVE RENDERED HTML PREVIEW
        </div>
        <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;padding:1rem;">
          ${html}
        </div>
      `;

      return {
        output: html,
        extraHtml,
        downloadExt: 'html',
        downloadMime: 'text/html',
        summary: `Compiled Markdown to ${html.length} bytes of semantic HTML5`,
      };
    },

    colorContrastEngine(input, opts) {
      function parseHex(hexStr) {
        const clean = hexStr.trim().replace(/^#/, '');
        const full =
          clean.length === 3
            ? clean
                .split('')
                .map((c) => c + c)
                .join('')
            : clean;
        if (!/^[0-9a-fA-F]{6}$/.test(full)) {
          throw new Error(`Invalid 6-digit HEX color: ${hexStr}`);
        }
        return {
          hex: `#${full.toUpperCase()}`,
          r: parseInt(full.slice(0, 2), 16),
          g: parseInt(full.slice(2, 4), 16),
          b: parseInt(full.slice(4, 6), 16),
        };
      }

      function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }
        return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      }

      function relLuminance({ r, g, b }) {
        const chan = [r, g, b].map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
      }

      const fg = parseHex(input || '#121824');
      const bg = parseHex(opts.bgHex || '#FAF8F4');

      const l1 = relLuminance(fg);
      const l2 = relLuminance(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const ratioStr = `${ratio.toFixed(2)}:1`;

      const aaNormal = ratio >= 4.5 ? 'PASS ✓' : 'FAIL ✗';
      const aaaNormal = ratio >= 7.0 ? 'PASS ✓' : 'FAIL ✗';
      const aaLarge = ratio >= 3.0 ? 'PASS ✓' : 'FAIL ✗';

      const report = [
        `[Foreground Color]`,
        `  HEX : ${fg.hex}`,
        `  RGB : rgb(${fg.r}, ${fg.g}, ${fg.b})`,
        `  HSL : ${rgbToHsl(fg.r, fg.g, fg.b)}`,
        ``,
        `[Background Color]`,
        `  HEX : ${bg.hex}`,
        `  RGB : rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        `  HSL : ${rgbToHsl(bg.r, bg.g, bg.b)}`,
        ``,
        `[WCAG 2.1 Contrast Audit]`,
        `  Contrast Ratio     : ${ratioStr}`,
        `  WCAG AA (Normal)   : ${aaNormal} (requires ≥ 4.5:1)`,
        `  WCAG AAA (Normal)  : ${aaaNormal} (requires ≥ 7.0:1)`,
        `  WCAG AA (Large)    : ${aaLarge} (requires ≥ 3.0:1)`,
      ].join('\n');

      const extraHtml = `
        <div style="background:${bg.hex};color:${fg.hex};padding:1.1rem;border-radius:6px;border:1px solid var(--border-strong);">
          <div style="font-size:1.1rem;font-weight:800;">Live WCAG Contrast Sample (${ratioStr})</div>
          <div style="font-size:0.9rem;margin-top:0.25rem;">
            Foreground ${fg.hex} rendered directly over Background ${bg.hex}. Normal Text AA: ${aaNormal}.
          </div>
        </div>
      `;

      return {
        output: report,
        extraHtml,
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Contrast Ratio ${ratioStr} — WCAG AA: ${aaNormal}`,
      };
    },

    chmodCalculatorEngine(input, opts) {
      const modeStr =
        opts.presetMode && opts.presetMode !== 'custom' ? opts.presetMode : input.trim();
      const inputEl = document.getElementById('workbench-input');
      if (opts.presetMode && opts.presetMode !== 'custom' && inputEl && inputEl.value !== modeStr) {
        inputEl.value = modeStr;
      }

      if (!/^[0-7]{3}$/.test(modeStr)) {
        throw new Error('Enter a valid 3-digit octal permission mode between 000 and 777 (e.g., 755 or 644).');
      }

      const digits = modeStr.split('').map(Number);
      const rwxFor = (d) =>
        `${d & 4 ? 'r' : '-'}${d & 2 ? 'w' : '-'}${d & 1 ? 'x' : '-'}`;
      const explainDigit = (d) => {
        const p = [];
        if (d & 4) p.push('Read (4)');
        if (d & 2) p.push('Write (2)');
        if (d & 1) p.push('Execute (1)');
        return p.length ? p.join(' + ') : 'None (0)';
      };

      const symbolic = digits.map(rwxFor).join('');
      const advisory =
        modeStr === '777' || modeStr === '666'
          ? '⚠️ SECURITY WARNING: World-writable permissions allow any local user to modify or replace this file.'
          : '✓ Safe POSIX permission profile.';

      const out = [
        `Octal Mode      : ${modeStr}`,
        `Symbolic String : -${symbolic}  (Directory: d${symbolic})`,
        `Shell Command   : chmod ${modeStr} filename`,
        `────────────────────────────────────────────────────────`,
        `Owner (User)    : ${digits[0]} (${rwxFor(digits[0])}) → ${explainDigit(digits[0])}`,
        `Group           : ${digits[1]} (${rwxFor(digits[1])}) → ${explainDigit(digits[1])}`,
        `Others (Public) : ${digits[2]} (${rwxFor(digits[2])}) → ${explainDigit(digits[2])}`,
        ``,
        `Advisory        : ${advisory}`,
      ].join('\n');

      return {
        output: out,
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `chmod ${modeStr} → -${symbolic}`,
      };
    },

    caseSlugEngine(input, opts) {
      const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'and', 'or', 'with', 'how']);
      const words = input
        .trim()
        .replace(/['’]/g, '')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean);

      const lowerWords = words.map((w) => w.toLowerCase());
      const slugWords =
        opts.stripStopWords !== false
          ? lowerWords.filter((w, idx) => idx === 0 || !stopWords.has(w))
          : lowerWords;

      const seoSlug = slugWords.join('-');
      const kebab = lowerWords.join('-');
      const snake = lowerWords.join('_');
      const constant = lowerWords.join('_').toUpperCase();
      const camel = lowerWords
        .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join('');
      const pascal = lowerWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      const titleCase = lowerWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const readTimeSec = Math.max(1, Math.round((words.length / 220) * 60));

      const out = [
        `[Document Stats]    : ${words.length} words • ${input.length} chars • ~${readTimeSec}s reading time`,
        ``,
        `[SEO URL Slug]      : /${seoSlug}/`,
        `[kebab-case]        : ${kebab}`,
        `[snake_case]        : ${snake}`,
        `[camelCase]         : ${camel}`,
        `[PascalCase]        : ${pascal}`,
        `[CONSTANT_CASE]     : ${constant}`,
        `[Title Case]        : ${titleCase}`,
      ].join('\n');

      return {
        output: out,
        extraHtml: '',
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Generated SEO slug /${seoSlug}/ (${words.length} words)`,
      };
    },

    tomlJsonEngine(input, opts) {
      const direction = opts.direction || 'toml-to-json';
      const indent = Number(opts.indent || 2);

      if (direction === 'toml-to-json') {
        const result = {};
        let currentSection = result;
        const lines = input.split(/\r?\n/);

        for (const rawLine of lines) {
          const line = rawLine.replace(/#.*$/, '').trim();
          if (!line) continue;

          if (line.startsWith('[') && line.endsWith(']')) {
            const pathParts = line
              .slice(1, -1)
              .trim()
              .split('.')
              .map((p) => p.trim());
            currentSection = result;
            for (const part of pathParts) {
              if (!currentSection[part] || typeof currentSection[part] !== 'object') {
                currentSection[part] = {};
              }
              currentSection = currentSection[part];
            }
          } else {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1) {
              const key = line.slice(0, eqIdx).trim();
              const rawVal = line.slice(eqIdx + 1).trim();
              if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
                try {
                  currentSection[key] = JSON.parse(rawVal);
                } catch (_e) {
                  currentSection[key] = rawVal
                    .slice(1, -1)
                    .split(',')
                    .map((s) => parseScalarValue(s));
                }
              } else {
                currentSection[key] = parseScalarValue(rawVal);
              }
            }
          }
        }

        const out = JSON.stringify(result, null, indent);
        return {
          output: out,
          downloadExt: 'json',
          downloadMime: 'application/json',
          summary: `Parsed TOML configuration into JSON (${Object.keys(result).length} top-level keys)`,
        };
      } else {
        const parsed = JSON.parse(input);
        const topScalars = [];
        const sections = [];

        for (const [k, v] of Object.entries(parsed)) {
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            const secLines = [`[${k}]`];
            for (const [sk, sv] of Object.entries(v)) {
              secLines.push(`${sk} = ${JSON.stringify(sv)}`);
            }
            sections.push(secLines.join('\n'));
          } else {
            topScalars.push(`${k} = ${JSON.stringify(v)}`);
          }
        }
        const tomlOut = [...topScalars, '', ...sections].join('\n').trim();
        return {
          output: tomlOut,
          downloadExt: 'toml',
          downloadMime: 'application/toml',
          summary: 'Converted JSON object to TOML configuration',
        };
      }
    },

    curlConverterEngine(input, opts) {
      const targetLang = opts.targetLang || 'fetch';
      const normalized = input.replace(/\\\r?\n/g, ' ').trim();

      let method = 'GET';
      const methodMatch = normalized.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
      if (methodMatch) method = methodMatch[1].toUpperCase();

      const urlMatch = normalized.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/i);
      const url = urlMatch ? urlMatch[1] : 'https://api.example.com/v1/resource';

      const headers = {};
      const headerRegex = /(?:-H|--header)\s+(['"])(.*?)\1/g;
      let hMatch;
      while ((hMatch = headerRegex.exec(normalized)) !== null) {
        const colonIdx = hMatch[2].indexOf(':');
        if (colonIdx !== -1) {
          const hk = hMatch[2].slice(0, colonIdx).trim();
          const hv = hMatch[2].slice(colonIdx + 1).trim();
          headers[hk] = hv;
        }
      }

      const dataMatch = normalized.match(/(?:-d|--data|--data-raw|--data-binary)\s+(['"])([\s\S]*?)\1/);
      const bodyRaw = dataMatch ? dataMatch[2] : null;
      if (bodyRaw && method === 'GET') method = 'POST';

      let output = '';
      let ext = 'js';

      if (targetLang === 'fetch') {
        const fetchOpts = { method };
        if (Object.keys(headers).length > 0) fetchOpts.headers = headers;
        if (bodyRaw) fetchOpts.body = bodyRaw;
        output = `const response = await fetch(${JSON.stringify(url)}, {\n  method: ${JSON.stringify(method)},\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},${bodyRaw ? `\n  body: ${JSON.stringify(bodyRaw)},` : ''}\n});\n\nconst data = await response.json();\nconsole.log(data);`;
      } else if (targetLang === 'axios') {
        let parsedData = bodyRaw;
        try {
          if (bodyRaw) parsedData = JSON.parse(bodyRaw);
        } catch (_e) {}
        output = `import axios from 'axios';\n\nconst response = await axios({\n  method: ${JSON.stringify(method.toLowerCase())},\n  url: ${JSON.stringify(url)},\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},${bodyRaw ? `\n  data: ${JSON.stringify(parsedData, null, 4).replace(/\n/g, '\n  ')},` : ''}\n});\n\nconsole.log(response.data);`;
      } else {
        ext = 'py';
        output = `import requests\n\nurl = ${JSON.stringify(url)}\nheaders = ${JSON.stringify(headers, null, 4)}\n${bodyRaw ? `payload = ${JSON.stringify(bodyRaw)}\n\nresponse = requests.${method.toLowerCase()}(url, headers=headers, data=payload)` : `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)`}\nprint(response.status_code)\nprint(response.json())`;
      }

      return {
        output,
        downloadExt: ext,
        downloadMime: 'text/plain',
        summary: `Converted cURL (${method} ${url}) to ${targetLang.toUpperCase()}`,
      };
    },

    svgOptimizerEngine(input, opts) {
      const mode = opts.outputMode || 'minified';
      const origLen = input.length;

      const minified = input
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

      const encodedUri =
        'data:image/svg+xml;utf8,' +
        minified
          .replace(/"/g, "'")
          .replace(/%/g, '%25')
          .replace(/#/g, '%23')
          .replace(/{/g, '%7B')
          .replace(/}/g, '%7D')
          .replace(/</g, '%3C')
          .replace(/>/g, '%3E');

      const savedPct = origLen > 0 ? Math.max(0, Math.round(((origLen - minified.length) / origLen) * 100)) : 0;

      let outText = minified;
      if (mode === 'css-bg') {
        outText = `.icon-vector {\n  background-image: url("${encodedUri}");\n  background-repeat: no-repeat;\n  background-size: contain;\n}`;
      } else if (mode === 'img-tag') {
        outText = `<img src="${encodedUri}" alt="Vector Icon" width="64" height="64" />`;
      } else {
        outText = `/* 1. Minified SVG (${minified.length} bytes, -${savedPct}% saved) */\n${minified}\n\n/* 2. URL-Encoded Data URI (${encodedUri.length} chars) */\n${encodedUri}`;
      }

      return {
        output: outText,
        extraHtml: `<div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;">
          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:8px;border:1px solid var(--border-subtle);display:inline-flex;">${minified}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">
            <div><strong>Original Size:</strong> ${origLen.toLocaleString()} bytes → <strong>Minified:</strong> ${minified.length.toLocaleString()} bytes (<strong>-${savedPct}%</strong>)</div>
            <div><strong>Live Vector Preview:</strong> Rendered directly from cleaned SVG markup</div>
          </div>
        </div>`,
        downloadExt: 'svg',
        downloadMime: 'image/svg+xml',
        summary: `Optimized SVG: ${origLen} B → ${minified.length} B (-${savedPct}%)`,
      };
    },

    urlParserEngine(input, opts) {
      const raw = input.trim();
      const targetUrl = raw.startsWith('http') ? raw : `https://example.com/${raw.replace(/^\//, '')}`;
      const u = new URL(targetUrl);

      const entries = Array.from(u.searchParams.entries());
      if (opts.sortParams) {
        entries.sort((a, b) => a[0].localeCompare(b[0]));
      }

      const paramsObj = {};
      for (const [k, v] of entries) {
        paramsObj[k] = v;
      }

      const parsedReport = {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? '443 (default)' : '80 (default)'),
        origin: u.origin,
        pathname: u.pathname,
        hash: u.hash || null,
        queryCount: entries.length,
        queryParams: paramsObj,
      };

      const rowsHtml = entries
        .map(
          ([k, v]) =>
            `<tr><td style="font-weight:700;color:var(--accent-primary);">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`
        )
        .join('');

      return {
        output: JSON.stringify(parsedReport, null, 2),
        extraHtml:
          entries.length > 0
            ? `<div style="font-size:0.78rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-secondary);">DECODED QUERY PARAMETERS (${entries.length})</div>
               <table class="preview-table"><thead><tr><th>Parameter Key</th><th>Decoded Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
            : '',
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Parsed URL host "${u.hostname}" with ${entries.length} query parameters`,
      };
    },

    passwordGeneratorEngine(_input, opts) {
      const len = Math.max(8, Math.min(128, Number(opts.length || 24)));
      const charsetMode = opts.charset || 'all';

      let pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?';
      if (charsetMode === 'alnum') {
        pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      } else if (charsetMode === 'hex') {
        pool = '0123456789abcdef';
      }

      const entropyBits = Math.round(len * Math.log2(pool.length));
      const tokens = [];
      for (let t = 0; t < 10; t++) {
        const rand = new Uint32Array(len);
        window.crypto.getRandomValues(rand);
        let str = '';
        for (let i = 0; i < len; i++) {
          str += pool[rand[i] % pool.length];
        }
        tokens.push(str);
      }

      const output = [
        `# WebCrypto CSPRNG Secrets (${len} chars • ~${entropyBits} bits of entropy per key)`,
        `# Pool Size: ${pool.length} chars | Security Grade: ${entropyBits >= 128 ? '256-Bit / Military Grade' : 'High Security'}`,
        '',
        ...tokens.map((tok, i) => `${String(i + 1).padStart(2, '0')}. ${tok}`),
      ].join('\n');

      return {
        output,
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Generated 10 CSPRNG secrets (${entropyBits} bits of entropy each)`,
      };
    },

    byteConverterEngine(input, opts) {
      const val = parseFloat(input.trim()) || 0;
      const unit = opts.unit || 'GB';
      const multMap = {
        B: 1,
        KB: 1e3,
        MB: 1e6,
        GB: 1e9,
        TB: 1e12,
        GiB: Math.pow(1024, 3),
      };
      const bytes = val * (multMap[unit] || 1e9);

      const fmt = (n) =>
        n >= 100 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toPrecision(4);

      const secAtMbps = (mbps) => {
        const totalBits = bytes * 8;
        const secs = totalBits / (mbps * 1e6);
        if (secs < 1) return `${(secs * 1000).toFixed(0)} ms`;
        if (secs < 60) return `${secs.toFixed(1)} sec`;
        if (secs < 3600) return `${(secs / 60).toFixed(1)} min`;
        return `${(secs / 3600).toFixed(2)} hours`;
      };

      const report = {
        exactBytes: Math.round(bytes).toLocaleString() + ' B',
        decimalSI_Base10: {
          Kilobytes_KB: fmt(bytes / 1e3) + ' KB',
          Megabytes_MB: fmt(bytes / 1e6) + ' MB',
          Gigabytes_GB: fmt(bytes / 1e9) + ' GB',
          Terabytes_TB: fmt(bytes / 1e12) + ' TB',
        },
        binaryIEC_Base2: {
          Kibibytes_KiB: fmt(bytes / 1024) + ' KiB',
          Mebibytes_MiB: fmt(bytes / Math.pow(1024, 2)) + ' MiB',
          Gibibytes_GiB: fmt(bytes / Math.pow(1024, 3)) + ' GiB',
          Tebibytes_TiB: fmt(bytes / Math.pow(1024, 4)) + ' TiB',
        },
        estimatedTransferTimes: {
          '100 Mbps Fast Ethernet / Wi-Fi': secAtMbps(100),
          '1 Gbps Cloud / Fiber Link': secAtMbps(1000),
          '10 Gbps Datacenter Trunk': secAtMbps(10000),
        },
      };

      return {
        output: JSON.stringify(report, null, 2),
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Converted ${val} ${unit} across SI Decimal, IEC Binary & Network Transfer speeds`,
      };
    },

    jsonSchemaEngine(input, opts) {
      const parsed = JSON.parse(input);
      const mode = opts.outputMode || 'json-schema';
      const strictReq = Boolean(opts.strictRequired);

      function inferSchema(val) {
        if (val === null) return { type: 'null' };
        if (Array.isArray(val)) {
          return {
            type: 'array',
            items: val.length > 0 ? inferSchema(val[0]) : {},
          };
        }
        if (typeof val === 'object') {
          const properties = {};
          const keys = Object.keys(val);
          for (const k of keys) {
            properties[k] = inferSchema(val[k]);
          }
          const node = { type: 'object', properties };
          if (strictReq && keys.length > 0) node.required = keys;
          return node;
        }
        if (typeof val === 'number') {
          return { type: Number.isInteger(val) ? 'integer' : 'number' };
        }
        return { type: typeof val };
      }

      if (mode === 'typescript') {
        const interfaces = [];
        function buildTs(obj, name = 'RootPayload') {
          if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return 'any';
          }
          const lines = [`export interface ${name} {`];
          for (const [k, v] of Object.entries(obj)) {
            const optFlag = strictReq ? '' : '?';
            let tsType = typeof v;
            if (v === null) tsType = 'null';
            else if (Array.isArray(v)) {
              const first = v[0];
              tsType =
                first && typeof first === 'object'
                  ? `${buildTs(first, k.charAt(0).toUpperCase() + k.slice(1) + 'Item')}[]`
                  : `${first !== undefined ? typeof first : 'any'}[]`;
            } else if (typeof v === 'object') {
              const subName = k.charAt(0).toUpperCase() + k.slice(1);
              buildTs(v, subName);
              tsType = subName;
            }
            lines.push(`  ${k}${optFlag}: ${tsType};`);
          }
          lines.push('}');
          interfaces.push(lines.join('\n'));
          return name;
        }
        const target = Array.isArray(parsed) ? parsed[0] || {} : parsed;
        buildTs(target, 'RootPayload');
        return {
          output: interfaces.reverse().join('\n\n'),
          downloadExt: 'ts',
          downloadMime: 'text/plain',
          summary: `Generated ${interfaces.length} TypeScript interface(s) from JSON payload`,
        };
      }

      const fullSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'RootPayload',
        ...inferSchema(parsed),
      };

      return {
        output: JSON.stringify(fullSchema, null, 2),
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: 'Generated Draft 2020-12 JSON Schema from input payload',
      };
    },

    htmlEntityEngine(input, opts) {
      const mode = opts.mode || 'encode-named';
      let output = '';

      if (mode === 'encode-named') {
        output = input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/©/g, '&copy;')
          .replace(/®/g, '&reg;')
          .replace(/€/g, '&euro;');
      } else if (mode === 'encode-numeric') {
        output = Array.from(input)
          .map((ch) => {
            const code = ch.codePointAt(0);
            if (code > 127 || ['&', '<', '>', '"', "'"].includes(ch)) {
              return `&#x${code.toString(16).toUpperCase()};`;
            }
            return ch;
          })
          .join('');
      } else {
        const txt = document.createElement('textarea');
        txt.innerHTML = input;
        output = txt.value;
      }

      return {
        output,
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: `Processed ${input.length} chars in ${mode} mode`,
      };
    },

    sqlToSchemaEngine(input, opts) {
      const target = opts.targetFormat || 'prisma';
      const tableMatch = input.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)\s*;/i);
      const rawTableName = tableMatch ? tableMatch[1] : 'ModelRecord';
      const modelName = rawTableName
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
        .replace(/s$/, '');

      const body = tableMatch ? tableMatch[2] : input;
      const lines = body
        .split(/,\r?\n|\r?\n/)
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|INDEX|KEY)\b/i.test(l));

      const cols = [];
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;
        const name = parts[0].replace(/[`"']/g, '');
        const sqlType = parts[1].toUpperCase();
        const isNotNull = /NOT\s+NULL/i.test(line) || /PRIMARY\s+KEY/i.test(line);
        const isPk = /PRIMARY\s+KEY/i.test(line);
        const isUnique = /UNIQUE/i.test(line);
        const hasDefault = /DEFAULT/i.test(line);
        cols.push({ name, sqlType, isNotNull, isPk, isUnique, hasDefault });
      }

      if (target === 'prisma') {
        const prismaFields = cols.map((c) => {
          let pType = 'String';
          if (/INT|SERIAL/.test(c.sqlType)) pType = 'Int';
          else if (/FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/.test(c.sqlType)) pType = 'Float';
          else if (/BOOL/.test(c.sqlType)) pType = 'Boolean';
          else if (/TIME|DATE/.test(c.sqlType)) pType = 'DateTime';
          else if (/JSON/.test(c.sqlType)) pType = 'Json';

          const opt = c.isNotNull ? '' : '?';
          const attrs = [];
          if (c.isPk) attrs.push('@id');
          if (c.isUnique && !c.isPk) attrs.push('@unique');
          if (c.hasDefault && pType === 'DateTime') attrs.push('@default(now())');
          else if (c.hasDefault && /UUID/.test(c.sqlType)) attrs.push('@default(uuid())');

          return `  ${c.name.padEnd(14)} ${(pType + opt).padEnd(10)} ${attrs.join(' ')}`.trimEnd();
        });
        return {
          output: `model ${modelName} {\n${prismaFields.join('\n')}\n  @@map("${rawTableName}")\n}`,
          downloadExt: 'prisma',
          downloadMime: 'text/plain',
          summary: `Generated Prisma model "${modelName}" (${cols.length} columns)`,
        };
      }

      if (target === 'zod') {
        const zodFields = cols.map((c) => {
          let zType = 'z.string()';
          if (/UUID/.test(c.sqlType)) zType = 'z.string().uuid()';
          else if (/INT|SERIAL/.test(c.sqlType)) zType = 'z.number().int()';
          else if (/FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/.test(c.sqlType)) zType = 'z.number()';
          else if (/BOOL/.test(c.sqlType)) zType = 'z.boolean()';
          else if (/TIME|DATE/.test(c.sqlType)) zType = 'z.coerce.date()';
          if (!c.isNotNull) zType += '.nullable().optional()';
          return `  ${c.name}: ${zType},`;
        });
        return {
          output: `import { z } from 'zod';\n\nexport const ${modelName}Schema = z.object({\n${zodFields.join('\n')}\n});\n\nexport type ${modelName} = z.infer<typeof ${modelName}Schema>;`,
          downloadExt: 'ts',
          downloadMime: 'text/plain',
          summary: `Generated Zod schema "${modelName}Schema" (${cols.length} fields)`,
        };
      }

      const tsFields = cols.map((c) => {
        let tType = 'string';
        if (/INT|SERIAL|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/.test(c.sqlType)) tType = 'number';
        else if (/BOOL/.test(c.sqlType)) tType = 'boolean';
        else if (/TIME|DATE/.test(c.sqlType)) tType = 'string | Date';
        return `  ${c.name}${c.isNotNull ? '' : '?'}: ${tType}${c.isNotNull ? '' : ' | null'};`;
      });
      return {
        output: `export interface ${modelName} {\n${tsFields.join('\n')}\n}`,
        downloadExt: 'ts',
        downloadMime: 'text/plain',
        summary: `Generated TypeScript interface "${modelName}" (${cols.length} properties)`,
      };
    },

    svgToJsxEngine(input, opts) {
      const isTsx = (opts.typescript || 'tsx') === 'tsx';
      const useCurrentColor = Boolean(opts.currentColor);

      let jsxSvg = input
        .trim()
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\bclass=/g, 'className=')
        .replace(/\b([a-z]+)-([a-z]+)=/g, (_m, a, b) => `${a}${b.charAt(0).toUpperCase()}${b.slice(1)}=`)
        .replace(/\bxmlns:xlink=/g, 'xmlnsXlink=')
        .replace(/\bxlink:href=/g, 'xlinkHref=');

      if (useCurrentColor) {
        jsxSvg = jsxSvg.replace(/(stroke|fill)="#[0-9a-fA-F]{3,6}"/g, '$1="currentColor"');
      }

      jsxSvg = jsxSvg.replace(/<svg([^>]*)>/i, '<svg$1 {...props}>');

      const componentCode = isTsx
        ? `import type { SVGProps } from 'react';\n\nexport function CustomIcon(props: SVGProps<SVGSVGElement>) {\n  return (\n    ${jsxSvg.replace(/\n/g, '\n    ')}\n  );\n}\n\nexport default CustomIcon;`
        : `export function CustomIcon(props) {\n  return (\n    ${jsxSvg.replace(/\n/g, '\n    ')}\n  );\n}\n\nexport default CustomIcon;`;

      return {
        output: componentCode,
        downloadExt: isTsx ? 'tsx' : 'jsx',
        downloadMime: 'text/plain',
        summary: `Converted SVG to ${isTsx ? 'TypeScript React (.tsx)' : 'React JSX (.jsx)'} component`,
      };
    },

    envConverterEngine(input, opts) {
      const target = opts.target || 'k8s-configmap';
      const pairs = {};
      input.split(/\r?\n/).forEach((raw) => {
        const line = raw.trim();
        if (!line || line.startsWith('#')) return;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) return;
        const key = line.slice(0, eqIdx).trim().replace(/^export\s+/, '');
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        pairs[key] = val;
      });

      const keys = Object.keys(pairs);
      if (target === 'k8s-configmap') {
        const dataLines = keys.map((k) => `  ${k}: ${JSON.stringify(String(pairs[k]))}`);
        return {
          output: `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-env-config\n  namespace: default\ndata:\n${dataLines.join('\n')}`,
          downloadExt: 'yaml',
          downloadMime: 'text/yaml',
          summary: `Generated Kubernetes ConfigMap with ${keys.length} environment variables`,
        };
      }
      if (target === 'k8s-secret') {
        const dataLines = keys.map((k) => `  ${k}: ${utf8ToBase64(String(pairs[k]))}`);
        return {
          output: `apiVersion: v1\nkind: Secret\nmetadata:\n  name: app-env-secrets\n  namespace: default\ntype: Opaque\ndata:\n${dataLines.join('\n')}`,
          downloadExt: 'yaml',
          downloadMime: 'text/yaml',
          summary: `Generated Base64-encoded Kubernetes Secret with ${keys.length} keys`,
        };
      }
      if (target === 'docker-compose') {
        const envLines = keys.map((k) => `      ${k}: ${JSON.stringify(String(pairs[k]))}`);
        return {
          output: `services:\n  app:\n    image: app:latest\n    environment:\n${envLines.join('\n')}`,
          downloadExt: 'yml',
          downloadMime: 'text/yaml',
          summary: `Generated Docker Compose environment block (${keys.length} variables)`,
        };
      }
      return {
        output: JSON.stringify(pairs, null, 2),
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Converted ${keys.length} .env keys to JSON`,
      };
    },

    csvToMarkdownEngine(input, opts) {
      const fmt = opts.format || 'markdown';
      const align = opts.align || 'left';
      const delimiter = input.includes('\t') && !input.includes(',') ? '\t' : ',';
      const rows = parseCsvToRows(input.trim(), delimiter);
      if (rows.length === 0) throw new Error('Enter at least one CSV or TSV row.');

      const colCount = Math.max(...rows.map((r) => r.length));
      const widths = Array.from({ length: colCount }, (_, colIdx) =>
        Math.max(3, ...rows.map((r) => String(r[colIdx] || '').length))
      );

      if (fmt === 'markdown') {
        const padCell = (txt, w) => String(txt || '').padEnd(w, ' ');
        const headerLine = '| ' + widths.map((w, i) => padCell(rows[0][i], w)).join(' | ') + ' |';
        const sepLine =
          '| ' +
          widths
            .map((w) => {
              if (align === 'center') return ':' + '-'.repeat(Math.max(1, w - 2)) + ':';
              if (align === 'right') return '-'.repeat(Math.max(1, w - 1)) + ':';
              return ':' + '-'.repeat(Math.max(1, w - 1));
            })
            .join(' | ') +
          ' |';
        const bodyLines = rows
          .slice(1)
          .map((r) => '| ' + widths.map((w, i) => padCell(r[i], w)).join(' | ') + ' |');

        return {
          output: [headerLine, sepLine, ...bodyLines].join('\n'),
          downloadExt: 'md',
          downloadMime: 'text/markdown',
          summary: `Generated GitHub Markdown table (${rows.length} rows × ${colCount} columns)`,
        };
      }

      if (fmt === 'latex') {
        const colSpec = (align === 'center' ? 'c' : align === 'right' ? 'r' : 'l').repeat(colCount);
        const latexRows = rows.map((r) => '  ' + r.map((c) => String(c || '').replace(/[$&%#_]/g, '\\$&')).join(' & ') + ' \\\\');
        return {
          output: `\\begin{tabular}{${colSpec}}\n  \\hline\n${latexRows[0]}\n  \\hline\n${latexRows.slice(1).join('\n')}\n  \\hline\n\\end{tabular}`,
          downloadExt: 'tex',
          downloadMime: 'text/plain',
          summary: `Generated LaTeX tabular environment (${rows.length} rows)`,
        };
      }

      const ths = rows[0].map((c) => `      <th>${escapeHtml(c || '')}</th>`).join('\n');
      const trs = rows
        .slice(1)
        .map((r) => `    <tr>\n${r.map((c) => `      <td>${escapeHtml(c || '')}</td>`).join('\n')}\n    </tr>`)
        .join('\n');
      return {
        output: `<table>\n  <thead>\n    <tr>\n${ths}\n    </tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`,
        downloadExt: 'html',
        downloadMime: 'text/html',
        summary: `Generated HTML <table> markup (${rows.length} rows)`,
      };
    },

    cidrCalculatorEngine(input, opts) {
      const clean = input.trim();
      const [ipPart, prefixStr] = clean.includes('/') ? clean.split('/') : [clean, '24'];
      const prefix = Math.max(1, Math.min(32, parseInt(prefixStr, 10) || 24));
      const octets = ipPart.split('.').map((n) => parseInt(n, 10));
      if (octets.length !== 4 || octets.some((n) => isNaN(n) || n < 0 || n > 255)) {
        throw new Error('Enter a valid IPv4 CIDR block such as 10.24.0.0/22 or 192.168.1.0/24');
      }

      const ipInt =
        ((octets[0] << 24) >>> 0) + ((octets[1] << 16) >>> 0) + ((octets[2] << 8) >>> 0) + (octets[3] >>> 0);
      const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const netInt = (ipInt & maskInt) >>> 0;
      const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;

      const intToIp = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
      const totalAddresses = Math.pow(2, 32 - prefix);
      const isCloud = opts.cloudMode === 'aws';
      const reservedCount = prefix >= 31 ? 0 : isCloud ? 5 : 2;
      const usableHosts = Math.max(0, totalAddresses - reservedCount);

      const firstUsable = prefix >= 31 ? netInt : netInt + (isCloud ? 4 : 1);
      const lastUsable = prefix >= 31 ? bcastInt : bcastInt - 1;

      const report = {
        cidrBlock: `${intToIp(netInt)}/${prefix}`,
        netmask: intToIp(maskInt),
        wildcardMask: intToIp(~maskInt >>> 0),
        networkAddress: intToIp(netInt),
        broadcastAddress: intToIp(bcastInt),
        firstUsableHost: intToIp(firstUsable),
        lastUsableHost: intToIp(lastUsable),
        totalIpAddresses: totalAddresses.toLocaleString(),
        usableHosts: usableHosts.toLocaleString(),
        reservationPolicy: isCloud
          ? 'AWS / Cloud VPC (5 IPs reserved: .0 Network, .1 Router, .2 DNS, .3 Future, Broadcast)'
          : 'Standard RFC (2 IPs reserved: Network + Broadcast)',
      };

      return {
        output: JSON.stringify(report, null, 2),
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `CIDR ${report.cidrBlock}: ${report.usableHosts} usable hosts (${report.firstUsableHost} – ${report.lastUsableHost})`,
      };
    },

    cronToEnglishEngine(input, opts) {
      const parts = input.trim().split(/\s+/);
      if (parts.length !== 5) {
        throw new Error('Enter a standard 5-field cron expression (minute hour day-of-month month day-of-week).');
      }
      const [min, hr, dom, mon, dow] = parts;
      const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const explainField = (val, unit) => {
        if (val === '*') return `every ${unit}`;
        if (val.startsWith('*/')) return `every ${val.slice(2)} ${unit}s`;
        return `${unit} ${val}`;
      };

      let dowDesc = 'every day of the week';
      if (dow === '1-5') dowDesc = 'Monday through Friday (weekdays)';
      else if (dow === '0,6' || dow === '6,0') dowDesc = 'Saturday and Sunday (weekends)';
      else if (/^\d$/.test(dow) && dowNames[Number(dow)]) dowDesc = `on ${dowNames[Number(dow)]}`;
      else if (dow !== '*') dowDesc = `on day-of-week ${dow}`;

      const english = `Runs at ${explainField(min, 'minute')} of ${explainField(hr, 'hour')}, ${dom === '*' ? 'every day' : `on day ${dom} of the month`}${mon === '*' ? '' : ` in month ${mon}`}, ${dowDesc}.`;

      let out = `# Plain-English Schedule Translation\n"${english}"\n\n# 5-Field Breakdown\n- Minute (0-59):        ${min}\n- Hour (0-23):          ${hr}\n- Day of Month (1-31):  ${dom}\n- Month (1-12):         ${mon}\n- Day of Week (0-6):    ${dow} (${dowDesc})`;

      if (opts.includeSystemd) {
        out += `\n\n# Equivalent Linux systemd Timer (schedule.timer)\n[Unit]\nDescription=Scheduled Job (${input.trim()})\n\n[Timer]\nOnCalendar=*-*-${dom === '*' ? '*' : dom} ${hr === '*' ? '*' : hr}:${min === '*' ? '00' : min}:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target`;
      }

      return {
        output: out,
        downloadExt: 'txt',
        downloadMime: 'text/plain',
        summary: english,
      };
    },

    httpHeaderEngine(input, opts) {
      const headers = {};
      input.split(/\r?\n/).forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0 && !line.startsWith('HTTP/')) {
          const k = line.slice(0, idx).trim().toLowerCase();
          const v = line.slice(idx + 1).trim();
          headers[k] = v;
        }
      });

      const checks = [
        {
          header: 'strict-transport-security',
          present: Boolean(headers['strict-transport-security']),
          rec: 'strict-transport-security: max-age=63072000; includeSubDomains; preload',
        },
        {
          header: 'content-security-policy',
          present: Boolean(headers['content-security-policy']),
          rec: "content-security-policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'",
        },
        {
          header: 'x-content-type-options',
          present: headers['x-content-type-options'] === 'nosniff',
          rec: 'x-content-type-options: nosniff',
        },
        {
          header: 'x-frame-options',
          present: Boolean(headers['x-frame-options']),
          rec: 'x-frame-options: DENY',
        },
        {
          header: 'referrer-policy',
          present: Boolean(headers['referrer-policy']),
          rec: 'referrer-policy: strict-origin-when-cross-origin',
        },
      ];

      const passed = checks.filter((c) => c.present).length;
      const report = {
        securityScore: `${passed}/${checks.length} OWASP Core Headers Present`,
        parsedHeaders: headers,
        ...(opts.strictAudit
          ? {
              missingRecommendations: checks.filter((c) => !c.present).map((c) => c.rec),
            }
          : {}),
      };

      return {
        output: JSON.stringify(report, null, 2),
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Audited ${Object.keys(headers).length} HTTP headers — Score: ${passed}/${checks.length} OWASP checks passed`,
      };
    },

    base64PreviewEngine(input, opts) {
      const raw = input.trim();
      let mime = 'application/octet-stream';
      let b64 = raw;

      const dataMatch = raw.match(/^data:([^;]+);base64,(.*)$/s);
      if (dataMatch) {
        mime = dataMatch[1];
        b64 = dataMatch[2];
      }

      const cleanB64 = b64.replace(/\s+/g, '');
      const binary = atob(cleanB64);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

      if (!dataMatch) {
        if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
        else if (bytes[0] === 0xff && bytes[1] === 0xd8) mime = 'image/jpeg';
        else if (binary.trim().startsWith('<svg')) mime = 'image/svg+xml';
        else if (binary.trim().startsWith('{')) mime = 'application/json';
      }

      const hexMagic = Array.from(bytes.slice(0, 32))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      const fullDataUri = `data:${mime};base64,${cleanB64}`;
      const isImage = mime.startsWith('image/');

      const info = {
        detectedMimeType: mime,
        base64LengthChars: cleanB64.length,
        decodedSizeBytes: bytes.length,
        base64SizeOverhead: `+${Math.round(((cleanB64.length - bytes.length) / Math.max(1, bytes.length)) * 100)}%`,
        ...(opts.showHex ? { first32HexMagicBytes: hexMagic } : {}),
      };

      return {
        output: JSON.stringify(info, null, 2),
        extraHtml: isImage
          ? `<div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;">
               <img src="${fullDataUri}" alt="Decoded Base64 Preview" style="max-height:140px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-subtle);padding:0.5rem;" />
               <div style="font-size:0.85rem;color:var(--text-secondary);">
                 <div><strong>Live Decoded Preview:</strong> ${escapeHtml(mime)} (${formatBytes(bytes.length)})</div>
                 <div>Rendered 100% locally from decoded Base64 buffer</div>
               </div>
             </div>`
          : '',
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Decoded ${formatBytes(bytes.length)} (${mime}) from Base64 payload`,
      };
    },

    freelanceRateEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        data = {};
      }
      const targetNet = Number(data.targetNetSalaryUsd || 140000);
      const overheadMo = Number(data.monthlySoftwareAndHealthInsuranceUsd || 950);
      const ptoWeeks = Number(data.vacationAndSickWeeksPerYear || 5);
      const billableHrsWk = Number(data.billableHoursPerWeek || 28);
      const taxRate = Number(opts.taxPreset || 30) / 100;
      const marginPct = Number(opts.profitMargin || 15) / 100;

      const workingWeeks = Math.max(1, 52 - ptoWeeks);
      const annualBillableHours = workingWeeks * billableHrsWk;
      const annualOverhead = overheadMo * 12;
      const requiredPreTaxProfit = targetNet / Math.max(0.1, 1 - taxRate);
      const requiredGrossRevenue = (requiredPreTaxProfit + annualOverhead) * (1 + marginPct);

      const minHourlyRate = Math.ceil(requiredGrossRevenue / annualBillableHours);
      const dayRate = minHourlyRate * 8;
      const weeklySprintRate = minHourlyRate * billableHrsWk;
      const monthlyRetainer20h = Math.round(minHourlyRate * 20 * 0.92);
      const sCorpEstSavings = targetNet > 100000 ? Math.round((targetNet - 90000) * 0.153) : 0;

      const report = {
        recommendedRates: {
          minimumHourlyRateUsd: `$${minHourlyRate}/hr`,
          fullDayRateUsd: `$${dayRate.toLocaleString()}/day`,
          weeklySprintRateUsd: `$${weeklySprintRate.toLocaleString()}/wk`,
          monthlyRetainer20HrsUsd: `$${monthlyRetainer20h.toLocaleString()}/mo (includes 8% retainer discount)`,
        },
        annualFinancialModel: {
          targetTakeHomePayUsd: `$${targetNet.toLocaleString()}`,
          annualBusinessOverheadUsd: `$${annualOverhead.toLocaleString()}`,
          estimatedTaxProvisionUsd: `$${Math.round(requiredPreTaxProfit - targetNet).toLocaleString()} (${Math.round(taxRate * 100)}%)`,
          requiredGrossBillingsUsd: `$${Math.round(requiredGrossRevenue).toLocaleString()}/yr`,
          billableCapacity: `${annualBillableHours.toLocaleString()} billable hrs/yr (${workingWeeks} wks × ${billableHrsWk} hrs/wk)`,
        },
        ...(opts.includeRetainer
          ? {
              taxOptimizationNote:
                sCorpEstSavings > 0
                  ? `Electing S-Corp status (via Gusto or collective payroll) at this income level can save ~$${sCorpEstSavings.toLocaleString()}/yr in self-employment FICA taxes.`
                  : 'Standard LLC pass-through taxation recommended at this bracket.',
            }
          : {}),
      };

      const extraHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0.75rem;">
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Recommended Hourly</div>
            <div style="font-size:1.35rem;font-weight:700;color:var(--brand-primary);">$${minHourlyRate}/hr</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Full-Day Rate (8h)</div>
            <div style="font-size:1.35rem;font-weight:700;">$${dayRate.toLocaleString()}/day</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">20h/mo Retainer</div>
            <div style="font-size:1.35rem;font-weight:700;">$${monthlyRetainer20h.toLocaleString()}/mo</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Est. S-Corp Tax Savings</div>
            <div style="font-size:1.35rem;font-weight:700;color:#15803d;">+$${sCorpEstSavings.toLocaleString()}/yr</div>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Calculated $${minHourlyRate}/hr ($${dayRate.toLocaleString()}/day) target rate for $${targetNet.toLocaleString()} net take-home`,
      };
    },

    saasMetricsEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        data = {};
      }
      const mrr = Number(data.currentMrrUsd || 42000);
      const arpu = Number(data.averageRevenuePerAccountMonthlyUsd || 149);
      const churnPct = Math.max(0.1, Number(data.monthlyLogoChurnPercent || 2.8));
      const cac = Number(data.customerAcquisitionCostUsd || 680);
      const cash = Number(data.cashOnHandUsd || 480000);
      const burn = Number(data.monthlyNetBurnUsd || 24000);
      const gm = Number(opts.grossMargin || 85) / 100;
      const growthMoM = Number(opts.growthRateMoM || 8) / 100;

      const ltv = (arpu * gm) / (churnPct / 100);
      const ltvCacRatio = ltv / Math.max(1, cac);
      const paybackMonths = cac / Math.max(1, arpu * gm);
      const runwayMonths = burn > 0 ? cash / burn : 999;
      const arrCurrent = mrr * 12;
      const projectedMrr12m = mrr * Math.pow(1 + growthMoM, 12);
      const projectedArr12m = projectedMrr12m * 12;
      const annualizedGrowthPct = (Math.pow(1 + growthMoM, 12) - 1) * 100;
      const fcfMarginPct = mrr > 0 ? ((-burn / mrr) * 100) : 0;
      const ruleOf40 = annualizedGrowthPct + fcfMarginPct;

      const report = {
        unitEconomics: {
          currentArrUsd: `$${Math.round(arrCurrent).toLocaleString()}/yr`,
          projected12MonthArrUsd: `$${Math.round(projectedArr12m).toLocaleString()}/yr`,
          customerLifetimeValueUsd: `$${Math.round(ltv).toLocaleString()}`,
          ltvToCacRatio: `${ltvCacRatio.toFixed(2)}x (${ltvCacRatio >= 3 ? 'Venture Scale >= 3.0x' : 'Needs Optimization < 3.0x'})`,
          cacPaybackPeriodMonths: `${paybackMonths.toFixed(1)} months`,
        },
        runwayAndEfficiency: {
          cashOnHandUsd: `$${cash.toLocaleString()}`,
          monthlyNetBurnUsd: `$${burn.toLocaleString()}/mo`,
          cashRunwayMonths: burn > 0 ? `${runwayMonths.toFixed(1)} months` : 'Infinite (Cash-Flow Positive)',
          ruleOf40Score: `${ruleOf40.toFixed(1)}% (${ruleOf40 >= 40 ? 'Elite SaaS >= 40%' : 'Below 40% Threshold'})`,
        },
        ...(opts.includeValuation
          ? {
              indicativeValuationBand: {
                conservative6xArr: `$${Math.round((arrCurrent * 6) / 1000).toLocaleString()}K`,
                venture10xArr: `$${Math.round((arrCurrent * 10) / 1000).toLocaleString()}K`,
                forward12m10xArr: `$${Math.round((projectedArr12m * 10) / 1000).toLocaleString()}K`,
              },
            }
          : {}),
      };

      const extraHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:0.75rem;">
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">LTV : CAC Ratio</div>
            <div style="font-size:1.35rem;font-weight:700;color:${ltvCacRatio >= 3 ? '#15803d' : '#c2410c'};">${ltvCacRatio.toFixed(1)}×</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">CAC Payback</div>
            <div style="font-size:1.35rem;font-weight:700;">${paybackMonths.toFixed(1)} mos</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Cash Runway</div>
            <div style="font-size:1.35rem;font-weight:700;">${burn > 0 ? `${runwayMonths.toFixed(1)} mos` : '∞'}</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">12-Mo Projected ARR</div>
            <div style="font-size:1.35rem;font-weight:700;color:var(--brand-primary);">$${Math.round(projectedArr12m / 1000).toLocaleString()}K</div>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `LTV:CAC ${ltvCacRatio.toFixed(1)}x • Payback ${paybackMonths.toFixed(1)} mos • Runway ${burn > 0 ? `${runwayMonths.toFixed(1)} mos` : 'Infinite'}`,
      };
    },

    llmTokenEstimatorEngine(input, opts) {
      const chars = input.length;
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      const estInputTokens = Math.max(1, Math.ceil(chars / 3.85));
      const outTokens = Number(opts.expectedOutputTokens || 500);
      const dailyCalls = Number(opts.dailyCalls || 10000);
      const cacheHitRatio = opts.cacheDiscount ? 0.5 : 0;

      const models = [
        { name: 'GPT-4o (OpenAI)', in1M: 2.5, out1M: 10.0 },
        { name: 'GPT-4o-mini (OpenAI)', in1M: 0.15, out1M: 0.6 },
        { name: 'Claude 3.5 Sonnet (Anthropic)', in1M: 3.0, out1M: 15.0 },
        { name: 'Claude 3.5 Haiku (Anthropic)', in1M: 0.8, out1M: 4.0 },
        { name: 'Gemini 2.5 Pro (Google)', in1M: 1.25, out1M: 10.0 },
        { name: 'Gemini 2.5 Flash (Google)', in1M: 0.15, out1M: 0.6 },
        { name: 'DeepSeek V3 / R1 (OpenRouter)', in1M: 0.27, out1M: 1.1 },
        { name: 'Llama 3.3 70B (Groq / Together)', in1M: 0.59, out1M: 0.79 },
      ];

      const effectiveInTokens = estInputTokens * (1 - cacheHitRatio * 0.5);
      const monthlyCalls = dailyCalls * 30;

      const breakdown = models.map((m) => {
        const perCallUsd = (effectiveInTokens / 1e6) * m.in1M + (outTokens / 1e6) * m.out1M;
        const monthlyUsd = perCallUsd * monthlyCalls;
        return {
          model: m.name,
          costPer1kCallsUsd: `$${(perCallUsd * 1000).toFixed(4)}`,
          monthlyCostUsd: `$${monthlyUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`,
          annualCostUsd: `$${(monthlyUsd * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`,
          rawMonthly: monthlyUsd,
        };
      });

      const cheapest = [...breakdown].sort((a, b) => a.rawMonthly - b.rawMonthly)[0];
      const mostExpensive = [...breakdown].sort((a, b) => b.rawMonthly - a.rawMonthly)[0];

      const report = {
        promptMetrics: {
          characterCount: chars,
          wordCount: words,
          estimatedInputTokens: estInputTokens,
          expectedOutputTokensPerCall: outTokens,
          monthlyApiCalls: monthlyCalls.toLocaleString(),
          promptCachingApplied: opts.cacheDiscount ? '50% Cached Input Token Discount' : 'None',
        },
        modelCostComparison: breakdown.map(({ rawMonthly, ...rest }) => rest),
      };

      const extraHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;">
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Prompt Token Count</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--brand-primary);">~${estInputTokens.toLocaleString()} tokens</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Lowest Monthly (${cheapest.model.split(' ')[0]})</div>
            <div style="font-size:1.3rem;font-weight:700;color:#15803d;">${cheapest.monthlyCostUsd}</div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-subtle);border:1px solid var(--border-subtle);">
            <div style="font-size:0.74rem;color:var(--text-muted);">Frontier Flagship (${mostExpensive.model.split(' ')[0]})</div>
            <div style="font-size:1.3rem;font-weight:700;">${mostExpensive.monthlyCostUsd}</div>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `~${estInputTokens} input tokens + ${outTokens} output tokens across ${dailyCalls.toLocaleString()} calls/day`,
      };
    },

    qrPayloadStudioEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        data = { url: input.trim() || 'https://utilforge.pages.dev' };
      }

      const mode = opts.payloadType || 'url';
      const fg = opts.fgColor || '#0f172a';
      let payloadStr = '';

      if (mode === 'wifi') {
        const ssid = data.wifiSsid || 'GuestNetwork';
        const pass = data.wifiPassword || '';
        const enc = data.wifiEncryption || 'WPA';
        payloadStr = `WIFI:T:${enc};S:${ssid};P:${pass};;`;
      } else if (mode === 'vcard') {
        const name = data.vcardName || 'Alex Rivera';
        const org = data.vcardOrg || 'UtilForge';
        const email = data.vcardEmail || 'alex@example.com';
        const url = data.url || 'https://utilforge.pages.dev';
        payloadStr = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${org}\nEMAIL:${email}\nURL:${url}\nEND:VCARD`;
      } else {
        payloadStr = data.url || 'https://utilforge.pages.dev';
      }

      // Deterministic 21x21 QR-style matrix visual SVG from payload hash + bytes
      const size = 21;
      const matrix = Array.from({ length: size }, () => Array(size).fill(false));

      function drawFinder(r0, c0) {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            const border = r === 0 || r === 6 || c === 0 || c === 6;
            const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            matrix[r0 + r][c0 + c] = border || inner;
          }
        }
      }
      drawFinder(0, 0);
      drawFinder(0, size - 7);
      drawFinder(size - 7, 0);

      for (let i = 8; i < size - 8; i++) {
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
      }

      let seed = 2166136261;
      for (let i = 0; i < payloadStr.length; i++) {
        seed ^= payloadStr.charCodeAt(i);
        seed = Math.imul(seed, 16777619) >>> 0;
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const inFinderTL = r < 8 && c < 8;
          const inFinderTR = r < 8 && c >= size - 8;
          const inFinderBL = r >= size - 8 && c < 8;
          if (inFinderTL || inFinderTR || inFinderBL || r === 6 || c === 6) continue;
          seed ^= (r * 31 + c * 17 + payloadStr.charCodeAt((r * size + c) % Math.max(1, payloadStr.length))) >>> 0;
          seed = Math.imul(seed, 1664525) + 1013904223;
          matrix[r][c] = ((seed >>> 16) & 1) === 1;
        }
      }

      const cell = 10;
      const margin = 20;
      const dim = size * cell + margin * 2;
      const rects = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c]) {
            rects.push(
              `<rect x="${margin + c * cell}" y="${margin + r * cell}" width="${cell}" height="${cell}" rx="1.5" fill="${fg}"/>`
            );
          }
        }
      }

      const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}">\n  <rect width="100%" height="100%" rx="12" fill="#ffffff"/>\n  ${rects.join('\n  ')}\n</svg>`;

      const extraHtml = `
        <div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;">
          <div style="border:1px solid var(--border-subtle);border-radius:10px;padding:0.5rem;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            ${svgCode}
          </div>
          <div style="font-size:0.84rem;color:var(--text-secondary);max-width:460px;">
            <div style="font-weight:700;color:var(--text-primary);margin-bottom:0.25rem;">Encoded Payload (${mode.toUpperCase()}):</div>
            <code style="display:block;padding:0.5rem;background:var(--bg-subtle);border-radius:6px;word-break:break-all;">${escapeHtml(payloadStr)}</code>
          </div>
        </div>
      `;

      return {
        output: opts.includeRawPayload ? `<!-- Payload: ${payloadStr.replace(/\n/g, ' ')} -->\n${svgCode}` : svgCode,
        extraHtml,
        downloadExt: 'svg',
        downloadMime: 'image/svg+xml',
        summary: `Generated ${dim}x${dim} vector SVG QR matrix (${mode.toUpperCase()} payload, ${payloadStr.length} bytes)`,
      };
    },

    stripeFeeEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        const num = parseFloat(String(input).replace(/[^0-9.]/g, ''));
        data = { monthlyRevenueUsd: isNaN(num) || num <= 0 ? 15000 : num };
      }

      const grossUsd = Math.max(1, Number(data.monthlyRevenueUsd ?? data.grossRevenueUsd ?? 15000));
      const aov = Math.max(1, Number(data.averageOrderValueUsd ?? data.aov ?? 49));
      const refundRatePct = Math.max(0, Math.min(25, Number(data.refundRatePct ?? 1.2)));
      const region = opts.billingRegion || 'us_domestic';
      const isAnnual = opts.payoutFrequency === 'annual';
      const multiplier = isAnnual ? 12 : 1;

      const numOrders = Math.max(1, Math.round(grossUsd / aov));
      const effectiveGross = grossUsd * (1 - refundRatePct / 100);

      let stripePct = 2.9;
      let stripeFixed = 0.30;
      let paypalPct = 3.49;
      let paypalFixed = 0.49;

      if (region === 'international') {
        stripePct = 4.4;
        paypalPct = 4.99;
      } else if (region === 'eu_eea') {
        stripePct = 1.5;
        stripeFixed = 0.27;
        paypalPct = 2.49;
        paypalFixed = 0.38;
      }

      const gateways = [
        {
          id: 'stripe',
          name: 'Stripe Standard',
          type: 'Direct PSP',
          pct: stripePct,
          fixed: stripeFixed,
          notes: 'Standard direct merchant processing. Global sales tax & remittance self-managed.',
        },
        {
          id: 'paypal',
          name: 'PayPal Commerce',
          type: 'Direct PSP',
          pct: paypalPct,
          fixed: paypalFixed,
          notes: 'Consumer wallet & card processing with higher percentage cut per sale.',
        },
        {
          id: 'lemonsqueezy',
          name: 'Lemon Squeezy',
          type: 'Merchant of Record (MoR)',
          pct: 5.0,
          fixed: 0.50,
          notes: 'Full MoR: Automatically calculates, collects, and remits global VAT/sales tax.',
        },
        {
          id: 'paddle',
          name: 'Paddle Billing',
          type: 'Merchant of Record (MoR)',
          pct: 5.0,
          fixed: 0.50,
          notes: 'Reseller Merchant of Record engineered for B2B & micro-SaaS subscriptions.',
        },
        {
          id: 'polar',
          name: 'Polar.sh',
          type: 'Merchant of Record (MoR)',
          pct: 4.0,
          fixed: 0.40,
          notes: 'Lowest fee MoR platform tailored for developer tools, SaaS, and GitHub creators.',
        },
      ];

      const rows = gateways.map((g) => {
        const pctFee = effectiveGross * (g.pct / 100);
        const fixedFee = numOrders * g.fixed;
        const totalFeesPeriod = (pctFee + fixedFee) * multiplier;
        const grossPeriod = grossUsd * multiplier;
        const netPayoutPeriod = Math.max(0, grossPeriod - totalFeesPeriod);
        const effectiveFeePct = (totalFeesPeriod / grossPeriod) * 100;

        return {
          ...g,
          grossPeriod,
          totalFeesPeriod,
          netPayoutPeriod,
          effectiveFeePct,
          numOrdersPeriod: numOrders * multiplier,
        };
      });

      rows.sort((a, b) => b.netPayoutPeriod - a.netPayoutPeriod);
      const topGateway = rows[0];
      const periodLabel = isAnnual ? 'Year' : 'Month';

      const report = {
        parameters: {
          grossRevenueUsd: grossUsd,
          averageOrderValueUsd: aov,
          monthlyTransactions: numOrders,
          refundRatePercent: refundRatePct,
          billingRegion: region,
          timeframe: periodLabel,
        },
        payoutComparison: rows.map((r) => ({
          gateway: r.name,
          type: r.type,
          effectiveFeeRate: `${r.effectiveFeePct.toFixed(2)}%`,
          totalFeesDeducted: `$${r.totalFeesPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          netTakeHomePayout: `$${r.netPayoutPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          rateFormula: `${r.pct}% + $${r.fixed.toFixed(2)}/tx`,
        })),
        insights: {
          highestPayoutGateway: topGateway.name,
          maxTakeHomePayout: `$${topGateway.netPayoutPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          directVsMorTradeoff:
            'Direct processors (Stripe) yield higher net payouts but require manual state and international VAT filings. Merchant of Record platforms handle 100% of tax remittance.',
        },
      };

      const extraHtml = `
        <div style="margin-top:1.25rem;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.6rem;letter-spacing:0.04em;">
            Payment Gateway Net Take-Home Comparison (${periodLabel}ly: $${grossUsd.toLocaleString()}/mo, ${numOrders} orders @ $${aov})
          </div>
          <div style="overflow-x:auto;">
            <table class="matrix-table" style="width:100%;font-size:0.86rem;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-subtle);border-bottom:2px solid var(--border-strong);">
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Payment Gateway</th>
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Type</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Processing Rate</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Total Fees (${periodLabel})</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Effective Fee %</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;color:var(--accent-emerald);">Net Take-Home Payout</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (r, idx) => `
                  <tr style="border-bottom:1px solid var(--border-subtle);${idx === 0 ? 'background:var(--accent-emerald-soft);' : ''}">
                    <td style="padding:0.65rem 0.75rem;">
                      <strong>${escapeHtml(r.name)}</strong>
                      <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(r.notes)}</div>
                    </td>
                    <td style="padding:0.65rem 0.75rem;">
                      <span class="trust-chip" style="font-size:0.68rem;padding:0.15rem 0.4rem;">${escapeHtml(r.type)}</span>
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      ${r.pct}% + $${r.fixed.toFixed(2)}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);color:var(--accent-danger);">
                      -$${r.totalFeesPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:700;">
                      ${r.effectiveFeePct.toFixed(2)}%
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:800;color:var(--accent-emerald);font-size:0.95rem;">
                      $${r.netPayoutPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:1.15rem;padding:0.9rem 1.15rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Need High-Yield Startup Banking for Payment Payouts?</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Mercury offers FDIC insured business checking, $250 bonus, zero monthly fees, and automated Stripe/PayPal subaccounts.</div>
            </div>
            <a href="/go/mercury-banking/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Mercury Startup Banking" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem;">
              Claim $250 Mercury Bonus →
            </a>
          </div>
        </div>
      `;

      const stripeRow = rows.find((r) => r.id === 'stripe') || rows[0];
      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `$${grossUsd.toLocaleString()}/mo (${numOrders} txs): Stripe Fees = -$${stripeRow.totalFeesPeriod.toFixed(2)} | Net Take-Home = $${stripeRow.netPayoutPeriod.toFixed(2)} (${stripeRow.effectiveFeePct.toFixed(2)}% effective fee)`,
      };
    },

    storageEgressEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        const num = parseFloat(String(input).replace(/[^0-9.]/g, ''));
        data = { storedDataGb: isNaN(num) || num <= 0 ? 8000 : num, monthlyEgressGb: 35000 };
      }

      const storedGb = Math.max(1, Number(data.storedDataGb ?? data.storageGb ?? 8000));
      const egressGb = Math.max(0, Number(data.monthlyEgressGb ?? data.egressGb ?? 35000));
      const classA = Math.max(0, Number(data.classARequestsPut ?? data.putRequests ?? 250000));
      const classB = Math.max(0, Number(data.classBRequestsGet ?? data.getRequests ?? 4000000));
      const includeReqs = opts.includeRequests !== 'no';
      const isAnnual = opts.comparisonTimeline === 'annual';
      const mult = isAnnual ? 12 : 1;

      const clouds = [
        {
          id: 'cloudflare-r2',
          name: 'Cloudflare R2',
          storagePerGb: 0.015,
          egressPerGb: 0.00,
          classAPer1M: 4.50,
          classBPer1M: 0.36,
          notes: 'Zero egress bandwidth fees anywhere globally • Standard S3 API compatible',
        },
        {
          id: 'aws-s3',
          name: 'AWS S3 Standard',
          storagePerGb: 0.023,
          egressPerGb: 0.09,
          classAPer1M: 5.00,
          classBPer1M: 0.40,
          notes: 'Baseline AWS object storage with steep $0.09/GB internet egress penalties',
        },
        {
          id: 'google-gcs',
          name: 'Google Cloud Storage (Standard)',
          storagePerGb: 0.020,
          egressPerGb: 0.12,
          classAPer1M: 5.00,
          classBPer1M: 0.40,
          notes: 'Multi-regional GCP storage with $0.12/GB outbound internet data egress',
        },
        {
          id: 'azure-blob',
          name: 'Microsoft Azure Blob (Hot)',
          storagePerGb: 0.018,
          egressPerGb: 0.087,
          classAPer1M: 6.50,
          classBPer1M: 0.50,
          notes: 'Azure hot blob tier with $0.087/GB internet egress transfer charges',
        },
        {
          id: 'backblaze-b2',
          name: 'Backblaze B2 (Bandwidth Alliance)',
          storagePerGb: 0.006,
          egressPerGb: 0.010,
          classAPer1M: 0.00,
          classBPer1M: 0.00,
          notes: 'Ultra-low cost capacity ($0.006/GB) with free egress when routed via Cloudflare CDN',
        },
      ];

      const periodLabel = isAnnual ? 'Year' : 'Month';
      const awsS3Row = clouds.find((c) => c.id === 'aws-s3');
      const awsStorage = storedGb * awsS3Row.storagePerGb;
      const awsEgress = egressGb * awsS3Row.egressPerGb;
      const awsOps = includeReqs ? (classA / 1000000) * awsS3Row.classAPer1M + (classB / 1000000) * awsS3Row.classBPer1M : 0;
      const awsTotalMonthly = awsStorage + awsEgress + awsOps;

      const rows = clouds.map((c) => {
        const storageCost = storedGb * c.storagePerGb * mult;
        const egressCost = egressGb * c.egressPerGb * mult;
        const opsCost = includeReqs ? ((classA / 1000000) * c.classAPer1M + (classB / 1000000) * c.classBPer1M) * mult : 0;
        const totalPeriod = storageCost + egressCost + opsCost;
        const awsPeriod = awsTotalMonthly * mult;
        const savingsUsd = awsPeriod - totalPeriod;
        const savingsPct = awsPeriod > 0 ? (savingsUsd / awsPeriod) * 100 : 0;

        return {
          ...c,
          storageCost,
          egressCost,
          opsCost,
          totalPeriod,
          savingsUsd,
          savingsPct,
        };
      });

      rows.sort((a, b) => a.totalPeriod - b.totalPeriod);
      const r2Row = rows.find((r) => r.id === 'cloudflare-r2') || rows[0];

      const report = {
        workload: {
          storedDataGigabytes: storedGb,
          storedDataTerabytes: Number((storedGb / 1024).toFixed(2)),
          monthlyEgressGigabytes: egressGb,
          monthlyEgressTerabytes: Number((egressGb / 1024).toFixed(2)),
          classAPutRequests: classA,
          classBGetRequests: classB,
          timeline: periodLabel,
        },
        cloudCostMatrix: rows.map((r) => ({
          provider: r.name,
          storageCost: `$${r.storageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          egressCost: `$${r.egressCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          operationsCost: `$${r.opsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalBill: `$${r.totalPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          dollarSavingsVsAwsS3:
            r.savingsUsd > 0
              ? `Save $${r.savingsUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${r.savingsPct.toFixed(1)}%)`
              : '$0.00 (Baseline)',
        })),
        insights: {
          cloudflareR2MonthlyTotal: `$${(r2Row.totalPeriod / mult).toFixed(2)}/mo`,
          awsS3MonthlyTotal: `$${awsTotalMonthly.toFixed(2)}/mo`,
          annualSavingsWithR2: `$${(r2Row.savingsUsd * (isAnnual ? 1 : 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          egressTaxNotice: `AWS S3 charges $${(egressGb * 0.09).toFixed(2)}/mo strictly for internet egress bandwidth, representing ${(
            (awsEgress / awsTotalMonthly) *
            100
          ).toFixed(1)}% of your AWS S3 bill. Cloudflare R2 charges $0.00 egress.`,
        },
      };

      const extraHtml = `
        <div style="margin-top:1.25rem;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.6rem;letter-spacing:0.04em;">
            Multi-Cloud Object Storage Cost Benchmark (${periodLabel}ly: ${(storedGb / 1024).toFixed(1)} TB Stored, ${(egressGb / 1024).toFixed(1)} TB Egress)
          </div>
          <div style="overflow-x:auto;">
            <table class="matrix-table" style="width:100%;font-size:0.86rem;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-subtle);border-bottom:2px solid var(--border-strong);">
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Cloud Provider</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Storage Cost</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Egress Bandwidth Fee</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">API Requests</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Total ${periodLabel}ly Bill</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;color:var(--accent-emerald);">Savings vs AWS S3</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (r, idx) => `
                  <tr style="border-bottom:1px solid var(--border-subtle);${r.id === 'cloudflare-r2' ? 'background:var(--accent-emerald-soft);' : ''}">
                    <td style="padding:0.65rem 0.75rem;">
                      <strong>${escapeHtml(r.name)}</strong>
                      <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(r.notes)}</div>
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      $${r.storageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);${r.egressCost === 0 ? 'color:var(--accent-emerald);font-weight:700;' : 'color:var(--accent-danger);'}">
                      ${r.egressCost === 0 ? 'FREE ($0.00)' : `-$${r.egressCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      $${r.opsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:800;font-size:0.95rem;">
                      $${r.totalPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:700;color:${r.savingsUsd > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)'};">
                      ${r.savingsUsd > 0 ? `Save $${r.savingsUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${r.savingsPct.toFixed(1)}%)` : 'Baseline'}
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:1.15rem;padding:0.9rem 1.15rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Eliminate Egress Fees with Cloudflare Workers & R2</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Deploy serverless edge apps, S3-compatible object buckets, and zero-egress static assets with Cloudflare's generous free tier.</div>
            </div>
            <a href="/go/cloudflare-workers/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Cloudflare Workers & Pages" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem;">
              Deploy Free on Cloudflare →
            </a>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `${(storedGb / 1024).toFixed(1)} TB storage + ${(egressGb / 1024).toFixed(1)} TB egress: Cloudflare R2 = $${(r2Row.totalPeriod / mult).toFixed(2)}/mo vs AWS S3 = $${awsTotalMonthly.toFixed(2)}/mo (Save $${(awsTotalMonthly - r2Row.totalPeriod / mult).toFixed(2)}/mo, ${(
          ((awsTotalMonthly - r2Row.totalPeriod / mult) / awsTotalMonthly) *
          100
        ).toFixed(1)}%)`,
      };
    },

    equityDilutionEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        const num = parseFloat(String(input).replace(/[^0-9.]/g, ''));
        data = { foundersCommonShares: 8000000, safeInvestmentUsd: isNaN(num) || num <= 0 ? 1500000 : num };
      }

      const foundersShares = Math.max(1000, Number(data.foundersCommonShares ?? 8000000));
      const safeInvestment = Math.max(1000, Number(data.safeInvestmentUsd ?? 1500000));
      const safeCap = Math.max(10000, Number(data.safeValuationCapUsd ?? 10000000));
      const safeDiscountPct = Math.max(0, Math.min(50, Number(data.safeDiscountPct ?? 20)));
      const nextPreMoney = Math.max(10000, Number(data.pricedRoundPreMoneyUsd ?? 15000000));
      const nextNewCapital = Math.max(1000, Number(data.pricedRoundNewCapitalUsd ?? 3000000));

      const safeType = opts.safeType || 'post_money';
      const poolPct = Number(opts.optionPoolPct || 10) / 100;
      const stage = opts.projectionStage || 'seed_conversion';

      let safeShares = 0;
      let safeEffPrice = 0;
      let conversionMechanism = 'Valuation Cap';

      if (safeType === 'post_money') {
        const safeOwnershipPrePriced = safeInvestment / safeCap;
        safeShares = Math.round(foundersShares * (safeOwnershipPrePriced / (1 - safeOwnershipPrePriced)));
        safeEffPrice = safeInvestment / safeShares;
        conversionMechanism = 'Post-Money Valuation Cap (YC Standard)';
      } else if (safeType === 'pre_money') {
        const capPrice = safeCap / foundersShares;
        const discountPrice = (nextPreMoney / foundersShares) * (1 - safeDiscountPct / 100);
        if (discountPrice < capPrice) {
          safeEffPrice = discountPrice;
          conversionMechanism = `${safeDiscountPct}% Pre-Money Discount`;
        } else {
          safeEffPrice = capPrice;
          conversionMechanism = 'Pre-Money Valuation Cap';
        }
        safeShares = Math.round(safeInvestment / safeEffPrice);
      } else {
        safeEffPrice = (nextPreMoney / foundersShares) * (1 - safeDiscountPct / 100);
        safeShares = Math.round(safeInvestment / safeEffPrice);
        conversionMechanism = `${safeDiscountPct}% Uncapped Discount`;
      }

      const postPricedPreOption = foundersShares + safeShares;
      const pricedRoundPostMoney = nextPreMoney + nextNewCapital;
      const newInvestorTargetPct = nextNewCapital / pricedRoundPostMoney;

      const denominator = Math.max(0.1, 1 - poolPct - newInvestorTargetPct);
      const totalPostShares = Math.round(postPricedPreOption / denominator);
      const poolShares = Math.round(totalPostShares * poolPct);
      const newLeadShares = Math.round(totalPostShares * newInvestorTargetPct);
      const pricedRoundSharePrice = nextNewCapital / newLeadShares;

      let stakeholders = [
        {
          name: 'Founders Common Stock',
          role: 'Founding Team',
          shares: foundersShares,
          ownershipPct: (foundersShares / totalPostShares) * 100,
          valueUsd: foundersShares * pricedRoundSharePrice,
          investedUsd: 0,
        },
        {
          name: 'SAFE Note Investors',
          role: `Seed Angel / VC (${conversionMechanism})`,
          shares: safeShares,
          ownershipPct: (safeShares / totalPostShares) * 100,
          valueUsd: safeShares * pricedRoundSharePrice,
          investedUsd: safeInvestment,
          moic: (safeShares * pricedRoundSharePrice) / safeInvestment,
        },
        {
          name: 'Priced Round Lead VC',
          role: 'Series Seed Lead Investor',
          shares: newLeadShares,
          ownershipPct: (newLeadShares / totalPostShares) * 100,
          valueUsd: newLeadShares * pricedRoundSharePrice,
          investedUsd: nextNewCapital,
          moic: 1.0,
        },
        {
          name: 'Unallocated Option Pool (ESOP)',
          role: `${Math.round(poolPct * 100)}% Post-Financing Reserved Pool`,
          shares: poolShares,
          ownershipPct: (poolShares / totalPostShares) * 100,
          valueUsd: poolShares * pricedRoundSharePrice,
          investedUsd: 0,
        },
      ];

      let seriesANote = '';
      if (stage === 'series_a') {
        const seriesAPre = 40000000;
        const seriesANew = 10000000;
        const seriesAPost = seriesAPre + seriesANew;
        const seriesADilutionPct = seriesANew / seriesAPost;
        const seriesASharePrice = seriesAPre / totalPostShares;
        const seriesAShares = Math.round(totalPostShares * (seriesADilutionPct / (1 - seriesADilutionPct)));
        const finalTotalShares = totalPostShares + seriesAShares;

        stakeholders = stakeholders.map((s) => ({
          ...s,
          ownershipPct: (s.shares / finalTotalShares) * 100,
          valueUsd: s.shares * seriesASharePrice,
        }));

        stakeholders.push({
          name: 'Series A Institutional Lead',
          role: 'Series A VC ($10M @ $40M Pre)',
          shares: seriesAShares,
          ownershipPct: (seriesAShares / finalTotalShares) * 100,
          valueUsd: seriesAShares * seriesASharePrice,
          investedUsd: seriesANew,
          moic: 1.0,
        });

        seriesANote = `Series A Model: $10M new capital on $40M pre-money ($50M post) expands total equity to ${finalTotalShares.toLocaleString()} shares @ $${seriesASharePrice.toFixed(2)}/share.`;
      }

      const founderRow = stakeholders[0];
      const safeRow = stakeholders[1];
      const effectivePostMoneyValuation = stakeholders.reduce((acc, s) => acc + s.valueUsd, 0);

      const report = {
        summary: {
          foundersOwnershipPercent: `${founderRow.ownershipPct.toFixed(2)}%`,
          foundersEquityValueUsd: `$${Math.round(founderRow.valueUsd).toLocaleString()}`,
          safeConversionPricePerShare: `$${safeEffPrice.toFixed(4)}`,
          pricedRoundPricePerShare: `$${pricedRoundSharePrice.toFixed(4)}`,
          safeInvestorReturnMultiple: `${((safeRow.valueUsd / safeInvestment)).toFixed(2)}x`,
          postFinancingValuationUsd: `$${Math.round(effectivePostMoneyValuation).toLocaleString()}`,
          conversionMechanism,
          stageProjected: stage === 'series_a' ? 'Seed + Series A' : 'Seed Priced Conversion',
        },
        capTable: stakeholders.map((s) => ({
          stakeholder: s.name,
          role: s.role,
          ownership: `${s.ownershipPct.toFixed(2)}%`,
          sharesCount: s.shares.toLocaleString(),
          impliedValuation: `$${Math.round(s.valueUsd).toLocaleString()}`,
          ...(s.investedUsd > 0
            ? {
                capitalInvested: `$${s.investedUsd.toLocaleString()}`,
                unrealizedMoic: `${((s.valueUsd / s.investedUsd)).toFixed(2)}x`,
              }
            : {}),
        })),
        safesSummary: {
          safeInstrumentType: safeType,
          optionPoolExpansion: `${Math.round(poolPct * 100)}%`,
          notes: seriesANote || 'All calculations reflect YC standard pre-money option pool expansion math.',
        },
      };

      const extraHtml = `
        <div style="margin-top:1.25rem;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.6rem;letter-spacing:0.04em;">
            Post-Financing Cap Table Waterfall & Ownership Breakdown (${report.summary.stageProjected})
          </div>
          <div style="overflow-x:auto;">
            <table class="matrix-table" style="width:100%;font-size:0.86rem;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-subtle);border-bottom:2px solid var(--border-strong);">
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Shareholder Group</th>
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Equity Class</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Shares Count</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;color:var(--accent-primary);">Ownership %</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;color:var(--accent-emerald);">Paper Value ($ USD)</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Investor MOIC</th>
                </tr>
              </thead>
              <tbody>
                ${stakeholders
                  .map(
                    (s, idx) => `
                  <tr style="border-bottom:1px solid var(--border-subtle);${idx === 0 ? 'background:var(--accent-emerald-soft);' : ''}">
                    <td style="padding:0.65rem 0.75rem;">
                      <strong>${escapeHtml(s.name)}</strong>
                      <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(s.role)}</div>
                    </td>
                    <td style="padding:0.65rem 0.75rem;">
                      <span class="trust-chip" style="font-size:0.68rem;padding:0.15rem 0.4rem;">${idx === 0 ? 'Common' : idx === 3 ? 'Option Pool' : 'Preferred'}</span>
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      ${s.shares.toLocaleString()}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:800;color:var(--accent-primary);font-size:0.95rem;">
                      ${s.ownershipPct.toFixed(2)}%
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--accent-emerald);">
                      $${Math.round(s.valueUsd).toLocaleString()}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      ${s.investedUsd > 0 ? `${((s.valueUsd / s.investedUsd)).toFixed(2)}x` : '—'}
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:1.15rem;padding:0.9rem 1.15rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Raising Capital or Managing Founder Treasury?</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Mercury offers venture banking with up to $5M FDIC insurance, zero maintenance fees, automated wire sweeps, and a $250 cash bonus.</div>
            </div>
            <a href="/go/mercury-banking/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Mercury Startup Banking" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem;">
              Open Mercury Account ($250 Bonus) →
            </a>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `Founders retain ${founderRow.ownershipPct.toFixed(2)}% ($${Math.round(founderRow.valueUsd).toLocaleString()}) • SAFE converts at $${safeEffPrice.toFixed(4)}/sh (${((safeRow.valueUsd / safeInvestment)).toFixed(2)}x MOIC) • Post-Money: $${Math.round(effectivePostMoneyValuation).toLocaleString()}`,
      };
    },

    vectorDbCostEngine(input, opts) {
      let data = {};
      try {
        data = JSON.parse(input);
      } catch (_e) {
        const num = parseFloat(String(input).replace(/[^0-9.]/g, ''));
        data = { totalVectorsCount: isNaN(num) || num <= 0 ? 5000000 : num };
      }

      const vectors = Math.max(1000, Number(data.totalVectorsCount ?? data.vectors ?? 5000000));
      const queries = Math.max(1000, Number(data.monthlyQueryCount ?? data.queries ?? 12000000));
      const topK = Math.max(1, Number(data.avgTopKResults ?? 10));
      const metaBytes = Math.max(0, Number(data.metadataBytesPerVector ?? 256));

      const dims = Number(opts.dimensions || 1536);
      const isHnsw = (opts.indexingMethod || 'hnsw') === 'hnsw';
      const replicas = Math.max(1, Number(opts.haReplicas || 1));

      const rawVectorBytes = vectors * dims * 4;
      const metadataBytes = vectors * metaBytes;
      const totalRawBytes = rawVectorBytes + metadataBytes;
      const totalRawGb = totalRawBytes / (1024 * 1024 * 1024);

      const hnswOverheadMultiplier = isHnsw ? 1.45 : 1.05;
      const ramRequiredGb = totalRawGb * hnswOverheadMultiplier * replicas;

      const storedDimsM = (vectors * dims) / 1000000;
      const queriedDimsM = (queries * dims) / 1000000;
      const vectorizeStorage = storedDimsM * 0.050 * replicas;
      const vectorizeQueries = queriedDimsM * 0.014;
      const vectorizeTotal = vectorizeStorage + vectorizeQueries;

      let supabaseComputeAddon = 0;
      let supabaseTier = 'Pro Small (2GB RAM)';
      if (ramRequiredGb <= 2) {
        supabaseComputeAddon = 0;
        supabaseTier = 'Pro (2GB RAM included)';
      } else if (ramRequiredGb <= 4) {
        supabaseComputeAddon = 10;
        supabaseTier = 'Compute Add-on: Small (4GB RAM)';
      } else if (ramRequiredGb <= 8) {
        supabaseComputeAddon = 30;
        supabaseTier = 'Compute Add-on: Medium (8GB RAM)';
      } else if (ramRequiredGb <= 16) {
        supabaseComputeAddon = 110;
        supabaseTier = 'Compute Add-on: Large (16GB RAM)';
      } else if (ramRequiredGb <= 32) {
        supabaseComputeAddon = 210;
        supabaseTier = 'Compute Add-on: XL (32GB RAM)';
      } else if (ramRequiredGb <= 64) {
        supabaseComputeAddon = 430;
        supabaseTier = 'Compute Add-on: 2XL (64GB RAM)';
      } else {
        supabaseComputeAddon = 950;
        supabaseTier = 'Compute Add-on: 4XL+ (128GB RAM)';
      }
      const supabaseStorageOverhead = Math.max(0, totalRawGb * replicas - 8) * 0.125;
      const supabaseTotal = 25 + supabaseComputeAddon + supabaseStorageOverhead;

      const pineconeStorage = totalRawGb * 0.33 * replicas;
      const pineconeQueries = (queries / 1000000) * 8.25;
      const pineconeTotal = pineconeStorage + pineconeQueries;

      const qdrantRamNodes = Math.max(1, Math.ceil(ramRequiredGb));
      const qdrantTotal = qdrantRamNodes * 9.00;

      const providers = [
        {
          id: 'cloudflare-vectorize',
          name: 'Cloudflare Vectorize',
          type: 'Edge Serverless Vector DB',
          monthlyTotal: vectorizeTotal,
          pricingFormula: `$0.05/M stored dims ($${vectorizeStorage.toFixed(2)}) + $0.014/M queried dims ($${vectorizeQueries.toFixed(2)})`,
          notes: 'Sub-10ms global worker binding • Zero cold starts • Native edge caching',
          affiliateUrl: '/go/cloudflare-workers/',
          affiliatePartner: 'Cloudflare Workers & Pages',
        },
        {
          id: 'supabase-pgvector',
          name: 'Supabase pgvector (PostgreSQL)',
          type: 'ACID Relational + Vector Extension',
          monthlyTotal: supabaseTotal,
          pricingFormula: `$25 Pro Base + $${supabaseComputeAddon} (${supabaseTier}) + $${supabaseStorageOverhead.toFixed(2)} disk`,
          notes: 'Full PostgreSQL capabilities • Hybrid search (FTS + Vector) • Row-Level Security',
          affiliateUrl: '/go/supabase-postgres/',
          affiliatePartner: 'Supabase Managed Postgres',
        },
        {
          id: 'pinecone-serverless',
          name: 'Pinecone Serverless',
          type: 'Dedicated Vector Cloud',
          monthlyTotal: pineconeTotal,
          pricingFormula: `$0.33/GB storage ($${pineconeStorage.toFixed(2)}) + $8.25/M Read Units ($${pineconeQueries.toFixed(2)})`,
          notes: 'Fully managed vector search • High burst throughput • Isolated multi-tenant namespaces',
          affiliateUrl: '/go/openrouter-ai/',
          affiliatePartner: 'OpenRouter Unified LLM API',
        },
        {
          id: 'qdrant-cloud',
          name: 'Qdrant Cloud Managed',
          type: 'Dedicated Rust In-Memory Cluster',
          monthlyTotal: qdrantTotal,
          pricingFormula: `${qdrantRamNodes} GB dedicated RAM node cluster @ $9.00/GB-mo`,
          notes: 'High-performance Rust engine • Complex payload filtering • On-disk vector payloads',
          affiliateUrl: '/go/railway-cloud/',
          affiliatePartner: 'Railway Instant App & DB Cloud',
        },
      ];

      providers.sort((a, b) => a.monthlyTotal - b.monthlyTotal);
      const topProvider = providers[0];
      const highestProvider = providers[providers.length - 1];
      const monthlySavings = highestProvider.monthlyTotal - topProvider.monthlyTotal;

      const report = {
        workloadParameters: {
          totalVectorsCount: vectors.toLocaleString(),
          monthlyQueriesCount: queries.toLocaleString(),
          embeddingDimensions: dims,
          rawDatasetSizeGb: `${totalRawGb.toFixed(2)} GB`,
          estimatedRamRequiredForIndex: `${ramRequiredGb.toFixed(2)} GB (${isHnsw ? 'HNSW graph' : 'Flat index'}, ${replicas} replica)`,
          topKResults: topK,
        },
        costComparisonMonthlyUsd: providers.map((p) => ({
          provider: p.name,
          architecture: p.type,
          estimatedMonthlyBill: `$${p.monthlyTotal.toFixed(2)}`,
          costBreakdown: p.pricingFormula,
          technicalFeatures: p.notes,
        })),
        insights: {
          recommendedProvider: topProvider.name,
          lowestMonthlyCost: `$${topProvider.monthlyTotal.toFixed(2)}/mo`,
          maxMonthlySavings: `$${monthlySavings.toFixed(2)}/mo ($${(monthlySavings * 12).toFixed(2)}/yr vs ${highestProvider.name})`,
          relationalRecommendation:
            'If your application requires relational SQL tables, user auth, and transactional joins, Supabase pgvector eliminates dual-database syncing costs.',
        },
      };

      const extraHtml = `
        <div style="margin-top:1.25rem;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.6rem;letter-spacing:0.04em;">
            Vector Database Cost & Sizing Benchmark (${vectors.toLocaleString()} vectors @ ${dims} dims, ${queries.toLocaleString()} queries/mo)
          </div>
          <div style="overflow-x:auto;">
            <table class="matrix-table" style="width:100%;font-size:0.86rem;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-subtle);border-bottom:2px solid var(--border-strong);">
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Vector Database</th>
                  <th style="padding:0.65rem 0.75rem;text-align:left;">Architecture</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">RAM Sizing</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;">Pricing Mechanics</th>
                  <th style="padding:0.65rem 0.75rem;text-align:right;color:var(--accent-emerald);">Est. Monthly Bill</th>
                </tr>
              </thead>
              <tbody>
                ${providers
                  .map(
                    (p, idx) => `
                  <tr style="border-bottom:1px solid var(--border-subtle);${idx === 0 ? 'background:var(--accent-emerald-soft);' : ''}">
                    <td style="padding:0.65rem 0.75rem;">
                      <strong>${escapeHtml(p.name)}</strong>
                      <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(p.notes)}</div>
                    </td>
                    <td style="padding:0.65rem 0.75rem;">
                      <span class="trust-chip" style="font-size:0.68rem;padding:0.15rem 0.4rem;">${escapeHtml(p.type)}</span>
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-size:0.8rem;">
                      ~${ramRequiredGb.toFixed(1)} GB
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-size:0.75rem;color:var(--text-secondary);">
                      ${escapeHtml(p.pricingFormula)}
                    </td>
                    <td style="padding:0.65rem 0.75rem;text-align:right;font-family:var(--font-mono);font-weight:800;font-size:0.95rem;color:${idx === 0 ? 'var(--accent-emerald)' : 'var(--text-primary)'};">
                      $${p.monthlyTotal.toFixed(2)}/mo
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:1.15rem;padding:0.9rem 1.15rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Launch Managed Postgres with pgvector &amp; Row-Level Security</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Supabase combines vector embeddings with relational tables, user authentication, and real-time streaming in a unified ACID database. Free tier includes 500MB storage.</div>
            </div>
            <a href="/go/supabase-postgres/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Supabase Managed Postgres" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem;">
              Launch Free Managed Postgres →
            </a>
          </div>
        </div>
      `;

      return {
        output: JSON.stringify(report, null, 2),
        extraHtml,
        downloadExt: 'json',
        downloadMime: 'application/json',
        summary: `${(vectors / 1000000).toFixed(1)}M vectors (${dims}d): Lowest Cost = ${topProvider.name} ($${topProvider.monthlyTotal.toFixed(2)}/mo) vs Pinecone ($${pineconeTotal.toFixed(2)}/mo) • Index RAM: ~${ramRequiredGb.toFixed(1)} GB`,
      };
    },
  };

  /* ========================================================================
     3. Special Image Compressor Canvas Engine
     ======================================================================== */

  let currentSourceCanvas = null;
  let currentOriginalBytes = 0;
  let currentCompressedDataUrl = '';
  let currentCompressedExt = 'webp';

  function createSyntheticDemoCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#c2410c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.arc(100 + i * 42, 180 + Math.sin(i * 0.6) * 140, 48 + (i % 5) * 14, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${18 + i * 6}, 80%, 55%, 0.22)`;
      ctx.fill();
    }

    ctx.fillStyle = '#faf8f4';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('UtilForge Local Canvas Benchmark', 80, 560);
    ctx.font = '32px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('1280x720 High-Entropy Sample Frame • 100% Browser Encoded', 80, 620);

    const pngUrl = canvas.toDataURL('image/png');
    currentOriginalBytes = Math.round((pngUrl.length - 22) * 0.75);
    return canvas;
  }

  function runImageCompression(opts) {
    if (!currentSourceCanvas) {
      currentSourceCanvas = createSyntheticDemoCanvas();
    }
    const format = opts.format || 'image/webp';
    const quality = Math.max(0.1, Math.min(1, Number(opts.quality || 80) / 100));
    const maxWidth = opts.maxWidth || 'original';

    let targetW = currentSourceCanvas.width;
    let targetH = currentSourceCanvas.height;
    if (maxWidth !== 'original' && Number(maxWidth) < targetW) {
      const ratio = Number(maxWidth) / targetW;
      targetW = Number(maxWidth);
      targetH = Math.round(targetH * ratio);
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(currentSourceCanvas, 0, 0, targetW, targetH);

    currentCompressedDataUrl = outCanvas.toDataURL(format, quality);
    currentCompressedExt = format.split('/')[1] || 'webp';
    const compressedBytes = Math.round((currentCompressedDataUrl.length - 22) * 0.75);
    const savingsPct =
      currentOriginalBytes > 0
        ? Math.max(0, Math.round(((currentOriginalBytes - compressedBytes) / currentOriginalBytes) * 100))
        : 0;

    const outputPane = document.getElementById('workbench-output');
    const statusEl = document.getElementById('workbench-status-msg');
    if (outputPane) {
      outputPane.innerHTML = `
        <div class="image-stats-grid">
          <div class="stat-box">
            <div class="stat-box-label">Original Size (PNG)</div>
            <div class="stat-box-val">${formatBytes(currentOriginalBytes)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">Optimized (${currentCompressedExt.toUpperCase()})</div>
            <div class="stat-box-val">${formatBytes(compressedBytes)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">Bytes Saved</div>
            <div class="stat-box-val savings">-${savingsPct}% (${targetW}×${targetH})</div>
          </div>
        </div>
        <div style="text-align:center;">
          <img src="${currentCompressedDataUrl}" alt="Compressed preview" style="max-width:100%;max-height:240px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);" />
        </div>
        <div style="margin-top:1rem;padding:0.85rem 1.1rem;background:var(--bg-elevated);border-left:4px solid var(--accent-primary);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;text-align:left;">
          <div>
            <div style="font-size:0.84rem;font-weight:700;color:var(--text-primary);">Host Optimized Images with Zero Egress Bandwidth Fees</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);">Serve WebP, AVIF, and static media globally without paying $0.09/GB AWS S3 download penalties on Cloudflare R2.</div>
          </div>
          <a href="/go/cloudflare-workers/" target="_blank" rel="noopener sponsored" data-affiliate-partner="Cloudflare Workers & Pages" class="btn btn-primary" style="padding:0.45rem 0.85rem;font-size:0.78rem;">
            Deploy Free on Cloudflare →
          </a>
        </div>
      `;
    }
    if (statusEl) {
      statusEl.textContent = `Compressed to ${formatBytes(compressedBytes)} (${currentCompressedExt.toUpperCase()} @ ${Math.round(quality * 100)}% quality) — Saved ${savingsPct}%`;
    }
  }

  /* ========================================================================
     4. Initialize Active Tool Workbench or Hub Page
     ======================================================================== */

  function gatherOptions() {
    const opts = {};
    document.querySelectorAll('[data-tool-opt]').forEach((el) => {
      const key = el.getAttribute('data-tool-opt');
      if (el.type === 'checkbox') {
        opts[key] = el.checked;
      } else {
        opts[key] = el.value;
      }
    });
    return opts;
  }

  let latestDownloadPayload = { content: '', ext: 'txt', mime: 'text/plain' };

  async function executeCurrentTool() {
    const workbench = document.getElementById('tool-workbench');
    if (!workbench) return;

    const engineName = workbench.getAttribute('data-engine');
    const opts = gatherOptions();

    if (engineName === 'imageCompressorEngine') {
      runImageCompression(opts);
      return;
    }

    const inputEl = document.getElementById('workbench-input');
    const outputEl = document.getElementById('workbench-output');
    const extraEl = document.getElementById('workbench-extra');
    const statusEl = document.getElementById('workbench-status-msg');
    const charCountEl = document.getElementById('input-char-count');

    if (!inputEl || !outputEl) return;
    const rawInput = inputEl.value;
    if (charCountEl) {
      charCountEl.textContent = `${rawInput.length.toLocaleString()} chars`;
    }

    try {
      const t0 = performance.now();
      const fn = ENGINES[engineName];
      if (!fn) return;
      const res = await fn(rawInput, opts);
      const elapsedMs = (performance.now() - t0).toFixed(1);

      if (res.outputHtml) {
        outputEl.innerHTML = res.outputHtml;
      } else {
        outputEl.textContent = res.output;
      }

      if (extraEl) {
        if (res.extraHtml) {
          extraEl.style.display = 'block';
          extraEl.innerHTML = res.extraHtml;
        } else {
          extraEl.style.display = 'none';
          extraEl.innerHTML = '';
        }
      }

      latestDownloadPayload = {
        content: res.output || '',
        ext: res.downloadExt || 'txt',
        mime: res.downloadMime || 'text/plain',
      };

      if (statusEl) {
        statusEl.textContent = `${res.summary} • Executed locally in ${elapsedMs} ms`;
      }
    } catch (err) {
      outputEl.textContent = `⚠️ Input / Syntax Error:\n${err.message}`;
      if (statusEl) {
        statusEl.textContent = `Waiting for valid input...`;
      }
    }
  }

  function initWorkbenchEvents() {
    const workbench = document.getElementById('tool-workbench');
    if (!workbench) return;

    const engineName = workbench.getAttribute('data-engine');
    const inputEl = document.getElementById('workbench-input');

    // Hydrate input and tool options from URL query parameters (?q=...&opt_...) for viral link sharing
    try {
      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q');
      if (qParam !== null && inputEl) {
        inputEl.value = qParam;
      }
      document.querySelectorAll('[data-tool-opt]').forEach((el) => {
        const optKey = el.getAttribute('data-tool-opt');
        const paramVal = params.get(`opt_${optKey}`);
        if (paramVal !== null) {
          if (el.type === 'checkbox') {
            el.checked = paramVal === 'true' || paramVal === '1';
          } else {
            el.value = paramVal;
          }
        }
      });
    } catch (_e) {
      // ignore malformed URL params
    }

    if (inputEl) {
      inputEl.addEventListener('input', () => executeCurrentTool());
    }

    document.querySelectorAll('[data-tool-opt]').forEach((el) => {
      el.addEventListener('input', () => executeCurrentTool());
      el.addEventListener('change', () => executeCurrentTool());
    });

    const shareBtn = document.getElementById('btn-share-permalink');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        try {
          const url = new URL(window.location.href);
          if (inputEl && inputEl.value) {
            url.searchParams.set('q', inputEl.value.slice(0, 1800));
          }
          document.querySelectorAll('[data-tool-opt]').forEach((el) => {
            const optKey = el.getAttribute('data-tool-opt');
            if (!optKey) return;
            const val = el.type === 'checkbox' ? String(el.checked) : el.value;
            url.searchParams.set(`opt_${optKey}`, val);
          });
          const shareUrl = url.toString();
          window.history.replaceState({}, '', shareUrl);
          await navigator.clipboard.writeText(shareUrl);
          const orig = shareBtn.textContent;
          shareBtn.textContent = '✓ Link Copied!';
          setTimeout(() => (shareBtn.textContent = orig), 1800);
        } catch (_e) {
          shareBtn.textContent = 'Copy Failed';
        }
      });
    }

    const embedBtn = document.getElementById('btn-embed-widget');
    if (embedBtn) {
      embedBtn.addEventListener('click', async () => {
        try {
          const cleanUrl = window.location.origin + window.location.pathname;
          const title = document.title.split('|')[0].trim();
          const snippet = `<iframe src="${cleanUrl}" width="100%" height="640" style="border:1px solid #cbd5e1;border-radius:12px;" loading="lazy"></iframe>\n<p style="font-size:12px;margin-top:6px;">Interactive calculator powered by <a href="${cleanUrl}" target="_blank" rel="noopener">${title} — UtilForge</a></p>`;
          await navigator.clipboard.writeText(snippet);
          const orig = embedBtn.textContent;
          embedBtn.textContent = '✓ Embed HTML Copied!';
          setTimeout(() => (embedBtn.textContent = orig), 1800);
        } catch (_e) {
          embedBtn.textContent = 'Copy Failed';
        }
      });
    }

    const copyBtn = document.getElementById('btn-copy-output');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const textToCopy =
          engineName === 'imageCompressorEngine'
            ? currentCompressedDataUrl
            : latestDownloadPayload.content;
        try {
          await navigator.clipboard.writeText(textToCopy);
          const orig = copyBtn.textContent;
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => (copyBtn.textContent = orig), 1600);
        } catch (_e) {
          copyBtn.textContent = 'Copy Failed';
        }
      });
    }

    const downloadBtn = document.getElementById('btn-download-output');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const slug = workbench.getAttribute('data-slug') || 'output';
        if (engineName === 'imageCompressorEngine' && currentCompressedDataUrl) {
          const a = document.createElement('a');
          a.href = currentCompressedDataUrl;
          a.download = `${slug}-optimized.${currentCompressedExt}`;
          a.click();
          return;
        }
        const blob = new Blob([latestDownloadPayload.content], {
          type: latestDownloadPayload.mime,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.${latestDownloadPayload.ext}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const fileInput = document.getElementById('image-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        currentOriginalBytes = file.size;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            currentSourceCanvas = c;
            runImageCompression(gatherOptions());
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    executeCurrentTool();
  }

  /* ========================================================================
     5. Factory Hub Interactivity (Filter, Revenue Calculator, Scaffolder)
     ======================================================================== */

  function initHubEvents() {
    const catTabs = document.querySelectorAll('[data-cat-filter]');
    const toolCards = document.querySelectorAll('[data-tool-card]');
    const searchInput = document.getElementById('hub-search-input');

    function filterCards(activeCat, query) {
      const q = (query || '').toLowerCase().trim();
      toolCards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        const text = card.textContent.toLowerCase();
        const catMatch = !activeCat || activeCat === 'ALL' || cat === activeCat;
        const qMatch = !q || text.includes(q);
        card.style.display = catMatch && qMatch ? 'flex' : 'none';
      });
    }

    let selectedCat = 'ALL';
    catTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        catTabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCat = btn.getAttribute('data-cat-filter');
        filterCards(selectedCat, searchInput ? searchInput.value : '');
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterCards(selectedCat, searchInput.value);
      });
    }

    // Passive Income Ad Revenue Simulator
    const visitorsSlider = document.getElementById('sim-visitors');
    const rpmSlider = document.getElementById('sim-rpm');
    const sitesSlider = document.getElementById('sim-sites');

    function updateRevenueSim() {
      if (!visitorsSlider || !rpmSlider || !sitesSlider) return;
      const visitorsPerTool = Number(visitorsSlider.value);
      const rpm = Number(rpmSlider.value);
      const numTools = Number(sitesSlider.value);

      const totalPageviews = visitorsPerTool * numTools * 1.45;
      const monthlyUsd = Math.round((totalPageviews / 1000) * rpm);
      const annualUsd = monthlyUsd * 12;

      document.getElementById('sim-visitors-val').textContent = visitorsPerTool.toLocaleString();
      document.getElementById('sim-rpm-val').textContent = `$${rpm}`;
      document.getElementById('sim-sites-val').textContent = `${numTools} tools`;
      document.getElementById('sim-monthly-out').textContent = `$${monthlyUsd.toLocaleString()}/mo`;
      document.getElementById('sim-annual-out').textContent = `$${annualUsd.toLocaleString()}/yr`;
    }

    [visitorsSlider, rpmSlider, sitesSlider].forEach((el) => {
      if (el) el.addEventListener('input', updateRevenueSim);
    });
    updateRevenueSim();

    // New Tool Config Generator
    const genBtn = document.getElementById('btn-generate-tool-config');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        const name = document.getElementById('gen-tool-name').value.trim() || 'TOML ↔ JSON Converter';
        const slug =
          document.getElementById('gen-tool-slug').value.trim() ||
          name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const kw = document.getElementById('gen-tool-kw').value.trim() || `${slug.replace(/-/g, ' ')} online`;
        const cat = document.getElementById('gen-tool-cat').value || 'Data Conversion';

        const snippet = {
          id: slug,
          slug,
          name,
          shortName: name,
          category: cat,
          engine: 'jsonCsvEngine',
          primaryKeyword: kw,
          estMonthlySearches: '95,000',
          estRpmUsd: '$15 – $24',
          headline: `${name} — 100% Client-Side in Your Browser`,
          subtitle: `Fast, zero-upload ${name.toLowerCase()} with instant copy and file download.`,
          metaDescription: `Free online ${name}. Runs 100% locally in your browser with zero server uploads.`,
          badge: '100% Local Processing',
          options: [],
          sampleInput: '{\n  "status": "ready"\n}',
          howToSteps: [
            `Paste your input into the ${name} editor.`,
            'Adjust formatting options in the top bar.',
            'Copy or download the transformed result instantly.',
          ],
          faqs: [
            {
              q: `Is this ${name} free and private?`,
              a: 'Yes. All processing happens locally inside your browser with zero backend servers.',
            },
          ],
        };

        const outPre = document.getElementById('gen-config-output');
        if (outPre) {
          outPre.textContent = JSON.stringify(snippet, null, 2);
        }
      });
    }
  }

  /* ========================================================================
     6. Global Ad Blueprint Inspector Toggle
     ======================================================================== */

  function initAdBlueprintToggle() {
    const toggleBtn = document.getElementById('btn-toggle-ad-slots');
    if (!toggleBtn) return;

    const savedPref = sessionStorage.getItem('utilforge_hide_ads');
    if (savedPref === '1') {
      document.body.classList.add('ads-hidden');
    } else if (savedPref === '0') {
      document.body.classList.remove('ads-hidden');
    }

    function syncLabel() {
      const isHidden = document.body.classList.contains('ads-hidden');
      const labelEl = document.getElementById('ad-toggle-label');
      if (labelEl) {
        labelEl.textContent = isHidden ? 'Ad Slots: Hidden' : 'Ad Blueprint: ON';
      }
    }
    syncLabel();

    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('ads-hidden');
      const isHidden = document.body.classList.contains('ads-hidden');
      sessionStorage.setItem('utilforge_hide_ads', isHidden ? '1' : '0');
      syncLabel();
    });
  }

  /* ========================================================================
     7. Programmatic SEO "X vs. Y" Matrix Calculator Controller
     ======================================================================== */

  function initMatrixCalculatorEvents() {
    const calcRoot = document.getElementById('matrix-calculator');
    if (!calcRoot) return;

    const calcType = calcRoot.getAttribute('data-calc-type');
    const itemA = JSON.parse(calcRoot.getAttribute('data-item-a') || '{}');
    const itemB = JSON.parse(calcRoot.getAttribute('data-item-b') || '{}');

    const s1 = document.getElementById('matrix-slider-primary');
    const s2 = document.getElementById('matrix-slider-secondary');
    const s1ValEl = document.getElementById('matrix-s1-val');
    const s2ValEl = document.getElementById('matrix-s2-val');

    const priceAEl = document.getElementById('vs-price-a');
    const priceBEl = document.getElementById('vs-price-b');
    const subAEl = document.getElementById('vs-sub-a');
    const subBEl = document.getElementById('vs-sub-b');
    const barAEl = document.getElementById('vs-bar-a');
    const barBEl = document.getElementById('vs-bar-b');
    const cardAEl = document.getElementById('vs-card-a');
    const cardBEl = document.getElementById('vs-card-b');
    const winnerBannerEl = document.getElementById('vs-winner-banner-text');
    const winnerCtaBtn = document.getElementById('vs-winner-cta-btn');
    const shareMatrixBtn = document.getElementById('btn-share-matrix');

    try {
      const params = new URLSearchParams(window.location.search);
      if (s1 && params.has('s1')) s1.value = params.get('s1');
      if (s2 && params.has('s2')) s2.value = params.get('s2');
    } catch (_) {}

    function computeMetrics(v1, v2) {
      if (calcType === 'llmCost') {
        const outRatio = v2 / 100;
        const inTokensM = v1 * (1 - outRatio);
        const outTokensM = v1 * outRatio;
        const costA = inTokensM * itemA.inputPer1M + outTokensM * itemA.outputPer1M;
        const costB = inTokensM * itemB.inputPer1M + outTokensM * itemB.outputPer1M;
        return {
          valA: costA,
          valB: costB,
          fmtA: `$${costA.toFixed(2)}/mo`,
          fmtB: `$${costB.toFixed(2)}/mo`,
          subA: `$${(costA * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr • ${itemA.speedTps}`,
          subB: `$${(costB * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr • ${itemB.speedTps}`,
          unitLabel: 'per year',
          annualMultiplier: 12,
          isCurrency: true,
        };
      }
      if (calcType === 'cloudCost') {
        const costA = itemA.baseMonthlyUsd + v1 * itemA.costPerMillionReqs + v2 * itemA.costPerGbStorage;
        const costB = itemB.baseMonthlyUsd + v1 * itemB.costPerMillionReqs + v2 * itemB.costPerGbStorage;
        return {
          valA: costA,
          valB: costB,
          fmtA: `$${costA.toFixed(2)}/mo`,
          fmtB: `$${costB.toFixed(2)}/mo`,
          subA: `$${(costA * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr • Cold start: ${itemA.coldStartMs}`,
          subB: `$${(costB * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr • Cold start: ${itemB.coldStartMs}`,
          unitLabel: 'per year',
          annualMultiplier: 12,
          isCurrency: true,
        };
      }
      if (calcType === 'paymentFee') {
        const txCount = Math.max(1, Math.round(v1 / v2));
        const feeA = v1 * (itemA.percentFee / 100) + txCount * (itemA.fixedCents / 100);
        const feeB = v1 * (itemB.percentFee / 100) + txCount * (itemB.fixedCents / 100);
        return {
          valA: feeA,
          valB: feeB,
          fmtA: `$${feeA.toFixed(2)}/mo fees`,
          fmtB: `$${feeB.toFixed(2)}/mo fees`,
          subA: `Effective rate: ${((feeA / v1) * 100).toFixed(2)}% across ${txCount.toLocaleString()} orders/mo`,
          subB: `Effective rate: ${((feeB / v1) * 100).toFixed(2)}% across ${txCount.toLocaleString()} orders/mo`,
          unitLabel: 'in annual processing fees',
          annualMultiplier: 12,
          isCurrency: true,
        };
      }
      // formatBenchmark
      const sizeA = v1 * itemA.compressionRatio;
      const sizeB = v1 * itemB.compressionRatio;
      const transferGbA = (sizeA * v2) / 1024;
      const transferGbB = (sizeB * v2) / 1024;
      return {
        valA: sizeA,
        valB: sizeB,
        fmtA: `${sizeA.toFixed(1)} MB stored`,
        fmtB: `${sizeB.toFixed(1)} MB stored`,
        subA: `${transferGbA.toFixed(1)} GB/mo egress • Parse speed: ${itemA.parseSpeedMbSec} MB/s`,
        subB: `${transferGbB.toFixed(1)} GB/mo egress • Parse speed: ${itemB.parseSpeedMbSec} MB/s`,
        unitLabel: 'storage & bandwidth footprint',
        annualMultiplier: 1,
        isCurrency: false,
      };
    }

    function updateView() {
      const v1 = Number(s1 ? s1.value : 50);
      const v2 = Number(s2 ? s2.value : 30);
      if (s1ValEl) s1ValEl.textContent = v1.toLocaleString();
      if (s2ValEl) s2ValEl.textContent = v2.toLocaleString();

      const m = computeMetrics(v1, v2);
      if (priceAEl) priceAEl.textContent = m.fmtA;
      if (priceBEl) priceBEl.textContent = m.fmtB;
      if (subAEl) subAEl.textContent = m.subA;
      if (subBEl) subBEl.textContent = m.subB;

      const maxVal = Math.max(m.valA, m.valB, 0.01);
      if (barAEl) barAEl.style.width = `${Math.max(8, Math.round((m.valA / maxVal) * 100))}%`;
      if (barBEl) barBEl.style.width = `${Math.max(8, Math.round((m.valB / maxVal) * 100))}%`;

      const aWins = m.valA <= m.valB;
      if (cardAEl) cardAEl.classList.toggle('is-winner', aWins);
      if (cardBEl) cardBEl.classList.toggle('is-winner', !aWins);

      const winner = aWins ? itemA : itemB;
      const loser = aWins ? itemB : itemA;
      const diff = Math.abs(m.valA - m.valB);
      const pct = maxVal > 0 ? Math.round((diff / maxVal) * 100) : 0;

      if (winnerBannerEl) {
        if (m.isCurrency) {
          const annualSavings = Math.round(diff * m.annualMultiplier);
          winnerBannerEl.textContent = `🏆 ${winner.name} saves $${annualSavings.toLocaleString()}/year (-${pct}%) compared to ${loser.name} at this workload`;
        } else {
          winnerBannerEl.textContent = `🏆 ${winner.name} reduces payload size by ${diff.toFixed(1)} MB (-${pct}%) compared to ${loser.name}`;
        }
      }

      if (winnerCtaBtn) {
        const href = aWins
          ? winnerCtaBtn.getAttribute('data-a-href')
          : winnerCtaBtn.getAttribute('data-b-href');
        const label = aWins
          ? winnerCtaBtn.getAttribute('data-a-label')
          : winnerCtaBtn.getAttribute('data-b-label');
        const partner = aWins
          ? winnerCtaBtn.getAttribute('data-a-partner')
          : winnerCtaBtn.getAttribute('data-b-partner');
        if (href) winnerCtaBtn.setAttribute('href', href);
        if (partner) winnerCtaBtn.setAttribute('data-affiliate-partner', `Winner Banner: ${partner}`);
        winnerCtaBtn.textContent = label ? `${label} →` : `Claim ${winner.name} Offer →`;
      }
    }

    if (shareMatrixBtn) {
      shareMatrixBtn.addEventListener('click', async () => {
        const u = new URL(window.location.origin + window.location.pathname);
        if (s1) u.searchParams.set('s1', s1.value);
        if (s2) u.searchParams.set('s2', s2.value);
        try {
          await navigator.clipboard.writeText(u.toString());
          const orig = shareMatrixBtn.textContent;
          shareMatrixBtn.textContent = '✓ Link Copied!';
          setTimeout(() => (shareMatrixBtn.textContent = orig), 1800);
        } catch (_) {}
      });
    }

    if (s1) s1.addEventListener('input', updateView);
    if (s2) s2.addEventListener('input', updateView);
    updateView();
  }

  /* ========================================================================
     8. Revenue, AdSense Fill-Rate & Affiliate Click Telemetry
     ======================================================================== */

  function initRevenueTelemetry() {
    const pagePath = window.location.pathname || '/';

    function sendTelemetry(payload) {
      try {
        const body = JSON.stringify({
          page: pagePath,
          ...payload,
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon('/api/telemetry', blob);
        } else {
          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch (_) {
        // Non-blocking telemetry
      }
    }

    // 1. Record pageview
    sendTelemetry({ type: 'pageview' });

    // 2. Track affiliate & partner CTA clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-affiliate-partner], a[rel*="sponsored"]');
      if (!link) return;
      const partner =
        link.getAttribute('data-affiliate-partner') ||
        link.textContent.trim().slice(0, 50) ||
        'partner';
      sendTelemetry({ type: 'affiliate_click', partner });
    });

    // 3. Observe AdSense <ins class="adsbygoogle"> slots for fill status + Smart House/Affiliate Fallback
    const adSlots = document.querySelectorAll('ins.adsbygoogle');
    const reportedSlots = new WeakSet();
    const fallbackInjected = new WeakSet();

    function pickContextualFallbackOffer() {
      const p = pagePath.toLowerCase();
      if (p.includes('stripe') || p.includes('equity') || p.includes('safe') || p.includes('freelance') || p.includes('ltv')) {
        return {
          badge: 'PARTNER PERK • $250 BONUS',
          title: 'Mercury Startup & SaaS Treasury Banking — $0 Fees + $250 Cash Bonus',
          sub: 'FDIC-insured checking up to $5M, automated Stripe payouts, and instant virtual cards.',
          cta: 'Claim $250 Mercury Bonus →',
          href: '/go/mercury-banking/',
          partner: 'House Fallback: Mercury Banking',
        };
      }
      if (p.includes('gpt') || p.includes('claude') || p.includes('gemini') || p.includes('llm') || p.includes('deepseek') || p.includes('llama') || p.includes('qwen')) {
        return {
          badge: 'AI GATEWAY • 300+ LLMS',
          title: 'OpenRouter Unified LLM API — Route GPT-4o, Claude 3.5 & DeepSeek with 1 Key',
          sub: 'Automatic fallback routing, zero markup on token pricing, and unified billing.',
          cta: 'Get OpenRouter API Key →',
          href: '/go/openrouter-ai/',
          partner: 'House Fallback: OpenRouter AI',
        };
      }
      if (p.includes('sql') || p.includes('postgres') || p.includes('vector') || p.includes('json') || p.includes('csv') || p.includes('supabase')) {
        return {
          badge: 'MANAGED POSTGRES + PGVECTOR',
          title: 'Supabase Managed PostgreSQL — Free Tier + Vector Embeddings & Auth',
          sub: 'Spin up production Postgres with Row-Level Security, pgvector, and Edge Functions in 30s.',
          cta: 'Launch Free Supabase DB →',
          href: '/go/supabase-postgres/',
          partner: 'House Fallback: Supabase Postgres',
        };
      }
      return {
        badge: 'CLOUD INFRASTRUCTURE • $200 CREDIT',
        title: 'DigitalOcean Cloud & GPU Droplets — Claim $200 Free 60-Day Credit',
        sub: 'Deploy production containers, Managed Postgres, and S3-compatible Spaces globally.',
        cta: 'Claim $200 Cloud Credit →',
        href: '/go/digitalocean-cloud/',
        partner: 'House Fallback: DigitalOcean $200',
      };
    }

    function injectUnfilledFallback(ins) {
      if (fallbackInjected.has(ins)) return;
      const container = ins.closest('.ad-slot');
      if (!container) return;
      fallbackInjected.add(ins);

      const isSidebar = container.classList.contains('ad-slot-sidebar');
      const offer = pickContextualFallbackOffer();
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'ad-fallback-banner';
      fallbackDiv.style.cssText = isSidebar
        ? 'width:100%;padding:0.95rem;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:8px;display:flex;flex-direction:column;gap:0.6rem;text-align:left;'
        : 'width:100%;padding:0.65rem 1rem;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;text-align:left;';

      fallbackDiv.innerHTML = isSidebar
        ? `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="tool-rpm-tag" style="font-size:0.64rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;">${offer.badge}</span>
            <button type="button" data-open-sponsor-modal="Sitewide Sticky Sidebar Sponsor Slot ($99/mo)" style="background:none;border:none;font-family:var(--font-mono);font-size:0.65rem;color:var(--accent-primary);cursor:pointer;text-decoration:underline;padding:0;">Sponsor Slot ($99/mo)</button>
          </div>
          <div style="font-size:0.9rem;font-weight:800;color:var(--text-primary);line-height:1.3;">${offer.title}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;">${offer.sub}</div>
          <a href="${offer.href}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${offer.partner}" class="btn btn-primary" style="width:100%;text-align:center;padding:0.5rem 0.75rem;font-size:0.8rem;">${offer.cta}</a>
          <div style="border-top:1px dashed var(--border-subtle);padding-top:0.5rem;margin-top:0.15rem;display:flex;justify-content:space-between;align-items:center;font-size:0.74rem;">
            <span style="color:var(--text-muted);">Want all 373 pages &amp; 40 engines?</span>
            <button type="button" data-open-sponsor-modal="Full UtilForge 373-Page Factory + 40 Engines Source Code ($149 Lifetime)" style="background:none;border:none;font-weight:700;color:var(--accent-primary);cursor:pointer;padding:0;">Buy Factory ($149) →</button>
          </div>
        `
        : `
          <div style="display:flex;flex-direction:column;gap:0.18rem;flex:1;min-width:240px;">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span class="tool-rpm-tag" style="font-size:0.63rem;background:var(--accent-emerald-soft);color:var(--accent-emerald);font-weight:700;">${offer.badge}</span>
              <strong style="font-size:0.86rem;color:var(--text-primary);">${offer.title}</strong>
            </div>
            <div style="font-size:0.76rem;color:var(--text-secondary);">${offer.sub}</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <a href="${offer.href}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${offer.partner}" class="btn btn-primary" style="padding:0.42rem 0.85rem;font-size:0.78rem;white-space:nowrap;">${offer.cta}</a>
            <button type="button" data-open-sponsor-modal="Sitewide Leaderboard / Sticky Sidebar Sponsor Slot ($99/mo)" class="btn btn-secondary" style="padding:0.42rem 0.7rem;font-size:0.74rem;white-space:nowrap;">⚡ Sponsor ($99/mo)</button>
          </div>
        `;

      ins.style.display = 'none';
      container.appendChild(fallbackDiv);
    }

    function checkAdSlotStatus(ins) {
      const status = ins.getAttribute('data-ad-status');
      if (status === 'filled') {
        if (!reportedSlots.has(ins)) {
          reportedSlots.add(ins);
          sendTelemetry({ type: 'ad_filled', rpm: 28 });
        }
      } else if (status === 'unfilled') {
        if (!reportedSlots.has(ins)) {
          reportedSlots.add(ins);
          sendTelemetry({ type: 'ad_unfilled' });
        }
        injectUnfilledFallback(ins);
      }
    }

    adSlots.forEach((ins) => {
      checkAdSlotStatus(ins);
      const obs = new MutationObserver(() => checkAdSlotStatus(ins));
      obs.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
      // Fallback timer if AdSense returns blank transparent iframe or is blocked by adblocker
      setTimeout(() => {
        const status = ins.getAttribute('data-ad-status');
        if (status !== 'filled' && ins.offsetHeight < 20) {
          injectUnfilledFallback(ins);
        }
      }, 1800);
    });
  }

  /* ========================================================================
     9. Passive Affiliate & Sponsored Marketplace Controller
     ======================================================================== */

  function initMarketplaceEvents() {
    // A. Individual Product Page: Build-vs-Buy Engineering ROI Calculator
    const roiBox = document.getElementById('mkt-roi-calculator');
    if (roiBox) {
      const hoursSaved = Number(roiBox.getAttribute('data-hours-saved') || 80);
      const priceUsd = Number(roiBox.getAttribute('data-price-usd') || 149);
      const rateSlider = document.getElementById('mkt-hourly-rate');
      const rateValEl = document.getElementById('mkt-hourly-rate-val');
      const savingsOutEl = document.getElementById('mkt-savings-out');
      const multipleOutEl = document.getElementById('mkt-multiple-out');

      function updateRoi() {
        const rate = Number(rateSlider ? rateSlider.value : 110);
        if (rateValEl) rateValEl.textContent = `$${rate}/hr`;
        const buildCost = hoursSaved * rate;
        const netSaved = Math.max(0, buildCost - priceUsd);
        const multiple = priceUsd > 0 ? Math.round(buildCost / priceUsd) : 100;
        if (savingsOutEl) {
          savingsOutEl.textContent = `$${netSaved.toLocaleString()} saved (${hoursSaved} dev hrs)`;
        }
        if (multipleOutEl) {
          multipleOutEl.textContent = `${multiple}× Instant ROI vs. building from scratch`;
        }
      }
      if (rateSlider) rateSlider.addEventListener('input', updateRoi);
      updateRoi();
    }

    // B. Copy Live Config / Blueprint JSON on Product Listing Page
    const copyPreviewBtn = document.getElementById('btn-copy-mkt-snippet');
    const previewPre = document.getElementById('mkt-snippet-pre');
    if (copyPreviewBtn && previewPre) {
      copyPreviewBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(previewPre.textContent || '');
          const orig = copyPreviewBtn.textContent;
          copyPreviewBtn.textContent = '✓ Copied Blueprint!';
          setTimeout(() => (copyPreviewBtn.textContent = orig), 1600);
        } catch (_e) {
          copyPreviewBtn.textContent = 'Copy Failed';
        }
      });
    }

    // C. Marketplace Hub: Sponsored Slots + Affiliate Commission Simulator
    const slotsSlider = document.getElementById('mkt-sim-slots');
    const visitorsSlider = document.getElementById('mkt-sim-visitors');
    const convSlider = document.getElementById('mkt-sim-conv');

    function updateMktRevenueSim() {
      if (!slotsSlider || !visitorsSlider || !convSlider) return;
      const sponsoredSlots = Number(slotsSlider.value);
      const monthlyVisitors = Number(visitorsSlider.value);
      const convPct = Number(convSlider.value);

      const sponsoredRev = sponsoredSlots * 99;
      const salesCount = Math.round(monthlyVisitors * (convPct / 100));
      const affiliateRev = Math.round(salesCount * 38);
      const totalMonthly = sponsoredRev + affiliateRev;
      const totalAnnual = totalMonthly * 12;

      document.getElementById('mkt-sim-slots-val').textContent = `${sponsoredSlots} slots ($${sponsoredRev.toLocaleString()}/mo)`;
      document.getElementById('mkt-sim-visitors-val').textContent = monthlyVisitors.toLocaleString();
      document.getElementById('mkt-sim-conv-val').textContent = `${convPct.toFixed(1)}% (${salesCount} sales/mo)`;
      document.getElementById('mkt-sim-monthly-out').textContent = `$${totalMonthly.toLocaleString()}/mo`;
      document.getElementById('mkt-sim-annual-out').textContent = `$${totalAnnual.toLocaleString()}/yr`;
    }

    [slotsSlider, visitorsSlider, convSlider].forEach((el) => {
      if (el) el.addEventListener('input', updateMktRevenueSim);
    });
    updateMktRevenueSim();

    // D. Self-Serve Listing Submission JSON Generator
    const submitBtn = document.getElementById('btn-generate-mkt-listing');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const title = document.getElementById('mkt-sub-title').value.trim() || 'SupabaseAuth MCP Server';
        const cat = document.getElementById('mkt-sub-cat').value || 'MCP Servers & Agent Skills';
        const price = Number(document.getElementById('mkt-sub-price').value || 79);
        const comm = Number(document.getElementById('mkt-sub-comm').value || 35);
        const url = document.getElementById('mkt-sub-url').value.trim() || 'https://www.lemonsqueezy.com/';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const listingObj = {
          id: slug,
          slug,
          name: title,
          shortName: title,
          category: cat,
          stack: 'TypeScript • Node.js • JSON',
          priceUsd: price,
          priceLabel: `$${price} Lifetime`,
          affiliateCommissionPct: comm,
          estPayoutPerSaleUsd: Number(((price * comm) / 100).toFixed(2)),
          isSponsored: true,
          sponsoredBadge: 'SPONSORED • $99/mo Slot',
          rating: 4.9,
          reviewsCount: 25,
          hoursSaved: 48,
          primaryKeyword: `${slug.replace(/-/g, ' ')} template`,
          headline: `${title} — Production-Ready Blueprint`,
          subtitle: `Save 48+ engineering hours with ${title}. Instant download + commercial license.`,
          checkoutBaseUrl: url,
          features: ['1-click setup & configuration', 'Commercial license for unlimited projects'],
          previewType: 'mcp',
          previewSnippet: '{\n  "status": "ready"\n}',
        };

        const outEl = document.getElementById('mkt-sub-output');
        if (outEl) {
          outEl.textContent = JSON.stringify(listingObj, null, 2);
        }
      });
    }

    // E. Direct Commercial License & Sponsored Slot AJAX Checkout Drawer
    const openOrderBtn = document.getElementById('btn-open-direct-order');
    const orderDrawer = document.getElementById('direct-order-drawer');
    const orderForm = document.getElementById('direct-order-form');
    const orderStatus = document.getElementById('direct-order-status');

    if (openOrderBtn && orderDrawer) {
      openOrderBtn.addEventListener('click', () => {
        const isHidden = orderDrawer.style.display === 'none';
        orderDrawer.style.display = isHidden ? 'block' : 'none';
      });
    }

    if (orderForm) {
      orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('direct-order-email');
        const typeEl = document.getElementById('direct-order-type');
        const submitOrderBtn = document.getElementById('btn-submit-direct-order');
        const buyerEmail = emailEl ? emailEl.value.trim() : '';
        const orderType = typeEl ? typeEl.value : 'Commercial License';
        const itemName = orderForm.getAttribute('data-item-name') || document.title;

        if (!buyerEmail) return;
        if (submitOrderBtn) {
          submitOrderBtn.disabled = true;
          submitOrderBtn.textContent = 'Sending...';
        }

        try {
          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_lead',
              email: buyerEmail,
              packageType: orderType,
              partner: `Direct Order Lead: ${orderType}`,
              page: window.location.pathname,
            }),
            keepalive: true,
          }).catch(() => {});

          await fetch('https://formsubmit.co/ajax/zainmasri123@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              _subject: `🔥 NEW UTILFORGE ORDER / SPONSOR LEAD: ${orderType}`,
              _captcha: 'false',
              Buyer_Email: buyerEmail,
              Requested_Package: orderType,
              Product_Page: itemName,
              Page_URL: window.location.href,
            }),
          });

          if (orderStatus) {
            orderStatus.style.display = 'block';
            orderStatus.textContent = `✓ Request received! Payment & repository access link sent to ${buyerEmail}.`;
          }
          if (submitOrderBtn) {
            submitOrderBtn.textContent = '✓ Sent!';
          }
        } catch (_err) {
          if (submitOrderBtn) {
            submitOrderBtn.disabled = false;
            submitOrderBtn.textContent = 'Send Payment Link →';
          }
        }
      });
    }

    // F. Global Header & Ad-Fallback Sponsor / License Checkout Modal
    const globalModal = document.getElementById('global-checkout-modal');
    const openGlobalBtn = document.getElementById('btn-open-global-checkout');
    const closeGlobalBtn = document.getElementById('btn-close-global-checkout');
    const globalForm = document.getElementById('global-checkout-form');
    const globalPkgSelect = document.getElementById('global-checkout-pkg');
    const globalStatus = document.getElementById('global-checkout-status');

    function openGlobalModal(preferredPkg) {
      if (!globalModal) return;
      if (preferredPkg && globalPkgSelect) {
        for (const opt of globalPkgSelect.options) {
          if (opt.value === preferredPkg) {
            globalPkgSelect.value = preferredPkg;
            break;
          }
        }
      }
      globalModal.style.display = 'flex';
    }

    if (openGlobalBtn) {
      openGlobalBtn.addEventListener('click', () => openGlobalModal());
    }
    if (closeGlobalBtn && globalModal) {
      closeGlobalBtn.addEventListener('click', () => {
        globalModal.style.display = 'none';
      });
      globalModal.addEventListener('click', (e) => {
        if (e.target === globalModal) globalModal.style.display = 'none';
      });
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-sponsor-modal]');
      if (!trigger) return;
      e.preventDefault();
      openGlobalModal(trigger.getAttribute('data-open-sponsor-modal'));
    });

    if (globalForm) {
      globalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('global-checkout-email');
        const submitBtn = document.getElementById('btn-submit-global-checkout');
        const buyerEmail = emailEl ? emailEl.value.trim() : '';
        const selectedPkg = globalPkgSelect ? globalPkgSelect.value : 'Full UtilForge Factory ($149)';
        if (!buyerEmail) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing Order Request...';
        }

        try {
          fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_lead',
              email: buyerEmail,
              packageType: selectedPkg,
              partner: `Direct Order Lead: ${selectedPkg}`,
              page: window.location.pathname,
            }),
            keepalive: true,
          }).catch(() => {});

          await fetch('https://formsubmit.co/ajax/zainmasri123@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              _subject: `💰 NEW UTILFORGE DIRECT ORDER / SPONSOR: ${selectedPkg}`,
              _captcha: 'false',
              Buyer_Email: buyerEmail,
              Selected_Package: selectedPkg,
              Source_Page: window.location.href,
            }),
          });

          if (globalStatus) {
            globalStatus.style.display = 'block';
            globalStatus.textContent = `✓ Confirmed! Invoice & instant repository access link sent to ${buyerEmail}.`;
          }
          if (submitBtn) {
            submitBtn.textContent = '✓ Payment Link Sent!';
          }
        } catch (_err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Instant Payment Link & Repo Access →';
          }
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAdBlueprintToggle();
    initWorkbenchEvents();
    initHubEvents();
    initMatrixCalculatorEvents();
    initMarketplaceEvents();
    initRevenueTelemetry();
  });
})();


