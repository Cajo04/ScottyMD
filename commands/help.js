/**
 * ScottyMd - .help command
 * Lists all available bot commands
 */
const settings = require('../settings');

async function helpCommand(sock, chatId, message) {
    const menu = `
╭──────────────────────╮
│     ✨ SCOTTYMD ✨    
│   _ᴛʜᴇ ᴜʟᴛɪᴍᴀᴛᴇ ʙᴏᴛ_   
╰──────────────────────╯

✦━━━━━━━━━━━━━━━━━━━━━━✦

   🌟 *GENERAL* 🌟
┌────────────────────────┐
│ ➤ *.help*   – Menu     │
│ ➤ *.ping*   – Pong!    │
│ ➤ *.alive*  – Status   │
│ ➤ *.owner*  – Contact  │
└────────────────────────┘

   🎨 *MEDIA* 🎨
┌────────────────────────┐
│ ➤ *.sticker*           
│   ᴛᴜʀɴ ᴍᴇᴅɪᴀ → sᴛɪᴄᴋᴇʀ  
│ ➤ *.play* <sᴏɴɢ>       
│   ᴅᴏᴡɴʟᴏᴀᴅ ᴀᴜᴅɪᴏ     
└────────────────────────┘

   👥 *ADMIN* 👥
┌────────────────────────┐
│ ➤ *.kick*     @user    
│ ➤ *.promote*  @user    
│ ➤ *.demote*   @user    
│ ➤ *.mute*     group    
│ ➤ *.unmute*   group    
│ ➤ *.warn*     @user    
└────────────────────────┘

   🤖 *AI* 🤖
┌────────────────────────┐
│ ➤ *.ai* <ǫᴜᴇsᴛɪᴏɴ>     
│   ᴀsᴋ ᴍᴇ ᴀɴʏᴛʜɪɴɢ!    
└────────────────────────┘

✦━━━━━━━━━━━━━━━━━━━━━━✦

╭────────────────────────╮
│  ᴘᴏᴡᴇʀᴇᴅ ʙʏ: sᴄᴏᴛᴛʏᴍᴅ  │
│  ᴠᴇʀsɪᴏɴ: 1.0.0        │
╰────────────────────────╯';

    await sock.sendMessage(chatId, {
        text: menu.trim()
    }, { quoted: message });
}

module.exports = helpCommand;
