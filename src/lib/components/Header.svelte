<script>
	import { page } from '$app/state';
	import { theme } from '$lib/stores/theme.js';
	import { goto } from '$app/navigation';

	let { currentPage = 'dashboard' } = $props();

	async function logout() {
		await fetch('/api/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<header class="app-header">
	<div class="header-inner">
		<a href="/dashboard" class="header-brand">
			<span class="material-icons-round">playlist_add_check</span>
			<span class="brand-text">STORM TASK MANAGER</span>
		</a>

		<nav class="header-nav">
			<a href="/dashboard" class="header-link" class:active={currentPage === 'dashboard'}>
				<span class="material-icons-round">home</span>
				Главная
			</a>
			<a href="/tasks" class="header-link" class:active={currentPage === 'tasks'}>
				<span class="material-icons-round">view_list</span>
				Задачи
			</a>
			<a href="/stats" class="header-link" class:active={currentPage === 'stats'}>
				<span class="material-icons-round">dashboard</span>
				Дашборд
			</a>
			<a href="/sql-builder" class="header-link" class:active={currentPage === 'sql-builder'}>
				<span class="material-icons-round">construction</span>
				Конструктор SQL
			</a>
			<a href="/admin" class="header-link" class:active={currentPage === 'admin'}>
				<span class="material-icons-round">admin_panel_settings</span>
				Панель администратора
			</a>
			<button class="header-link logout-btn" onclick={logout}>
				<span class="material-icons-round">logout</span>
				Выход
			</button>
		</nav>
	</div>
</header>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		background: var(--gradient-header);
		backdrop-filter: saturate(180%) blur(20px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.header-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: white;
		text-decoration: none;
		font-weight: 800;
		font-size: 1.125rem;
		letter-spacing: -0.01em;
	}
	.header-brand .material-icons-round {
		font-size: 1.5rem;
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: rgba(255, 255, 255, 0.65);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 0.875rem;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-primary);
		position: relative;
	}
	.header-link:hover {
		color: white;
		background: rgba(255, 255, 255, 0.12);
	}
	.header-link.active {
		color: white;
		background: rgba(255, 255, 255, 0.15);
		font-weight: 700;
	}
	.header-link.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 20%;
		width: 60%;
		height: 2px;
		background: white;
		border-radius: 2px 2px 0 0;
	}
	.header-link .material-icons-round {
		font-size: 1.125rem;
	}

	.logout-btn {
		margin-left: 0.5rem;
		border-left: 1px solid rgba(255, 255, 255, 0.2);
		padding-left: 1rem;
	}
</style>
