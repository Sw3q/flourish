<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { CONFIG } from '$lib/config';
	import type { Floor } from '$lib/types';
	import { Loader2, ArrowRight, HeartHandshake } from 'lucide-svelte';

	onMount(() => {
		if (CONFIG.BYPASS_AUTH) {
			goto('/', { replaceState: true });
		}
	});

	let isLogin = $state(true);
	let email = $state('');
	let password = $state('');
	let floorId = $state('');
	let loading = $state(false);
	let floors = $state<Floor[]>([]);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	onMount(async () => {
		const { data } = await supabase.from('floors').select('*').order('name');
		if (data) floors = data as Floor[];
	});

	$effect(() => {
		if (!isLogin && floors.length > 0 && !floorId) {
			floorId = floors[0].id;
		}
	});

	async function handleAuth(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = null;
		message = null;

		try {
			if (isLogin) {
				const { error: err } = await supabase.auth.signInWithPassword({ email, password });
				if (err) throw err;
				goto('/', { replaceState: true });
			} else {
				const { error: err } = await supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: `${window.location.origin}/pending`,
						data: { floor_id: floorId }
					}
				});
				if (err) throw err;
				message = 'Check your email for the confirmation link!';
			}
		} catch (err: any) {
			if (err.message.toLowerCase().includes('rate limit')) {
				error =
					'Registration limit reached for this hour. Please try again later or contact an admin to be manually added.';
			} else {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary-50 to-accent-200"
>
	<!-- Background blobs -->
	<div
		class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
	></div>
	<div
		class="absolute top-[20%] right-[-10%] w-96 h-96 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
	></div>
	<div
		class="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
	></div>

	<div class="w-full max-w-md relative z-10">
		<div class="glass rounded-3xl p-8 shadow-2xl">
			<div class="text-center mb-8">
				<div
					class="w-16 h-16 bg-gradient-to-tr from-primary-500 to-accent-400 rounded-2xl mx-auto flex items-center justify-center transform rotate-3 shadow-lg mb-6"
				>
					<HeartHandshake class="w-8 h-8 text-white -rotate-3" />
				</div>
				<h1 class="text-3xl font-bold text-slate-900 tracking-tight">Flourish Fund</h1>
				<p class="text-sm text-slate-500 mt-2">Grassroots governance for our communal pot.</p>
			</div>

			<form onsubmit={handleAuth} class="space-y-5">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1 ml-1">Email</label>
					<input
						type="email"
						bind:value={email}
						required
						class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none bg-white/50"
						placeholder="you@frontier.com"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1 ml-1">Password</label>
					<input
						type="password"
						bind:value={password}
						required
						class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none bg-white/50"
						placeholder="••••••••"
					/>
				</div>

				{#if !isLogin}
					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1 ml-1"
							>Base Community Floor</label
						>
						<select
							bind:value={floorId}
							class="w-full bg-white/50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 pr-8 shadow-sm transition-all focus:ring-2 focus:ring-opacity-20 outline-none"
						>
							{#each floors as floor (floor.id)}
								<option value={floor.id}>{floor.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if error}
					<div class="p-3 bg-danger-400/10 text-danger-400 text-sm rounded-xl border border-danger-400/20">
						{error}
					</div>
				{/if}

				{#if message}
					<div
						class="p-3 bg-success-400/10 text-success-400 border-success-400/20 text-sm rounded-xl border"
					>
						{message}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 px-4 font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center group shadow-lg shadow-slate-900/20"
				>
					{#if loading}
						<Loader2 class="w-5 h-5 animate-spin" />
					{:else}
						{isLogin ? 'Sign in' : 'Create account'}
						<ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
					{/if}
				</button>
			</form>

			<div class="mt-8 text-center text-sm">
				<button
					onclick={() => (isLogin = !isLogin)}
					class="text-primary-600 hover:text-primary-700 font-medium transition-colors"
				>
					{isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
				</button>
			</div>
		</div>
	</div>
</div>
