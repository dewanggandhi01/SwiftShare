const crypto = require('crypto');
const path = require('path');

// In-memory stores (shared across modules)
const transfers = new Map();
const chatUsers = new Map();   // userId -> user object
const chatRooms = new Map();   // roomCode -> room object
const socketToUser = new Map(); // socketId -> userId

function generateCode() {
    let code;
    do {
        const buf = crypto.randomBytes(3);
        const num = ((buf[0] << 16) | (buf[1] << 8) | buf[2]) % 900000 + 100000;
        code = num.toString();
    } while (transfers.has(code));
    return code;
}

function generateLinkId() {
    return crypto.randomBytes(8).toString('hex');
}

function generateChatCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
    } while (chatRooms.has(code) || [...chatUsers.values()].some(u => u.code === code));
    return code;
}

function generateMsgId() {
    return 'm_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
}

function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\.\./g, '_')
        .trim() || 'unnamed';
}

function splitText(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const parts = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= maxLen) { parts.push(remaining); break; }
        let cut = remaining.lastIndexOf('. ', maxLen);
        if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf('। ', maxLen);
        if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf('。', maxLen);
        if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf('\n', maxLen);
        if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf(' ', maxLen);
        if (cut === -1 || cut < maxLen * 0.3) cut = maxLen;
        parts.push(remaining.substring(0, cut + 1).trim());
        remaining = remaining.substring(cut + 1);
    }
    return parts.filter(p => p.length > 0);
}

module.exports = {
    transfers,
    chatUsers,
    chatRooms,
    socketToUser,
    generateCode,
    generateLinkId,
    generateChatCode,
    generateMsgId,
    sanitizeFilename,
    splitText,
};
