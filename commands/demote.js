/**
 * ScottyMd - .demote command
 * Removes admin rights from a group member
 */
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

async function demoteCommand(sock, chatId, message) {
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
                text: '❌ Only admins can demote members.'
            }, { quoted: message });
        }

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = await isAdmin(sock, chatId, botJid);
        if (!botIsAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ I need to be an admin to demote members.'
            }, { quoted: message });
        }

        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant && !mentioned.includes(quotedParticipant)) mentioned.push(quotedParticipant);

        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please mention the user to demote.\n\n*Usage:* .demote @user'
            }, { quoted: message });
        }

        for (const user of mentioned) {
            await sock.groupParticipantsUpdate(chatId, [user], 'demote');
            await sock.sendMessage(chatId, {
                text: `🔻 @${user.split('@')[0]} has been demoted from admin.`,
                mentions: [user]
            });
        }

    } catch (e) {
        console.error('Demote error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to demote user.' }, { quoted: message });
    }
}

module.exports = { demoteCommand };
