/**
 * ScottyMd - .ai command
 * Ask AI anything using a free inference API
 */
const axios = require('axios');

async function aiCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a question.\n\n*Usage:* .ai <your question>'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: '🤖 *Thinking...*'
        }, { quoted: message });

        // Using a free public inference endpoint (no key required)
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
            {
                inputs: `<s>[INST] ${query} [/INST]`,
                parameters: {
                    max_new_tokens: 300,
                    temperature: 0.7,
                    return_full_text: false
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        let answer = '';
        if (Array.isArray(response.data) && response.data[0]?.generated_text) {
            answer = response.data[0].generated_text.trim();
        } else if (response.data?.generated_text) {
            answer = response.data.generated_text.trim();
        } else {
            answer = 'Sorry, I could not generate a response.';
        }

        // Clean up any leftover instruction tags
        answer = answer.replace(/<\/?s>/g, '').replace(/\[INST\]|\[\/INST\]/g, '').trim();

        await sock.sendMessage(chatId, {
            text: `🤖 *ScottyMd AI*\n\n*Q:* ${query}\n\n*A:* ${answer}`
        }, { quoted: message });

    } catch (e) {
        console.error('AI error:', e.message);
        await sock.sendMessage(chatId, {
            text: '❌ AI is unavailable right now. Try again later.'
        }, { quoted: message });
    }
}

module.exports = aiCommand;
