/**
 * ScottyMd - isOwner helper
 */
const fs = require('fs');
const settings = require('../settings');

function isOwnerOrSudo(userId) {
    const cleanId = userId.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
    const ownerClean = settings.ownerNumber.replace(/[^0-9]/g, '');

    if (cleanId === ownerClean) return true;

    try {
        const owners = JSON.parse(fs.readFileSync('./data/owner.json', 'utf8'));
        return owners.some(o => o.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '') === cleanId);
    } catch {
        return false;
    }
}

module.exports = isOwnerOrSudo;
