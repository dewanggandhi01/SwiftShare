const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    UPLOAD_DIR: path.join(__dirname, '..', 'uploads'),
    CHAT_UPLOAD_DIR: path.join(__dirname, '..', 'chat-uploads'),
    CODE_EXPIRY_MS: 10 * 60 * 1000,       // 10 minutes
    LINK_EXPIRY_MS: 48 * 60 * 60 * 1000,  // 48 hours
    MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5 GB
    MAX_CHAT_FILE: 25 * 1024 * 1024,       // 25 MB
    MAX_UPLOAD_FILES: 100,
    MAX_MESSAGES_PER_ROOM: 500,
};
