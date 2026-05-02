# Discord Application Bot

A professional Discord.js v14 application bot with a quiz flow, scoring, role assignment, staff logging, SQLite storage, and an optional web dashboard.

---

## Features

- `/solliciteer` slash command — starts the entire flow
- All questions delivered in **DM** as rich embeds
- **Multiple-choice buttons** (A / B / C / D), user-locked and auto-disabled after click
- **Randomised question order** (anti-cheat)
- **Score tracking** — 70% pass threshold
- Automatic **role assignment** on acceptance
- Staff **log channel** embed after every application
- **SQLite database** for persistent storage
- **1-hour cooldown** per user
- Clean error handling — no crashes on API errors
- **Web dashboard** to browse all applications (optional)

---

## File Structure

```
discord-bot/
├── index.js          # Main bot — client, quiz runner, event handlers
├── questions.js      # Question bank + shuffle utility
├── db.js             # SQLite database helpers
├── dashboard.js      # Optional Express web dashboard
├── package.json
├── .env.example      # Copy to .env and fill in your values
└── applications.db   # Auto-created on first run
```

---

## Setup

### 1. Create a Discord Application & Bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name
3. Go to **Bot** → click **Add Bot**
4. Under **Token** → click **Reset Token** → copy it
5. Under **Privileged Gateway Intents** → enable:
   - **Server Members Intent**
   - **Message Content Intent** (not strictly required but recommended)
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Manage Roles`, `Send Messages`, `Read Message History`, `Use Slash Commands`
7. Copy the generated URL and invite the bot to your server

### 2. Get Required IDs

Enable **Developer Mode** in Discord (Settings → Advanced → Developer Mode).

| Value | How to get it |
|---|---|
| `BOT_TOKEN` | Discord Developer Portal → Bot → Token |
| `CLIENT_ID` | Developer Portal → General Information → Application ID |
| `GUILD_ID` | Right-click your server name → Copy Server ID |
| `ACCEPTED_ROLE_ID` | Right-click the role in Server Settings → Copy Role ID |
| `LOG_CHANNEL_ID` | Right-click the staff log channel → Copy Channel ID |

### 3. Install Dependencies

```bash
cd discord-bot
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

### 5. Run the Bot

```bash
npm start
```

The bot will:
1. Connect to Discord
2. Create the SQLite database
3. Register the `/solliciteer` slash command
4. Start listening for interactions

> **Note:** Slash commands may take up to 1 hour to propagate globally. For instant registration, the bot uses guild-specific commands via `GUILD_ID`.

---

## Running the Dashboard (Optional)

In a separate terminal:

```bash
npm run dashboard
```

Then open http://localhost:3000 in your browser.

If `DASHBOARD_SECRET` is set in `.env`, append `?token=your_secret` to the URL.

The dashboard shows:
- Total / Accepted / Rejected counts and average score
- Full application history table

---

## Customising Questions

Edit `questions.js`. Each question must follow this structure:

```js
{
  id: 11,
  question: 'Your question text here?',
  options: {
    A: 'First option',
    B: 'Second option',
    C: 'Third option',
    D: 'Fourth option',
  },
  answer: 'B', // Correct answer letter
}
```

---

## Changing the Pass Threshold

In `index.js`, find this line and change `70`:

```js
const accepted = pct >= 70;
```

---

## Changing the Cooldown

In `index.js`, find and change `COOLDOWN_MS`:

```js
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour in milliseconds
```

---

## Bot Permissions Required

| Permission | Why |
|---|---|
| `Manage Roles` | Assign the accepted role |
| `Send Messages` | Send embeds in log channel and DMs |
| `Use Slash Commands` | Register and respond to `/solliciteer` |

Make sure the bot's role is **above** the accepted role in the role hierarchy.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot does not respond to `/solliciteer` | Wait up to 1 minute after start, check `CLIENT_ID` and `GUILD_ID` |
| Cannot send DM to user | User must have DMs open from server members (Discord Privacy Settings) |
| Role not assigned | Ensure bot role is above target role in server role hierarchy |
| `better-sqlite3` install fails | Run `npm install --build-from-source` or install build tools (`npm install -g node-gyp`) |