# Data Machine Bot

A Discord bot that integrates with Data Machine's chat endpoint, allowing users to have natural conversations with AI-powered WordPress automation workflows.

## Features

- 💬 Natural chat interface - DM the bot or mention it in servers
- 🌐 Multi-site support for different WordPress installations
- 🔄 Persistent conversations with 24-hour session management
- 🔒 Secure authentication with AES-256 encrypted application passwords
- 🛡️ Admin-only site management
- 🏗️ Multi-platform ready architecture (Discord now, Slack later)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Discord Bot

1. Create a bot at https://discord.com/developers/applications
2. Enable these bot permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
3. Enable these privileged gateway intents:
   - Message Content Intent
   - Server Members Intent
4. Copy your bot token and application ID

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATAMACHINE_DISCORD_TOKEN` - Your Discord bot token
- `DATAMACHINE_DISCORD_CLIENT_ID` - Your Discord application ID
- `DATAMACHINE_DISCORD_GUILD_ID` - Your test Discord server ID
- `DATAMACHINE_ENCRYPTION_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

### 4. Create WordPress Application Password

In your WordPress admin (User → Profile):
1. Scroll to "Application Passwords"
2. Enter name: "Data Machine Bot"
3. Click "Add New Application Password"
4. Copy the generated password (format: `xxxx xxxx xxxx xxxx`)

### 5. Configure Sites (Admin Only)

```
/sites add name:myblog url:https://myblog.com password:xxxx-xxxx-xxxx-xxxx
/sites set-default name:myblog
```

### 6. Start Chatting

**Direct Message:**
```
How do I create a pipeline for Twitter posts?
```

**Server Mention:**
```
@DataMachine help me build an RSS to WordPress workflow
```

**Slash Command:**
```
/chat message:Create a pipeline that fetches from Reddit and posts to Bluesky
```

## Commands

### User Commands

- `/chat message:"..." [site:"..."]` - Chat with Data Machine (optional slash command interface)

### Admin Commands (Requires Administrator Permission)

- `/sites add name:"..." url:"..." password:"..."` - Add a WordPress site
- `/sites list` - Show all configured sites
- `/sites set-default name:"..."` - Set default site for this server
- `/sites remove name:"..."` - Remove a site configuration

## How It Works

1. **Natural Conversations**: The bot maintains chat sessions per user, per site for 24 hours
2. **WordPress Integration**: Connects to Data Machine's REST API endpoint (`/wp-json/datamachine/v1/chat`)
3. **Secure Storage**: Application passwords are encrypted before storage using AES-256
4. **Multi-Site**: Each Discord server can have its own default WordPress site
5. **AI Provider**: Uses AI provider and model configured in WordPress Data Machine settings

## Requirements

- Node.js 16+
- WordPress site with Data Machine plugin v0.2.3+
- Discord bot with Message Content intent enabled

## Production Deployment

### Build

```bash
./build.sh
```

### Deploy with PM2

```bash
# Copy datamachine-bot-production.tar.gz to server
tar -xzf datamachine-bot-production.tar.gz
npm install --production
cp .env.example .env
# Edit .env with your credentials
pm2 start src/index.js --name datamachine-bot
pm2 save
```

## Architecture

```
src/
├── index.js                  # Discord bot initialization
├── handlers/
│   ├── messageHandler.js     # DM and mention handling
│   └── commandHandler.js     # Slash command routing
├── commands/
│   ├── chat.js              # /chat command
│   └── sites.js             # /sites management
├── services/
│   ├── datamachine.js       # Data Machine API client
│   ├── encryption.js        # AES-256 encryption
│   └── sessionManager.js    # Chat session tracking
└── utils/
    ├── jsonFileManager.js   # File-based persistence
    └── responseFormatter.js # Discord message formatting
```

Ready for future Slack integration with shared service layer.

## Development

See `CLAUDE.md` for developer documentation and architecture details.

## License

MIT