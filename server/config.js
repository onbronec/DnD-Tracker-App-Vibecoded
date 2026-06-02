const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '..', 'dm-token.local');

function loadDmToken() {
    if (process.env.DND_DM_TOKEN) return process.env.DND_DM_TOKEN;
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
        }
        const token = crypto.randomBytes(18).toString('hex');
        fs.writeFileSync(TOKEN_FILE, token, 'utf8');
        return token;
    } catch (error) {
        console.warn('Could not persist DM token, using in-memory token:', error.message);
        return crypto.randomBytes(18).toString('hex');
    }
}

module.exports = {
    loadDmToken
};
