/**
 * ScottyMd - Lightweight Message Store
 * Replaces makeInMemoryStore for better memory usage
 */

const fs = require('fs');
const path = require('path');

const STORE_FILE = './data/store.json';
const MAX_MESSAGES = 20;

let store = {
    messages: {},
    contacts: {},
    chats: {}
};

function readFromFile() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
            store.contacts = data.contacts || {};
            store.chats = data.chats || {};
            // Don't load messages from file - too heavy
        }
    } catch (e) {
        // Start fresh if file is corrupt
        store = { messages: {}, contacts: {}, chats: {} };
    }
}

function writeToFile() {
    try {
        const toWrite = {
            contacts: store.contacts,
            chats: store.chats
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(toWrite, null, 2));
    } catch (e) {
        console.error('Store write error:', e.message);
    }
}

function bind(ev) {
    ev.on('chats.set', ({ chats }) => {
        for (const chat of chats) {
            store.chats[chat.id] = chat;
        }
    });

    ev.on('contacts.update', (updates) => {
        for (const contact of updates) {
            if (contact.id) {
                store.contacts[contact.id] = {
                    ...store.contacts[contact.id],
                    ...contact
                };
            }
        }
    });

    ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages) {
            const jid = msg.key?.remoteJid;
            if (!jid) continue;
            if (!store.messages[jid]) store.messages[jid] = [];

            store.messages[jid].push(msg);

            // Keep only last MAX_MESSAGES
            if (store.messages[jid].length > MAX_MESSAGES) {
                store.messages[jid] = store.messages[jid].slice(-MAX_MESSAGES);
            }
        }
    });
}

async function loadMessage(jid, id) {
    const msgs = store.messages[jid] || [];
    return msgs.find(m => m.key?.id === id) || null;
}

module.exports = {
    readFromFile,
    writeToFile,
    bind,
    loadMessage,
    get contacts() { return store.contacts; },
    get chats() { return store.chats; },
    get messages() { return store.messages; }
};
