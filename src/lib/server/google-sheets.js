import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let sheetsClient = null;

async function getAuthClient() {
	const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './google-credentials.json';
	
	if (!fs.existsSync(keyPath)) {
		console.warn(`Google credentials file not found at ${keyPath}. Google Sheets export will be unavailable.`);
		return null;
	}

	const auth = new google.auth.GoogleAuth({
		keyFile: keyPath,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});
	
	return auth;
}

async function getSheetsClient() {
	if (!sheetsClient) {
		const auth = await getAuthClient();
		if (!auth) return null;
		sheetsClient = google.sheets({ version: 'v4', auth });
	}
	return sheetsClient;
}

/**
 * Преобразует номер столбца (1-based) в буквенное обозначение Google Sheets.
 * 1 -> A, 26 -> Z, 27 -> AA, 28 -> AB, ...
 */
function columnIndexToLetter(colIndex) {
	let letter = '';
	let num = colIndex;
	while (num > 0) {
		num--;
		letter = String.fromCharCode(65 + (num % 26)) + letter;
		num = Math.floor(num / 26);
	}
	return letter;
}

/**
 * Write data to Google Sheet
 * @param {string} spreadsheetId - Google Sheet key
 * @param {string} sheetName - Sheet/tab name
 * @param {Array<Array>} data - 2D array of data (first row = headers)
 * @param {boolean} append - If true, append data instead of replacing
 */
export async function writeToSheet(spreadsheetId, sheetName, data, append = false) {
	const sheets = await getSheetsClient();
	if (!sheets) {
		throw new Error('Google Sheets client not configured. Add service account credentials.');
	}

	if (!append) {
		// Вычисляем размеры новых данных
		const newCols = data.reduce((max, row) => Math.max(max, row.length), 0);
		const newLastCol = columnIndexToLetter(Math.max(newCols, 1));
		const newLastRow = data.length + 1; // +1 потому что данные начинаются с A2

		// ── Шаг 1: Узнаём количество строк СТАРЫХ данных ──
		// (нужно только для очистки лишних строк снизу)
		let oldLastRow = 0;
		try {
			const existing = await sheets.spreadsheets.values.get({
				spreadsheetId,
				range: `${sheetName}!A:A`,
				majorDimension: 'ROWS'
			});
			if (existing.data.values) {
				oldLastRow = existing.data.values.length;
			}
		} catch {
			// Лист может не существовать — ничего страшного
		}

		// ── Шаг 2: Записываем НОВЫЕ данные поверх старых (атомарная перезапись) ──
		// Таймштамп (Москва UTC+3)
		const now = new Date();
		const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
		const pad = (n) => String(n).padStart(2, '0');
		const timestamp = `${pad(msk.getUTCDate())}.${pad(msk.getUTCMonth() + 1)}.${msk.getUTCFullYear()} ${pad(msk.getUTCHours())}:${pad(msk.getUTCMinutes())}:${pad(msk.getUTCSeconds())}`;

		// Один batchUpdate: таймштамп A1 + данные A2:lastCol — мгновенная перезапись
		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId,
			resource: {
				valueInputOption: 'USER_ENTERED',
				data: [
					{
						range: `${sheetName}!A1`,
						values: [[timestamp]]
					},
					{
						range: `${sheetName}!A2:${newLastCol}${newLastRow}`,
						values: data
					}
				]
			}
		});

		// ── Шаг 3: Вычищаем лишние СТРОКИ снизу ──
		// Если старых строк было больше, очистить только нижний хвост
		// СТРОГО в пределах ширины выгружаемых данных (A:newLastCol),
		// чтобы НЕ задеть пользовательские столбцы правее (AE, AF и т.д.)
		if (oldLastRow > newLastRow) {
			try {
				await sheets.spreadsheets.values.clear({
					spreadsheetId,
					range: `${sheetName}!A${newLastRow + 1}:${newLastCol}${oldLastRow}`
				});
			} catch (e) {
				console.warn('Could not clear tail rows:', e.message);
			}
		}
	} else {
		const params = {
			spreadsheetId,
			range: `${sheetName}!A1`,
			valueInputOption: 'USER_ENTERED',
			resource: { values: data },
			insertDataOption: 'INSERT_ROWS'
		};
		await sheets.spreadsheets.values.append(params);
	}

	return { success: true, rows: data.length };
}

/**
 * Convert SQL result recordset to 2D array for Google Sheets
 */
export function recordsetToArray(recordset) {
	if (!recordset || recordset.length === 0) return [['No data']];
	
	const headers = Object.keys(recordset[0]);
	const rows = recordset.map(row => headers.map(h => {
		const val = row[h];
		if (val === null || val === undefined) return '';
		if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
		return String(val);
	}));
	
	return [headers, ...rows];
}
