# CLAUDE.md

Developer documentation for Data Machine Bot - Discord integration for Data Machine's chat endpoint.

## Project Overview

Data Machine Bot provides a natural chat interface to Data Machine's AI-powered WordPress automation workflows through Discord. The bot supports direct messages, server mentions, and slash commands with persistent conversation sessions.

**Version**: 0.1.1

**Architecture Philosophy**: Platform-agnostic service layer with platform-specific interaction handlers. Currently implements Discord; designed for easy Slack integration.

## Architecture

### Multi-Platform Design

The codebase separates platform-specific code from shared business logic:

```
Platform Layer (Discord-specific):
├── handlers/messageHandler.js     # Discord message events
├── handlers/commandHandler.js     # Discord slash commands
├── commands/                      # Discord command definitions
└── index.js                       # Discord client initialization

Service Layer (Platform-agnostic):
├── services/datamachine.js        # Data Machine REST API client
├── services/encryption.js         # AES-256 password encryption
├── services/sessionManager.js     # Chat session persistence
└── utils/                         # Shared utilities
```

**Future Slack Integration**: Create `src/platforms/slack/` with Slack-specific handlers that use the same service layer.

### Key Components

**Message Handler** (`handlers/messageHandler.js`):
- Detects DMs and bot mentions
- Determines which WordPress site to use (guild default)
- Retrieves or creates chat sessions
- Manages typing indicators during API calls
- Formats and splits responses for Discord's 2000-char limit

**Command Handler** (`handlers/commandHandler.js`):
- Auto-loads commands from `commands/` directory
- Routes slash command interactions
- Comprehensive error handling with user-friendly messages

**Data Machine API Client** (`services/datamachine.js`):
- POST requests to `/wp-json/datamachine/v1/chat`
- WordPress Application Password authentication (Basic Auth)
- Session continuity via `session_id` parameter
- Compatible with Data Machine v0.2.0+ Universal Engine architecture
- Detailed error messages for different failure modes

**Session Manager** (`services/sessionManager.js`):
- Per-user, per-site session tracking
- 24-hour automatic expiration
- Guild-based default site management
- File-based persistence (no database needed)

**Encryption Service** (`services/encryption.js`):
- AES-256-CBC encryption for application passwords
- Random IV generation per encryption
- Environment-based encryption key

## Data Storage

All data stored in `data/` directory (gitignored):

**wordpress_sites.json**:
```json
{
  "site_name": {
    "url": "https://example.com",
    "username": "discord_username",
    "encryptedPassword": "iv:encrypted_data",
    "addedBy": "discord_user_id",
    "addedAt": "2024-01-02T12:00:00.000Z"
  }
}
```

**chat_sessions.json**:
```json
{
  "userId_guildId_siteName": {
    "sessionId": "session_abc123",
    "lastUsed": "2024-01-02T14:30:00.000Z",
    "messageCount": 5
  }
}
```

**guild_defaults.json**:
```json
{
  "discord_guild_id": "site_name"
}
```

## Interaction Patterns

### Direct Message Flow

1. User sends DM to bot
2. `messageHandler` detects DM (channel type === 1)
3. Determines site from user's last interaction or DM defaults
4. Retrieves existing session or creates new one
5. Sends typing indicator
6. Calls Data Machine API
7. Formats response and replies

### Server Mention Flow

1. User mentions bot in server message
2. `messageHandler` detects mention
3. Strips mention prefix from content
4. Uses guild's default site
5. Same session/API/response flow as DM

### Slash Command Flow

1. User executes `/chat` or `/sites` command
2. `commandHandler` routes to appropriate command file
3. Command handles interaction with deferred reply pattern
4. Same API integration as message handler

## Session Management

**Session Key Format**: `${userId}_${guildId}_${siteName}`

**Session Lifecycle**:
1. First message creates new session (no `session_id` sent to API)
2. API returns `session_id` which is stored locally
3. Subsequent messages within 24 hours use stored `session_id`
4. Sessions expire after 24 hours of inactivity
5. Expired sessions cleaned up hourly

**Session Isolation**:
- Per-user: Different users have separate sessions
- Per-site: Same user chatting with different sites has separate sessions
- Per-guild: DMs and different servers maintain separate contexts

## Security

**Application Password Encryption**:
- AES-256-CBC with random IV per encryption
- Key stored in environment variable (never in code/data)
- Decrypted only when making API requests
- Invalid passwords rejected during site addition

