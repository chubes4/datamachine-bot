const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.DATAMACHINE_ENCRYPTION_KEY;

function getKey() {
	if (!KEY) {
		throw new Error('DATAMACHINE_ENCRYPTION_KEY environment variable is not set');
	}

	if (KEY.length !== 32) {
		throw new Error('DATAMACHINE_ENCRYPTION_KEY must be exactly 32 characters');
	}

	return Buffer.from(KEY, 'utf8');
}

function encrypt(text) {
	try {
		const key = getKey();
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		return iv.toString('hex') + ':' + encrypted;
	} catch (error) {
		throw new Error(`Encryption failed: ${error.message}`);
	}
}

function decrypt(encryptedText) {
	try {
		const key = getKey();
		const parts = encryptedText.split(':');

		if (parts.length !== 2) {
			throw new Error('Invalid encrypted text format');
		}

		const iv = Buffer.from(parts[0], 'hex');
		const encrypted = parts[1];

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		throw new Error(`Decryption failed: ${error.message}`);
	}
}

module.exports = {
	encrypt,
	decrypt
};
