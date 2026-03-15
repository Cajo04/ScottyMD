/**
 * ScottyMd - WhatsApp Bot
 * Built on @whiskeysockets/baileys
 * Author: Scotty
 */

require('./settings');

// ── Start web pairing server ──────────────────────────────────────────────────
const { startServer } = require('./server');
startServer();

const { Boom }      = require('@hapi/boom');
const fs            = require('fs');
const chalk         = require('chalk');
const path          = require('path');
const readline      = require('readline');
const NodeCache     = require('node-cache');
const pino          = require('pino');
const PhoneNumber   = require('awesome-phonenumber');
const { parsePhoneNumber } = require('libphonenumber-js');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const store    = require('./lib/lightweight_store');
const settings = require('./settings');

// ── Ensure required folders exist ────────────────────────────────────────────
['session', 'temp', 'data'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Initialize store ──────────────────────────────────────────────────────────
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// ── Memory management ─────────────────────────────────────────────────────────
setInterval(() => {
    if (global.gc) {
        global.gc();
        console.log('🧹 Garbage collection done');
    }
}, 60_000);

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 400) {
        console.log('⚠️ RAM > 400MB — restarting bot...');
        process.exit(1);
    }
}, 30_000);

// ── Bot config ────────────────────────────────────────────────────────────────
let phoneNumber = settings.ownerNumber;
let owner       = JSON.parse(fs.readFileSync('./data/owner.json', 'utf8'));

global.botname    = settings.botName;
global.themeemoji = '•';

const pairingCode = !!phoneNumber || process.argv.includes('--pairing-code');
const useMobile   = process.argv.includes('--mobile');

// ── Readline (for interactive terminals only) ─────────────────────────────────
const rl = process.stdin.isTTY
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber);
};

// ── Main bot function ─────────────────────────────────────────────────────────
async function startScottyMd() {
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds }  = await useMultiFileAuthState('./session');
        const msgRetryCounterCache  = new NodeCache();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: 'fatal' }).child({ level: 'fatal' })
                )
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || '';
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs:      60000,
            keepAliveIntervalMs:   10000,
        });

        // Save credentials
        sock.ev.on('creds.update', saveCreds);

        // Bind store
        store.bind(sock.ev);

        // ── Decode JID helper ────────────────────────────────────────────────
        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
            }
            return jid;
        };

        sock.public = settings.commandMode !== 'private';

        // ── Contact updates ──────────────────────────────────────────────────
        sock.ev.on('contacts.update', update => {
            for (const contact of update) {
                const id = sock.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        // ── Handle pairing code ──────────────────────────────────────────────
        if (pairingCode && !sock.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile API');

            let num = global.phoneNumber || await question(
                chalk.bgBlack(chalk.greenBright(
                    `\nEnter your WhatsApp number (e.g. 263788114185): `
                ))
            );

            num = num.replace(/[^0-9]/g, '');

            const pn = require('awesome-phonenumber');
            if (!pn('+' + num).isValid()) {
                console.log(chalk.red('❌ Invalid phone number. Use full international format without + or spaces.'));
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    console.log(chalk.bgGreen(chalk.black(' Your Pairing Code: ')), chalk.white(chalk.bold(code)));
                    console.log(chalk.yellow('\n1. Open WhatsApp → Settings → Linked Devices\n2. Tap "Link a Device"\n3. Enter the code above'));
                } catch (err) {
                    console.error(chalk.red('❌ Failed to get pairing code:'), err.message);
                }
            }, 3000);
        }

        // ── Message handler ──────────────────────────────────────────────────
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;

                // Decode ephemeral
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                    ? mek.message.ephemeralMessage.message
                    : mek.message;

                // Skip status broadcasts (handled separately)
                if (mek.key?.remoteJid === 'status@broadcast') {
                    await handleStatus(sock, chatUpdate);
                    return;
                }

                // Private mode: block DMs from non-owners
                if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }

                // Skip Baileys internal messages
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                // Clear retry cache occasionally
                if (sock?.msgRetryCounterCache) sock.msgRetryCounterCache.clear();

                await handleMessages(sock, chatUpdate);

            } catch (err) {
                console.error('❌ messages.upsert error:', err.message);
            }
        });

        // ── Anti-call (silently reject) ──────────────────────────────────────
        sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                const callerJid = call.from || call.peerJid || call.chatId;
                if (!callerJid) continue;
                try {
                    if (typeof sock.rejectCall === 'function' && call.id) {
                        await sock.rejectCall(call.id, callerJid);
                    }
                } catch { /* ignore */ }
            }
        });

        // ── Group participant updates ─────────────────────────────────────────
        sock.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(sock, update);
        });

        // ── Connection updates ───────────────────────────────────────────────
        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;

            if (qr) console.log(chalk.yellow('📱 QR Code generated — scan with WhatsApp.'));
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting to WhatsApp...'));

            if (connection === 'open') {
                await delay(1500);
                console.log(chalk.cyan('\n╔═══════════════════════════════╗'));
                console.log(chalk.cyan(`║   ${chalk.bold.yellow(global.botname || 'ScottyMd')}${' '.repeat(Math.max(0, 26 - (global.botname || 'ScottyMd').length))}║`));
                console.log(chalk.cyan('╚═══════════════════════════════╝'));
                console.log(chalk.green(`${global.themeemoji} 🤖 Bot Connected Successfully! ✅`));
                console.log(chalk.magenta(`${global.themeemoji} Owner: ${owner}`));
                console.log(chalk.blue(`${global.themeemoji} Version: ${settings.version}`));
                console.log(chalk.yellow(`${global.themeemoji} Mode: ${settings.commandMode}`));
                console.log(chalk.cyan('════════════════════════════════\n'));

                // Notify bot number it's online
                try {
                    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.sendMessage(botNumber, { text: `✅ *${settings.botName}* is now online!\nVersion: ${settings.version}` });
                } catch { /* ignore */ }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

                console.log(chalk.red(`⛔ Connection closed. Code: ${statusCode}`));

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log(chalk.yellow('🗑️ Session expired — deleting session folder...'));
                    try { fs.rmSync('./session', { recursive: true, force: true }); } catch { }
                    console.log(chalk.red('❌ Please re-authenticate by restarting the bot.'));
                    process.exit(1);
                }

                if (shouldReconnect) {
                    console.log(chalk.yellow('♻️ Reconnecting in 5s...'));
                    await delay(5000);
                    startScottyMd();
                }
            }
        });

        return sock;

    } catch (error) {
        console.error('❌ Fatal error in startScottyMd:', error.message);
        await delay(5000);
        startScottyMd();
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
startScottyMd().catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
});

process.on('uncaughtException',   err => console.error('Uncaught Exception:', err));
process.on('unhandledRejection',  err => console.error('Unhandled Rejection:', err));

// ── Hot reload on file change ─────────────────────────────────────────────────
const file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`♻️ Reloading ${__filename}...`));
    delete require.cache[file];
    require(file);
});
