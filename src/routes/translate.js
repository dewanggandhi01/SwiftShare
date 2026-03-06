const express = require('express');
const { splitText } = require('../utils/helpers');

const router = express.Router();

router.post('/', express.json({ limit: '1mb' }), async (req, res) => {
    const { text, from, to } = req.body;
    if (!text || !to) return res.status(400).json({ error: 'Missing text or target language' });
    const sourceLang = (from && from !== 'auto' && from !== 'autodetect') ? from : 'auto';
    const segments = splitText(text, 4800);
    try {
        const results = [];
        let detectedLang = sourceLang;
        for (const seg of segments) {
            const translated = await translateSegment(seg, sourceLang, to);
            results.push(translated.text);
            if (translated.detectedLang) detectedLang = translated.detectedLang;
        }
        res.json({ translated: results.join(' '), detectedLang });
    } catch (e) {
        res.status(500).json({ error: 'Translation service unavailable' });
    }
});

// Try Google first, fall back to MyMemory
async function translateSegment(text, from, to) {
    // --- Google Translate (free, no key) ---
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
        const gResp = await fetch(gUrl);
        if (gResp.ok) {
            const gData = await gResp.json();
            if (gData && gData[0]) {
                const translated = gData[0].map(s => s[0]).filter(Boolean).join('');
                const detected = (gData[2]) || from;
                if (translated && !translated.includes('MYMEMORY WARNING')) {
                    return { text: translated, detectedLang: detected };
                }
            }
        }
    } catch (_) { /* fall through to MyMemory */ }

    // --- MyMemory Fallback ---
    try {
        const mmFrom = (from === 'auto') ? 'autodetect' : from;
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=${mmFrom}|${to}`;
        const mmResp = await fetch(mmUrl);
        const mmData = await mmResp.json();
        if (mmData.responseData && mmData.responseData.translatedText) {
            const t = mmData.responseData.translatedText;
            if (!t.includes('MYMEMORY WARNING') && t !== 'QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS') {
                return { text: t, detectedLang: mmData.responseData.detectedLanguage || from };
            }
        }
    } catch (_) { /* both failed */ }

    return { text, detectedLang: from };
}

module.exports = router;
