<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ServicePanel from '$lib/components/ServicePanel.svelte';
	import LogsTable from '$lib/components/LogsTable.svelte';
	import SqlSettings from '$lib/components/SqlSettings.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';

	let { data } = $props();
	let logs = $state(data.logs || []);

	async function refreshLogs() {
		try {
			const res = await fetch('/api/logs');
			logs = await res.json();
		} catch {
			// ignore
		}
	}

	function handleLogsCleared() {
		logs = [];
	}

	onMount(async () => {
		const { gsap } = await import('gsap');
		gsap.from('.admin-section', {
			y: 30,
			opacity: 0,
			duration: 0.6,
			stagger: 0.15,
			ease: 'power2.out'
		});
	});
</script>

<svelte:head>
	<title>Панель администратора — STORM TASK MANAGER</title>
</svelte:head>

<Header currentPage="admin" />

<main class="container" style="padding-top: var(--space-2xl); padding-bottom: 6rem;">
	<div class="admin-section">
		<ServicePanel onlogscleared={handleLogsCleared} />
	</div>

	<div class="admin-section" style="margin-top: var(--space-2xl);">
		<LogsTable {logs} />
	</div>

	<div class="admin-section" style="margin-top: var(--space-2xl);">
		<SqlSettings />
	</div>
</main>

<ThemeToggle />
<ScrollToTop />
