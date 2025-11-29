const { sendChatMessage } = require('../services/datamachine');
const { getUserSession, updateSession, getSiteForUser } = require('../services/sessionManager');
const { formatResponse, splitMessage } = require('../utils/responseFormatter');
const { readJSON } = require('../utils/jsonFileManager');

async function handleMessage(message, client) {
	const isDM = message.channel.type === 1;
	const isMention = !isDM && message.mentions.has(client.user);

	console.log('[Message Handler] Received message:', {
		isDM,
		isMention,
		channelType: message.channel.type,
		hasContent: !!message.content,
		contentLength: message.content?.length || 0,
		authorBot: message.author.bot,
		guildId: message.guildId || 'dm'
	});

	if (!isDM && !isMention) {
		console.log('[Message Handler] Ignoring: not DM and not mention');
		return;
	}

	if (message.author.bot) {
		console.log('[Message Handler] Ignoring: message from bot');
		return;
	}

	let content = message.content;

	if (isMention) {
		const beforeStrip = content;
		content = content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim();
		console.log('[Message Handler] Mention detected:', {
			beforeStrip,
			afterStrip: content,
			botUserId: client.user.id
		});
	}

	if (!content) {
		console.log('[Message Handler] Ignoring: empty content after processing');
		return;
	}

	const guildId = message.guildId || 'dm';
	const userId = message.author.id;

	const sites = readJSON('wordpress_sites.json', {});
	const siteUrl = getSiteForUser(guildId);

	if (!siteUrl || !sites[siteUrl]) {
		await message.reply('No WordPress sites configured. An admin needs to run `/sites add` to add a site.');
		return;
	}

	const siteConfig = sites[siteUrl];

	await message.channel.sendTyping();

	const typingInterval = setInterval(() => {
		message.channel.sendTyping().catch(() => clearInterval(typingInterval));
	}, 5000);

	try {
		const existingSession = getUserSession(userId, guildId, siteUrl);

		const result = await sendChatMessage(siteConfig, content, existingSession);

		clearInterval(typingInterval);

		if (!result.success) {
			console.error('[Message Handler] Chat failed:', {
				error: result.error,
				siteUrl: siteUrl,
				username: siteConfig.username,
				hadExistingSession: !!existingSession,
				sessionId: existingSession
			});
			await message.reply(`Error: ${result.error}`);
			return;
		}

		updateSession(userId, guildId, siteUrl, result.sessionId, {
			messageCount: result.metadata.message_count || 0
		});

		const formattedResponse = formatResponse(result.response, result.toolCalls);
		const messageParts = splitMessage(formattedResponse);

		for (let i = 0; i < messageParts.length; i++) {
			if (i === 0) {
				await message.reply(messageParts[i]);
			} else {
				await message.channel.send(messageParts[i]);
			}
		}

		if (result.warning) {
			await message.channel.send(`⚠️ ${result.warning}`);
		}
	} catch (error) {
		clearInterval(typingInterval);
		console.error('Error handling message:', error);
		await message.reply('An unexpected error occurred while processing your message.');
	}
}

module.exports = { handleMessage };
