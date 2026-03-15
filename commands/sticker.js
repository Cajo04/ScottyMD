/**
 * ScottyMd - .sticker command
 * Converts image or video to WhatsApp sticker
 */
const settings = require('../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function stickerCommand(sock, chatId, message) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const msg = quoted || message.message;

        let mediaType = null;
        let mediaMsg = null;

        if (msg?.imageMessage) {
            mediaType = 'image';
            mediaMsg = msg.imageMessage;
        } else if (msg?.videoMessage && msg.videoMessage.seconds <= 10) {
            mediaType = 'video';
            mediaMsg = msg.videoMessage;
        } else if (msg?.stickerMessage) {
            await sock.sendMessage(chatId, { text: '❌ That is already a sticker!' }, { quoted: message });
            return;
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Please send or quote an *image* or *short video* (max 10s) with *.sticker*'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ Creating sticker...' }, { quoted: message });

        // Download the media
        const stream = await downloadContentFromMessage(
            quoted
                ? { ...mediaMsg, url: mediaMsg.url }
                : message.message[mediaType + 'Message'],
            mediaType
        );

        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const tmpIn = path.join('./temp', `sticker_in_${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`);
        const tmpOut = path.join('./temp', `sticker_out_${Date.now()}.webp`);
        fs.writeFileSync(tmpIn, buffer);

        if (mediaType === 'image') {
            execSync(`ffmpeg -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" "${tmpOut}" -y`);
        } else {
            execSync(`ffmpeg -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -loop 0 -ss 00:00:00 -t 00:00:09 -preset default -an -vsync 0 "${tmpOut}" -y`);
        }

        const stickerBuffer = fs.readFileSync(tmpOut);

        await sock.sendMessage(chatId, {
            sticker: stickerBuffer,
            packname: settings.packname,
            author: settings.author
        });

        // Cleanup
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);

    } catch (e) {
        console.error('Sticker error:', e.message);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to create sticker.\n_Make sure ffmpeg is installed on your system._`
        }, { quoted: message });
    }
}

module.exports = stickerCommand;
