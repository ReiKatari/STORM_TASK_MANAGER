<script>
	import { theme } from '$lib/stores/theme.js';

	let open = $state(false);

	function selectTheme(id) {
		theme.setTheme(id);
		open = false;
	}
</script>

<div class="theme-widget">
	{#if open}
		<div class="theme-picker" role="listbox">
			{#each theme.themes as t (t.id)}
				<button
					class="theme-option"
					class:active={$theme === t.id}
					onclick={() => selectTheme(t.id)}
					role="option"
					aria-selected={$theme === t.id}
				>
					<span class="material-icons-round">{t.icon}</span>
					<span class="theme-label">{t.name}</span>
				</button>
			{/each}
		</div>
	{/if}
	<button
		class="theme-toggle"
		onclick={() => open = !open}
		title="Выбрать тему оформления"
		aria-label="Выбрать тему оформления"
	>
		<span class="material-icons-round">
			{$theme === 'light' ? 'light_mode' : 'palette'}
		</span>
	</button>
</div>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="theme-backdrop" onclick={() => open = false} onkeydown={() => {}}></div>
{/if}

<style>
	.theme-widget {
		position: fixed;
		bottom: 1.5rem;
		left: 1.5rem;
		z-index: 9990;
	}
	.theme-toggle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1px solid var(--border-color);
		background: var(--card-bg);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-lg);
		transition: all 150ms ease;
	}
	.theme-toggle:hover {
		transform: scale(1.12);
		color: var(--color-primary);
		box-shadow: var(--shadow-xl), var(--shadow-glow);
	}
	.theme-toggle .material-icons-round {
		font-size: 1.375rem;
	}

	/* Picker Panel */
	.theme-picker {
		position: absolute;
		bottom: 60px;
		left: 0;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.5rem;
		box-shadow: var(--shadow-xl);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem;
		min-width: 260px;
		animation: picker-in 0.2s ease;
	}
	@keyframes picker-in {
		from { opacity: 0; transform: translateY(10px) scale(0.95); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
	.theme-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		transition: all 150ms ease;
		white-space: nowrap;
	}
	.theme-option:hover {
		background: var(--bg-surface-hover);
		color: var(--text-primary);
	}
	.theme-option.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
		font-weight: 700;
	}
	.theme-option .material-icons-round {
		font-size: 1.125rem;
	}

	.theme-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9989;
	}
</style>
