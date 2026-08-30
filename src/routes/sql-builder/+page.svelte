<script>
	import Header from '$lib/components/Header.svelte';
	import { theme } from '$lib/stores/theme.js';
	import { columnCategories, datePresets, typeIdMap, serviceIdMap, companyIdMap, generateSQL, getAllColumns } from '$lib/sql-builder-data.js';

	let selectedColumns = $state([]);
	let datePreset = $state('prev_month');
	let customDate = $state('');
	let dateField = $state('Deadline');
	let sourceType = $state('task');
	let filterTypeIds = $state([]);
	let excludedServiceIds = $state(new Set());
	let excludedCompanyIds = $state(new Set());
	let orderBy = $state('');
	let orderDir = $state('DESC');
	let topN = $state('');
	let searchQuery = $state('');
	let draggedColumn = $state(null);
	let dragOverIndex = $state(-1);
	let copiedToast = $state(false);
	let expandedCategories = $state(new Set(columnCategories.map(c => c.id)));
	let showFilters = $state(true);

	// Derive included/excluded service IDs from the toggle set
	const activeServiceIds = $derived(serviceIdMap.filter(s => !excludedServiceIds.has(s.value)).map(s => s.value));
	const inactiveServiceIds = $derived(serviceIdMap.filter(s => excludedServiceIds.has(s.value)).map(s => s.value));

	const activeCompanyIds = $derived(companyIdMap.filter(c => !excludedCompanyIds.has(c.value)).map(c => c.value));
	const inactiveCompanyIds = $derived(companyIdMap.filter(c => excludedCompanyIds.has(c.value)).map(c => c.value));

	const generatedSQL = $derived(generateSQL({
		selectedColumns,
		datePreset,
		customDate,
		dateField,
		sourceType,
		filterTypeIds,
		// Smart mode: pass both lists, generator picks IN vs NOT IN
		activeServiceIds,
		inactiveServiceIds,
		totalServiceCount: serviceIdMap.length,
		activeCompanyIds,
		inactiveCompanyIds,
		totalCompanyCount: companyIdMap.length,
		orderBy,
		orderDir,
		topN: topN ? parseInt(topN) : null,
	}));

	const filteredCategories = $derived(() => {
		const sortCols = (cols) => [...cols].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
		if (!searchQuery.trim()) return columnCategories.map(cat => ({ ...cat, columns: sortCols(cat.columns) }));
		const q = searchQuery.toLowerCase();
		return columnCategories.map(cat => ({
			...cat,
			columns: sortCols(cat.columns.filter(col =>
				col.label.toLowerCase().includes(q) || col.alias.toLowerCase().includes(q)
			)),
		})).filter(cat => cat.columns.length > 0);
	});

	function toggleCategory(catId) {
		const next = new Set(expandedCategories);
		if (next.has(catId)) next.delete(catId);
		else next.add(catId);
		expandedCategories = next;
	}

	function handleDragStart(e, col) {
		draggedColumn = col;
		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData('text/plain', col.id);
	}

	function handleDropZoneDragOver(e, index) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		dragOverIndex = index;
	}

	function handleDropZoneDrop(e, index) {
		e.preventDefault();
		if (draggedColumn) {
			// Check not already added
			if (!selectedColumns.find(c => c.id === draggedColumn.id)) {
				const newCols = [...selectedColumns];
				if (index >= 0 && index < newCols.length) {
					newCols.splice(index, 0, { ...draggedColumn });
				} else {
					newCols.push({ ...draggedColumn });
				}
				selectedColumns = newCols;
				// Auto-detect source
				if (draggedColumn.source === 'asset' && sourceType === 'task') {
					const hasTaskCols = selectedColumns.some(c => c.source === 'task');
					if (!hasTaskCols) sourceType = 'asset';
				}
			}
		}
		draggedColumn = null;
		dragOverIndex = -1;
	}

	function handleMainDropZoneDrop(e) {
		e.preventDefault();
		if (draggedColumn && !selectedColumns.find(c => c.id === draggedColumn.id)) {
			selectedColumns = [...selectedColumns, { ...draggedColumn }];
			if (draggedColumn.source === 'asset' && sourceType === 'task') {
				const hasTaskCols = selectedColumns.some(c => c.source === 'task');
				if (!hasTaskCols) sourceType = 'asset';
			}
		}
		draggedColumn = null;
		dragOverIndex = -1;
	}

	function removeColumn(index) {
		selectedColumns = selectedColumns.filter((_, i) => i !== index);
	}

	function moveColumn(from, to) {
		if (to < 0 || to >= selectedColumns.length) return;
		const newCols = [...selectedColumns];
		const [moved] = newCols.splice(from, 1);
		newCols.splice(to, 0, moved);
		selectedColumns = newCols;
	}

	function clearAll() {
		selectedColumns = [];
	}

	function toggleColumn(col) {
		const idx = selectedColumns.findIndex(c => c.id === col.id);
		if (idx >= 0) {
			selectedColumns = selectedColumns.filter((_, i) => i !== idx);
		} else {
			selectedColumns = [...selectedColumns, { ...col }];
		}
	}

	function toggleTypeFilter(typeId) {
		if (filterTypeIds.includes(typeId)) {
			filterTypeIds = filterTypeIds.filter(t => t !== typeId);
		} else {
			filterTypeIds = [...filterTypeIds, typeId];
		}
	}

	function toggleServiceId(sid) {
		const next = new Set(excludedServiceIds);
		if (next.has(sid)) {
			next.delete(sid);
		} else {
			next.add(sid);
		}
		excludedServiceIds = next;
	}

	function excludeAllServices() {
		excludedServiceIds = new Set(serviceIdMap.map(s => s.value));
	}

	function includeAllServices() {
		excludedServiceIds = new Set();
	}

	function toggleCompanyId(cid) {
		const next = new Set(excludedCompanyIds);
		if (next.has(cid)) {
			next.delete(cid);
		} else {
			next.add(cid);
		}
		excludedCompanyIds = next;
	}

	function excludeAllCompanies() {
		excludedCompanyIds = new Set(companyIdMap.map(c => c.value));
	}

	function includeAllCompanies() {
		excludedCompanyIds = new Set();
	}

	async function copySQL() {
		try {
			await navigator.clipboard.writeText(generatedSQL);
			copiedToast = true;
			setTimeout(() => copiedToast = false, 2000);
		} catch {
			// Fallback
			const ta = document.createElement('textarea');
			ta.value = generatedSQL;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			copiedToast = true;
			setTimeout(() => copiedToast = false, 2000);
		}
	}

	function highlightSQL(sql) {
		if (!sql) return '';
		return sql
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/\b(DECLARE|SELECT|FROM|LEFT JOIN|INNER JOIN|RIGHT JOIN|CROSS APPLY|OUTER APPLY|WHERE|AND|OR|ON|AS|ORDER BY|GROUP BY|HAVING|TOP|SET|WITH|CASE|WHEN|THEN|ELSE|END|IN|NOT|LIKE|IS|NULL|DESC|ASC|FORMAT|ISNULL|TRY_CAST|CAST|CONCAT|STRING_AGG|COUNT|MAX|MIN|SUM|ROW_NUMBER|OVER|PARTITION BY|DISTINCT|UNION|ALL|EXISTS|BETWEEN|DATEADD|DATEDIFF|GETDATE|MONTH|CONVERT|TRIM|REPLACE|NULLIF|COALESCE|LEAD|LAG)\b/gi,
				'<span class="sql-keyword">$1</span>')
			.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>')
			.replace(/--.*$/gm, '<span class="sql-comment">$&</span>')
			.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');
	}
