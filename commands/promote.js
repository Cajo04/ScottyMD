/**
 * ScottyMd - .promote command
 * Promotes a member to group admin
 */
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

async function promoteCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in a group.'
            }, { quoted: message });
        }

        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsAdmin = await isAdmin(sock, chatId, senderId);
        const senderIsOwner = isOwnerOrSudo(senderId);

        if (!senderIsAdmin && !senderIsOwner) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only admins can promote members.'
            }, { quoted: message });
        }

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = await isAdmin(sock, chatId, botJid);
        if (!botIsAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ I need to be an admin to promote members.'
            }, { quoted: message });
        }

        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant && !mentioned.includes(quotedParticipant)) mentioned.push(quotedParticipant);

        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please mention the user to promote.\n\n*Usage:* .promote @user'
            }, { quoted: message });
        }

        for (const user of mentioned) {
            await sock.groupParticipantsUpdate(chatId, [user], 'promote');
            await sock.sendMessage(chatId, {
                text: `⭐ @${user.split('@')[0]} has been promoted to admin!`,
                mentions: [user]
            });
        }

    } catch (e) {
        console.error('Promote error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to promote user.' }, { quoted: message });
    }
}

module.exports = { promoteCommand };
