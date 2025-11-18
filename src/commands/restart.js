const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const data = new SlashCommandBuilder()
	.setName('restart')
	.setDescription('Restart the bot (admin only)')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
	const response = await interaction.reply({ content: 'Restarting bot...' }).then(msg => msg.fetch());

	const restartInfo = {
		channelId: interaction.channelId,
		messageId: response.id,
		timestamp: Date.now()
	};

	const restartFilePath = path.join(__dirname, '..', '..', 'data', 'restart_info.json');
	fs.writeFileSync(restartFilePath, JSON.stringify(restartInfo, null, 2));

	setTimeout(() => process.exit(0), 500);
}

module.exports = { data, execute };
