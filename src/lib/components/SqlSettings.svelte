<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toasts.js';

	let server = $state('');
	let database = $state('');
	let user = $state('');
	let password = $state('');
	let vpnUser = $state('');
	let vpnPassword = $state('');
	let loading = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/settings');
			const data = await res.json();
			server = data.server || '';
			database = data.database || '';
			user = data.user || '';
			password = data.password || '';
			vpnUser = data.vpnUser || '';
			vpnPassword = data.vpnPassword || '';
		} catch {
			// Settings not available
		}
	});

	async function save() {
		loading = true;
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ server, database, user, password, vpnUser, vpnPassword })
			});
			if (res.ok) {
				addToast('Настройки соединения сохранены', 'success');
			}
		} catch {
			addToast('Ошибка сохранения', 'error');
		} finally {
			loading = false;
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<span class="material-icons-round">storage</span>
		<span>Настройки соединения</span>
	</div>

	<div class="form-row">
		<div class="form-group">
			<label for="sql-server">SQL Server:</label>
			<input id="sql-server" type="text" placeholder="Server address" bind:value={server} />
		</div>
		<div class="form-group">
			<label for="sql-db">SQL Database:</label>
			<input id="sql-db" type="text" placeholder="Database name" bind:value={database} />
		</div>
	</div>

	<div class="form-row">
		<div class="form-group">
			<label for="sql-user">SQL User:</label>
			<input id="sql-user" type="text" placeholder="Username" bind:value={user} />
		</div>
		<div class="form-group">
			<label for="sql-pass">SQL Password:</label>
			<input id="sql-pass" type="password" placeholder="Password" bind:value={password} />
		</div>
	</div>

	<div class="form-row">
		<div class="form-group">
			<label for="vpn-user">VPN User:</label>
			<input id="vpn-user" type="text" placeholder="Cisco Username" bind:value={vpnUser} />
		</div>
		<div class="form-group">
			<label for="vpn-pass">VPN Password:</label>
			<input id="vpn-pass" type="password" placeholder="Cisco Password" bind:value={vpnPassword} />
		</div>
	</div>

	<button class="btn btn-primary btn-lg btn-full" onclick={save} disabled={loading} style="margin-top:var(--space-md)">
		{#if loading}
			<div class="spinner"></div>
			Сохранение...
		{:else}
			<span class="material-icons-round">save</span>
			Сохранить настройки
		{/if}
	</button>
</div>
