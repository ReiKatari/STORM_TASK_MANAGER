<script>
	import { addToast } from '$lib/stores/toasts.js';

	let { task, ondelete, onedit, onrefresh } = $props();
	let running = $state(false);
	let cancelling = $state(false);
	let deleting = $state(false);
	let confirmDelete = $state(false);

	// Show running state from either local click or server-side CRON
	let isRunning = $derived(!cancelling && (running || task.status === 'running'));

	async function handleRun() {
		running = true;
		try {
			const res = await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				if (data.status === 'error') {
					addToast(`Задача "${task.name}": ${data.errorMessage || 'неизвестная ошибка'}`, 'error');
				} else if (data.status === 'cancelled') {
					addToast(`Задача "${task.name}" была отменена`, 'info');
				} else {
					addToast(`Задача "${task.name}" выполнена (${data.duration} сек)`, 'success');
				}
			} else {
				addToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
			}
		} catch (e) {
			addToast(`Ошибка сети: ${e.message || 'не удалось подключиться'}`, 'error');
		} finally {
			running = false;
			onrefresh?.();
		}
	}

	function requestDelete() {
		confirmDelete = true;
		// Auto-hide confirm after 5s
		setTimeout(() => { confirmDelete = false; }, 5000);
	}

	async function executeDelete() {
		deleting = true;
		confirmDelete = false;
		try {
			const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
			if (res.ok) {
				addToast(`Задача "${task.name}" удалена`, 'success');
				ondelete?.(task.id);
			} else {
				const data = await res.json();
				addToast(data.error || 'Ошибка удаления', 'error');
			}
		} catch (err) {
			addToast('Ошибка сети при удалении', 'error');
		} finally {
			deleting = false;
		}
	}

	async function handleCancel() {
		try {
			const res = await fetch(`/api/tasks/${task.id}/cancel`, { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				addToast(data.message || `Задача "${task.name}" отменена`, 'info');
				running = false;
				cancelling = true;
				// Refresh data from server
				onrefresh?.();
				cancelling = false;
			} else {
				addToast(data.error || 'Не удалось отменить', 'error');
			}
		} catch (e) {
			addToast('Ошибка сети при отмене', 'error');
		}
	}
</script>

<div class="task-card" class:running={isRunning}>
	<div class="task-card-body">
		<div class="task-info">
			<div class="task-name">
				{task.name}
				{#if task.hasEndpoint}
					<span class="material-icons-round endpoint-icon" title="Есть точка входа">cloud_download</span>
				{/if}
			</div>
			<div class="task-meta">
				<span class="meta-item">
					<span class="material-icons-round">schedule</span>
					{task.cronExpression}
				</span>
				<span class="badge badge-info">{task.dbSource || 'SINC'}</span>
				{#if task.status === 'running' || running}
					<span class="badge badge-warning">
						<span class="material-icons-round spinning" style="font-size:0.75rem">sync</span>
						Выполняется
					</span>
				{:else}
					<span class="badge badge-success">
						<span class="material-icons-round" style="font-size:0.75rem">check_circle</span>
						Ожидание
					</span>
				{/if}
			</div>
			<div class="task-people">
				{#if task.creator}
					<span class="people-item people-creator">
						<span class="material-icons-round">person</span>
						{task.creator}
					</span>
				{/if}
				{#if task.requester}
					<span class="people-item people-requester">
						<span class="material-icons-round">person_outline</span>
						{task.requester}
					</span>
				{/if}
			</div>
		</div>
		<div class="task-actions">
			{#if confirmDelete}
				<div class="confirm-strip">
					<span class="confirm-text">Удалить?</span>
					<button class="btn btn-danger btn-sm" onclick={executeDelete} disabled={deleting}>
						{#if deleting}
							<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>
						{:else}
							<span class="material-icons-round">check</span>
						{/if}
						Да
					</button>
					<button class="btn btn-outline btn-sm" onclick={() => confirmDelete = false}>
						<span class="material-icons-round">close</span>
						Нет
					</button>
				</div>
			{:else}
				<button class="btn btn-success" onclick={handleRun} disabled={isRunning || deleting}>
					{#if isRunning}
						<div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
					{:else}
						<span class="material-icons-round">play_arrow</span>
					{/if}
					Запустить
				</button>
				<button class="btn btn-warning" onclick={() => onedit?.(task)} disabled={deleting}>
					<span class="material-icons-round">edit</span>
					Изменить
				</button>
				{#if isRunning}
					<button class="btn btn-cancel-task" onclick={handleCancel}>
						<span class="material-icons-round">stop_circle</span>
						Отменить
					</button>
				{/if}
				<button class="btn btn-danger" onclick={requestDelete} disabled={deleting || isRunning}>
					<span class="material-icons-round">delete</span>
					Удалить
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.task-card {
		background: var(--card-bg);
		backdrop-filter: var(--card-glass);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.25rem 1.5rem;
		transition: all var(--transition-base);
		box-shadow: var(--shadow-sm);
	}
	.task-card:hover {
		box-shadow: var(--shadow-md);
		border-color: var(--border-color-hover);
		transform: translateY(-2px);
	}
	.task-card.running {
		border-left: 3px solid var(--color-warning);
	}

	.task-card-body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.task-info {
		flex: 1;
		min-width: 0;
	}

	.task-name {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.endpoint-icon {
		font-size: 1.125rem;
		color: var(--color-primary);
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
	.meta-item .material-icons-round {
		font-size: 0.9375rem;
	}

	.task-people {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.people-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-weight: 500;
	}
	.people-item .material-icons-round {
		font-size: 0.9375rem;
	}
	.people-creator {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.people-requester {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.task-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
		flex-wrap: wrap;
		align-items: center;
	}

	/* Inline confirmation strip */
	.confirm-strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-danger-light);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-sm);
		animation: confirm-in 0.2s ease;
	}
	.confirm-text {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-danger);
		white-space: nowrap;
	}
	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}
	.btn-sm .material-icons-round {
		font-size: 0.9375rem;
	}

	@keyframes confirm-in {
		from { opacity: 0; transform: translateX(10px); }
		to { opacity: 1; transform: translateX(0); }
	}

	.btn-cancel-task {
		background: linear-gradient(135deg, #f97316, #ea580c) !important;
		color: white !important;
		border: none;
		animation: confirm-in 0.2s ease;
	}
	.btn-cancel-task:hover {
		background: linear-gradient(135deg, #ea580c, #c2410c) !important;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
	}

	@media (max-width: 768px) {
		.task-card-body {
			flex-direction: column;
			align-items: stretch;
		}
		.task-actions {
			justify-content: flex-end;
		}
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
