/**
 * ScottyMd - .alive command
 * Shows bot status and uptime
 */
const settings = require('../settings');
const os = require('os');

async function aliveCommand(sock, chatId, message) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const totalRam = (os.totalmem() / 1024 / 1024).toFixed(1);

    const text = `
✅ *${settings.botName} is Alive!*

🕐 *Uptime:* ${hours}h ${minutes}m ${seconds}s
💾 *RAM:* ${ramUsed}MB / ${totalRam}MB
📦 *Version:* ${settings.version}
👤 *Owner:* ${settings.botOwner}
🌐 *Mode:* ${settings.commandMode}
`;

    await sock.sendMessage(chatId, {
        text: text.trim()
    }, { quoted: message });
}

module.exports = aliveCommand;
