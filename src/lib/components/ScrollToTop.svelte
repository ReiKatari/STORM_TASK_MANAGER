<script>
	import { onMount } from 'svelte';

	let showBtn = $state(false);

	onMount(() => {
		const handleScroll = () => {
			showBtn = window.scrollY > 300;
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

{#if showBtn}
	<button 
		class="scroll-top-btn"
		onclick={scrollToTop}
		title="Наверх"
	>
		<span class="material-icons-round">arrow_upward</span>
	</button>
{/if}

<style>
	.scroll-top-btn {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: var(--z-sticky);
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid var(--border-color);
		background: var(--color-primary);
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-md);
		transition: all var(--transition-fast);
		opacity: 0.9;
		animation: fade-up 0.3s ease;
	}
	.scroll-top-btn:hover {
		transform: scale(1.1) translateY(-2px);
		opacity: 1;
		box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.4);
	}
	@keyframes fade-up {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 0.9; transform: translateY(0); }
	}
</style>
