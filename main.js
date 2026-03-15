/**
 * ScottyMd - Main Message Handler
 * Routes all commands and events
 */

// 🧹 Redirect temp to project folder (avoids ENOSPC on hosted panels)
const fs = require('fs');
const path = require('path');
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP  = customTemp;
process.env.TMP   = customTemp;

// Auto-clean temp every 3 hours
setInterval(() => {
    fs.readdir(customTemp, (err, files) => {
        if (err) return;
        for (const file of files) {
            const filePath = path.join(customTemp, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => {});
                }
            });
        }
    });
    console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings  = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const isOwnerOrSudo = require('./lib/isOwner');

// ── Command imports ───────────────────────────────────────────────────────────
const helpCommand    = require('./commands/help');
const pingCommand    = require('./commands/ping');
const aliveCommand   = require('./commands/alive');
const ownerCommand   = require('./commands/owner');
const stickerCommand = require('./commands/sticker');
const playCommand    = require('./commands/play');
const kickCommand    = require('./commands/kick');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand }  = require('./commands/demote');
const { muteCommand, unmuteCommand } = require('./commands/mute');
const warnCommand    = require('./commands/warn');
const aiCommand      = require('./commands/ai');

// Global bot info
global.packname = settings.packname;
global.author   = settings.author;

// ── Main message handler ──────────────────────────────────────────────────────
async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Decode ephemeral messages
        if (Object.keys(message.message)[0] === 'ephemeralMessage') {
            message.message = message.message.ephemeralMessage.message;
        }

        const chatId   = message.key.remoteJid;
        const isGroup  = chatId?.endsWith('@g.us');
        const senderId = message.key.fromMe
            ? sock.user.id
            : (isGroup ? message.key.participant : chatId);

        if (!chatId || !senderId) return;

        // Ignore status broadcasts
        if (chatId === 'status@broadcast') return;

        // Check ban list
        if (isBanned(senderId)) return;

        // Extract text from all common message types
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.buttonsResponseMessage?.selectedButtonId ||
            message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            '';

        const prefix  = settings.prefix || '.';
        const userMessage = rawText.trim().toLowerCase();

        // Only handle messages that start with the prefix
        if (!userMessage.startsWith(prefix)) return;

        // ── Command routing ──────────────────────────────────────────────────
        const [cmd, ...argsArr] = userMessage.slice(prefix.length).split(/\s+/);
        const args = argsArr;

        switch (cmd) {

            case 'help':
            case 'menu':
                await helpCommand(sock, chatId, message);
                break;

            case 'ping':
                await pingCommand(sock, chatId, message);
                break;

            case 'alive':
                await aliveCommand(sock, chatId, message);
                break;

            case 'owner':
                await ownerCommand(sock, chatId, message);
                break;

            case 'sticker':
            case 's':
                await stickerCommand(sock, chatId, message);
                break;

            case 'play':
                await playCommand(sock, chatId, message, args);
                break;

            case 'kick':
            case 'remove':
                await kickCommand(sock, chatId, message);
                break;

            case 'promote':
                await promoteCommand(sock, chatId, message);
                break;

            case 'demote':
                await demoteCommand(sock, chatId, message);
                break;

            case 'mute':
                await muteCommand(sock, chatId, message);
                break;

            case 'unmute':
                await unmuteCommand(sock, chatId, message);
                break;

            case 'warn':
                await warnCommand(sock, chatId, message);
                break;

            case 'ai':
            case 'ask':
            case 'gpt':
                await aiCommand(sock, chatId, message, args);
                break;

            default:
                // Unknown command - silently ignore
                break;
        }

    } catch (error) {
        console.error('❌ Error in handleMessages:', error.message);
    }
}

// ── Group participant update handler ─────────────────────────────────────────
async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action } = update;
        if (!id.endsWith('@g.us')) return;

        for (const participant of participants) {
            if (action === 'add') {
                await sock.sendMessage(id, {
                    text: `👋 Welcome @${participant.split('@')[0]} to the group!`,
                    mentions: [participant]
                });
            } else if (action === 'remove') {
                await sock.sendMessage(id, {
                    text: `👋 @${participant.split('@')[0]} has left the group.`,
                    mentions: [participant]
                }).catch(() => {}); // Ignore if fails (bot removed too)
            }
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error.message);
    }
}

// ── Status handler (stub — extend as needed) ─────────────────────────────────
async function handleStatus(sock, statusUpdate) {
    // Extend this if you want the bot to react to status updates
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus
};
