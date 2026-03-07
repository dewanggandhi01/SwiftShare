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

// ── Security headers ───────────────────────────────────────────────────
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ── Static assets (with cache headers) ─────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true
}));
app.use('/chat-uploads', express.static(config.CHAT_UPLOAD_DIR));
app.use('/promo-images', express.static(path.join(__dirname, 'uploads', 'pictures')));
app.use(express.json());

// ── Serve index.html at root ───────────────────────────────────────────
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

// ── Routes ─────────────────────────────────────────────────────────────
app.use(require('./src/routes/pages'));
app.use('/api', require('./src/routes/transfer'));
app.use('/api/translate', require('./src/routes/translate'));
app.use('/api/chat', require('./src/routes/chat'));

// ── WebSocket ──────────────────────────────────────────────────────────
require('./src/socket')(io);

// ── Start ──────────────────────────────────────────────────────────────
server.listen(config.PORT, () => {
    console.log(`\n  Ξ DΞBO is running!\n  Local:  http://localhost:${config.PORT}\n`);
});
