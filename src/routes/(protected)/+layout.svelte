<script lang="ts">
	import { setContext, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { CONFIG } from '$lib/config';
	import { cn } from '$lib/utils';
	import type { AuthContext } from '$lib/types';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	let session = $state<any>(null);
	let loading = $state(true);
	let isApproved = $state<boolean | null>(null);
	let isAdmin = $state(false);
	let userRole = $state('member');
	let currentFloorId = $state<string | null>(null);
	let userId = $state('');
	let isSidebarOpen = $state(true);

	const authContext: AuthContext = {
		get currentFloorId() { return currentFloorId; },
		get userRole() { return userRole; },
		get isAdmin() { return isAdmin; },
		get userId() { return userId; }
	};

	setContext('auth', authContext);

	async function checkApproval(uid: string) {
		const { data } = await supabase
			.from('profiles')
			.select('is_approved, role, floor_id')
			.eq('id', uid)
			.single();

		const isUserAdmin = data?.role === 'admin' || data?.role === 'super_admin';
		isApproved = data?.is_approved || isUserAdmin || false;
		isAdmin = isUserAdmin;
		userRole = data?.role || 'member';
		currentFloorId = data?.floor_id || null;
		userId = uid;
		loading = false;
	}

	onMount(() => {
		if (CONFIG.BYPASS_AUTH) {
			session = { user: { id: '00000000-0000-0000-0000-000000000000', email: 'demo@flourish.test' } };
			isApproved = true;
			isAdmin = true;
			userRole = 'super_admin';
			currentFloorId = '00000000-0000-0000-0000-000000000000';
			userId = '00000000-0000-0000-0000-000000000000';
			loading = false;
			return;
		}

		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			if (s) checkApproval(s.user.id);
			else loading = false;
		});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
			session = s;
			if (s) checkApproval(s.user.id);
			else {
				isApproved = null;
				loading = false;
			}
		});

		return () => subscription.unsubscribe();
	});

	$effect(() => {
		if (loading) return;
		if (!session) {
			goto('/login', { replaceState: true });
		} else if (isApproved === false) {
			goto('/pending', { replaceState: true });
		}
	});
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-slate-50">
		<div class="w-8 h-8 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
	</div>
{:else if session && isApproved}
	<div class="min-h-screen bg-[#FCFAF7] flex selection:bg-primary-100 selection:text-primary-900">
		<Sidebar isOpen={isSidebarOpen} onToggle={() => (isSidebarOpen = !isSidebarOpen)} />

		<main
			class={cn(
				'flex-1 min-h-screen relative transition-all duration-500 ease-in-out',
				isSidebarOpen ? 'w-[calc(100vw-320px)]' : 'w-[calc(100vw-80px)]'
			)}
		>
			<div class="w-full h-full px-6 md:px-12 py-8">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
