<script>
	import { addToast } from '$lib/stores/toasts.js';

	let { onlogscleared } = $props();
	let restarting = $state(false);
	let confirmClear = $state(false);
	let showAutoRestart = $state(false);
	let autoRestartInterval = $state('24');
	let testingConnection = $state(false);

	async function handleRestart() {
		restarting = true;
		try {
			const res = await fetch('/api/service', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'restart' })
			});
			const data = await res.json();
			addToast(data.message || 'Сервис перезапущен', 'success');
		} catch {
			addToast('Ошибка при перезапуске', 'error');
		} finally {
			restarting = false;
		}
	}

	function requestClearLogs() {
		confirmClear = true;
		setTimeout(() => { confirmClear = false; }, 5000);
	}

	async function executeClearLogs() {
		confirmClear = false;
		try {
			const res = await fetch('/api/logs', { method: 'DELETE' });
			if (res.ok) {
				addToast('Логи очищены', 'success');
				onlogscleared?.();
			} else {
				addToast('Ошибка при очистке логов', 'error');
			}
		} catch {
			addToast('Ошибка сети', 'error');
		}
	}

	async function saveAutoRestart() {
		try {
			const res = await fetch('/api/service', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'autorestart', intervalHours: parseInt(autoRestartInterval) })
			});
			const data = await res.json();
			addToast(`Автоперезапуск настроен каждые ${autoRestartInterval} ч.`, 'success');
			showAutoRestart = false;
		} catch {
			addToast('Ошибка настройки автоперезапуска', 'error');
		}
	}

	function downloadLogs() {
		fetch('/api/logs')
			.then(r => r.json())
			.then(logs => {
				const lines = [
					'═══════════════════════════════════════════════════════════',
					'  TASK MANAGER — Логи задач',
					'  Выгружено: ' + new Date().toLocaleString('ru-RU'),
					'═══════════════════════════════════════════════════════════',
					'',
					...logs.map((l, i) => [
						`[${i + 1}] ${l.taskName}`,
						`    Начало:        ${l.startTime}`,
						`    Окончание:     ${l.endTime || '—'}`,
						`    Длительность:  ${l.duration != null ? l.duration + ' сек' : '...'}`,
						`    Ссылка:        ${l.sheetUrl || '—'}`,
						`    Статус:        ${l.status === 'success' ? '✅ Success' : l.status === 'running' ? '🔄 Running' : '❌ Error'}`,
						''
					].join('\n')),
					'═══════════════════════════════════════════════════════════',
					`Всего записей: ${logs.length}`,
				].join('\n');

				const blob = new Blob([lines], { type: 'text/plain;charset=utf-8;' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `task_logs_${new Date().toISOString().slice(0,10)}.txt`;
				a.click();
				URL.revokeObjectURL(url);
				addToast('Логи скачаны в .txt', 'success');
			});
	}

	async function handleTestConnection() {
		testingConnection = true;
		try {
			const res = await fetch('/api/settings', { method: 'POST' });
			const data = await res.json();
			if (data.success) {
				addToast(data.message, 'success');
			} else {
				addToast(`Ошибка подключения: ${data.message}`, 'error');
			}
		} catch (e) {
			addToast('Ошибка сети при тестировании подключения', 'error');
		} finally {
			testingConnection = false;
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<span class="material-icons-round">settings_applications</span>
		<span>Управление сервисом</span>
	</div>

	<div class="service-actions">
		<button class="btn btn-warning" onclick={handleRestart} disabled={restarting}>
			{#if restarting}
				<div class="spinner" style="border-color:rgba(0,0,0,0.2);border-top-color:#1a1a1a;width:16px;height:16px;border-width:2px"></div>
			{:else}
				<span class="material-icons-round">refresh</span>
			{/if}
			Перезапустить сервис
		</button>

		<button class="btn btn-info-filled" onclick={() => showAutoRestart = !showAutoRestart}>
			<span class="material-icons-round">timer</span>
			Настроить автоперезапуск
		</button>

		{#if confirmClear}
			<div class="confirm-inline">
				<span class="confirm-label">Очистить все логи?</span>
				<button class="btn btn-danger btn-sm" onclick={executeClearLogs}>
					<span class="material-icons-round">check</span>
					Да
				</button>
				<button class="btn btn-outline btn-sm" onclick={() => confirmClear = false}>
					<span class="material-icons-round">close</span>
					Нет
				</button>
			</div>
		{:else}
			<button class="btn btn-danger" onclick={requestClearLogs}>
				<span class="material-icons-round">delete_sweep</span>
				Очистить логи
			</button>
		{/if}

		<button class="btn btn-primary-filled" onclick={downloadLogs}>
			<span class="material-icons-round">download</span>
			Скачать логи
		</button>

		<button class="btn btn-test-conn" onclick={handleTestConnection} disabled={testingConnection}>
			{#if testingConnection}
				<div class="spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:white;width:16px;height:16px;border-width:2px"></div>
			{:else}
				<span class="material-icons-round">lan</span>
			{/if}
			Тест подключения
		</button>
	</div>

	{#if showAutoRestart}
		<div class="autorestart-panel">
			<div class="autorestart-row">
				<label for="ar-interval">Интервал перезапуска (часы):</label>
				<select id="ar-interval" bind:value={autoRestartInterval}>
					<option value="1">1 час</option>
					<option value="2">2 часа</option>
					<option value="4">4 часа</option>
					<option value="6">6 часов</option>
					<option value="8">8 часов</option>
					<option value="12">12 часов</option>
					<option value="24">24 часа</option>
					<option value="48">48 часов</option>
				</select>
				<button class="btn btn-success" onclick={saveAutoRestart}>
					<span class="material-icons-round">save</span>
					Сохранить
				</button>
				<button class="btn btn-outline" onclick={() => showAutoRestart = false}>
					<span class="material-icons-round">close</span>
					Отмена
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.service-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.btn-info-filled {
		background: var(--color-info);
		color: white;
	}
	.btn-info-filled:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.btn-primary-filled {
		background: var(--color-primary);
		color: white;
	}
	.btn-primary-filled:hover {
		background: var(--color-primary-hover);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}
	.btn-sm .material-icons-round {
		font-size: 0.9375rem;
	}

	/* Inline confirm */
	.confirm-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-danger-light);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-sm);
		animation: confirm-in 0.2s ease;
	}
	.confirm-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-danger);
		white-space: nowrap;
	}

	/* Auto-restart panel */
	.autorestart-panel {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-color);
		animation: confirm-in 0.3s ease;
	}
	.autorestart-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.autorestart-row label {
		font-weight: 600;
		font-size: 0.875rem;
		margin: 0;
		white-space: nowrap;
	}
	.autorestart-row select {
		width: auto;
		min-width: 140px;
	}

	@keyframes confirm-in {
		from { opacity: 0; transform: translateX(10px); }
		to { opacity: 1; transform: translateX(0); }
	}

	.btn-test-conn {
		background: linear-gradient(135deg, #10b981, #059669) !important;
		color: white !important;
		border: none;
	}
	.btn-test-conn:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}
	.btn-test-conn:disabled {
		opacity: 0.7;
		cursor: wait;
	}
</style>
