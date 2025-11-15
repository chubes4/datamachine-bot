const { SlashCommandBuilder } = require('discord.js');
const { sendChatMessage } = require('../services/datamachine');
const { getUserSession, updateSession, getSiteForUser } = require('../services/sessionManager');
const { formatResponse, splitMessage } = require('../utils/responseFormatter');
const { readJSON } = require('../utils/jsonFileManager');

const data = new SlashCommandBuilder()
	.setName('chat')
	.setDescription('Chat with Data Machine AI')
	.addStringOption(option =>
		option
			.setName('message')
			.setDescription('Your message to Data Machine')
			.setRequired(true)
	)
	.addStringOption(option =>
		option
			.setName('site')
			.setDescription('WordPress site URL to use (optional)')
			.setRequired(false)
			.setAutocomplete(true)
	);

async function execute(interaction) {
	if (interaction.isAutocomplete()) {
		const sites = readJSON('wordpress_sites.json', {});
		const choices = Object.keys(sites).map(url => ({
			name: url,
			value: url
		}));
		await interaction.respond(choices.slice(0, 25));
		return;
	}

	await interaction.deferReply();

	const message = interaction.options.getString('message');
	const siteOverride = interaction.options.getString('site');
	const guildId = interaction.guildId || 'dm';
	const userId = interaction.user.id;

	const sites = readJSON('wordpress_sites.json', {});
	const siteUrl = siteOverride ? siteOverride.replace(/\/$/, '') : getSiteForUser(guildId);

	if (!siteUrl || !sites[siteUrl]) {
		const errorMsg = siteOverride
			? `Site ${siteOverride} not found. Use \`/sites list\` to see available sites.`
			: 'No WordPress sites configured. An admin needs to run `/sites add` to add a site.';

		await interaction.editReply(errorMsg);
		return;
	}

	const siteConfig = sites[siteUrl];

	try {
		const existingSession = getUserSession(userId, guildId, siteUrl);

		const result = await sendChatMessage(siteConfig, message, existingSession);

		if (!result.success) {
			await interaction.editReply(`Error: ${result.error}`);
			return;
		}

		updateSession(userId, guildId, siteUrl, result.sessionId, {
			messageCount: result.metadata.message_count || 0
		});

		const formattedResponse = formatResponse(result.response, result.toolCalls);
		const messageParts = splitMessage(formattedResponse);

		for (let i = 0; i < messageParts.length; i++) {
			if (i === 0) {
				await interaction.editReply(messageParts[i]);
			} else {
				await interaction.followUp(messageParts[i]);
			}
		}
	} catch (error) {
		console.error('Error executing chat command:', error);
		await interaction.editReply('An unexpected error occurred while processing your message.');
	}
}

module.exports = { data, execute };