</script>

<svelte:head>
	<title>Конструктор SQL — STORM TASK MANAGER</title>
</svelte:head>

<Header currentPage="sql-builder" />

<div class="builder-layout">
	<!-- LEFT SIDEBAR -->
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2>
				<span class="material-icons-round">view_column</span>
				Столбцы
			</h2>
			<input
				type="search"
				class="sidebar-search"
				placeholder="Поиск столбцов..."
				bind:value={searchQuery}
			/>
		</div>
		<div class="sidebar-content">
			{#each filteredCategories() as cat (cat.id)}
				<div class="category-group">
					<button
						class="category-header"
						onclick={() => toggleCategory(cat.id)}
					>
						<span class="material-icons-round cat-icon">{cat.icon}</span>
						<span class="cat-label">{cat.label}</span>
						<span class="cat-count">{cat.columns.length}</span>
						<span class="material-icons-round expand-icon" class:expanded={expandedCategories.has(cat.id)}>
							expand_more
						</span>
					</button>
					{#if expandedCategories.has(cat.id)}
						<ul class="category-columns">
							{#each cat.columns as col (col.id)}
								{@const isSelected = selectedColumns.some(c => c.id === col.id)}
								<li
									class="column-row"
									class:selected={isSelected}
									class:asset-source={col.source === 'asset'}
									draggable={!isSelected}
									ondragstart={(e) => handleDragStart(e, col)}
									onclick={() => toggleColumn(col)}
									role="option"
									aria-selected={isSelected}
									tabindex="0"
								>
									{#if isSelected}
										<span class="material-icons-round row-check">check_circle</span>
									{:else}
										<span class="material-icons-round row-dot">radio_button_unchecked</span>
									{/if}
									<span class="row-label">{col.label}</span>
									{#if col.source === 'asset'}
										<span class="row-badge">Asset</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	</aside>

	<!-- MAIN AREA -->
	<main class="main-area">
		<!-- SETTINGS BAR -->
		<div class="settings-bar">
			<div class="settings-grid">
				<div class="setting-card">
					<div class="setting-card-icon"><span class="material-icons-round">storage</span></div>
					<div class="setting-card-body">
						<label>Источник</label>
						<select bind:value={sourceType}>
							<option value="task">Task (Заявки)</option>
							<option value="asset">Asset (Активы)</option>
						</select>
					</div>
				</div>

				<div class="settings-divider"></div>

				<div class="setting-card">
					<div class="setting-card-icon"><span class="material-icons-round">date_range</span></div>
					<div class="setting-card-body">
						<label>Период</label>
						<select bind:value={datePreset}>
							{#each datePresets as dp (dp.id)}
								<option value={dp.id}>{dp.label}</option>
							{/each}
						</select>
						{#if datePreset === 'custom'}
							<input type="date" bind:value={customDate} style="margin-top:4px" />
						{/if}
					</div>
				</div>

				<div class="setting-card">
					<div class="setting-card-icon"><span class="material-icons-round">filter_alt</span></div>
					<div class="setting-card-body">
						<label>Поле даты</label>
						<select bind:value={dateField}>
							<option value="Deadline">Срок план</option>
							<option value="Created">Дата создания</option>
							<option value="Changed">Дата изменения</option>
							<option value="ResolutionDateFact">Срок факт</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Expandable Filters -->
			<button class="toggle-filters-btn" onclick={() => showFilters = !showFilters}>
				<span class="material-icons-round">{showFilters ? 'expand_less' : 'tune'}</span>
				Дополнительные фильтры
				{#if filterTypeIds.length + excludedServiceIds.size + excludedCompanyIds.size > 0}
					<span class="filter-badge">{filterTypeIds.length + excludedServiceIds.size + excludedCompanyIds.size}</span>
				{/if}
			</button>

			{#if showFilters}
				<div class="filters-panel">
					<div class="filter-section">
						<label class="filter-section-label">
							<span class="material-icons-round">assignment</span>
							Тип заявки
						</label>
						<div class="type-chips">
							{#each typeIdMap as t (t.value)}
								<button
									class="type-chip"
									class:active={filterTypeIds.includes(t.value)}
									onclick={() => toggleTypeFilter(t.value)}
								>
									{#if filterTypeIds.includes(t.value)}
										<span class="material-icons-round tc-check">check</span>
									{/if}
									{t.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="filter-section">
						<label class="filter-section-label">
							<span class="material-icons-round">dns</span>
							Сервис
							<span class="filter-hint">клик — исключить</span>
						<div class="service-actions">
							<button class="service-action-btn" onclick={excludeAllServices}>
								<span class="material-icons-round">deselect</span> Исключить все
							</button>
							<button class="service-action-btn include" onclick={includeAllServices}>
								<span class="material-icons-round">select_all</span> Включить все
							</button>
						</div>
						</label>
						<div class="service-chips">
							{#each serviceIdMap as s (s.value)}
								{@const isExcluded = excludedServiceIds.has(s.value)}
								<button
									class="service-chip"
									class:excluded={isExcluded}
									onclick={() => toggleServiceId(s.value)}
										title={`${s.value}: ${s.label}`}
							data-tooltip={s.label}
								>
									<span class="sid-num" class:struck={isExcluded}>{s.value}</span>
								</button>
							{/each}
						</div>
						{#if excludedServiceIds.size > 0}
							<div class="service-summary">
								<span class="material-icons-round">info_outline</span>
								Исключено: {excludedServiceIds.size} из {serviceIdMap.length}
							</div>
						{/if}
					</div>

					<!-- КЛИЕНТЫ -->
					<div class="filter-section">
						<label class="filter-section-label">
							<span class="material-icons-round">business</span>
							Клиенты
							<span class="filter-hint">клик — исключить</span>
						<div class="service-actions">
							<button class="service-action-btn" onclick={excludeAllCompanies}>
								<span class="material-icons-round">deselect</span> Исключить все
							</button>
							<button class="service-action-btn include" onclick={includeAllCompanies}>
								<span class="material-icons-round">select_all</span> Включить все
							</button>
						</div>
						</label>
						<div class="service-chips">
							{#each companyIdMap as c (c.value)}
								{@const isExcluded = excludedCompanyIds.has(c.value)}
								<button
									class="service-chip"
									class:excluded={isExcluded}
									onclick={() => toggleCompanyId(c.value)}
									title={`${c.value}: ${c.label}`}
									data-tooltip={c.label}
								>
									<span class="sid-num" class:struck={isExcluded}>{c.value}</span>
								</button>
							{/each}
						</div>
						{#if excludedCompanyIds.size > 0}
							<div class="service-summary">
								<span class="material-icons-round">info_outline</span>
								Исключено: {excludedCompanyIds.size} из {companyIdMap.length}
							</div>
						{/if}
					</div>

					<div class="filter-row">
						<div class="filter-input-group">
							<label>
								<span class="material-icons-round">pin</span>
								ОГРАНИЧЕНИЕ СТРОК
							</label>
							<input type="number" bind:value={topN} placeholder="Все строки" min="1" max="100000" />
						</div>
						<div class="filter-input-group">
							<label>
								<span class="material-icons-round">sort</span>
								СОРТИРОВКА
							</label>
							<div class="inline-selects">
								<select bind:value={orderBy}>
									<option value="">По умолчанию</option>
									<option value="Created">Дата создания</option>
									<option value="Deadline">Срок план</option>
									<option value="Changed">Дата изменения</option>
									<option value="Id">ID заявки</option>
								</select>
								<select bind:value={orderDir} class="dir-select">
									<option value="DESC">↓ УБЫВ.</option>
									<option value="ASC">↑ ВОЗР.</option>
								</select>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- DROP ZONE TABLE -->
		<div class="constructor-section">
			<div class="section-header">
				<h3>
					<span class="material-icons-round">table_chart</span>
					Конструктор таблицы
					<span class="col-count">{selectedColumns.length} столб.</span>
				</h3>
				{#if selectedColumns.length > 0}
					<button class="clear-btn" onclick={clearAll}>
						<span class="material-icons-round">delete_sweep</span>
						Очистить
					</button>
				{/if}
			</div>

			<div
				class="drop-zone"
				class:drag-active={draggedColumn !== null}
				class:has-columns={selectedColumns.length > 0}
				ondragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
				ondrop={handleMainDropZoneDrop}
				role="listbox"
			>
				{#if selectedColumns.length === 0}
					<div class="drop-placeholder">
						<span class="material-icons-round">drag_indicator</span>
						<p>Перетащите или кликните на столбцы в левой панели</p>
					</div>
				{:else}
					<div class="column-headers">
						{#each selectedColumns as col, i (col.id)}
							<div
								class="header-cell"
								class:drag-over={dragOverIndex === i}
								ondragover={(e) => handleDropZoneDragOver(e, i)}
								ondrop={(e) => handleDropZoneDrop(e, i)}
							>
								<div class="cell-number">{i + 1}</div>
								<div class="header-cell-inner">
									<span class="cell-label">{col.alias || col.label}</span>
									{#if col.source === 'asset'}
										<span class="cell-badge">Asset</span>
									{/if}
								</div>
								<div class="cell-controls">
									<button class="cell-move" onclick={() => moveColumn(i, i - 1)} disabled={i === 0} aria-label="Влево">
										<span class="material-icons-round">chevron_left</span>
									</button>
									<button class="cell-remove" onclick={() => removeColumn(i)} aria-label="Удалить">
										<span class="material-icons-round">close</span>
									</button>
									<button class="cell-move" onclick={() => moveColumn(i, i + 1)} disabled={i === selectedColumns.length - 1} aria-label="Вправо">
										<span class="material-icons-round">chevron_right</span>
									</button>
								</div>
							</div>
						{/each}
						<!-- Extra drop zone at the end -->
						<div
							class="header-cell add-cell"
							class:drag-over={dragOverIndex === selectedColumns.length}
							ondragover={(e) => handleDropZoneDragOver(e, selectedColumns.length)}
							ondrop={(e) => handleDropZoneDrop(e, selectedColumns.length)}
						>
							<span class="material-icons-round">add</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- SQL OUTPUT -->
		<div class="sql-section">
			<div class="section-header">
				<h3>
					<span class="material-icons-round">code</span>
					Сгенерированный SQL
				</h3>
				<button class="copy-btn" onclick={copySQL}>
					<span class="material-icons-round">{copiedToast ? 'check' : 'content_copy'}</span>
					{copiedToast ? 'Скопировано!' : 'Копировать'}
				</button>
			</div>
			<div class="sql-output">
				<pre><code>{@html highlightSQL(generatedSQL)}</code></pre>
			</div>
		</div>
	</main>
</div>

{#if copiedToast}
	<div class="toast">
		<span class="material-icons-round">check_circle</span>
		SQL скопирован в буфер обмена
	</div>
{/if}

<style>
	/* ═══════════════════════════════════════════
	   SQL Builder — Redesigned Layout
	   ═══════════════════════════════════════════ */

	/* ── Layout ── */
	.builder-layout {
		display: flex;
		height: calc(100vh - 56px);
		overflow: hidden;
		background: var(--bg-primary);
	}

	/* ═══ Sidebar ═══ */
	.sidebar {
		width: 280px;
		min-width: 280px;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-primary);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.sidebar-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-primary);
		background: var(--bg-tertiary);
	}
	.sidebar-header h2 {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.625rem 0;
	}
	.sidebar-header h2 .material-icons-round { font-size: 1.125rem; color: var(--accent-primary); }
	.sidebar-search {
		width: 100%;
		padding: 0.4375rem 0.75rem;
		padding-left: 2rem;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-sm);
		background: var(--bg-primary) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='16' width='16' fill='%236c7086'%3E%3Cpath d='M10 10.5l4 4M7 12A5 5 0 107 2a5 5 0 000 10z' stroke='%236c7086' stroke-width='1.5' fill='none'/%3E%3C/svg%3E") no-repeat 0.5rem center;
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-family: var(--font-primary);
		outline: none;
		transition: border-color var(--transition-fast);
	}
	.sidebar-search:focus { border-color: var(--accent-primary); }
	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 0;
	}

	/* ── Category Groups ── */
	.category-group {
		border-bottom: 1px solid var(--border-primary);
	}
	.category-group:last-child { border-bottom: none; }
	.category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 700;
		font-family: var(--font-primary);
		cursor: pointer;
		transition: background var(--transition-fast);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.category-header:hover { background: var(--bg-hover); }
	.cat-icon { font-size: 1rem; color: var(--accent-primary); }
	.cat-label { flex: 1; text-align: left; }
	.cat-count {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-tertiary);
		background: var(--bg-primary);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-primary);
	}
	.expand-icon {
		font-size: 1rem;
		color: var(--text-tertiary);
		transition: transform var(--transition-fast);
	}
	.expand-icon.expanded { transform: rotate(180deg); }

	/* ── Vertical Column List ── */
	.category-columns {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.column-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem 0.375rem 1rem;
		cursor: pointer;
		transition: all var(--transition-fast);
		user-select: none;
		border-bottom: 1px solid color-mix(in srgb, var(--border-primary) 40%, transparent);
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
	.column-row:last-child { border-bottom: none; }
	.column-row:hover:not(.selected) {
		background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
		color: var(--accent-primary);
	}
	.column-row.selected {
		background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
		color: var(--accent-primary);
	}
	.column-row.asset-source {
		border-left: 3px solid #f59e0b;
		padding-left: calc(1rem - 3px);
	}
	.row-check {
		font-size: 1rem;
		color: var(--accent-primary);
		flex-shrink: 0;
	}
	.row-dot {
		font-size: 1rem;
		color: var(--text-tertiary);
		opacity: 0.35;
		flex-shrink: 0;
	}
	.row-label {
		flex: 1;
		font-weight: 500;
		line-height: 1.3;
	}
	.row-badge {
		font-size: 0.5625rem;
		font-weight: 700;
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.15);
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	/* ═══ Main Area ═══ */
	.main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: var(--space-lg);
		gap: var(--space-md);
	}

	/* ════ Settings Bar ════ */
	.settings-bar {
		background: var(--bg-secondary);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		box-shadow: var(--shadow-sm);
	}
	.settings-grid {
		display: flex;
		align-items: stretch;
		gap: 0;
		flex-wrap: wrap;
	}
	.settings-divider {
		width: 1px;
		background: var(--border-primary);
		margin: 0.25rem 0.75rem;
		flex-shrink: 0;
	}
	.setting-card {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.375rem 0.625rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	.setting-card:hover { background: color-mix(in srgb, var(--accent-primary) 4%, transparent); }
	.setting-card-icon {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
		color: var(--accent-primary);
		flex-shrink: 0;
		margin-top: 2px;
	}
	.setting-card-icon .material-icons-round { font-size: 0.9375rem; }
	.setting-card-body {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}
	.setting-card-body label {
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.setting-card-body select,
	.setting-card-body input[type="date"],
	.setting-card-body input[type="number"] {
		padding: 0.3125rem 0.5rem;
		border: 1px solid var(--border-primary);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-family: var(--font-primary);
		outline: none;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}
	.setting-card-body select:focus,
	.setting-card-body input:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 15%, transparent);
	}
	.inline-selects {
		display: flex;
		gap: 4px;
	}
	.dir-select { width: 100px !important; }

	/* ── Filters Toggle ── */
	.toggle-filters-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-full);
		background: var(--bg-primary);
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-primary);
		cursor: pointer;
		transition: all var(--transition-fast);
		margin-top: var(--space-md);
	}
	.toggle-filters-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
	.toggle-filters-btn .material-icons-round { font-size: 1rem; }
	.filter-badge {
		background: var(--accent-primary);
		color: white;
		font-size: 0.5625rem;
		font-weight: 700;
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-full);
		min-width: 16px;
		text-align: center;
	}

	/* ── Filters Panel ── */
	.filters-panel {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--border-primary);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.filter-section-label {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.filter-section-label .material-icons-round { font-size: 0.875rem; color: var(--accent-primary); }
	.filter-row {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}
	.filter-input-group {
		flex: 1;
		min-width: 200px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.filter-input-group label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-tertiary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.filter-input-group label .material-icons-round { font-size: 0.8125rem; }
	.filter-input-group input {
		padding: 0.4375rem 0.625rem;
		border: 1px solid var(--border-primary);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-family: var(--font-primary);
		outline: none;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}
	.filter-input-group input:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 15%, transparent);
	}
	.filter-input-group select {
		padding: 0.4375rem 0.625rem;
		padding-right: 22px;
		border: 1px solid var(--border-primary);
		border-radius: 6px;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-family: var(--font-primary);
		outline: none;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}
	.filter-input-group select:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 15%, transparent);
	}

	/* ── Type Chips ── */
	.type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.type-chip {
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		color: var(--text-secondary);
		font-size: 0.6875rem;
		font-weight: 500;
		font-family: var(--font-primary);
		cursor: pointer;
		transition: all var(--transition-fast);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.type-chip:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
	.type-chip.active {
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		color: var(--accent-primary);
		border-color: var(--accent-primary);
		font-weight: 600;
	}
	.tc-check { font-size: 0.75rem; }

	/* ── Service ID Toggle Chips ── */
	.service-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.service-chip {
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
		cursor: pointer;
		transition: all var(--transition-fast);
		display: inline-flex;
		align-items: center;
		min-width: 36px;
		justify-content: center;
		position: relative;
	}
	.service-chip:hover { border-color: var(--accent-primary); }
	/* Custom tooltip */
	.service-chip::after {
		content: attr(data-tooltip);
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%) scale(0.9);
		padding: 0.3125rem 0.625rem;
		background: #1e1e2e;
		color: #cdd6f4;
		font-size: 0.6875rem;
		font-weight: 500;
		font-family: var(--font-primary);
		border-radius: 6px;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: opacity 150ms, transform 150ms;
		z-index: 100;
		border: 1px solid var(--border-primary);
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
	}
	.service-chip:hover::after {
		opacity: 1;
		transform: translateX(-50%) scale(1);
	}
	.service-chip.excluded {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.3);
		color: var(--text-tertiary);
	}
	.sid-num { transition: all var(--transition-fast); }
	.sid-num.struck {
		text-decoration: line-through;
		text-decoration-color: #ef4444;
		text-decoration-thickness: 2px;
		opacity: 0.4;
	}
	.filter-hint {
		font-size: 0.5625rem;
		font-weight: 500;
		color: var(--text-tertiary);
		opacity: 0.6;
		text-transform: none;
		letter-spacing: normal;
		margin-left: auto;
	}
	.service-actions {
		display: flex;
		gap: 0.375rem;
		margin-left: 0.5rem;
	}
	.service-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1875rem 0.5rem;
		border-radius: 4px;
		border: 1px solid rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.06);
		color: #ef4444;
		font-size: 0.5625rem;
		font-weight: 600;
		font-family: var(--font-primary);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		transition: all var(--transition-fast);
	}
	.service-action-btn .material-icons-round { font-size: 0.75rem; }
	.service-action-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: #ef4444;
	}
	.service-action-btn.include {
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.06);
		color: #22c55e;
	}
	.service-action-btn.include:hover {
		background: rgba(34, 197, 94, 0.15);
		border-color: #22c55e;
	}
	.service-summary {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: #ef4444;
		font-weight: 500;
		padding: 0.25rem 0;
	}
	.service-summary .material-icons-round { font-size: 0.875rem; }

	/* ── Dark-theme Native Select Styling ── */
	select {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 6px center;
		padding-right: 22px !important;
	}
	/* Force dark dropdown on Chromium */
	select option {
		background: var(--bg-secondary, #1e1e2e);
		color: var(--text-primary, #cdd6f4);
		padding: 0.375rem 0.5rem;
	}
	select option:checked,
	select option:hover {
		background: var(--accent-primary, #6366f1);
		color: white;
	}

	/* ════ Constructor Section ════ */
	.constructor-section, .sql-section {
		background: var(--bg-secondary);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem var(--space-md);
		border-bottom: 1px solid var(--border-primary);
		background: var(--bg-tertiary);
	}
	.section-header h3 {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}
	.section-header h3 .material-icons-round { font-size: 1.125rem; color: var(--accent-primary); }
	.col-count {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}
	.clear-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3125rem 0.75rem;
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.08);
		color: #ef4444;
		font-size: 0.6875rem;
		font-weight: 600;
		font-family: var(--font-primary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.clear-btn:hover { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.5); }
	.clear-btn .material-icons-round { font-size: 0.875rem; }

	/* ── Drop Zone ── */
	.drop-zone {
		min-height: 80px;
		padding: var(--space-md);
		transition: background var(--transition-fast);
	}
	.drop-zone.drag-active {
		background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
	}
	.drop-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: var(--space-lg);
		color: var(--text-tertiary);
		border: 2px dashed color-mix(in srgb, var(--border-primary) 70%, transparent);
		border-radius: var(--radius-md);
	}
	.drop-placeholder .material-icons-round { font-size: 1.75rem; opacity: 0.3; }
	.drop-placeholder p { font-size: 0.8125rem; margin: 0; }

	/* ── Column Header Table ── */
	.column-headers {
		display: flex;
		gap: 0;
		overflow-x: auto;
		padding-bottom: 4px;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
	}
	.header-cell {
		flex: 0 0 auto;
		min-width: 130px;
		max-width: 220px;
		background: transparent;
		border-right: 1px solid var(--border-primary);
		transition: all var(--transition-fast);
		display: flex;
		flex-direction: column;
	}
	.header-cell:last-of-type:not(.add-cell) { border-right: none; }
	.header-cell.drag-over {
		background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
	}
	.cell-number {
		font-size: 0.5625rem;
		font-weight: 700;
		color: var(--text-tertiary);
		text-align: center;
		padding: 0.1875rem 0 0;
		opacity: 0.6;
	}
	.header-cell-inner {
		padding: 0.25rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		align-items: center;
		text-align: center;
		flex: 1;
		justify-content: center;
	}
	.cell-controls {
		display: flex;
		gap: 1px;
		align-items: center;
		justify-content: center;
		padding: 0.125rem 0 0.25rem;
		border-top: 1px solid color-mix(in srgb, var(--border-primary) 50%, transparent);
	}
	.cell-move, .cell-remove {
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		display: flex;
		transition: all var(--transition-fast);
	}
	.cell-move:hover { color: var(--accent-primary); background: color-mix(in srgb, var(--accent-primary) 10%, transparent); }
	.cell-remove:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
	.cell-move:disabled { opacity: 0.2; cursor: default; }
	.cell-move:disabled:hover { background: transparent; color: var(--text-tertiary); }
	.cell-move .material-icons-round, .cell-remove .material-icons-round { font-size: 0.8125rem; }
	.cell-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.25;
		word-break: break-word;
	}
	.cell-badge {
		font-size: 0.5rem;
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		padding: 0.0625rem 0.25rem;
		border-radius: 3px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.add-cell {
		min-width: 44px;
		max-width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-right: none;
		color: var(--text-tertiary);
		cursor: default;
		opacity: 0.4;
	}
	.add-cell .material-icons-round { font-size: 1.125rem; }

	/* ════ SQL Output ════ */
	.sql-section { flex: 1; min-height: 200px; display: flex; flex-direction: column; }
	.copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3125rem 0.75rem;
		border: none;
		border-radius: 6px;
		background: var(--accent-primary);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		font-family: var(--font-primary);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.copy-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
	.copy-btn .material-icons-round { font-size: 0.875rem; }
	.sql-output {
		flex: 1;
		overflow: auto;
		padding: var(--space-md) var(--space-lg);
		background: #1e1e2e;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		border-top: 3px solid var(--accent-primary);
	}
	.sql-output pre {
		margin: 0;
		font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
		font-size: 0.8125rem;
		line-height: 1.65;
		color: #cdd6f4;
		white-space: pre-wrap;
		word-break: break-word;
		tab-size: 4;
	}
	.sql-output :global(.sql-keyword) { color: #cba6f7; font-weight: 600; }
	.sql-output :global(.sql-string) { color: #a6e3a1; }
	.sql-output :global(.sql-comment) { color: #6c7086; font-style: italic; }
	.sql-output :global(.sql-number) { color: #fab387; }

	/* ── Toast ── */
	.toast {
		position: fixed;
		bottom: var(--space-lg);
		right: var(--space-lg);
		background: var(--accent-primary);
		color: white;
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-shadow: var(--shadow-lg);
		z-index: var(--z-toast);
		animation: slideUp 300ms ease-out;
	}
	.toast .material-icons-round { font-size: 1.125rem; }

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}
</style>