**Admin-Only Operations**:
- All `/sites` commands require `ADMINISTRATOR` Discord permission
- Site configurations are server-wide (not per-user)
- Users cannot view encrypted passwords

**Input Validation**:
- URL format validation before site addition
- Connection testing before saving site config
- Empty message rejection

## Error Handling

**Graceful Degradation**:
- API failures return user-friendly error messages
- Missing sites prompt admin setup instructions
- Encryption errors caught and reported
- Unhandled rejections logged but don't crash bot

**Error Message Strategy**:
- 401: "Authentication failed. Check your WordPress application password."
- 404: "Data Machine endpoint not found. Is the plugin installed?"
- Network: "No response from server. Check the site URL."
- Generic: Detailed error for debugging without exposing sensitive data

## Adding Features

### Adding a New Command

1. Create `src/commands/newcommand.js`:
```javascript
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('newcommand')
	.setDescription('Command description');

async function execute(interaction) {
	await interaction.reply('Response');
}

module.exports = { data, execute };
```

2. Command auto-loaded on bot start
3. Auto-registered with Discord API

### Adding Slack Platform

1. Create `src/platforms/slack/` directory
2. Implement Slack-specific handlers using `@slack/bolt`
3. Reuse `services/` layer without modifications
4. Update `src/index.js` to launch both platforms

**Shared services require no changes** - same `datamachine.js`, `sessionManager.js`, `encryption.js` work for all platforms.

## Deployment

**Development**:
```bash
npm install
cp .env.example .env
# Edit .env
npm run dev  # Uses nodemon for auto-restart
```

**Production**:
```bash
./build.sh
# Creates datamachine-bot.tar.gz and datamachine-bot.zip
# Deploy to server and run with PM2
```

**PM2 Management**:
```bash
pm2 start src/index.js --name datamachine-bot
pm2 logs datamachine-bot
pm2 restart datamachine-bot
pm2 stop datamachine-bot
```

## Inspired by mjpin

This bot adapts proven patterns from the mjpin Discord bot:

1. **Deferred Replies**: Long-running API calls use `deferReply()` to prevent timeouts
2. **File-Based Persistence**: Simple JSON files instead of database complexity
3. **Auto-Loading Commands**: Command files auto-discovered and registered
4. **Service Layer Separation**: External APIs isolated in dedicated service files
5. **Comprehensive Error Handling**: Multiple fallback strategies for robust operation
6. **Typing Indicators**: Visual feedback during API calls

## Testing Checklist

**Before deploying**:
- [ ] Test DM conversation flow
- [ ] Test server mention flow
- [ ] Test `/chat` slash command
- [ ] Test `/sites add` with valid/invalid credentials
- [ ] Test `/sites set-default` and verify default used
- [ ] Test session continuity (multiple messages)
- [ ] Test session expiration (24-hour timeout)
- [ ] Test message splitting (responses > 2000 chars)
- [ ] Test error handling (invalid site, network failure)
- [ ] Verify encrypted passwords never logged

## Troubleshooting

**Bot doesn't respond to mentions**:
- Verify Message Content intent enabled in Discord Developer Portal
- Check bot has Read Messages permission in channel

**"Authentication failed" error**:
- Verify application password copied correctly (no extra spaces)
- Check username matches Discord username used during site addition
- Test credentials manually with curl/Postman

**"Session not found" errors**:
- Sessions expire after 24 hours
- Bot restart doesn't preserve sessions (by design)
- Each site has separate sessions

**Encrypted password errors**:
- Verify `DATAMACHINE_ENCRYPTION_KEY` is exactly 32 characters
- Key must be consistent (changing key invalidates existing encrypted passwords)
- Generate new key: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

## Development Philosophy

**KISS Principle**: Favor direct, centralized solutions over complex abstractions

**Single Responsibility**: Each file has one clear purpose
- `messageHandler.js` - Discord message events only
- `datamachine.js` - API communication only
- `sessionManager.js` - Session persistence only

**No Fallbacks**: No placeholder fallbacks, legacy fallbacks, or dual support patterns

**Platform-Agnostic Services**: Business logic works regardless of Discord/Slack/etc.

## Future Enhancements

**Potential additions**:
- Slash command autocomplete for site selection
- Rich embeds for formatted AI responses
- Conversation history command (`/history`)
- Session reset command (`/reset`)
- Multi-server session sharing (advanced use case)
- Slack platform integration
- Web dashboard for site management

**Not planned**:
- Model/provider selection (handled in WordPress)
- Conversation forking/branching
- Message editing/regeneration (complexity vs value)
