/**
 * ScottyMd - .play command
 * Search and send a song from YouTube
 */
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

async function playCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();

        if (!query) {
            await sock.sendMessage(chatId, {
                text: '❌ Please provide a song name.\n\n*Usage:* .play <song name>'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `🔍 Searching for: *${query}*...`
        }, { quoted: message });

        // Search YouTube
        const search = await yts(query);
        const results = search.videos;

        if (!results || results.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ No results found. Try a different song name.'
            }, { quoted: message });
            return;
        }

        const video = results[0];

        if (video.duration.seconds > 600) {
            await sock.sendMessage(chatId, {
                text: '❌ Song is too long (max 10 minutes).'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `🎵 *${video.title}*\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views.toLocaleString()}\n\n⬇️ Downloading...`
        }, { quoted: message });

        const tmpFile = path.join('./temp', `play_${Date.now()}.mp3`);

        // Download audio
        await new Promise((resolve, reject) => {
            ytdl(video.url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            })
            .pipe(fs.createWriteStream(tmpFile))
            .on('finish', resolve)
            .on('error', reject);
        });

        const audioBuffer = fs.readFileSync(tmpFile);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // Cleanup
        fs.unlinkSync(tmpFile);

    } catch (e) {
        console.error('Play error:', e.message);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to download song. The video may be restricted or unavailable.'
        }, { quoted: message });
    }
}

module.exports = playCommand;
