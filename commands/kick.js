/**
 * ScottyMd - .kick command
 * Removes a member from the group (admin only)
 */
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

async function kickCommand(sock, chatId, message) {
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
                text: '❌ Only group admins can use this command.'
            }, { quoted: message });
        }

        // Get bot JID and check if bot is admin
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = await isAdmin(sock, chatId, botJid);

        if (!botIsAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ I need to be an admin to kick members.'
            }, { quoted: message });
        }

        // Get mentioned users
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid
            || message.message?.conversation?.match(/@(\d+)/g)?.map(n => n.replace('@', '') + '@s.whatsapp.net')
            || [];

        // Also check quoted message
        const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant && !mentioned.includes(quotedParticipant)) {
            mentioned.push(quotedParticipant);
        }

        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please mention or quote the user you want to kick.\n\n*Usage:* .kick @user'
            }, { quoted: message });
        }

        for (const user of mentioned) {
            const userIsAdmin = await isAdmin(sock, chatId, user);
            if (userIsAdmin) {
                await sock.sendMessage(chatId, {
                    text: `⚠️ Cannot kick @${user.split('@')[0]} — they are an admin.`,
                    mentions: [user]
                }, { quoted: message });
                continue;
            }

            await sock.groupParticipantsUpdate(chatId, [user], 'remove');
            await sock.sendMessage(chatId, {
                text: `✅ @${user.split('@')[0]} has been kicked from the group.`,
                mentions: [user]
            });
        }

    } catch (e) {
        console.error('Kick error:', e.message);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to kick user. Please try again.'
        }, { quoted: message });
    }
}

module.exports = kickCommand;
