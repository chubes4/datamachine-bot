const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDataDirectory() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function readJSON(filename, defaultValue = {}) {
	ensureDataDirectory();

	const filePath = path.join(DATA_DIR, filename);

	try {
		if (!fs.existsSync(filePath)) {
			return defaultValue;
		}

		const data = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error(`Error reading ${filename}:`, error.message);
		return defaultValue;
	}
}

function writeJSON(filename, data) {
	ensureDataDirectory();

	const filePath = path.join(DATA_DIR, filename);
	const tempPath = `${filePath}.tmp`;

	try {
		fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
		fs.renameSync(tempPath, filePath);
		return true;
	} catch (error) {
		console.error(`Error writing ${filename}:`, error.message);

		if (fs.existsSync(tempPath)) {
			fs.unlinkSync(tempPath);
		}

		return false;
	}
}

module.exports = {
	readJSON,
	writeJSON,
	ensureDataDirectory
};
