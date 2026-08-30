<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';

	let { data } = $props();
	let tasks = data.tasks || [];
	let logs = data.logs || [];

	// ── Summary Stats ──
	const totalTasks = tasks.length;
	const totalRuns = logs.length;
	const successRuns = logs.filter(l => l.status === 'success').length;
	const errorRuns = logs.filter(l => l.status === 'error').length;
	const runningCount = logs.filter(l => l.status === 'running').length;
	const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : 0;
	const avgDuration = totalRuns > 0 
		? (logs.filter(l => l.duration != null).reduce((s, l) => s + l.duration, 0) / logs.filter(l => l.duration != null).length).toFixed(1)
		: 0;

	// ── By Creator ──
	function groupBy(arr, key) {
		const map = {};
		arr.forEach(item => {
			const k = item[key] || 'Не указан';
			if (!map[k]) map[k] = 0;
			map[k]++;
		});
		return Object.entries(map).sort((a, b) => b[1] - a[1]);
	}

	const byCreator = groupBy(tasks, 'creator');
	const byRequester = groupBy(tasks.filter(t => t.requester), 'requester');
	const maxCreator = byCreator.length > 0 ? byCreator[0][1] : 1;
	const maxRequester = byRequester.length > 0 ? byRequester[0][1] : 1;

	// ── By Task (run count from logs) ──
	function getTaskRunStats() {
		const stats = {};
		logs.forEach(l => {
			if (!stats[l.taskName]) stats[l.taskName] = { runs: 0, success: 0, error: 0, totalDuration: 0 };
			stats[l.taskName].runs++;
			if (l.status === 'success') stats[l.taskName].success++;
			if (l.status === 'error') stats[l.taskName].error++;
			if (l.duration != null) stats[l.taskName].totalDuration += l.duration;
		});
		return Object.entries(stats)
			.map(([name, s]) => ({ name, ...s, avgDuration: (s.totalDuration / s.runs).toFixed(1) }))
			.sort((a, b) => b.runs - a.runs);
	}
	const taskRunStats = getTaskRunStats();
	const maxRuns = taskRunStats.length > 0 ? taskRunStats[0].runs : 1;

	// ── By Period (last 7 days) ──
	function getPeriodsStats() {
		const days = [];
		const now = new Date();
		for (let i = 6; i >= 0; i--) {
			const d = new Date(now);
			d.setDate(d.getDate() - i);
			const dateKey = d.toISOString().slice(0, 10);
			const dayLogs = logs.filter(l => l.startTime && l.startTime.startsWith(dateKey.replace(/-/g, '-')));
			const pad = n => String(n).padStart(2, '0');
			days.push({
				label: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`,
				fullDate: dateKey,
				total: dayLogs.length,
				success: dayLogs.filter(l => l.status === 'success').length,
				error: dayLogs.filter(l => l.status === 'error').length
			});
		}
		return days;
	}
	const periods = getPeriodsStats();
	const maxPeriodTotal = Math.max(...periods.map(p => p.total), 1);

	// ── DB Source breakdown ──
	const byDbSource = groupBy(tasks, 'dbSource');
	const maxDbSource = byDbSource.length > 0 ? byDbSource[0][1] : 1;

	// Color palette for charts
	const colors = [
		'#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', 
		'#f59e0b', '#ef4444', '#10b981', '#f97316', '#06b6d4'
	];

	onMount(async () => {
		const { gsap } = await import('gsap');
		gsap.from('.stat-card', { y: 20, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'transform' });
		gsap.from('.chart-section', { y: 30, duration: 0.6, stagger: 0.12, delay: 0.3, ease: 'power2.out', clearProps: 'transform' });
	});
</script>

<svelte:head>
	<title>Дашборд — STORM TASK MANAGER</title>
</svelte:head>

<Header currentPage="stats" />

<main class="container stats-page">
	<!-- ────────── Summary Cards ────────── -->
	<div class="summary-grid">
		<div class="stat-card stat-primary">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">assignment</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{totalTasks}</div>
				<div class="stat-label">Всего задач</div>
			</div>
		</div>

		<div class="stat-card stat-info">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">play_circle</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{totalRuns}</div>
				<div class="stat-label">Всего запусков</div>
			</div>
		</div>

		<div class="stat-card stat-success">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">check_circle</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{successRate}%</div>
				<div class="stat-label">Успешных</div>
			</div>
			<div class="stat-sub">{successRuns} из {totalRuns}</div>
		</div>

		<div class="stat-card stat-danger">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">error</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{errorRuns}</div>
				<div class="stat-label">Ошибок</div>
			</div>
		</div>

		<div class="stat-card stat-warning">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">timer</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{avgDuration}<span class="stat-unit"> сек</span></div>
				<div class="stat-label">Среднее время</div>
			</div>
		</div>

		<div class="stat-card stat-running">
			<div class="stat-icon-wrap">
				<span class="material-icons-round">sync</span>
			</div>
			<div class="stat-details">
				<div class="stat-value">{runningCount}</div>
				<div class="stat-label">Выполняется</div>
			</div>
		</div>
	</div>

	<!-- ────────── Period Chart (7 days) ────────── -->
	<div class="chart-section">
		<div class="chart-header">
			<span class="material-icons-round">calendar_month</span>
			<h3>Активность за 7 дней</h3>
		</div>
		<div class="period-chart">
			{#each periods as day, i}
				<div class="period-bar-group">
					<div class="period-bars" style="height: 180px;">
						{#if day.total > 0}
							<div 
								class="period-bar bar-success" 
								style="height: {(day.success / maxPeriodTotal) * 100}%; min-height: {day.success > 0 ? '8px' : '0'};"
								title="Успешных: {day.success}"
							></div>
							<div 
								class="period-bar bar-error" 
								style="height: {(day.error / maxPeriodTotal) * 100}%; min-height: {day.error > 0 ? '8px' : '0'};"
								title="Ошибок: {day.error}"
							></div>
						{:else}
							<div class="period-bar bar-empty" style="height: 4px;"></div>
						{/if}
					</div>
					<div class="period-label">{day.label}</div>
					<div class="period-total">{day.total}</div>
				</div>
			{/each}
		</div>
		<div class="chart-legend">
			<span class="legend-item"><span class="legend-dot dot-success"></span> Успешно</span>
			<span class="legend-item"><span class="legend-dot dot-error"></span> Ошибки</span>
		</div>
	</div>

	<div class="charts-grid">
		<!-- ────────── By Creator ────────── -->
		<div class="chart-section">
			<div class="chart-header">
				<span class="material-icons-round">person</span>
				<h3>По создателю</h3>
				<span class="chart-count">{byCreator.length}</span>
			</div>
			<div class="bar-chart">
				{#each byCreator as [name, count], i}
					<div class="bar-row">
						<div class="bar-label">{name}</div>
						<div class="bar-track">
							<div 
								class="bar-fill" 
								style="width: {(count / maxCreator) * 100}%; background: {colors[i % colors.length]};"
							></div>
						</div>
						<div class="bar-value">{count}</div>
					</div>
				{/each}
				{#if byCreator.length === 0}
					<div class="empty-chart">Нет данных</div>
				{/if}
			</div>
		</div>

		<!-- ────────── By Requester ────────── -->
		<div class="chart-section">
			<div class="chart-header">
				<span class="material-icons-round">people</span>
				<h3>По заявителю</h3>
				<span class="chart-count">{byRequester.length}</span>
			</div>
			<div class="bar-chart">
				{#each byRequester as [name, count], i}
					<div class="bar-row">
						<div class="bar-label">{name}</div>
						<div class="bar-track">
							<div 
								class="bar-fill" 
								style="width: {(count / maxRequester) * 100}%; background: {colors[(i + 3) % colors.length]};"
							></div>
						</div>
						<div class="bar-value">{count}</div>
					</div>
				{/each}
				{#if byRequester.length === 0}
					<div class="empty-chart">Нет данных</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ────────── Tasks Run Leaderboard ────────── -->
	<div class="chart-section">
		<div class="chart-header">
			<span class="material-icons-round">leaderboard</span>
			<h3>Статистика по задачам</h3>
			<span class="chart-count">{taskRunStats.length}</span>
		</div>
		{#if taskRunStats.length > 0}
			<div class="leaderboard">
				<div class="leaderboard-header">
					<span class="lb-col lb-name">Задача</span>
					<span class="lb-col lb-runs">Запуски</span>
					<span class="lb-col lb-success">Успешно</span>
					<span class="lb-col lb-error">Ошибки</span>
					<span class="lb-col lb-avg">Ср. время</span>
					<span class="lb-col lb-bar">Прогресс</span>
				</div>
				{#each taskRunStats as stat, i}
					<div class="leaderboard-row">
						<span class="lb-col lb-name">
							<span class="lb-rank" style="background: {colors[i % colors.length]};">{i + 1}</span>
							{stat.name}
						</span>
						<span class="lb-col lb-runs lb-value">{stat.runs}</span>
						<span class="lb-col lb-success">
							<span class="badge badge-success">{stat.success}</span>
						</span>
						<span class="lb-col lb-error">
							<span class="badge badge-danger">{stat.error || '—'}</span>
						</span>
						<span class="lb-col lb-avg lb-value">{stat.avgDuration} с</span>
						<span class="lb-col lb-bar">
							<div class="mini-bar-track">
								<div class="mini-bar-success" style="width: {(stat.success / stat.runs) * 100}%;"></div>
								<div class="mini-bar-error" style="width: {(stat.error / stat.runs) * 100}%;"></div>
							</div>
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-chart">Нет данных о запусках</div>
		{/if}
	</div>

	<!-- ────────── DB Source Breakdown ────────── -->
	<div class="charts-grid">
		<div class="chart-section">
			<div class="chart-header">
				<span class="material-icons-round">storage</span>
				<h3>По источнику БД</h3>
			</div>
			<div class="donut-chart-wrap">
				{#each byDbSource as [name, count], i}
					<div class="donut-item">
						<div class="donut-ring" style="--ring-color: {colors[i % colors.length]}; --ring-pct: {(count / totalTasks) * 100}%;">
							<span class="donut-inner-val">{count}</span>
						</div>
						<div class="donut-label">{name}</div>
						<div class="donut-pct">{((count / totalTasks) * 100).toFixed(0)}%</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="chart-section">
			<div class="chart-header">
				<span class="material-icons-round">pie_chart</span>
				<h3>Результаты выполнения</h3>
			</div>
			<div class="result-breakdown">
				<div class="result-ring">
					<svg viewBox="0 0 120 120" class="ring-svg">
						<circle cx="60" cy="60" r="50" class="ring-bg" />
						{#if totalRuns > 0}
							<circle cx="60" cy="60" r="50" class="ring-success"
								style="stroke-dasharray: {(successRuns / totalRuns) * 314} 314; stroke-dashoffset: 0;"
							/>
							<circle cx="60" cy="60" r="50" class="ring-error"
								style="stroke-dasharray: {(errorRuns / totalRuns) * 314} 314; stroke-dashoffset: {-(successRuns / totalRuns) * 314};"
							/>
						{/if}
					</svg>
					<div class="ring-center">
						<span class="ring-total">{totalRuns}</span>
						<span class="ring-caption">запусков</span>
					</div>
				</div>
				<div class="result-list">
					<div class="result-item">
						<span class="result-dot" style="background: #10b981;"></span>
						<span class="result-name">Успешно</span>
						<span class="result-val">{successRuns}</span>
					</div>
					<div class="result-item">
						<span class="result-dot" style="background: #ef4444;"></span>
						<span class="result-name">Ошибки</span>
						<span class="result-val">{errorRuns}</span>
					</div>
					{#if runningCount > 0}
						<div class="result-item">
							<span class="result-dot" style="background: #f59e0b;"></span>
							<span class="result-name">В работе</span>
							<span class="result-val">{runningCount}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</main>

<ThemeToggle />
<ScrollToTop />

<style>
	.stats-page {
		padding-top: var(--space-2xl);
		padding-bottom: 6rem;
	}

	/* ── Summary Cards Grid ── */
	:global(.summary-grid) {
		display: grid !important;
		grid-template-columns: repeat(6, 1fr) !important;
		gap: 0.75rem !important;
		margin-bottom: 2rem !important;
	}

	:global(.stat-card) {
		background: rgba(20, 24, 39, 0.6) !important;
		backdrop-filter: blur(10px) !important;
		border: 1px solid rgba(255, 255, 255, 0.05) !important;
		border-radius: var(--radius-md) !important;
		padding: 1rem !important;
		display: flex !important;
		flex-direction: column !important;
		gap: 0.5rem !important;
		position: relative !important;
		overflow: hidden !important;
		transition: all var(--transition-base) !important;
	}
	:global(.stat-card:hover) {
		transform: translateY(-2px) !important;
		box-shadow: 0 6px 20px rgba(0,0,0, 0.4) !important;
	}
	:global(.stat-card::before) {
		content: '' !important;
		position: absolute !important;
		top: 0 !important;
		left: 0 !important;
		right: 0 !important;
		height: 3px !important;
	}

	:global(.stat-card.stat-primary) { background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(0,0,0,0.2)) !important; border-color: rgba(99, 102, 241, 0.2) !important; }
	:global(.stat-card.stat-primary::before) { background: linear-gradient(90deg, #6366f1, #8b5cf6) !important; }
	:global(.stat-card.stat-primary .stat-value) { color: #818cf8 !important; text-shadow: 0 0 10px rgba(99, 102, 241, 0.3) !important; }
	:global(.stat-card.stat-primary .stat-icon-wrap) { background: rgba(99, 102, 241, 0.15) !important; color: #818cf8 !important; }

	:global(.stat-card.stat-info) { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(0,0,0,0.2)) !important; border-color: rgba(59, 130, 246, 0.2) !important; }
	:global(.stat-card.stat-info::before) { background: linear-gradient(90deg, #3b82f6, #06b6d4) !important; }
	:global(.stat-card.stat-info .stat-value) { color: #60a5fa !important; text-shadow: 0 0 10px rgba(59, 130, 246, 0.3) !important; }
	:global(.stat-card.stat-info .stat-icon-wrap) { background: rgba(59, 130, 246, 0.15) !important; color: #60a5fa !important; }

	:global(.stat-card.stat-success) { background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(0,0,0,0.2)) !important; border-color: rgba(16, 185, 129, 0.3) !important; }
	:global(.stat-card.stat-success::before) { background: linear-gradient(90deg, #10b981, #14b8a6) !important; }
	:global(.stat-card.stat-success .stat-value) { color: #34d399 !important; text-shadow: 0 0 15px rgba(52, 211, 153, 0.4) !important; }
	:global(.stat-card.stat-success .stat-icon-wrap) { background: rgba(16, 185, 129, 0.2) !important; color: #34d399 !important; }
	:global(.stat-card.stat-success .stat-label), :global(.stat-card.stat-success .stat-sub) { color: #a7f3d0 !important; }

	:global(.stat-card.stat-danger) { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0.2)) !important; border-color: rgba(239, 68, 68, 0.2) !important; }
	:global(.stat-card.stat-danger::before) { background: linear-gradient(90deg, #ef4444, #f97316) !important; }
	:global(.stat-card.stat-danger .stat-value) { color: #f87171 !important; text-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important; }
	:global(.stat-card.stat-danger .stat-icon-wrap) { background: rgba(239, 68, 68, 0.15) !important; color: #f87171 !important; }

	:global(.stat-card.stat-warning) { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(0,0,0,0.2)) !important; border-color: rgba(245, 158, 11, 0.2) !important; }
	:global(.stat-card.stat-warning::before) { background: linear-gradient(90deg, #f59e0b, #eab308) !important; }
	:global(.stat-card.stat-warning .stat-value) { color: #fbbf24 !important; text-shadow: 0 0 10px rgba(245, 158, 11, 0.3) !important; }
	:global(.stat-card.stat-warning .stat-icon-wrap) { background: rgba(245, 158, 11, 0.15) !important; color: #fbbf24 !important; }

	:global(.stat-card.stat-running) { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.2)) !important; border-color: rgba(139, 92, 246, 0.2) !important; }
	:global(.stat-card.stat-running::before) { background: linear-gradient(90deg, #8b5cf6, #ec4899) !important; }
	:global(.stat-card.stat-running .stat-value) { color: #a78bfa !important; text-shadow: 0 0 10px rgba(139, 92, 246, 0.3) !important; }
	:global(.stat-card.stat-running .stat-icon-wrap) { background: rgba(139, 92, 246, 0.15) !important; color: #a78bfa !important; }

	:global(.stat-icon-wrap) {
		width: 32px !important;
		height: 32px !important;
		border-radius: var(--radius-sm) !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}
	:global(.stat-icon-wrap .material-icons-round) { font-size: 1.25rem !important; }
	
	:global(.stat-details) {
		display: flex !important;
		flex-direction: column !important;
	}
	
	:global(.stat-value) {
		font-size: 1.5rem !important;
		font-weight: 800 !important;
		line-height: 1 !important;
	}
	:global(.stat-unit) { font-size: 0.75rem !important; font-weight: 500 !important; opacity: 0.8 !important; }
	
	:global(.stat-label) {
		font-size: 0.75rem !important;
		color: #94a3b8 !important;
		margin-top: 0.25rem !important;
		white-space: nowrap !important;
	}
	:global(.stat-sub) {
		font-size: 0.7rem !important;
		color: #64748b !important;
	}

	/* ── Chart Sections ── */
	.chart-section {
		background: var(--card-bg);
		backdrop-filter: var(--card-glass);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: var(--space-xl);
	}
	.chart-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.chart-header .material-icons-round {
		font-size: 1.375rem;
		color: var(--color-primary);
	}
	.chart-header h3 {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
	}
	.chart-count {
		margin-left: auto;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
	}

	/* ── Two-column layout ── */
	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
		gap: var(--space-xl);
	}
	.charts-grid .chart-section {
		margin-bottom: 0;
	}

	/* ── Bar Charts ── */
	.bar-chart {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}
	.bar-row {
		display: grid;
		grid-template-columns: 120px 1fr 50px;
		gap: 0.75rem;
		align-items: center;
	}
	.bar-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.bar-track {
		height: 28px;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: var(--radius-sm);
		transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		min-width: 8px;
	}
	.bar-value {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: right;
	}

	/* ── Period Chart ── */
	.period-chart {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 0.5rem;
		padding: 0 0.5rem;
	}
	.period-bar-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.period-bars {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 2px;
		width: 100%;
	}
	.period-bar {
		width: 100%;
		max-width: 56px;
		border-radius: var(--radius-xs);
		transition: height 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.bar-success { background: linear-gradient(180deg, #10b981, #059669); }
	.bar-error { background: linear-gradient(180deg, #ef4444, #dc2626); }
	.bar-empty { background: var(--bg-secondary); width: 100%; max-width: 56px; border-radius: 2px; }
	.period-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-tertiary);
	}
	.period-total {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.chart-legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}
	.dot-success { background: #10b981; }
	.dot-error { background: #ef4444; }

	/* ── Leaderboard ── */
	.leaderboard {
		overflow-x: auto;
	}
	.leaderboard-header, .leaderboard-row {
		display: grid;
		grid-template-columns: 1.8fr 0.6fr 0.6fr 0.6fr 0.7fr 1.2fr;
		gap: 0.5rem;
		padding: 0.75rem 0.5rem;
		align-items: center;
	}
	.leaderboard-header {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-tertiary);
		border-bottom: 1px solid var(--border-color);
	}
	.leaderboard-row {
		border-bottom: 1px solid var(--border-color-subtle, rgba(128,128,128,0.08));
		transition: background var(--transition-fast);
	}
	.leaderboard-row:last-child { border-bottom: none; }
	.leaderboard-row:hover { background: var(--bg-secondary); }
	
	.lb-name {
		font-size: 0.875rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.lb-rank {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.lb-value {
		font-weight: 700;
		font-size: 0.9375rem;
	}
	.lb-runs, .lb-success, .lb-error, .lb-avg, .lb-bar {
		text-align: center;
	}

	/* Mini progress bar */
	.mini-bar-track {
		height: 8px;
		background: var(--bg-secondary);
		border-radius: 4px;
		display: flex;
		overflow: hidden;
	}
	.mini-bar-success {
		background: #10b981;
		height: 100%;
		transition: width 0.6s ease;
	}
	.mini-bar-error {
		background: #ef4444;
		height: 100%;
		transition: width 0.6s ease;
	}

	/* ── Donut / Ring Charts ── */
	.donut-chart-wrap {
		display: flex;
		justify-content: center;
		gap: 2.5rem;
		flex-wrap: wrap;
	}
	.donut-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.donut-ring {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: conic-gradient(var(--ring-color) 0% var(--ring-pct), var(--bg-secondary) var(--ring-pct) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
	}
	.donut-inner-val {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--card-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.donut-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	.donut-pct {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* ── SVG Ring ── */
	.result-breakdown {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2.5rem;
		flex-wrap: wrap;
	}
	.result-ring {
		position: relative;
		width: 140px;
		height: 140px;
	}
	.ring-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.ring-bg {
		fill: none;
		stroke: var(--bg-secondary);
		stroke-width: 12;
	}
	.ring-success {
		fill: none;
		stroke: #10b981;
		stroke-width: 12;
		stroke-linecap: round;
		transition: stroke-dasharray 1s ease;
	}
	.ring-error {
		fill: none;
		stroke: #ef4444;
		stroke-width: 12;
		stroke-linecap: round;
		transition: stroke-dasharray 1s ease;
	}
	.ring-center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.ring-total {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}
	.ring-caption {
		font-size: 0.6875rem;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.result-list {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}
	.result-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}
	.result-dot {
		width: 12px;
		height: 12px;
		border-radius: 4px;
		flex-shrink: 0;
	}
	.result-name {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
	.result-val {
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-left: auto;
	}

	.empty-chart {
		text-align: center;
		padding: 2rem;
		color: var(--text-tertiary);
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.charts-grid {
			grid-template-columns: 1fr;
		}
		.leaderboard-header, .leaderboard-row {
			grid-template-columns: 1.5fr 0.5fr 0.5fr 0.5fr 0.6fr 1fr;
			font-size: 0.75rem;
		}
		.bar-row {
			grid-template-columns: 90px 1fr 40px;
		}
	}
</style>
