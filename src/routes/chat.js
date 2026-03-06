const express = require('express');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');

const config = require('../config');
const { sanitizeFilename } = require('../utils/helpers');

const router = express.Router();

// Chat file upload storage
const chatStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.CHAT_UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = sanitizeFilename(path.basename(file.originalname, ext));
        cb(null, Date.now() + '-' + safeName.substring(0, 40) + ext);
    }
});
const chatUpload = multer({ storage: chatStorage, limits: { fileSize: config.MAX_CHAT_FILE } });

router.post('/upload', (req, res, next) => {
    chatUpload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File too large. Maximum size is 25 MB.' });
            }
            return res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const url = '/chat-uploads/' + req.file.filename;
        res.json({ url, name: req.file.originalname, size: req.file.size });
    });
});

router.get('/qr', async (req, res) => {
    const text = req.query.text;
    if (!text || typeof text !== 'string' || text.length > 500) {
        return res.status(400).json({ error: 'Invalid text' });
    }
    try {
        const qr = await QRCode.toDataURL(text, { width: 300, margin: 2 });
        res.json({ qr });
    } catch {
        res.status(500).json({ error: 'QR generation failed' });
    }
});

module.exports = router;
