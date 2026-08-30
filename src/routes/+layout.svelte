<script>
	import '../app.css';
	import { theme } from '$lib/stores/theme.js';
	import { toasts } from '$lib/stores/toasts.js';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		theme.init();
	});
</script>

{#each $toasts as toast (toast.id)}
	<div class="toast-container">
		<div class="toast toast-{toast.type}">
			<span class="material-icons-round" style="font-size:1.125rem">
				{toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
			</span>
			{toast.message}
		</div>
	</div>
{/each}

{@render children()}
