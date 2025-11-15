const DISCORD_MAX_LENGTH = 2000;

function formatResponse(content, toolCalls = []) {
	let formattedContent = content;

	if (toolCalls.length > 0) {
		const toolNames = toolCalls.map(tc => tc.function?.name || tc.name).filter(Boolean);
		const toolIndicator = `\n\n*[Used tools: ${toolNames.join(', ')}]*`;

		if ((formattedContent + toolIndicator).length <= DISCORD_MAX_LENGTH) {
			formattedContent += toolIndicator;
		}
	}

	return formattedContent;
}

function splitMessage(content, maxLength = DISCORD_MAX_LENGTH) {
	if (content.length <= maxLength) {
		return [content];
	}

	const parts = [];
	let currentPart = '';

	const lines = content.split('\n');

	for (const line of lines) {
		if ((currentPart + line + '\n').length > maxLength) {
			if (currentPart) {
				parts.push(currentPart.trim());
				currentPart = '';
			}

			if (line.length > maxLength) {
				let remainingLine = line;
				while (remainingLine.length > 0) {
					parts.push(remainingLine.substring(0, maxLength));
					remainingLine = remainingLine.substring(maxLength);
				}
			} else {
				currentPart = line + '\n';
			}
		} else {
			currentPart += line + '\n';
		}
	}

	if (currentPart) {
		parts.push(currentPart.trim());
	}

	return parts;
}

module.exports = {
	formatResponse,
	splitMessage
};
