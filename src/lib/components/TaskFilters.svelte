<script>
	let { creators = [], onfilter } = $props();

	let selectedCreator = $state('');
	let requesterFilter = $state('');

	function apply() {
		onfilter?.({ creator: selectedCreator, requester: requesterFilter });
	}

	function reset() {
		selectedCreator = '';
		requesterFilter = '';
		onfilter?.({ creator: '', requester: '' });
	}
</script>

<div class="filters-bar">
	<div class="filters-row">
		<div class="filter-group">
			<label for="filter-creator">Создатель:</label>
			<select id="filter-creator" bind:value={selectedCreator}>
				<option value="">Все</option>
				{#each creators as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</div>

		<div class="filter-group">
			<label for="filter-requester">Заявитель:</label>
			<input id="filter-requester" type="text" placeholder="Поиск..." bind:value={requesterFilter} />
		</div>

		<div class="filter-actions">
			<button class="btn btn-primary" onclick={apply}>
				<span class="material-icons-round">filter_alt</span>
				Применить
			</button>
			<button class="btn btn-outline" onclick={reset}>
				<span class="material-icons-round">filter_alt_off</span>
				Сбросить
			</button>
		</div>
	</div>
</div>

<style>
	.filters-bar {
		background: var(--card-bg);
		backdrop-filter: var(--card-glass);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem 1.5rem;
		margin-bottom: var(--space-lg);
	}

	.filters-row {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-group {
		flex: 1;
		min-width: 180px;
	}
	.filter-group label {
		font-size: 0.8125rem;
	}
	.filter-group input,
	.filter-group select {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.filter-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.filters-row {
			flex-direction: column;
			align-items: stretch;
		}
		.filter-actions {
			justify-content: stretch;
		}
		.filter-actions .btn {
			flex: 1;
		}
	}
</style>
