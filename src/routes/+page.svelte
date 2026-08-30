<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme.js';

	let { form } = $props();
	let loading = $state(false);
	let usernameEl = $state(null);
	let passwordEl = $state(null);
	let formEl = $state(null);
	let mounted = $state(false);

	onMount(async () => {
		mounted = true;
		const { gsap } = await import('gsap');

		// Animate floating orbs
		document.querySelectorAll('.login-orb').forEach((orb, i) => {
			gsap.to(orb, {
				x: `random(-120, 120)`,
				y: `random(-120, 120)`,
				duration: `random(6, 12)`,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
				delay: i * 0.8
			});
		});

		// Animate card entrance
		gsap.from('.login-card', {
			scale: 0.88,
			opacity: 0,
			y: 40,
			duration: 0.8,
			ease: 'back.out(1.4)'
		});

		// Stagger form fields
		gsap.from('.login-field', {
			y: 25,
			opacity: 0,
			duration: 0.5,
			stagger: 0.12,
			delay: 0.4,
			ease: 'power2.out'
		});
	});

	function handleSubmit() {
		loading = true;
		return async ({ result, update }) => {
			loading = false;
			if (result.type === 'failure') {
				// Shake animation on error
				const { gsap } = await import('gsap');
				gsap.fromTo('.login-card', 
					{ x: -8 },
					{ x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
				);
			}
			await update();
		};
	}
</script>

<svelte:head>
	<title>Вход — STORM TASK MANAGER</title>
</svelte:head>

<div class="login-page" class:mounted>
	<!-- Animated background orbs -->
	<div class="login-bg">
		<div class="login-orb orb-1"></div>
		<div class="login-orb orb-2"></div>
		<div class="login-orb orb-3"></div>
		<div class="login-orb orb-4"></div>
	</div>

	<div class="login-card">
		<div class="login-logo">
			<span class="material-icons-round logo-icon">playlist_add_check</span>
			<span class="logo-text">STORM TASK MANAGER</span>
		</div>

		<h1 class="login-title login-field">Вход в систему</h1>

		{#if form?.error}
			<div class="login-error login-field">
				<span class="material-icons-round">warning</span>
				{form.error}
			</div>
		{/if}

		<form method="POST" use:enhance={handleSubmit} bind:this={formEl}>
			<div class="form-group login-field">
				<label for="username">Имя пользователя</label>
				<div class="input-wrapper">
					<span class="material-icons-round input-icon">person</span>
					<input 
						id="username"
						name="username" 
						type="text" 
						placeholder="Введите имя пользователя"
						value={form?.username ?? ''}
						autocomplete="username"
						bind:this={usernameEl}
						required
					/>
				</div>
			</div>

			<div class="form-group login-field">
				<label for="password">Пароль</label>
				<div class="input-wrapper">
					<span class="material-icons-round input-icon">lock</span>
					<input 
						id="password"
						name="password" 
						type="password" 
						placeholder="Введите пароль"
						autocomplete="current-password"
						bind:this={passwordEl}
						required
					/>
				</div>
			</div>

			<div class="login-field submit-wrapper">
				<button type="submit" class="btn btn-primary btn-lg btn-full" disabled={loading}>
					{#if loading}
						<div class="spinner"></div>
						Вход...
					{:else}
						<span class="material-icons-round">login</span>
						Войти
					{/if}
				</button>
			</div>
		</form>

		<div class="login-footer login-field">
			© 2026 STORM TASK MANAGER. Все права защищены.
		</div>
	</div>

	<!-- Theme toggle on login page -->
	<button class="theme-toggle-login" onclick={() => theme.toggle()} title="Переключить тему">
		<span class="material-icons-round">
			{$theme === 'light' ? 'dark_mode' : 'light_mode'}
		</span>
	</button>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	/* ── Animated Gradient Background ── */
	.login-bg {
		position: fixed;
		inset: 0;
		background: var(--gradient-login-bg);
		z-index: 0;
	}

	.login-orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.5;
		will-change: transform;
	}
	.orb-1 {
		width: 500px; height: 500px;
		background: rgba(99, 102, 241, 0.4);
		top: -10%; left: -5%;
	}
	.orb-2 {
		width: 400px; height: 400px;
		background: rgba(139, 92, 246, 0.35);
		top: 50%; right: -10%;
	}
	.orb-3 {
		width: 350px; height: 350px;
		background: rgba(59, 130, 246, 0.3);
		bottom: -5%; left: 30%;
	}
	.orb-4 {
		width: 200px; height: 200px;
		background: rgba(236, 72, 153, 0.25);
		top: 20%; right: 25%;
	}

	/* ── Login Card ── */
	.login-card {
		position: relative;
		z-index: 1;
		background: var(--card-bg);
		backdrop-filter: saturate(180%) blur(24px);
		-webkit-backdrop-filter: saturate(180%) blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: var(--radius-xl);
		padding: 2.5rem 2.5rem 2rem;
		width: 100%;
		max-width: 440px;
		box-shadow: 
			0 25px 50px rgba(0, 0, 0, 0.15),
			0 0 0 1px rgba(255, 255, 255, 0.1) inset;
	}

	.login-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 1.5rem;
	}
	.logo-icon {
		font-size: 2rem;
		color: var(--color-primary);
	}
	.logo-text {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-primary);
		letter-spacing: -0.02em;
	}

	.login-title {
		text-align: center;
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
	}

	.login-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--color-danger-light);
		color: var(--color-danger);
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}
	.login-error .material-icons-round {
		font-size: 1.125rem;
	}

	/* Input with icon */
	.input-wrapper {
		position: relative;
	}
	.input-wrapper .input-icon {
		position: absolute;
		left: 0.875rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-tertiary);
		font-size: 1.25rem;
		pointer-events: none;
		transition: color var(--transition-fast);
	}
	.input-wrapper input {
		padding-left: 2.75rem;
	}
	.input-wrapper input:focus + .input-icon,
	.input-wrapper:has(input:focus) .input-icon {
		color: var(--color-primary);
	}

	.login-footer {
		text-align: center;
		color: var(--text-tertiary);
		font-size: 0.8125rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	/* Theme toggle */
	.theme-toggle-login {
		position: fixed;
		bottom: 1.5rem;
		left: 1.5rem;
		z-index: 10;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: var(--card-bg);
		backdrop-filter: blur(12px);
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-md);
		transition: all var(--transition-fast);
	}
	.theme-toggle-login:hover {
		transform: scale(1.1);
		color: var(--color-primary);
	}
</style>
