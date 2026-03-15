# ScottyMd — WhatsApp Bot

A clean WhatsApp bot built on [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) with a **web pairing UI** — users pair their number through a browser, no terminal needed.

---

## 🚀 Deploy on GitHub + Render

### Step 1 — Push to GitHub
1. Create a new repo on GitHub called `ScottyMd`
2. Upload all files to the repo
3. `session/` and `.env` are already in `.gitignore` ✅

### Step 2 — Deploy on Render
1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub and select the `ScottyMd` repo
4. Fill in:
   - **Name:** `scottymd`
   - **Runtime:** Node
   - **Build Command:** `npm install --legacy-peer-deps`
   - **Start Command:** `npm start`
5. Click **Advanced** → **Add Environment Variable:**
   - Key: `RENDER_URL` | Value: `https://scottymd.onrender.com`
6. Click **Create Web Service** and wait for it to deploy

### Step 3 — Pair Your Number
1. Open your Render URL in a browser (e.g. `https://scottymd.onrender.com`)
2. Enter your WhatsApp number (e.g. `263788114185`)
3. Click **Get Pairing Code**
4. Open WhatsApp → **Settings → Linked Devices → Link a Device**
5. Tap **Link with phone number** and enter the code
6. ✅ Done — bot is live!

---

## ⚙️ Local Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
node index.js
```

---

## 📋 Commands (12 Total)

| Command | Description | Access |
|---------|-------------|--------|
| `.help` / `.menu` | Show command menu | Everyone |
| `.ping` | Check bot speed | Everyone |
| `.alive` | Bot status & uptime | Everyone |
| `.owner` | Get owner contact | Everyone |
| `.sticker` / `.s` | Convert image/video to sticker | Everyone |
| `.play <song>` | Download & send a song | Everyone |
| `.kick @user` | Remove a member | Admins only |
| `.promote @user` | Make a member admin | Admins only |
| `.demote @user` | Remove admin rights | Admins only |
| `.mute` | Lock the group | Admins only |
| `.unmute` | Unlock the group | Admins only |
| `.warn @user` | Warn member, auto-kick at 3 | Admins only |
| `.ai` / `.ask` | Ask AI anything | Everyone |

---

## 📁 Project Structure

```
ScottyMd/
├── index.js           Entry point & WhatsApp connection
├── main.js            Message handler & command router
├── server.js          Web pairing server + keep-alive ping
├── settings.js        Bot config
├── config.js          API keys
├── render.yaml        Render deployment config
├── public/
│   └── index.html     Web pairing UI
├── commands/          12 bot commands
├── lib/               Helpers (isAdmin, isBanned, etc.)
├── data/              Runtime data files
├── sessions/          Per-user pairing sessions (gitignored)
├── session/           Bot own session (gitignored)
└── temp/              Temp files, auto-cleaned every 3h
```

---

## 🌐 Keep-Alive

Server pings itself every **10 minutes** to prevent Render free tier from sleeping. Set `RENDER_URL` in your Render environment variables.

---

## ⚠️ Important

- Never push `session/` or `sessions/` to GitHub
- `.warn` auto-kicks at **3 warnings** — change `WARN_COUNT` in `config.js`
- `.ai` uses free Hugging Face API, no key needed
- ffmpeg is pre-installed on Render ✅

---

Built by Scotty • Powered by Baileys
