<script>
	import { onMount } from 'svelte';

	let { logs = [] } = $props();

	let currentPage = $state(1);
	let itemsPerPage = 20;
	let totalPages = $derived(Math.ceil(logs.length / itemsPerPage) || 1);
	let paginatedLogs = $derived(logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage));

	// Сброс страницы, если логи очистили или изменилось количество и текущая страница оказалась больше максимальной
	$effect(() => {
		if (currentPage > totalPages) currentPage = totalPages;
		if (currentPage < 1) currentPage = 1;
	});

	function prevPage() {
		if (currentPage > 1) currentPage--;
	}

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	/**
	 * Compute average durations per task from completed runs
	 */
	let avgDurations = $derived.by(() => {
		const map = {};
		for (const log of logs) {
			if (log.duration != null && (log.status === 'success' || log.status === 'error')) {
				if (!map[log.taskName]) map[log.taskName] = { total: 0, count: 0 };
				map[log.taskName].total += log.duration;
				map[log.taskName].count++;
			}
		}
		const result = {};
		for (const [name, data] of Object.entries(map)) {
			result[name] = (data.total / data.count).toFixed(2);
		}
		return result;
	});

	/**
	 * Format date string to dd.MM.yyyy HH:mm:ss
	 */
	function formatDate(dateStr) {
		if (!dateStr) return '—';
		const d = new Date(dateStr.replace(' ', 'T'));
		if (isNaN(d.getTime())) return dateStr;
		const pad = (n) => String(n).padStart(2, '0');
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	}

	onMount(async () => {
		const { gsap } = await import('gsap');
		gsap.from('.logs-row', {
			x: -20,
			opacity: 0,
			duration: 0.3,
			stagger: 0.04,
			ease: 'power2.out'
		});
	});
</script>

<div class="card">
	<div class="card-header">
		<span class="material-icons-round">description</span>
		<span>Логи задач</span>
		<span class="log-count">{logs.length}</span>
	</div>

	{#if logs.length === 0}
		<div class="empty-state">
			<span class="material-icons-round">inbox</span>
			<p>Нет записей</p>
		</div>
	{:else}
		<div class="table-responsive">
			<table class="data-table">
				<thead>
					<tr>
						<th>Имя задачи</th>
						<th>Время начала</th>
						<th>Время окончания</th>
						<th>Длительность</th>
						<th>Средняя длит.</th>
						<th>Ссылка</th>
						<th>Статус</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedLogs as log (log.id)}
						<tr class="logs-row" class:running-row={log.status === 'running'}>
							<td class="task-name-cell">{log.taskName}</td>
							<td class="datetime-cell">{formatDate(log.startTime)}</td>
							<td class="datetime-cell">{log.status === 'running' ? '—' : formatDate(log.endTime)}</td>
							<td class="duration-cell">{log.status === 'running' ? '...' : log.duration + ' сек'}</td>
							<td class="duration-cell avg-cell">
								{#if avgDurations[log.taskName]}
									<span class="avg-badge">
										<span class="material-icons-round" style="font-size:0.75rem">schedule</span>
										{avgDurations[log.taskName]} сек
									</span>
								{:else}
									—
								{/if}
							</td>
							<td class="link-cell">
								{#if log.sheetUrl}
									<a href={log.sheetUrl} target="_blank" rel="noopener">
										<span class="material-icons-round" style="font-size:1rem">open_in_new</span>
										Открыть
									</a>
								{:else}
									<span class="no-link">—</span>
								{/if}
							</td>
							<td>
								{#if log.status === 'running'}
									<span class="badge badge-warning">
										<span class="material-icons-round spinning" style="font-size:0.75rem">sync</span>
										Running
									</span>
								{:else if log.status === 'success'}
									<span class="badge badge-success">
										<span class="material-icons-round" style="font-size:0.75rem">check_circle</span>
										Success
									</span>
								{:else if log.status === 'cancelled'}
									<span class="badge badge-info">
										<span class="material-icons-round" style="font-size:0.75rem">cancel</span>
										Отменена
									</span>
								{:else}
									<span class="badge badge-danger">
										<span class="material-icons-round" style="font-size:0.75rem">error</span>
										Error
									</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if totalPages > 1}
			<div class="pagination">
				<button class="btn btn-secondary btn-sm" onclick={prevPage} disabled={currentPage === 1}>
					<span class="material-icons-round">chevron_left</span> Назад
				</button>
				<span class="page-info">
					Страница {currentPage} из {totalPages}
				</span>
				<button class="btn btn-secondary btn-sm" onclick={nextPage} disabled={currentPage === totalPages}>
					Вперед <span class="material-icons-round">chevron_right</span>
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
	}
	.page-info {
		font-size: 0.9rem;
		color: var(--color-text-light);
		font-weight: 500;
	}

	.table-responsive {
		overflow-x: auto;
	}

	.log-count {
		margin-left: auto;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
	}

	/* Center all table headers */
	:global(.data-table thead th) {
		text-align: center;
	}

	.task-name-cell {
		font-weight: 600;
		max-width: 300px;
	}

	.datetime-cell {
		font-size: 0.8125rem;
		white-space: nowrap;
		color: var(--text-secondary);
		text-align: center;
	}

	.duration-cell {
		font-weight: 500;
		white-space: nowrap;
		text-align: center;
	}

	.avg-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary);
		background: var(--color-primary-light);
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.no-link {
		color: var(--text-tertiary);
	}

	.link-cell {
		text-align: center;
	}

	td:last-child {
		text-align: center;
	}

	.running-row {
		background: var(--color-warning-light) !important;
	}

	.spinning {
		animation: spin-icon 1s linear infinite;
	}

	@keyframes spin-icon {
		to { transform: rotate(360deg); }
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--text-tertiary);
	}
	.empty-state .material-icons-round {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}
</style>
