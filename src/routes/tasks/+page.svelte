<script>
	import { onMount, onDestroy } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import TaskForm from '$lib/components/TaskForm.svelte';
	import TaskFilters from '$lib/components/TaskFilters.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import { addToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	// Server-side tasks (reactive to SSR data / client-side navigation)
	let serverTasks = $derived(data?.tasks ?? []);

	// Live mutable tasks state — seeded from server, then updated via background fetch
	let tasks = $state([]);
	let tasksInitialized = false;
	let currentFilter = $state({ creator: '', requester: '' });
	let editingTask = $state(null);
	let isRefreshing = $state(false);
	let taskListEl = $state(null);

	// Seed tasks from server data (initial load + client-side navigation)
	$effect(() => {
		const st = serverTasks;
		if (!tasksInitialized || st !== tasks) {
			tasks = st;
			tasksInitialized = true;
		}
	});

	let filteredTasks = $derived.by(() => {
		let result = [...tasks];
		if (currentFilter.creator) {
			result = result.filter(t => t.creator === currentFilter.creator);
		}
		if (currentFilter.requester) {
			result = result.filter(t =>
				t.requester?.toLowerCase().includes(currentFilter.requester.toLowerCase())
			);
		}
		return result;
	});

	/**
	 * Fetch fresh tasks from API in background.
	 * Old data stays visible until new data arrives, then smoothly crossfades.
	 */
	async function refreshTasksSilently() {
		try {
			const res = await fetch('/api/tasks');
			if (!res.ok) return;
			const freshTasks = await res.json();

			// Crossfade: fade out old rows, swap data, fade in new rows
			if (taskListEl) {
				isRefreshing = true;
				// Quick fade out
				taskListEl.style.transition = 'opacity 150ms ease';
				taskListEl.style.opacity = '0.5';

				await new Promise(r => setTimeout(r, 150));

				// Swap data
				tasks = freshTasks;

				// Fade back in on next tick
				await new Promise(r => setTimeout(r, 20));
				taskListEl.style.opacity = '1';

				setTimeout(() => { isRefreshing = false; }, 150);
			} else {
				tasks = freshTasks;
			}
		} catch {
			// Silently ignore — old data stays visible
		}
	}

	// Poll server every 5s for dynamic status changes (CRON start/finish)
	let pollInterval;
	onMount(async () => {
		pollInterval = setInterval(refreshTasksSilently, 5000);

		const { gsap } = await import('gsap');
		gsap.from('.page-section', {
			y: 30,
			opacity: 0,
			duration: 0.6,
			stagger: 0.15,
			ease: 'power2.out'
		});
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	function handleFilter(filter) {
		currentFilter = filter;
	}

	function handleTaskDeleted(id) {
		tasks = tasks.filter(t => t.id !== id);
	}

	function handleEdit(task) {
		editingTask = { ...task };
		// Scroll to form
		setTimeout(() => {
			document.getElementById('edit-form-section')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	function handleEditSubmit(updatedTask) {
		// Update the task in the local list
		tasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
		editingTask = null;
		addToast(`Задача "${updatedTask.name}" обновлена`, 'success');
	}

	function handleEditCancel() {
		editingTask = null;
	}

	const creators = $derived([...new Set(tasks.map(t => t.creator).filter(Boolean))]);
</script>

<svelte:head>
	<title>Задачи — STORM TASK MANAGER</title>
</svelte:head>

<Header currentPage="tasks" />

<main class="container" style="padding-top: var(--space-2xl); padding-bottom: 6rem;">
	{#if editingTask}
		<div class="page-section" id="edit-form-section">
			<div class="section-header">
				<span class="material-icons-round">edit</span>
				<h2>Редактирование задачи</h2>
				<button class="btn btn-outline" onclick={handleEditCancel} style="margin-left: auto;">
					<span class="material-icons-round">close</span>
					Отмена
				</button>
			</div>
			<TaskForm editTask={editingTask} onsubmit={handleEditSubmit} oncancel={handleEditCancel} />
		</div>
	{/if}

	{#if !editingTask}
	<div class="page-section">
		<div class="section-header">
			<span class="material-icons-round">view_list</span>
			<h2>Задачи</h2>
			<span class="task-count">{filteredTasks.length}</span>
			{#if isRefreshing}
				<span class="refresh-indicator" title="Обновление...">
					<span class="material-icons-round spinning">sync</span>
				</span>
			{/if}
		</div>

		<TaskFilters {creators} onfilter={handleFilter} />

		<div class="task-list" bind:this={taskListEl}>
			{#each filteredTasks as task, i (task.id)}
				<TaskCard
					{task}
					ondelete={handleTaskDeleted}
					onedit={handleEdit}
					onrefresh={refreshTasksSilently}
				/>
			{/each}

			{#if filteredTasks.length === 0}
				<div class="empty-state">
					<span class="material-icons-round">search_off</span>
					<p>Задачи не найдены</p>
				</div>
			{/if}
		</div>
	</div>
	{/if}
</main>

<ThemeToggle />
<ScrollToTop />

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: var(--space-lg);
	}
	.section-header .material-icons-round {
		font-size: 1.75rem;
		color: var(--color-primary);
	}
	.section-header h2 {
		font-size: 1.5rem;
		margin: 0;
	}
	.task-count {
		margin-left: auto;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 0.875rem;
		font-weight: 700;
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
	}

	.refresh-indicator {
		display: flex;
		align-items: center;
		margin-left: 0.5rem;
	}
	.refresh-indicator .material-icons-round {
		font-size: 1.125rem;
		color: var(--text-tertiary);
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		transition: opacity 150ms ease;
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
	.empty-state p {
		font-size: 1rem;
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
