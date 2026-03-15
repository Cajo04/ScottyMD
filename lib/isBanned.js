/**
 * ScottyMd - isBanned helper
 */
const fs = require('fs');
const BANNED_FILE = './data/banned.json';

function getBanned() {
    try {
        return JSON.parse(fs.readFileSync(BANNED_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function isBanned(userId) {
    const banned = getBanned();
    return banned.includes(userId);
}

module.exports = { isBanned };
