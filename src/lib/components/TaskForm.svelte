<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toasts.js';
	import SqlEditor from './SqlEditor.svelte';

	let sqlEditorOpen = $state(false);

	// ── Отдельные CRON-поля (двусторонняя синхронизация с cronExpression) ──
	let cronMin = $state('*');
	let cronHour = $state('*');
	let cronDay = $state('*');
	let cronMonth = $state('*');
	let cronWeekday = $state('*');
	let cronSyncDirection = 'none'; // 'fromMain' | 'fromParts' | 'none'

	// Когда меняется общее поле → разбираем на части
	function syncPartsFromExpression() {
		const parts = (cronExpression || '* * * * *').trim().split(/\s+/);
		cronMin = parts[0] || '*';
		cronHour = parts[1] || '*';
		cronDay = parts[2] || '*';
		cronMonth = parts[3] || '*';
		cronWeekday = parts[4] || '*';
	}

	// Когда меняется отдельное поле → собираем общее выражение
	function updateCronFromParts() {
		cronSyncDirection = 'fromParts';
		cronExpression = `${cronMin || '*'} ${cronHour || '*'} ${cronDay || '*'} ${cronMonth || '*'} ${cronWeekday || '*'}`;
		cronSyncDirection = 'none';
	}

	// Синхронизация: когда cronExpression меняется извне (ввод в главное поле, пресеты)
	$effect(() => {
		// Читаем cronExpression для отслеживания
		const expr = cronExpression;
		if (cronSyncDirection !== 'fromParts') {
			syncPartsFromExpression();
		}
	});

	let { editTask = null, onsubmit, oncancel } = $props();

	let name = $state('');
	let cronExpression = $state('* * * * *');
	let keepImport = $state(false);
	let sqlQuery = $state('');
	let googleSheetKey = $state('');
	let sheetName = $state('');
	let notificationUrl = $state('');
	let hasEndpoint = $state(false);
	let creator = $state('Матагаев');
	let requester = $state('');
	let dbSource = $state('SINC');
	let loading = $state(false);
	let collapsed = $state(false);

	// Sync form fields when editTask prop changes
	$effect(() => {
		if (editTask) {
			name = editTask.name || '';
			cronExpression = editTask.cronExpression || '* * * * *';
			keepImport = editTask.keepImport || false;
			sqlQuery = editTask.sqlQuery || '';
			googleSheetKey = editTask.googleSheetKey || '';
			sheetName = editTask.sheetName || '';
			notificationUrl = editTask.notificationUrl || '';
			hasEndpoint = editTask.hasEndpoint || false;
			creator = editTask.creator || 'Матагаев';
			requester = editTask.requester || '';
			dbSource = editTask.dbSource || 'SINC';
			collapsed = false;
		}
	});

	const creators = ['Матагаев', 'Стасюк', 'Трубникова', 'Щербакова'];

	onMount(async () => {
		const { gsap } = await import('gsap');
		gsap.from('.task-form .form-field', {
			y: 20,
			opacity: 0,
			duration: 0.4,
			stagger: 0.06,
			ease: 'power2.out'
		});
	});

	async function handleSubmit(e) {
		e.preventDefault();
		if (!name.trim() || !cronExpression.trim() || !sqlQuery.trim()) {
			addToast('Заполните обязательные поля', 'error');
			return;
		}

		// Extract Google Sheet key from full URL if needed
		let sheetKey = googleSheetKey.trim();
		if (sheetKey.includes('docs.google.com/spreadsheets')) {
			const match = sheetKey.match(/\/d\/([a-zA-Z0-9_-]+)/);
			if (match) sheetKey = match[1];
		}

		loading = true;
		try {
			const url = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks';
			const method = editTask ? 'PUT' : 'POST';
			
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name, cronExpression, keepImport, sqlQuery,
					googleSheetKey: sheetKey, sheetName, notificationUrl,
					hasEndpoint, creator, requester, dbSource
				})
			});

			if (res.ok) {
				const task = await res.json();
				addToast(editTask ? 'Задача обновлена' : 'Задача добавлена', 'success');
				onsubmit?.(task);
				if (!editTask) resetForm();
			} else {
				const err = await res.json();
				addToast(err.error || 'Ошибка', 'error');
			}
		} catch (err) {
			addToast('Ошибка сети', 'error');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		name = ''; cronExpression = '* * * * *'; keepImport = false;
		sqlQuery = ''; googleSheetKey = ''; sheetName = '';
		notificationUrl = ''; hasEndpoint = false; creator = 'Матагаев';
		requester = ''; dbSource = 'SINC';
	}
</script>

