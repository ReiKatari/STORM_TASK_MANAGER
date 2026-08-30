<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TaskForm from '$lib/components/TaskForm.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import { addToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	onMount(async () => {
		const { gsap } = await import('gsap');
		gsap.from('.page-section', {
			y: 30,
			opacity: 0,
			duration: 0.6,
			stagger: 0.15,
			ease: 'power2.out'
		});
	});

	function handleTaskCreated(task) {
		addToast(`Задача "${task.name}" создана`, 'success');
	}
</script>

<svelte:head>
	<title>Главная — STORM TASK MANAGER</title>
</svelte:head>

<Header currentPage="dashboard" />

<main class="container" style="padding-top: var(--space-2xl); padding-bottom: 6rem;">
	<div class="page-section">
		<TaskForm onsubmit={handleTaskCreated} />
	</div>
</main>

<ThemeToggle />
<ScrollToTop />
