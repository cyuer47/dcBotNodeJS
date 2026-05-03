# Discord Application Bot

A professional Discord.js v14 application bot with a quiz flow, scoring, automatic Roblox group rank assignment, staff logging, warnings system, shift management, and SQLite storage.

---

## Features

- `/apply` slash command — starts the entire flow
- All questions delivered in **DM** as rich embeds
- **Multiple-choice buttons** (A / B / C / D), user-locked and auto-disabled after click
- **Randomised question order** (anti-cheat)
- **Score tracking** — 70% pass threshold
- **Automatic Roblox group rank assignment** — Users automatically receive Roblox group ranks after passing (using Roblox API with cookie)
- **SQLite database** for persistent storage
- **1-hour cooldown** per user
- Clean error handling — no crashes on API errors

---

## File Structure

```
discord-bot/
├── index.js          # Main bot — client, quiz runner, event handlers
├── questions.js      # Question bank + shuffle utility
├── db.js             # SQLite database helpers
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
   - Bot Permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`
7. Copy the generated URL and invite the bot to your server

### 2. Get Required IDs & Keys

Enable **Developer Mode** in Discord (Settings → Advanced → Developer Mode).

| Value              | How to get it                                           |
| ------------------ | ------------------------------------------------------- |
| `BOT_TOKEN`        | Discord Developer Portal → Bot → Token                  |
| `CLIENT_ID`        | Developer Portal → General Information → Application ID |
| `GUILD_ID`         | Right-click your server name → Copy Server ID           |
| `LOG_CHANNEL_ID`   | Right-click the staff log channel → Copy Channel ID     |
| `SHIFT_CHANNEL_ID` | Right-click the shifts channel → Copy Channel ID        |
| `ROBLOX_GROUP_ID`  | Your Roblox group ID                                    |
| `ROBLOX_COOKIE`    | Roblox account cookie (.ROBLOSECURITY)                  |
| `BLOXLINK_RANK_ID` | Your Roblox group rank ID to assign after acceptance    |

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
3. Register the `/apply` slash command
4. Start listening for interactions

> **Note:** Slash commands may take up to 1 hour to propagate globally. For instant registration, the bot uses guild-specific commands via `GUILD_ID`.

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

| Permission             | Why                                |
| ---------------------- | ---------------------------------- |
| `Moderate Members`     | Timeout members (warning system)   |
| `Send Messages`        | Send embeds in log channel and DMs |
| `Read Message History` | Read channels for context          |
| `Use Slash Commands`   | Register and respond to `/apply`   |

---

## Troubleshooting

| Problem                                    | Fix                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Bot does not respond to `/apply`           | Wait up to 1 minute after start, check `CLIENT_ID` and `GUILD_ID`                                     |
| Cannot send DM to user                     | User must have DMs open from server members (Discord Privacy Settings)                                |
| User doesn't get Roblox rank automatically | Ensure Roblox group ID, cookie, and rank ID are set, user's Roblox account must be linked to Bloxlink |
| Roblox API shows error                     | Check that `ROBLOX_COOKIE` is valid, account has group permissions, and IDs are correct               |
| Shifts not posted to channel               | Ensure `SHIFT_CHANNEL_ID` is set to a valid channel ID                                                |
