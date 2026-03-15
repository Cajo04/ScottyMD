/**
 * ScottyMd - .warn command
 * Warns a member. Auto-kicks at warn limit (default: 3).
 */
const fs = require('fs');
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');
const { WARN_COUNT } = require('../config');

const WARN_FILE = './data/warnings.json';

function getWarnings() {
    try {
        return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveWarnings(data) {
    fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
}

async function warnCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in a group.'
            }, { quoted: message });
        }

        const senderId = message.key.participant || message.key.remoteJid;
        if (!await isAdmin(sock, chatId, senderId) && !isOwnerOrSudo(senderId)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only admins can warn members.'
            }, { quoted: message });
        }

        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant && !mentioned.includes(quotedParticipant)) mentioned.push(quotedParticipant);

        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please mention the user to warn.\n\n*Usage:* .warn @user'
            }, { quoted: message });
        }

        const warnings = getWarnings();
        const maxWarns = WARN_COUNT || 3;

        for (const user of mentioned) {
            const key = `${chatId}_${user}`;
            warnings[key] = (warnings[key] || 0) + 1;
            const count = warnings[key];
            saveWarnings(warnings);

            if (count >= maxWarns) {
                // Auto-kick
                await sock.sendMessage(chatId, {
                    text: `⛔ @${user.split('@')[0]} has reached *${count}/${maxWarns} warnings* and has been *kicked* from the group!`,
                    mentions: [user]
                });

                try {
                    await sock.groupParticipantsUpdate(chatId, [user], 'remove');
                } catch (kickErr) {
                    await sock.sendMessage(chatId, {
                        text: `⚠️ Could not auto-kick @${user.split('@')[0]}. Make sure I'm an admin.`,
                        mentions: [user]
                    });
                }

                // Reset their warnings after kick
                warnings[key] = 0;
                saveWarnings(warnings);
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *Warning ${count}/${maxWarns}*\n\n@${user.split('@')[0]}, you have been warned!\n_${maxWarns - count} warning(s) left before auto-kick._`,
                    mentions: [user]
                }, { quoted: message });
            }
        }

    } catch (e) {
        console.error('Warn error:', e.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to warn user.' }, { quoted: message });
    }
}

module.exports = warnCommand;
