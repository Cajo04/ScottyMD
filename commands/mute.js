/**
 * ScottyMd - .mute / .unmute commands
 * Locks or unlocks the group chat
 */
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

async function muteCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in a group.'
            }, { quoted: message });
        }

        const senderId = message.key.participant || message.key.remoteJid;
        if (!await isAdmin(sock, chatId, senderId) && !isOwnerOrSudo(senderId)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only admins can mute the group.'
            }, { quoted: message });
        }

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (!await isAdmin(sock, chatId, botJid)) {
            return await sock.sendMessage(chatId, {
                text: '❌ I need to be an admin to mute the group.'
            }, { quoted: message });
        }

        await sock.groupSettingUpdate(chatId, 'announcement'); // only admins can send
        await sock.sendMessage(chatId, {
            text: '🔇 *Group has been muted.*\nOnly admins can send messages now.'
        }, { quoted: message });

    } catch (e) {
        console.error('Mute error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to mute group.' }, { quoted: message });
    }
}

async function unmuteCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in a group.'
            }, { quoted: message });
        }

        const senderId = message.key.participant || message.key.remoteJid;
        if (!await isAdmin(sock, chatId, senderId) && !isOwnerOrSudo(senderId)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only admins can unmute the group.'
            }, { quoted: message });
        }

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (!await isAdmin(sock, chatId, botJid)) {
            return await sock.sendMessage(chatId, {
                text: '❌ I need to be an admin to unmute the group.'
            }, { quoted: message });
        }

        await sock.groupSettingUpdate(chatId, 'not_announcement'); // everyone can send
        await sock.sendMessage(chatId, {
            text: '🔊 *Group has been unmuted.*\nAll members can send messages now.'
        }, { quoted: message });

    } catch (e) {
        console.error('Unmute error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to unmute group.' }, { quoted: message });
    }
}

module.exports = { muteCommand, unmuteCommand };
