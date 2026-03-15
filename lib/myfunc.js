/**
 * ScottyMd - Utility Functions
 */
const axios = require('axios');
const fs = require('fs');

async function getBuffer(url, options = {}) {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        throw new Error(`getBuffer error: ${e.message}`);
    }
}

async function fetchBuffer(url) {
    return getBuffer(url);
}

function isUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function smsg(sock, m, store) {
    if (!m) return m;
    let M = m;
    if (M.key) {
        M.id = M.key.id;
        M.isBaileys = M.id?.startsWith('BAE5') && M.id.length === 16;
        M.chat = M.key.remoteJid;
        M.fromMe = M.key.fromMe;
        M.isGroup = M.chat?.endsWith('@g.us');
        M.sender = sock.decodeJid(
            M.fromMe
                ? sock.user.id
                : M.isGroup
                ? M.key.participant
                : M.key.remoteJid
        );
    }
    if (M.message) {
        M.mtype = Object.keys(M.message)[0];
        M.body = M.message?.conversation
            || M.message[M.mtype]?.caption
            || M.message[M.mtype]?.text
            || '';
    }
    return M;
}

module.exports = { getBuffer, fetchBuffer, isUrl, sleep, smsg };
