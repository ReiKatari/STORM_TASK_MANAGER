import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const THEMES = [
	{ id: 'light', name: 'Светлая', icon: 'light_mode' },
	{ id: 'dark', name: 'Тёмная', icon: 'dark_mode' },
	{ id: 'cyberpunk', name: 'Киберпанк', icon: 'electric_bolt' },
	{ id: 'neon', name: 'Неон', icon: 'blur_on' },
	{ id: 'dracula', name: 'Дракула', icon: 'nightlight' },
	{ id: 'nord', name: 'Норд', icon: 'ac_unit' },
	{ id: 'solarized', name: 'Соляризед', icon: 'wb_sunny' },
	{ id: 'monokai', name: 'Монокай', icon: 'code' },
	{ id: 'ocean', name: 'Океан', icon: 'water' },
	{ id: 'forest', name: 'Лесная', icon: 'forest' },
];

function createThemeStore() {
	const initial = browser ? (localStorage.getItem('tm-theme') || 'dark') : 'dark';
	const { subscribe, set, update } = writable(initial);

	return {
		subscribe,
		themes: THEMES,
		setTheme(themeId) {
			if (browser) {
				localStorage.setItem('tm-theme', themeId);
				document.documentElement.setAttribute('data-theme', themeId);
			}
			set(themeId);
		},
		toggle() {
			update(current => {
				const idx = THEMES.findIndex(t => t.id === current);
				const next = THEMES[(idx + 1) % THEMES.length].id;
				if (browser) {
					localStorage.setItem('tm-theme', next);
					document.documentElement.setAttribute('data-theme', next);
				}
				return next;
			});
		},
		init() {
			if (browser) {
				const saved = localStorage.getItem('tm-theme') || 'dark';
				document.documentElement.setAttribute('data-theme', saved);
				set(saved);
			}
		}
	};
}

export const theme = createThemeStore();
