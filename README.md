<p align="center">
   <a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com?font=Kalam&size=45&duration=2000&pause=1000&color=15E3F7&background=FF11B200&center=true&vCenter=true&repeat=false&width=650&lines=Discord+OwO+Bot+Grinder+Tool" alt="Owo Grinder Text" /></a>
</p>

Best selfbot for Discord OwO Bot currently with alot of cool features like captcha notifications, captcha solver api, boss battles, auto huntbot and so many more!

---

> [!WARNING]
> 🚨 We are not responsible for any bans that may occur from using our selfbots. Using selfbots violates Discord’s Terms of Service and also goes against OwO Bot’s rules

---

# 🔎 Requirements

- **Node.js Version:** v22.11.0 and above
- **For Laptop and PC:** Windows 10/11 or higher, Linux
- **For Android:** Download [Termux](https://f-droid.org/en/packages/com.termux/)

---

# 🚀 Installation & Usage

### 1️⃣ Install Node.js

- **Windows/Linux:** [Node.js LTS](https://nodejs.org/en/download)
- **Termux:** Run the following commands:

```bash
apt update && apt upgrade -y && apt install -y nodejs-lts git
```

### 2️⃣ Install Tool

- Run the following command in terminal:

```bash
git clone https://github.com/lawerth/OwO-Grinder.git
cd OwO-Grinder
npm install
```

### 3️⃣ Usage

#### 🔸 Normal Usage (Interactive Command Line User Interface):

For running the tool, please use the following command (inside tool folder):

```bash
npm start
```

##### 🔸 CLI usage (Command Line Interface):

```bash
node . [command] [options]
npm start [command] [options]
npm start -- -- [options]

# Example
npm start generate config-sample.json # generate config-sample.json
npm start import config.json # Trigger auto import and run with given config.json

# CLI Options
-s, --skip-check-update # Skip the update check
-u, --update # Update without asking
-v, --verbose # Enable debug
```

# ⚙️ Configuration Guide

**Generate sample config**: Use `npm start generate config-sample.json` to create a template

```js
{
    "username": "your_username", // Optional: Display name (can be ignored)
    "token": "your_discord_token", // Required: Your Discord account token
    "guildID": "guild_id", // Optional: Server ID where the bot operates
    "channelID": [ // Required: Array of channel IDs for farming (at least one)
        "channel_id_1",
        "channel_id_2",
        "channel_id_3"
    ],
    "wayNotify": [ // Choose notification methods: "webhook", "dms", "call", "music", "popup", "ntfy"
        "webhook"
    ],
    "webhookURL": "https://discord.com/api/webhooks/...", // Required if using webhook notification
    "adminID": "your_user_id", // Required for dms/call notifications, command usage, send cookie/clover, and webhook message mention
    "musicPath": "./path/to/music.mp3", // Required if using music notification
    "prefix": "!", // Command prefix for selfbot commands
    "captchaAPI": "yescaptcha", // Available options: "yescaptcha"
    "apiKey": "yescaptcha_api_key", // Required if captchaAPI is set
    "autoHuntbot": true, // Enable/disable huntbot automation
    "autoTrait": "efficiency", // Options: "efficiency", "duration", "cost", "gain", "experience", "radar"
    "useOurHuntbotAPI": true, // Use Our OwO Grinder API: Solves huntbot captchas
    "autoPray": [ // Auto pray/curse commands.
        "pray", //You can change value "curse"
        "pray user_id_here", // You can target specific users
        "curse user_id_here"
    ],
    "autoGem": 1, // 0: disabled, 1: upgrade fabled→common, -1: downgrade common→fabled
    "gemTier": ["common", "uncommon", "rare", "epic", "mythical", "legendary", "fabled"], // Gem tiers to use (when autoGem is enabled)
    "useSpecialGem": false, // Use special gems
    "autoLootbox": true, // Auto use regular lootboxes
    "autoFabledLootbox": false, // Auto use fabled lootboxes
    "autoQuote": [
        "owo", // Send owo/uwu randomly
        "quote" // Send quotes randomly
    ],
    "autoRPP": [ // Other auto commands
        "run",
        "pup",
        "piku"
    ],
    "autoDaily": true, // Auto claim daily rewards
    "autoCookie": true, // To use this, "adminID" option must be set
    "autoClover": true, // To use this, "adminID" option must be set
    "autoSell": true, // Auto sell animals when cash runs out
    "autoSleep": true, // Create random pause gaps to avoid captcha (5-20 mins)
    "autoReload": true, // Auto reload config daily
    "autoResume": true, // Auto resume after solving captcha
}
```

<div align="center">
    <h3>📞 Need Help?</h3>
    <h4><a href="https://discord.gg/3XGwmERAk3">Join Our Discord Server</a></h4>
</div>

<br>

<div align="center">
    <h3>⭐ Star This Repository</h3>
    <p>If you find this tool useful, please consider giving it a star ❤️</p>
</div>
