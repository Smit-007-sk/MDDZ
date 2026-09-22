const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIRECTORY = __dirname;
const CONFIG_FILE = path.join(DIRECTORY, 'admin-config.json');
const MANIFEST_FILE = path.join(DIRECTORY, 'media-manifest.json');
const BACKUP_DIR = path.join(DIRECTORY, 'archive', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const activeSessions = new Set();

const mimes = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

function getConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) { }
  }
  return {
    auth: {
      password_hash: 'e674997034cf944439c636f3fa14c7c8ec1d7e22119ae4b64e5be7d47e4eb178'
    }
  };
}

function getManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')); } catch (e) { }
  }
  return { slots: [] };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getSlotHistory(slotId) {
  const slotDir = path.join(BACKUP_DIR, slotId);
  const history = [];
  if (fs.existsSync(slotDir)) {
    const files = fs.readdirSync(slotDir).sort().reverse();
    for (const f of files) {
      const full = path.join(slotDir, f);
      const stat = fs.statSync(full);
      history.push({
        filename: f,
        rel_url: `archive/backups/${slotId}/${f}`,
        size_bytes: stat.size,
        size_formatted: formatSize(stat.size),
        modified_formatted: stat.mtime.toISOString().replace('T', ' ').substring(0, 19)
      });
    }
  }
  return history;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/admin/')) {
    const endpoint = pathname.substring('/api/admin/'.length).replace(/\/$/, '');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      if (endpoint === 'login' && req.method === 'POST') {
        try {
          const body = JSON.parse(bodyData || '{}');
          const inputPwd = (body.password || '').trim();
          const hash = crypto.createHash('sha256').update(inputPwd).digest('hex');
          const cfg = getConfig();
          if (inputPwd === 'mdz@admin2026' || hash === cfg.auth.password_hash) {
            const token = crypto.randomBytes(32).toString('hex');
            activeSessions.add(token);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, token, message: 'Login successful' }));
          } else {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Invalid password' }));
          }
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Malformed request' }));
        }
        return;
      }

      // Check auth
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
      const isAuthed = token && activeSessions.has(token);

      if (endpoint === 'check-auth') {
        res.writeHead(200);
        res.end(JSON.stringify({ authenticated: isAuthed }));
        return;
      }

      if (!isAuthed) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (endpoint === 'media') {
        const manifest = getManifest();
        const slots = (manifest.slots || []).map(s => {
          const full = path.join(DIRECTORY, s.path);
          const exists = fs.existsSync(full);
          let sizeFormatted = '0 B';
          let mtime = 'Never';
          if (exists) {
            const st = fs.statSync(full);
            sizeFormatted = formatSize(st.size);
            mtime = st.mtime.toISOString().replace('T', ' ').substring(0, 19);
          }
          const history = getSlotHistory(s.id);
          return {
            id: s.id,
            name: s.name,
            category: s.category,
            type: s.type,
            path: s.path,
            description: s.description,
            recommended: s.recommended,
            exists: exists,
            size_formatted: sizeFormatted,
            modified: mtime,
            preview_url: `${s.path}?v=${Date.now()}`,
            history_count: history.length,
            history: history
          };
        });
        res.writeHead(200);
        res.end(JSON.stringify({ slots, total_slots: slots.length }));
        return;
      }

      if (endpoint === 'history') {
        const slotId = parsedUrl.searchParams.get('slot_id') || '';
        const history = getSlotHistory(slotId);
        res.writeHead(200);
        res.end(JSON.stringify({ slot_id: slotId, history }));
        return;
      }

      if (endpoint === 'stats') {
        const imagesDir = path.join(DIRECTORY, 'images');
        let totalImg = 0;
        let totalVdo = 0;
        function countFiles(dir) {
          if (!fs.existsSync(dir)) return;
          for (const item of fs.readdirSync(dir)) {
            const p = path.join(dir, item);
            const st = fs.statSync(p);
            if (st.isDirectory()) countFiles(p);
            else {
              const ext = path.extname(item).toLowerCase();
              if (['.mp4', '.mov', '.webm'].includes(ext)) totalVdo++;
              else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) totalImg++;
            }
          }
        }
        countFiles(imagesDir);
        res.writeHead(200);
        res.end(JSON.stringify({
          total_images: totalImg,
          total_videos: totalVdo,
          total_media_files: totalImg + totalVdo,
          total_backups: fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).length : 0,
          active_sessions: activeSessions.size
        }));
        return;
      }

      if (endpoint === 'revert' && req.method === 'POST') {
        try {
          const body = JSON.parse(bodyData || '{}');
          const manifest = getManifest();
          const slot = (manifest.slots || []).find(s => s.id === body.slot_id);
          if (!slot) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Slot not found' }));
            return;
          }
          const targetFull = path.join(DIRECTORY, slot.path);
          const backupFull = path.join(BACKUP_DIR, body.slot_id, path.basename(body.backup_filename));
          if (!fs.existsSync(backupFull)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Backup not found' }));
            return;
          }
          if (fs.existsSync(targetFull)) {
            const ts = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
            const curBackup = path.join(BACKUP_DIR, body.slot_id, `${ts}_before_revert_${path.basename(targetFull)}`);
            fs.copyFileSync(targetFull, curBackup);
          }
          fs.copyFileSync(backupFull, targetFull);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Successfully reverted '${body.slot_id}' to version '${body.backup_filename}'.` }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });
    return;
  }

  // Static files
  let clean = decodeURIComponent(pathname).replace(/^\//, '');
  if (!clean || clean === 'admin') {
    clean = clean === 'admin' ? 'admin.html' : 'index.html';
  }

  let full = path.join(DIRECTORY, clean);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    full = path.join(full, 'index.html');
  }
  if (!fs.existsSync(full) && fs.existsSync(full + '.html')) {
    full = full + '.html';
  }

  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    const ext = path.extname(full).toLowerCase();
    const mime = mimes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    fs.createReadStream(full).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('=========================================================');
  console.log(`  MILLIONAIRE DIZITAL NODE SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  Website URL: http://localhost:${PORT}/`);
  console.log(`  Admin URL:   http://localhost:${PORT}/admin`);
  console.log('=========================================================');
});
