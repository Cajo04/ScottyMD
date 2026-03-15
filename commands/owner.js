/**
 * ScottyMd - .owner command
 * Sends owner contact info
 */
const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    await sock.sendMessage(chatId, {
        text: `👤 *Bot Owner*\n\n📛 Name: ${settings.botOwner}\n📞 Number: +${settings.ownerNumber}\n\n_Contact for support or inquiries._`
    }, { quoted: message });

    // Send owner as a contact card
    try {
        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: settings.botOwner,
                contacts: [{
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.botOwner}\nTEL;type=CELL;type=VOICE;waid=${settings.ownerNumber}:+${settings.ownerNumber}\nEND:VCARD`
                }]
            }
        });
    } catch (e) {
        // Silently skip if vcard fails
    }
}

module.exports = ownerCommand;
