const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const QRCode = require('qrcode');

const config = require('../config');
const { transfers, generateCode, generateLinkId, sanitizeFilename } = require('../utils/helpers');

const router = express.Router();

// ── Multer config ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const dir = path.join(config.UPLOAD_DIR, req.transferId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        if (!req.usedNames) req.usedNames = new Set();
        let name = sanitizeFilename(file.originalname);
        let final = name;
        let counter = 1;
        while (req.usedNames.has(final)) {
            const ext = path.extname(name);
            const base = path.basename(name, ext);
            final = `${base}_${counter}${ext}`;
            counter++;
        }
        req.usedNames.add(final);
        cb(null, final);
    }
});

const upload = multer({ storage, limits: { fileSize: config.MAX_FILE_SIZE } });

// ── Upload ─────────────────────────────────────────────────────────────
router.post('/upload',
    (req, _res, next) => { req.transferId = uuidv4(); next(); },
    (req, res, next) => {
        upload.array('files', config.MAX_UPLOAD_FILES)(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            if (err) return res.status(500).json({ error: 'Upload failed' });
            next();
        });
    },
    (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files selected' });
        }

        const code = generateCode();
        const linkId = generateLinkId();

        const files = req.files.map(f => ({
            originalName: f.originalname,
            storedName: f.filename,
            size: f.size,
            path: f.path
        }));

        const totalSize = files.reduce((s, f) => s + f.size, 0);

        const transfer = {
            id: req.transferId,
            code,
            linkId,
            files,
            totalSize,
            createdAt: Date.now(),
            codeExpiry: Date.now() + config.CODE_EXPIRY_MS,
            linkExpiry: Date.now() + config.LINK_EXPIRY_MS,
            downloads: 0
        };

        transfers.set(code, transfer);
        transfers.set(linkId, transfer);

        res.json({
            code,
            linkId,
            fileCount: files.length,
            totalSize,
            codeExpiresIn: config.CODE_EXPIRY_MS / 1000,
            linkExpiresIn: config.LINK_EXPIRY_MS / 1000
        });
    }
);

// ── File info ──────────────────────────────────────────────────────────
router.get('/info/:key', (req, res) => {
    const key = req.params.key;
    const transfer = transfers.get(key);
    if (!transfer) {
        return res.status(404).json({ error: 'Transfer not found or expired' });
    }
    const now = Date.now();
    if (key === transfer.code && now > transfer.codeExpiry) {
        return res.status(410).json({ error: 'Code has expired' });
    }
    if (key === transfer.linkId && now > transfer.linkExpiry) {
        return res.status(410).json({ error: 'Link has expired' });
    }
    res.json({
        fileCount: transfer.files.length,
        files: transfer.files.map(f => ({ name: f.originalName, size: f.size })),
        totalSize: transfer.totalSize,
        downloads: transfer.downloads
    });
});

// ── Download ───────────────────────────────────────────────────────────
router.get('/download/:key', (req, res) => {
    const key = req.params.key;
    const transfer = transfers.get(key);
    if (!transfer) {
        return res.status(404).json({ error: 'Transfer not found or expired' });
    }
    const now = Date.now();
    if (key === transfer.code && now > transfer.codeExpiry) {
        return res.status(410).json({ error: 'Code has expired' });
    }
    if (key === transfer.linkId && now > transfer.linkExpiry) {
        return res.status(410).json({ error: 'Link has expired' });
    }

    // Path-traversal guard
    for (const file of transfer.files) {
        const resolved = path.resolve(file.path);
        if (!resolved.startsWith(path.resolve(config.UPLOAD_DIR))) {
            return res.status(403).json({ error: 'Invalid file path' });
        }
    }

    transfer.downloads++;

    if (transfer.files.length === 1) {
        const file = transfer.files[0];
        return res.download(file.path, file.originalName);
    }

    // Multiple files → zip
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="swiftdrop-files.zip"');

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', () => res.status(500).end());
    archive.pipe(res);

    for (const file of transfer.files) {
        archive.file(file.path, { name: sanitizeFilename(file.originalName) });
    }
    archive.finalize();
});

// ── QR Code ────────────────────────────────────────────────────────────
router.get('/qrcode/:linkId', async (req, res) => {
    const transfer = transfers.get(req.params.linkId);
    if (!transfer) {
        return res.status(404).json({ error: 'Transfer not found' });
    }
    const url = `${req.protocol}://${req.get('host')}/receive?link=${encodeURIComponent(req.params.linkId)}`;
    try {
        const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
        res.json({ qr, url });
    } catch {
        res.status(500).json({ error: 'QR generation failed' });
    }
});

// ── Cleanup expired transfers (every 60 s) ─────────────────────────────
setInterval(() => {
    const now = Date.now();
    const seen = new Set();
    for (const [, transfer] of transfers.entries()) {
        if (seen.has(transfer.id)) continue;
        seen.add(transfer.id);
        if (now > transfer.linkExpiry) {
            const dir = path.join(config.UPLOAD_DIR, transfer.id);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            transfers.delete(transfer.code);
            transfers.delete(transfer.linkId);
        }
    }
}, 60_000);

module.exports = router;
