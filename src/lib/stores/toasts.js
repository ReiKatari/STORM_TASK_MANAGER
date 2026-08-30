import { writable } from 'svelte/store';

export const toasts = writable([]);

let toastId = 0;

export function addToast(message, type = 'success', duration = 4000) {
	const id = ++toastId;
	toasts.update(t => [...t, { id, message, type }]);
	setTimeout(() => {
		toasts.update(t => t.filter(toast => toast.id !== id));
	}, duration);
}
