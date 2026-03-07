const express = require('express');
const path = require('path');

const router = express.Router();
const PAGES_DIR = path.join(__dirname, '..', '..', 'public', 'pages');

router.get('/receive', (_req, res) => {
    res.sendFile(path.join(PAGES_DIR, 'index.html'));
});

router.get('/pdf', (_req, res) => {
    res.sendFile(path.join(PAGES_DIR, 'pdf.html'));
});

router.get('/chat', (_req, res) => {
    res.sendFile(path.join(PAGES_DIR, 'chat.html'));
});

router.get('/translate', (_req, res) => {
    res.sendFile(path.join(PAGES_DIR, 'translate.html'));
});

router.get('/streamfinder', (_req, res) => {
    res.sendFile(path.join(PAGES_DIR, 'streamfinder.html'));
});

module.exports = router;
