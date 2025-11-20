const axios = require('axios');
const { decrypt } = require('./encryption');

async function sendChatMessage(siteConfig, message, sessionId = null) {
	try {
		const { url, username, encryptedPassword } = siteConfig;
		const password = decrypt(encryptedPassword);

		const endpoint = `${url.replace(/\/$/, '')}/wp-json/datamachine/v1/chat`;

		const payload = {
			message: message
		};

		if (sessionId) {
			payload.session_id = sessionId;
		}

		const auth = Buffer.from(`${username}:${password}`).toString('base64');

		console.log('[Data Machine API] Sending chat request:', {
			endpoint: endpoint,
			username: username,
			hasSessionId: !!sessionId,
			sessionId: sessionId || 'none'
		});

		const response = await axios.post(endpoint, payload, {
			headers: {
				'Authorization': `Basic ${auth}`,
				'Content-Type': 'application/json'
			},
			timeout: 60000
		});

		if (response.data && response.data.success) {
			return {
				success: true,
				sessionId: response.data.data.session_id,
				response: response.data.data.response || '',
				toolCalls: response.data.data.tool_calls || [],
				conversation: response.data.data.conversation || [],
				metadata: response.data.data.metadata || {}
			};
		} else {
			return {
				success: false,
				error: response.data.message || 'Unknown error from Data Machine API'
			};
		}
	} catch (error) {
		console.error('[Data Machine API] Request failed:', {
			url: siteConfig.url,
			username: siteConfig.username,
			sessionId: sessionId,
			status: error.response?.status,
			statusText: error.response?.statusText,
			errorData: error.response?.data,
			errorMessage: error.message
		});

		let errorMessage = 'Failed to communicate with Data Machine';

		if (error.response) {
			if (error.response.status === 401) {
				errorMessage = 'Authentication failed. Check your WordPress application password.';
			} else if (error.response.status === 404) {
				errorMessage = 'Data Machine endpoint not found. Is the plugin installed and activated?';
			} else if (error.response.data && error.response.data.message) {
				errorMessage = error.response.data.message;
			} else {
				errorMessage = `API error (${error.response.status}): ${error.response.statusText}`;
			}
		} else if (error.request) {
			errorMessage = 'No response from server. Check the site URL and network connection.';
		} else {
			errorMessage = error.message;
		}

		return {
			success: false,
			error: errorMessage
		};
	}
}

async function validateSiteConnection(url, username, encryptedPassword) {
	try {
		const password = decrypt(encryptedPassword);
		const endpoint = `${url.replace(/\/$/, '')}/wp-json/datamachine/v1/chat`;

		const auth = Buffer.from(`${username}:${password}`).toString('base64');

		const response = await axios.post(endpoint, {
			message: 'test'
		}, {
			headers: {
				'Authorization': `Basic ${auth}`,
				'Content-Type': 'application/json'
			},
			timeout: 20000
		});

		return {
			success: true,
			message: 'Connection successful!'
		};
	} catch (error) {
		if (error.response && error.response.status === 401) {
			return {
				success: false,
				error: 'Authentication failed. Check your application password.'
			};
		} else if (error.response && error.response.status === 404) {
			return {
				success: false,
				error: 'Data Machine endpoint not found. Is the plugin installed?'
			};
		} else if (error.request) {
			return {
				success: false,
				error: 'Could not connect to site. Check the URL.'
			};
		} else {
			return {
				success: false,
				error: error.message
			};
		}
	}
}

module.exports = {
	sendChatMessage,
	validateSiteConnection
};
