/**
 * ScottyMd - .ping command
 * Checks bot response speed
 */

async function pingCommand(sock, chatId, message) {
    const start = Date.now();
    const sent = await sock.sendMessage(chatId, { text: '🏓 Pinging...' }, { quoted: message });
    const end = Date.now();
    const speed = end - start;

    await sock.sendMessage(chatId, {
        text: `🏓 *Pong!*\n⚡ Response time: *${speed}ms*`
    }, { quoted: message });
}

module.exports = pingCommand;
