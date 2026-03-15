/**
 * ScottyMd - isAdmin helper
 */

async function isAdmin(sock, groupId, userId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const admins = groupMetadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);
        return admins.includes(userId);
    } catch (e) {
        return false;
    }
}

module.exports = isAdmin;
