/**
 * UtilForge Zero-Dependency Static Dev Server (`node server.js`)
 * Serves `/dist` on 0.0.0.0:4173 with clean URL resolution and ZIP download headers.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let relPath = decodeURIComponent(urlObj.pathname);

  if (relPath.endsWith('/')) {
    relPath += 'index.html';
  }

  let filePath = path.join(DIST_DIR, relPath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 — Page Not Found</h1><p><a href="/">Return to UtilForge Hub</a></p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': contentType };

  if (ext === '.zip') {
    const stat = fs.statSync(filePath);
    headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
    headers['Content-Length'] = stat.size;
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[UtilForge Server] Listening on http://zainmasri-glinux.c.googlers.com:${PORT}`);
});
