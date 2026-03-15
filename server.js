/**
 * ScottyMd - Web Pairing Server
 * Serves the pairing UI and handles pairing code generation
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const pino = require('pino');
const NodeCache = require('node-cache');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Track active pairing sessions
const pairingSessions = new Map();

// ── Keep-Alive Ping ───────────────────────────────────────────────────────────
// Pings itself every 10 minutes to prevent Render free tier from sleeping
function startKeepAlive() {
    const url = RENDER_URL;
    setInterval(async () => {
        try {
            const fetch = require('node-fetch');
            const res = await fetch(`${url}/ping`);
            console.log(chalk.cyan(`🏓 Keep-alive ping sent → ${res.status}`));
        } catch (e) {
            console.log(chalk.yellow('⚠️ Keep-alive ping failed:', e.message));
        }
    }, 10 * 60 * 1000); // every 10 minutes
    console.log(chalk.green('✅ Keep-alive started — pinging every 10 minutes'));
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check / keep-alive endpoint
app.get('/ping', (req, res) => {
    res.json({ status: 'alive', bot: 'ScottyMd', time: new Date().toISOString() });
});

// Serve the pairing UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Pairing Code API ──────────────────────────────────────────────────────────
app.post('/pair', async (req, res) => {
    let { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Clean the number — digits only
    phone = phone.replace(/[^0-9]/g, '');

    if (phone.length < 7 || phone.length > 15) {
        return res.status(400).json({ error: 'Invalid phone number. Use full international format without + (e.g. 263788114185).' });
    }

    // Prevent duplicate pairing requests for same number
    if (pairingSessions.has(phone)) {
        return res.status(429).json({ error: 'A pairing request is already in progress for this number. Please wait.' });
    }

    pairingSessions.set(phone, true);

    try {
        const sessionDir = `./sessions/${phone}`;
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const msgRetryCounterCache = new NodeCache();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: 'fatal' }).child({ level: 'fatal' })
                )
            },
            msgRetryCounterCache,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        // Wait for socket to be ready then request pairing code
        await delay(2000);

        let code;
        try {
            code = await sock.requestPairingCode(phone);
            code = code?.match(/.{1,4}/g)?.join('-') || code;
        } catch (err) {
            pairingSessions.delete(phone);
            sock.end();
            return res.status(500).json({ error: 'Failed to generate pairing code. Make sure the number is registered on WhatsApp.' });
        }

        // Listen for successful auth — save session properly
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(chalk.green(`✅ User paired successfully: ${phone}`));
                pairingSessions.delete(phone);

                // Save session ID to a file for reference
                try {
                    const sessionInfo = {
                        phone,
                        pairedAt: new Date().toISOString(),
                        sessionDir
                    };
                    fs.writeFileSync(
                        `${sessionDir}/info.json`,
                        JSON.stringify(sessionInfo, null, 2)
                    );
                } catch { }

                // Close this temporary socket after pairing
                await delay(3000);
                sock.end();
            }

            if (connection === 'close') {
                pairingSessions.delete(phone);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch { }
                }
            }
        });

        // Respond with the pairing code
        return res.json({
            success: true,
            code,
            message: `Enter this code in WhatsApp → Linked Devices → Link a Device`
        });

    } catch (err) {
        pairingSessions.delete(phone);
        console.error('Pairing error:', err.message);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// Session status check
app.get('/status/:phone', (req, res) => {
    const phone = req.params.phone.replace(/[^0-9]/g, '');
    const sessionDir = `./sessions/${phone}`;
    const infoFile = `${sessionDir}/info.json`;

    if (fs.existsSync(infoFile)) {
        const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
        return res.json({ paired: true, pairedAt: info.pairedAt });
    }

    const isPairing = pairingSessions.has(phone);
    res.json({ paired: false, pending: isPairing });
});

// ── Start Server ──────────────────────────────────────────────────────────────
function startServer() {
    app.listen(PORT, () => {
        console.log(chalk.cyan(`\n🌐 ScottyMd Web Pairing Server running!`));
        console.log(chalk.green(`🔗 URL: ${RENDER_URL}`));
        console.log(chalk.yellow(`📡 Port: ${PORT}\n`));
        startKeepAlive();
    });
}

module.exports = { startServer };
