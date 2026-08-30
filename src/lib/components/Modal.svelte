<script>
	let { show = false, title = '', onclose } = $props();

	function handleBackdrop(e) {
		if (e.target === e.currentTarget) onclose?.();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<div class="modal-backdrop" onclick={handleBackdrop} role="dialog" aria-modal="true">
		<div class="modal-container">
			{#if title}
				<div class="modal-header">
					<h3>{title}</h3>
					<button class="modal-close" onclick={() => onclose?.()}>
						<span class="material-icons-round">close</span>
					</button>
				</div>
			{/if}
			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

{#snippet children()}{/snippet}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal-backdrop);
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-in 0.2s ease;
	}

	.modal-container {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		width: 100%;
		max-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
		animation: scale-in 0.25s ease;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-header h3 {
		font-size: 1.125rem;
		font-weight: 700;
	}
	.modal-close {
		background: none;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
	}
	.modal-close:hover {
		color: var(--text-primary);
		background: var(--bg-surface-alt);
	}

	.modal-body {
		padding: 1.5rem;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes scale-in {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