<div class="card task-form">
	<button class="card-header card-toggle" onclick={() => collapsed = !collapsed}>
		<span class="material-icons-round">{editTask ? 'edit' : 'add_circle'}</span>
		<span>{editTask ? `Редактирование: ${editTask.name}` : 'Добавить новую задачу'}</span>
		<span class="material-icons-round toggle-icon" class:collapsed>expand_more</span>
	</button>

	{#if !collapsed}
		<form onsubmit={handleSubmit}>
			<div class="form-group form-field">
				<label for="task-name">Название задачи:</label>
				<input id="task-name" type="text" placeholder="Введите название задачи" bind:value={name} required />
			</div>

			<div class="form-group form-field">
				<label for="task-cron">CRON-выражение:</label>
				<input id="task-cron" type="text" placeholder="* * * * *" bind:value={cronExpression} required />
				<div class="cron-help">
					<div class="cron-fields">
						<label class="cron-field">
							<input type="text" class="cron-input" bind:value={cronMin} oninput={updateCronFromParts} placeholder="*" />
							<small>МИН</small>
						</label>
						<label class="cron-field">
							<input type="text" class="cron-input" bind:value={cronHour} oninput={updateCronFromParts} placeholder="*" />
							<small>ЧАС</small>
						</label>
						<label class="cron-field">
							<input type="text" class="cron-input" bind:value={cronDay} oninput={updateCronFromParts} placeholder="*" />
							<small>ДЕНЬ</small>
						</label>
						<label class="cron-field">
							<input type="text" class="cron-input" bind:value={cronMonth} oninput={updateCronFromParts} placeholder="*" />
							<small>МЕС</small>
						</label>
						<label class="cron-field">
							<input type="text" class="cron-input" bind:value={cronWeekday} oninput={updateCronFromParts} placeholder="*" />
							<small>ДН.НЕД</small>
						</label>
					</div>
					<div class="cron-presets">
						<button type="button" class="cron-preset" onclick={() => cronExpression = '* * * * *'}>Каждую минуту</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '*/5 * * * *'}>Каждые 5 мин</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '*/15 * * * *'}>Каждые 15 мин</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '*/30 * * * *'}>Каждые 30 мин</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 * * * *'}>Каждый час</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 */2 * * *'}>Каждые 2 часа</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 */6 * * *'}>Каждые 6 часов</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 0 * * *'}>Ежедневно 00:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 8 * * *'}>Ежедневно 08:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 12 * * *'}>Ежедневно 12:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 18 * * *'}>Ежедневно 18:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 8 * * 1-5'}>Будни 08:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 0 * * 1'}>Понедельник 00:00</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 0 1 * *'}>1-е число месяца</button>
						<button type="button" class="cron-preset" onclick={() => cronExpression = '0 0 1 1 *'}>1 января</button>
					</div>
					<div class="cron-legend">
						<span><b>*</b> — любое</span>
						<span><b>*/N</b> — каждые N</span>
						<span><b>1,3,5</b> — список</span>
						<span><b>1-5</b> — диапазон</span>
						<span><b>дн.нед:</b> 0=Вс, 1=Пн...6=Сб</span>
					</div>
				</div>
			</div>

			<div class="checkbox-wrapper form-field">
				<input id="keep-import" type="checkbox" bind:checked={keepImport} />
				<label for="keep-import">Сохранять импорт (добавлять данные)</label>
			</div>
			<p class="form-hint" style="text-align:center;margin-top:-0.5rem;margin-bottom:1rem">Если отмечено, новые данные будут добавляться к существующим</p>

			<div class="form-group form-field">
				<label for="task-sql">SQL-запрос:</label>
				<div class="sql-preview-wrapper">
					<pre class="sql-preview" onclick={() => sqlEditorOpen = true}>{sqlQuery || 'SELECT * FROM table'}</pre>
					<button type="button" class="sql-open-btn" onclick={() => sqlEditorOpen = true} title="Открыть SQL-редактор">
						<span class="material-icons-round">open_in_full</span>
						Открыть редактор
					</button>
				</div>
			</div>

			<SqlEditor bind:value={sqlQuery} bind:open={sqlEditorOpen} />

			<div class="form-group form-field">
				<label for="task-sheet-key">Google Sheet Key:</label>
				<input id="task-sheet-key" type="text" placeholder="Ключ или ссылка на Google таблицу" bind:value={googleSheetKey} />
				<span class="form-hint">Вставьте ключ или полную ссылку (https://docs.google.com/spreadsheets/d/...)</span>
			</div>

			<div class="form-group form-field">
				<label for="task-sheet-name">Имя листа:</label>
				<input id="task-sheet-name" type="text" placeholder="Имя листа в таблице" bind:value={sheetName} />
			</div>

			<div class="form-group form-field">
				<label for="task-notification-url">URL для уведомлений:</label>
				<input id="task-notification-url" type="text" placeholder="URL для отправки уведомлений о статусе задачи" bind:value={notificationUrl} />
				<span class="form-hint">На этот URL будут отправляться POST-запросы со статусом задачи</span>
			</div>

			<div class="checkbox-wrapper form-field">
				<input id="has-endpoint" type="checkbox" bind:checked={hasEndpoint} />
				<label for="has-endpoint">Создать точку входа для внешних запросов</label>
			</div>
			<p class="form-hint" style="text-align:center;margin-top:-0.5rem;margin-bottom:1rem">Создать URL для запуска задачи через HTTP POST запрос</p>

			<div class="form-row form-field">
				<div class="form-group">
					<label for="task-creator">Создатель:</label>
					<select id="task-creator" bind:value={creator}>
						{#each creators as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="task-db-source">Источник БД:</label>
					<select id="task-db-source" bind:value={dbSource}>
						<option value="SINC">SINC</option>
						<option value="MD-4">MD-4</option>
						<option value="OTHER">Другой</option>
					</select>
				</div>
			</div>

			<div class="form-group form-field">
				<label for="task-requester">Заявитель:</label>
				<input id="task-requester" type="text" placeholder="Введите заявителя (не обязательно)" bind:value={requester} />
			</div>

			<div class="form-actions form-field">
				<button type="submit" class="btn btn-primary btn-lg btn-full" disabled={loading}>
					{#if loading}
						<div class="spinner"></div>
						{editTask ? 'Сохранение...' : 'Добавление...'}
					{:else}
						<span class="material-icons-round">{editTask ? 'save' : 'add'}</span>
						{editTask ? 'Сохранить изменения' : 'Добавить задачу'}
					{/if}
				</button>
				{#if editTask}
					<button type="button" class="btn btn-outline btn-lg btn-full" onclick={() => oncancel?.()}>
						Отмена
					</button>
				{/if}
			</div>
		</form>
	{/if}
</div>

<style>
	.card-toggle {
		cursor: pointer;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-color);
		width: 100%;
		text-align: left;
		padding: var(--space-lg);
		font-family: var(--font-primary);
		position: relative;
	}
	.toggle-icon {
		position: absolute;
		right: 0;
		transition: transform var(--transition-fast);
	}
	.toggle-icon.collapsed {
		transform: rotate(-90deg);
	}

	.task-form form {
		padding-top: var(--space-md);
	}

	.form-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	/* SQL Preview */
	.sql-preview-wrapper {
		position: relative;
	}
	.sql-preview {
		background: #1e1e2e;
		color: #cdd6f4;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
		padding-right: 10rem;
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
		font-size: 0.8125rem;
		line-height: 1.6;
		min-height: 80px;
		max-height: 140px;
		overflow: hidden;
		cursor: pointer;
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}
	.sql-preview:hover {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
	}
	.sql-open-btn {
		position: absolute;
		top: 50%;
		right: 0.75rem;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all var(--transition-fast);
	}
	.sql-open-btn:hover {
		background: var(--color-primary-hover);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
	}
	.sql-open-btn .material-icons-round {
		font-size: 1rem;
	}

	/* ── CRON Helper ── */
	.cron-help {
		margin-top: 0.5rem;
		background: var(--bg-surface-alt);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.75rem;
	}
	.cron-fields {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.cron-field {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.375rem 0.5rem;
		min-width: 56px;
		cursor: text;
		transition: all 150ms ease;
	}
	.cron-field:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}
	.cron-field:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
		background: var(--color-primary-light);
	}
	.cron-input {
		width: 100%;
		max-width: 60px;
		border: none;
		background: transparent;
		text-align: center;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-primary);
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		outline: none;
		padding: 0.125rem 0;
		line-height: 1.2;
	}
	.cron-input::placeholder {
		color: var(--text-tertiary);
		opacity: 0.5;
	}
	.cron-field small {
		font-size: 0.625rem;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		pointer-events: none;
	}
	.cron-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.625rem;
	}
	.cron-preset {
		padding: 0.25rem 0.625rem;
		border: 1px solid var(--border-color);
		border-radius: 999px;
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-size: 0.6875rem;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}
	.cron-preset:hover {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.cron-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.6875rem;
		color: var(--text-tertiary);
		border-top: 1px solid var(--border-color);
		padding-top: 0.5rem;
	}
	.cron-legend b {
		color: var(--color-primary);
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}
</style>
