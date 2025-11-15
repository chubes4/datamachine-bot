const { SlashCommandBuilder } = require('discord.js');
const { clearUserSession, getSiteForUser } = require('../services/sessionManager');
const { readJSON } = require('../utils/jsonFileManager');

const data = new SlashCommandBuilder()
	.setName('reset-session')
	.setDescription('Clear your current chat session and start fresh')
	.addStringOption(option =>
		option
			.setName('site')
			.setDescription('WordPress site URL (optional - clears session for default site if not specified)')
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

	const siteOverride = interaction.options.getString('site');
	const guildId = interaction.guildId || 'dm';
	const userId = interaction.user.id;

	const sites = readJSON('wordpress_sites.json', {});
	const siteUrl = siteOverride ? siteOverride.replace(/\/$/, '') : getSiteForUser(guildId);

	if (!siteUrl || !sites[siteUrl]) {
		const errorMsg = siteOverride
			? `Site ${siteOverride} not found. Use \`/sites list\` to see available sites.`
			: 'No WordPress sites configured.';

		await interaction.reply({ content: errorMsg, ephemeral: true });
		return;
	}

	const wasCleared = clearUserSession(userId, guildId, siteUrl);

	if (wasCleared) {
		await interaction.reply({
			content: `Session cleared for ${siteUrl}. Your next message will start a fresh conversation.`,
			ephemeral: true
		});
	} else {
		await interaction.reply({
			content: `No active session found for ${siteUrl}.`,
			ephemeral: true
		});
	}
}

module.exports = { data, execute };
