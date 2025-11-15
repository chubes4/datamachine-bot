const { readJSON, writeJSON } = require('../utils/jsonFileManager');

const SESSIONS_FILE = 'chat_sessions.json';
const GUILD_DEFAULTS_FILE = 'guild_defaults.json';
const SESSION_EXPIRY_HOURS = 24;

function getUserSession(userId, guildId, siteName) {
	const sessions = readJSON(SESSIONS_FILE, {});
	const sessionKey = `${userId}_${guildId}_${siteName}`;

	if (sessions[sessionKey]) {
		const session = sessions[sessionKey];

		const expiryTime = new Date(session.lastUsed);
		expiryTime.setHours(expiryTime.getHours() + SESSION_EXPIRY_HOURS);

		if (new Date() < expiryTime) {
			return session.sessionId;
		} else {
			delete sessions[sessionKey];
			writeJSON(SESSIONS_FILE, sessions);
		}
	}

	return null;
}

function updateSession(userId, guildId, siteName, sessionId, metadata = {}) {
	const sessions = readJSON(SESSIONS_FILE, {});
	const sessionKey = `${userId}_${guildId}_${siteName}`;

	sessions[sessionKey] = {
		sessionId: sessionId,
		lastUsed: new Date().toISOString(),
		...metadata
	};

	return writeJSON(SESSIONS_FILE, sessions);
}

function getSiteForUser(guildId, siteOverride = null) {
	if (siteOverride) {
		return siteOverride;
	}

	const defaults = readJSON(GUILD_DEFAULTS_FILE, {});
	if (defaults[guildId]) {
		return defaults[guildId];
	}

	const sites = readJSON('wordpress_sites.json', {});
	const siteUrls = Object.keys(sites);

	if (siteUrls.length === 0) {
		return null;
	}

	if (siteUrls.length === 1) {
		return siteUrls[0];
	}

	const sortedSites = siteUrls.sort((a, b) => {
		return new Date(sites[a].addedAt) - new Date(sites[b].addedAt);
	});

	return sortedSites[0];
}

function setDefaultSite(guildId, siteName) {
	const defaults = readJSON(GUILD_DEFAULTS_FILE, {});
	defaults[guildId] = siteName;
	return writeJSON(GUILD_DEFAULTS_FILE, defaults);
}

function clearUserSession(userId, guildId, siteName) {
	const sessions = readJSON(SESSIONS_FILE, {});
	const sessionKey = `${userId}_${guildId}_${siteName}`;

	if (sessions[sessionKey]) {
		delete sessions[sessionKey];
		writeJSON(SESSIONS_FILE, sessions);
		console.log(`Cleared session for ${sessionKey}`);
		return true;
	}

	return false;
}

function cleanExpiredSessions() {
	const sessions = readJSON(SESSIONS_FILE, {});
	let cleaned = 0;

	const now = new Date();

	Object.keys(sessions).forEach(key => {
		const session = sessions[key];
		const expiryTime = new Date(session.lastUsed);
		expiryTime.setHours(expiryTime.getHours() + SESSION_EXPIRY_HOURS);

		if (now >= expiryTime) {
			delete sessions[key];
			cleaned++;
		}
	});

	if (cleaned > 0) {
		writeJSON(SESSIONS_FILE, sessions);
		console.log(`Cleaned ${cleaned} expired sessions`);
	}

	return cleaned;
}

module.exports = {
	getUserSession,
	updateSession,
	getSiteForUser,
	setDefaultSite,
	clearUserSession,
	cleanExpiredSessions
};
