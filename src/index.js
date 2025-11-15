require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { loadCommands, handleInteraction, getCommands } = require('./handlers/commandHandler');
const { handleMessage } = require('./handlers/messageHandler');
const { cleanExpiredSessions } = require('./services/sessionManager');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent
	]
});

const token = process.env.DATAMACHINE_DISCORD_TOKEN;
const clientId = process.env.DATAMACHINE_DISCORD_CLIENT_ID;
const guildId = process.env.DATAMACHINE_DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
	console.error('Missing required environment variables. Check your .env file.');
	process.exit(1);
}

loadCommands();

client.once('clientReady', async () => {
	console.log(`Logged in as ${client.user.tag}`);

	try {
		const rest = new REST({ version: '10' }).setToken(token);

		console.log('Registering slash commands...');

		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: getCommands() }
		);

		console.log('Slash commands registered successfully');
	} catch (error) {
		console.error('Error registering commands:', error);
	}

	const fs = require('fs');
	const path = require('path');
	const restartFilePath = path.join(__dirname, '..', 'data', 'restart_info.json');

	if (fs.existsSync(restartFilePath)) {
		try {
			const restartInfo = JSON.parse(fs.readFileSync(restartFilePath, 'utf8'));
			const channel = await client.channels.fetch(restartInfo.channelId);
			const message = await channel.messages.fetch(restartInfo.messageId);
			await message.edit('Restart successful! ✅');
			fs.unlinkSync(restartFilePath);
			console.log('Restart confirmation sent');
		} catch (error) {
			console.error('Error handling restart confirmation:', error);
		}
	}

	cleanExpiredSessions();

	setInterval(() => {
		cleanExpiredSessions();
	}, 60 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
	await handleMessage(message, client);
});

client.on('interactionCreate', async (interaction) => {
	await handleInteraction(interaction);
});

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully');
	client.destroy();
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down gracefully');
	client.destroy();
	process.exit(0);
});

client.login(token).catch((error) => {
	console.error('Failed to login:', error);
	process.exit(1);
});
