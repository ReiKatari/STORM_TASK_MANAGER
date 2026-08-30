import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadSettings() {
	try {
		if (fs.existsSync(SETTINGS_FILE)) {
			return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
		}
	} catch (e) {
		console.warn(`Failed to load settings:`, e.message);
	}
	return null;
}

export function saveSettings(settings) {
	try {
		fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
	} catch (e) {
		console.warn(`Failed to save settings:`, e.message);
	}
}
