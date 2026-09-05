const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const PAGES_DIR = path.join(__dirname, '..', '..', 'public', 'pages');
const DIST_INDEX = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');

router.get(['/receive', '/pdf', '/chat', '/translate', '/streamfinder', '/games'], (_req, res) => {
    const hasDist = fs.existsSync(DIST_INDEX);
    if (hasDist) {
        res.sendFile(DIST_INDEX);
    } else {
        // Fall back to original vanilla HTML views
        const routePath = _req.path;
        let pageName = 'index.html';
        if (routePath === '/pdf') pageName = 'pdf.html';
        else if (routePath === '/chat') pageName = 'chat.html';
        else if (routePath === '/translate') pageName = 'translate.html';
        else if (routePath === '/streamfinder') pageName = 'streamfinder.html';
        else if (routePath === '/games') pageName = 'games.html';
        
        res.sendFile(path.join(PAGES_DIR, pageName));
    }
});

module.exports = router;
