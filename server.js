const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const config = require('./src/config');

// ── Ensure upload directories exist ────────────────────────────────────
[config.UPLOAD_DIR, config.CHAT_UPLOAD_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Express app ────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Compression ────────────────────────────────────────────────────────
app.use(compression());

// ── CORS & Security headers ─────────────────────────────────────────────
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (_req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ── Static assets (with cache headers) ─────────────────────────────────
const distPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
        maxAge: '7d',
        etag: true
    }));
}
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true
}));
app.use('/chat-uploads', express.static(config.CHAT_UPLOAD_DIR));
app.use('/promo-images', express.static(path.join(__dirname, 'uploads', 'pictures')));
app.use(express.json());

// Redirect /index.html to / to avoid React Router route mismatches
app.get('/index.html', (_req, res) => {
    res.redirect(301, '/');
});

// ── Serve index.html at root ───────────────────────────────────────────
app.get('/', (_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
    }
});

// ── Routes ─────────────────────────────────────────────────────────────
app.use(require('./src/routes/pages'));
app.use('/api', require('./src/routes/transfer'));
app.use('/api/translate', require('./src/routes/translate'));
app.use('/api/chat', require('./src/routes/chat'));

// ── SPA Catch-all Fallback ─────────────────────────────────────────────
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/chat-uploads') || req.path.startsWith('/uploads')) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
    }
});

// ── WebSocket ──────────────────────────────────────────────────────────
require('./src/socket')(io);

// ── Start ──────────────────────────────────────────────────────────────
server.listen(config.PORT, () => {
    console.log(`\n  Ξ DΞBO is running!\n  Local:  http://localhost:${config.PORT}\n`);
});
