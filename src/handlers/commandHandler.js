const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const commands = new Map();

function loadCommands() {
	const commandsPath = path.join(__dirname, '..', 'commands');
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ('data' in command && 'execute' in command) {
			commands.set(command.data.name, command);
		} else {
			console.warn(`Command at ${file} is missing required "data" or "execute" property`);
		}
	}

	console.log(`Loaded ${commands.size} commands`);
}

async function handleInteraction(interaction) {
	if (interaction.isAutocomplete()) {
		const command = commands.get(interaction.commandName);
		if (command) {
			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Autocomplete error for ${interaction.commandName}:`, error);
			}
		}
		return;
	}

	if (!interaction.isChatInputCommand()) {
		return;
	}

	const command = commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(`Error executing ${interaction.commandName}:`, error);

		const errorMessage = 'There was an error executing this command.';

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply(errorMessage);
		} else {
			await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
		}
	}
}

function getCommands() {
	return Array.from(commands.values()).map(cmd => cmd.data);
}

module.exports = {
	loadCommands,
	handleInteraction,
	getCommands
};
