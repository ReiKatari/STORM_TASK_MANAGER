<script>
	import { onMount, tick } from 'svelte';

	let { value = $bindable(''), open = $bindable(false) } = $props();

	let editorValue = $state('');
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let matchCount = $state(0);
	let currentMatch = $state(0);
	let textareaEl;
	let highlightEl;
	let lineNumbersEl;
	let editorWrapEl;

	// Sync on open
	$effect(() => {
		if (open) {
			editorValue = value;
			searchQuery = '';
			searchOpen = false;
			tick().then(() => {
				textareaEl?.focus();
				syncScroll();
				updateLineNumbers();
			});
		}
	});

	function save() {
		value = editorValue;
		open = false;
	}

	function cancel() {
		open = false;
	}

	function handleKeydown(e) {
		if (!open) return;
		if (e.key === 'Escape') {
			if (searchOpen) { searchOpen = false; }
			else { cancel(); }
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			save();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
			e.preventDefault();
			searchOpen = !searchOpen;
			if (searchOpen) {
				tick().then(() => document.getElementById('sql-search-input')?.focus());
			}
		}
		// Tab support
		if (e.key === 'Tab' && e.target === textareaEl) {
			e.preventDefault();
			const start = textareaEl.selectionStart;
			const end = textareaEl.selectionEnd;
			editorValue = editorValue.substring(0, start) + '    ' + editorValue.substring(end);
			tick().then(() => {
				textareaEl.selectionStart = textareaEl.selectionEnd = start + 4;
			});
		}
	}

	function syncScroll() {
		if (highlightEl && textareaEl) {
			highlightEl.scrollTop = textareaEl.scrollTop;
			highlightEl.scrollLeft = textareaEl.scrollLeft;
		}
		if (lineNumbersEl && textareaEl) {
			lineNumbersEl.scrollTop = textareaEl.scrollTop;
		}
	}

	function updateLineNumbers() {
		const lines = (editorValue || '').split('\n').length;
		if (lineNumbersEl) {
			lineNumbersEl.innerHTML = Array.from({ length: lines }, (_, i) => 
				`<div class="line-num">${i + 1}</div>`
			).join('');
		}
	}

	$effect(() => {
		// Re-render when editorValue changes
		if (editorValue !== undefined) {
			updateLineNumbers();
			updateSearchHighlights();
		}
	});

	// ── SQL Syntax Highlighting ──
	function highlightSQL(code) {
		if (!code) return '';

		// Escape HTML
		let html = code
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Multi-line comments /* */
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>');

		// Single-line comments --
		html = html.replace(/(--.*)/gm, '<span class="sql-comment">$1</span>');

		// Strings
		html = html.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');
		html = html.replace(/(N'(?:[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');

		// Numbers
		html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="sql-number">$1</span>');

		// SQL Keywords (DML)
		const keywords = [
			'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
			'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
			'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'FULL', 'ON',
			'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'TOP',
			'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
			'IS', 'NULL', 'LIKE', 'BETWEEN', 'ASC', 'DESC', 'WITH', 'OVER',
			'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'
		];
		const keywordsRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
		html = html.replace(keywordsRe, (m) => {
			// Don't re-highlight inside already-wrapped spans
			return `<span class="sql-keyword">${m.toUpperCase()}</span>`;
		});

		// DDL / Schema keywords
		const ddl = [
			'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION',
			'TRIGGER', 'DATABASE', 'SCHEMA', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN',
			'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE'
		];
		const ddlRe = new RegExp(`\\b(${ddl.join('|')})\\b`, 'gi');
		html = html.replace(ddlRe, (m) => `<span class="sql-ddl">${m.toUpperCase()}</span>`);

		// Types
		const types = [
			'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT',
			'VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT',
			'DATETIME', 'DATE', 'TIME', 'TIMESTAMP', 'FLOAT', 'DECIMAL', 'NUMERIC',
			'MONEY', 'REAL', 'XML', 'UNIQUEIDENTIFIER', 'VARBINARY', 'IMAGE'
		];
		const typesRe = new RegExp(`\\b(${types.join('|')})\\b`, 'gi');
		html = html.replace(typesRe, (m) => `<span class="sql-type">${m.toUpperCase()}</span>`);

		// Functions
		const funcs = [
			'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'ISNULL', 'NULLIF',
			'CAST', 'CONVERT', 'SUBSTRING', 'LEN', 'REPLACE', 'TRIM', 'LTRIM', 'RTRIM',
			'UPPER', 'LOWER', 'GETDATE', 'DATEADD', 'DATEDIFF', 'DATEPART', 'YEAR', 'MONTH', 'DAY',
			'FORMAT', 'STUFF', 'CHARINDEX', 'PATINDEX', 'STRING_AGG', 'CONCAT', 'IIF',
			'ROW_NUMBER', 'NEWID', 'SCOPE_IDENTITY', 'OBJECT_ID'
		];
		const funcsRe = new RegExp(`\\b(${funcs.join('|')})\\s*(?=\\()`, 'gi');
		html = html.replace(funcsRe, (m) => `<span class="sql-func">${m}</span>`);

		// Operators
		html = html.replace(/(\*(?!\/))/g, '<span class="sql-operator">$1</span>');

		// Schema references (dbo.Table)
		html = html.replace(/\b(dbo)\./gi, '<span class="sql-schema">$1</span>.');

		// Variables @var
		html = html.replace(/(@\w+)/g, '<span class="sql-var">$1</span>');

		// Brackets [TableName]
		html = html.replace(/(\[[\w\s]+\])/g, '<span class="sql-bracket">$1</span>');

		return html;
	}

	// ── Search ──
	function updateSearchHighlights() {
		if (!searchQuery) {
			matchCount = 0;
			currentMatch = 0;
			return;
		}
		try {
			const regex = new RegExp(escapeRegex(searchQuery), 'gi');
			const matches = (editorValue || '').match(regex);
			matchCount = matches ? matches.length : 0;
			currentMatch = matchCount > 0 ? 1 : 0;
		} catch {
			matchCount = 0;
			currentMatch = 0;
		}
	}

	function escapeRegex(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function getHighlightedHTML() {
		let html = highlightSQL(editorValue);

		// Overlay search highlights
		if (searchQuery && matchCount > 0) {
			try {
				// This is simplified — proper implementation would track positions
				const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
				html = html.replace(regex, '<mark class="search-highlight">$1</mark>');
			} catch {
				// ignore
			}
		}

		// Ensure trailing newline for proper scrolling
		if (html.endsWith('\n')) html += ' ';

		return html;
	}

	function nextMatch() {
		if (matchCount > 0) {
			currentMatch = currentMatch >= matchCount ? 1 : currentMatch + 1;
		}
	}

	function prevMatch() {
		if (matchCount > 0) {
			currentMatch = currentMatch <= 1 ? matchCount : currentMatch - 1;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="sql-overlay" role="dialog" aria-modal="true">
		<div class="sql-editor">
			<!-- ── Toolbar ── -->
			<div class="sql-toolbar">
				<div class="toolbar-left">
					<span class="material-icons-round toolbar-icon">code</span>
					<h3 class="toolbar-title">SQL-редактор</h3>
					<span class="toolbar-hint">Ctrl+S сохранить · Esc отмена · Ctrl+F поиск · Tab отступ</span>
				</div>
				<div class="toolbar-right">
					{#if searchOpen}
						<div class="search-bar">
							<span class="material-icons-round search-icon">search</span>
							<input 
								id="sql-search-input"
								type="text" 
								class="search-input" 
								placeholder="Найти..." 
								bind:value={searchQuery}
								oninput={updateSearchHighlights}
							/>
							{#if searchQuery}
								<span class="search-count">{currentMatch}/{matchCount}</span>
								<button class="search-nav-btn" onclick={prevMatch} title="Предыдущий">
									<span class="material-icons-round">keyboard_arrow_up</span>
								</button>
								<button class="search-nav-btn" onclick={nextMatch} title="Следующий">
									<span class="material-icons-round">keyboard_arrow_down</span>
								</button>
							{/if}
							<button class="search-nav-btn" onclick={() => { searchOpen = false; searchQuery = ''; }} title="Закрыть">
								<span class="material-icons-round">close</span>
							</button>
						</div>
					{:else}
						<button class="toolbar-btn" onclick={() => { searchOpen = true; tick().then(() => document.getElementById('sql-search-input')?.focus()); }} title="Поиск (Ctrl+F)">
							<span class="material-icons-round">search</span>
						</button>
					{/if}
					<button class="toolbar-btn btn-save" onclick={save}>
						<span class="material-icons-round">check</span>
						Сохранить
					</button>
					<button class="toolbar-btn btn-cancel" onclick={cancel}>
						<span class="material-icons-round">close</span>
						Отмена
					</button>
				</div>
			</div>

			<!-- ── Editor Body ── -->
			<div class="editor-body" bind:this={editorWrapEl}>
				<div class="line-numbers" bind:this={lineNumbersEl}>
					<div class="line-num">1</div>
				</div>
				<div class="editor-area">
					<pre class="highlight-layer" bind:this={highlightEl} aria-hidden="true">{@html getHighlightedHTML()}</pre>
					<textarea
						class="code-textarea"
						bind:this={textareaEl}
						bind:value={editorValue}
						oninput={() => { syncScroll(); updateLineNumbers(); }}
						onscroll={syncScroll}
						spellcheck="false"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
					></textarea>
				</div>
			</div>

			<!-- ── Status Bar ── -->
			<div class="sql-statusbar">
				<span class="status-item">
					<span class="material-icons-round">notes</span>
					Строк: {(editorValue || '').split('\n').length}
				</span>
				<span class="status-item">
					<span class="material-icons-round">text_fields</span>
					Символов: {(editorValue || '').length}
				</span>
				<span class="status-item">SQL · UTF-8</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Overlay ── */
	.sql-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: stretch;
		justify-content: center;
		animation: overlay-in 0.2s ease;
	}
	@keyframes overlay-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* ── Editor Container ── */
	.sql-editor {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #1e1e2e;
		color: #cdd6f4;
	}

	/* ── Toolbar ── */
	.sql-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: #181825;
		border-bottom: 1px solid #313244;
		flex-shrink: 0;
		gap: 1rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
	}
	.toolbar-icon {
		color: #89b4fa;
		font-size: 1.375rem;
	}
	.toolbar-title {
		font-size: 1rem;
		font-weight: 700;
		color: #cdd6f4;
		margin: 0;
		white-space: nowrap;
	}
	.toolbar-hint {
		font-size: 0.6875rem;
		color: #6c7086;
		white-space: nowrap;
	}
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4rem 0.875rem;
		border: 1px solid #45475a;
		border-radius: 6px;
		background: #313244;
		color: #cdd6f4;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.toolbar-btn:hover {
		background: #45475a;
	}
	.toolbar-btn .material-icons-round {
		font-size: 1.0625rem;
	}
	.btn-save {
		background: #1e66f5;
		border-color: #1e66f5;
		color: white;
	}
	.btn-save:hover {
		background: #3b7ff5;
		border-color: #3b7ff5;
	}
	.btn-cancel {
		background: #45475a;
	}
	.btn-cancel:hover {
		background: #585b70;
	}

	/* ── Search Bar ── */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: #313244;
		border: 1px solid #45475a;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		animation: search-in 0.15s ease;
	}
	@keyframes search-in {
		from { opacity: 0; transform: translateX(20px); }
		to { opacity: 1; transform: translateX(0); }
	}
	.search-icon {
		color: #6c7086;
		font-size: 1.125rem;
	}
	.search-input {
		background: transparent;
		border: none;
		color: #cdd6f4;
		font-size: 0.8125rem;
		width: 180px;
		outline: none;
		font-family: inherit;
	}
	.search-input::placeholder {
		color: #585b70;
	}
	.search-count {
		font-size: 0.6875rem;
		color: #89b4fa;
		font-weight: 600;
		white-space: nowrap;
		padding: 0 0.25rem;
	}
	.search-nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: #a6adc8;
		border-radius: 4px;
		cursor: pointer;
		padding: 0;
	}
	.search-nav-btn:hover {
		background: #45475a;
		color: #cdd6f4;
	}
	.search-nav-btn .material-icons-round {
		font-size: 1.125rem;
	}

	/* ── Editor Body ── */
	.editor-body {
		flex: 1;
		display: flex;
		overflow: hidden;
		position: relative;
	}

	/* ── Line Numbers ── */
	.line-numbers {
		width: 52px;
		flex-shrink: 0;
		background: #181825;
		border-right: 1px solid #313244;
		padding: 0.75rem 0;
		overflow: hidden;
		user-select: none;
	}
	:global(.line-num) {
		height: 1.6em;
		line-height: 1.6em;
		text-align: right;
		padding-right: 12px;
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
		font-size: 0.8125rem;
		color: #45475a;
		transition: color 0.1s;
	}
	:global(.line-num:hover) {
		color: #89b4fa;
	}

	/* ── Editor Area (textarea + highlight overlay) ── */
	.editor-area {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.highlight-layer, .code-textarea {
		position: absolute;
		inset: 0;
		padding: 0.75rem 1rem;
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
		font-size: 0.875rem;
		line-height: 1.6;
		tab-size: 4;
		white-space: pre;
		overflow: auto;
		margin: 0;
	}

	.highlight-layer {
		color: #cdd6f4;
		pointer-events: none;
		z-index: 1;
		word-wrap: normal;
	}

	.code-textarea {
		color: transparent;
		caret-color: #89b4fa;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		z-index: 2;
		-webkit-text-fill-color: transparent;
		font-variant-ligatures: none;
	}
	.code-textarea::selection {
		background: rgba(137, 180, 250, 0.25);
		-webkit-text-fill-color: transparent;
	}

	/* ── SQL Syntax Colors (Catppuccin Mocha inspired) ── */
	:global(.sql-keyword) {
		color: #cba6f7;   /* Purple - keywords */
		font-weight: 700;
	}
	:global(.sql-ddl) {
		color: #f38ba8;    /* Red/Pink - DDL */
		font-weight: 700;
	}
	:global(.sql-type) {
		color: #fab387;    /* Peach - types */
	}
	:global(.sql-func) {
		color: #89dceb;    /* Sky - functions */
	}
	:global(.sql-string) {
		color: #a6e3a1;    /* Green - strings */
	}
	:global(.sql-number) {
		color: #fab387;    /* Peach - numbers */
	}
	:global(.sql-comment) {
		color: #6c7086;    /* Overlay0 - comments */
		font-style: italic;
	}
	:global(.sql-operator) {
		color: #89b4fa;    /* Blue - operators */
		font-weight: 700;
	}
	:global(.sql-var) {
		color: #f5c2e7;    /* Pink - variables */
	}
	:global(.sql-schema) {
		color: #94e2d5;    /* Teal - schema */
	}
	:global(.sql-bracket) {
		color: #f9e2af;    /* Yellow - brackets */
	}
	:global(.search-highlight) {
		background: rgba(249, 226, 175, 0.35);
		border-radius: 2px;
		outline: 1px solid #f9e2af;
	}

	/* ── Status Bar ── */
	.sql-statusbar {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 0.375rem 1rem;
		background: #181825;
		border-top: 1px solid #313244;
		flex-shrink: 0;
	}
	.status-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6875rem;
		color: #6c7086;
	}
	.status-item .material-icons-round {
		font-size: 0.875rem;
	}
</style>
