const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON } = require('../utils/jsonFileManager');
const { encrypt } = require('../services/encryption');
const { validateSiteConnection } = require('../services/datamachine');
const { setDefaultSite, getSiteForUser } = require('../services/sessionManager');

const data = new SlashCommandBuilder()
	.setName('sites')
	.setDescription('Manage WordPress sites')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.addSubcommand(subcommand =>
		subcommand
			.setName('add')
			.setDescription('Add a WordPress site')
			.addStringOption(option =>
				option
					.setName('url')
					.setDescription('WordPress site URL (e.g., https://example.com)')
					.setRequired(true)
			)
			.addStringOption(option =>
				option
					.setName('username')
					.setDescription('WordPress username')
					.setRequired(true)
			)
			.addStringOption(option =>
				option
					.setName('password')
					.setDescription('WordPress application password (format: xxxx xxxx xxxx xxxx)')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('list')
			.setDescription('List all configured sites')
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('set-default')
			.setDescription('Set the default site for this server')
			.addStringOption(option =>
				option
					.setName('url')
					.setDescription('WordPress site URL')
					.setRequired(true)
					.setAutocomplete(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('remove')
			.setDescription('Remove a site configuration')
			.addStringOption(option =>
				option
					.setName('url')
					.setDescription('WordPress site URL')
					.setRequired(true)
			)
	);

async function execute(interaction) {
	if (interaction.isAutocomplete()) {
		return await handleAutocomplete(interaction);
	}

	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'add') {
		await handleAdd(interaction);
	} else if (subcommand === 'list') {
		await handleList(interaction);
	} else if (subcommand === 'set-default') {
		await handleSetDefault(interaction);
	} else if (subcommand === 'remove') {
		await handleRemove(interaction);
	}
}

async function handleAutocomplete(interaction) {
	const focusedOption = interaction.options.getFocused(true);

	if (focusedOption.name === 'url') {
		const sites = readJSON('wordpress_sites.json', {});
		const choices = Object.keys(sites).map(url => ({
			name: url,
			value: url
		}));

		await interaction.respond(choices.slice(0, 25));
	}
}

async function handleAdd(interaction) {
	await interaction.deferReply({ ephemeral: true });

	const url = interaction.options.getString('url').replace(/\/$/, '');
	const username = interaction.options.getString('username');
	const password = interaction.options.getString('password').replace(/\s/g, '');

	const sites = readJSON('wordpress_sites.json', {});

	if (sites[url]) {
		await interaction.editReply(`Site ${url} already exists. Remove it first if you want to update credentials.`);
		return;
	}

	const urlPattern = /^https?:\/\/.+/i;
	if (!urlPattern.test(url)) {
		await interaction.editReply('Invalid URL format. URL must start with http:// or https://');
		return;
	}

	try {
		const encryptedPassword = encrypt(password);

		const validationResult = await validateSiteConnection(url, username, encryptedPassword);

		if (!validationResult.success) {
			await interaction.editReply(`Connection failed: ${validationResult.error}`);
			return;
		}

		sites[url] = {
			url: url,
			username: username,
			encryptedPassword: encryptedPassword,
			addedBy: interaction.user.id,
			addedAt: new Date().toISOString()
		};

		writeJSON('wordpress_sites.json', sites);

		await interaction.editReply(`Site ${url} added successfully! Connection verified.`);
	} catch (error) {
		await interaction.editReply(`Error adding site: ${error.message}`);
	}
}

async function handleList(interaction) {
	const sites = readJSON('wordpress_sites.json', {});
	const guildId = interaction.guildId || 'dm';
	const defaultSite = getSiteForUser(guildId);

	if (Object.keys(sites).length === 0) {
		await interaction.reply({ content: 'No sites configured yet. Use `/sites add` to add one.', ephemeral: true });
		return;
	}

	let response = '**Configured WordPress Sites:**\n\n';

	for (const [siteUrl, config] of Object.entries(sites)) {
		const isDefault = siteUrl === defaultSite ? ' **(default)**' : '';
		response += `${config.url}${isDefault}\n`;
		response += `  Username: ${config.username}\n`;
		response += `  Added: ${new Date(config.addedAt).toLocaleDateString()}\n\n`;
	}

	await interaction.reply({ content: response, ephemeral: true });
}

async function handleSetDefault(interaction) {
	const url = interaction.options.getString('url').replace(/\/$/, '');
	const sites = readJSON('wordpress_sites.json', {});

	if (!sites[url]) {
		await interaction.reply({ content: `Site ${url} not found. Use \`/sites list\` to see available sites.`, ephemeral: true });
		return;
	}

	const guildId = interaction.guildId;

	if (!guildId) {
		await interaction.reply({ content: 'Default sites can only be set in a server, not in DMs.', ephemeral: true });
		return;
	}

	setDefaultSite(guildId, url);

	await interaction.reply({ content: `Default site for this server set to ${url}.`, ephemeral: true });
}

async function handleRemove(interaction) {
	const url = interaction.options.getString('url').replace(/\/$/, '');
	const sites = readJSON('wordpress_sites.json', {});

	if (!sites[url]) {
		await interaction.reply({ content: `Site ${url} not found.`, ephemeral: true });
		return;
	}

	delete sites[url];
	writeJSON('wordpress_sites.json', sites);

	await interaction.reply({ content: `Site ${url} removed successfully.`, ephemeral: true });
}

module.exports = { data, execute };
