<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { Floor, Profile, Transaction } from '$lib/types';
	import Visualizations from '$lib/components/Visualizations.svelte';
	import { Loader2, TrendingUp, Users, BadgeDollarSign, Building2, Activity } from 'lucide-svelte';

	type FloorStats = {
		floor: Floor;
		balance: number;
		activeProposals: number;
		memberCount: number;
	};

	let loading = $state(true);
	let floors = $state<FloorStats[]>([]);
	let totalBalance = $state(0);
	let totalActiveProposals = $state(0);
	let totalMembers = $state(0);
	let activityTrend = $state<number[]>([]);
	let governanceIntensity = $state(0);
	let operationalState = $state<'Nominal' | 'High Activity' | 'Peak Activity' | 'Quiet'>('Nominal');

	let chartData = $derived(floors.map((f) => ({ name: f.floor.name, balance: f.balance })));

	onMount(async () => {
		try {
			const now = new Date();
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

			const [floorsRes, profilesRes, activePropsRes, recentPropsRes, transactionsRes] =
				await Promise.all([
					supabase.from('floors').select('*').order('floor_number', { ascending: true }),
					supabase.from('profiles').select('id, floor_id, is_approved'),
					supabase.from('proposals').select('id, floor_id, status, expires_at').eq('status', 'active'),
					supabase.from('proposals').select('id, created_at').gt('created_at', thirtyDaysAgo.toISOString()),
					supabase.from('transactions').select('amount, type, floor_id')
				]);

			supabase.rpc('evaluate_cleanup').then();

			const floorsData = (floorsRes.data || []) as Floor[];
			const profilesData = (profilesRes.data || []) as Profile[];
			const activeProposals = ((activePropsRes.data || []) as any[]).filter(
				(p) => new Date(p.expires_at) > now
			);
			const recentProposals = (recentPropsRes.data || []) as { id: string; created_at: string }[];
			const transactions = (transactionsRes.data || []) as Transaction[];

			const dailyActivity = new Array(30).fill(0);
			recentProposals.forEach((p) => {
				const daysAgo = Math.floor(
					(now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
				);
				if (daysAgo >= 0 && daysAgo < 30) {
					dailyActivity[29 - daysAgo]++;
				}
			});

			const floorStats: FloorStats[] = floorsData.map((floor) => {
				const floorProfiles = profilesData.filter((p) => p.floor_id === floor.id && p.is_approved);
				const floorProposals = activeProposals.filter((p) => p.floor_id === floor.id);
				const floorTxs = transactions.filter((t) => t.floor_id === floor.id);
				const balance = floorTxs.reduce(
					(acc, t) => (t.type === 'deposit' ? acc + Number(t.amount) : acc - Number(t.amount)),
					0
				);
				return { floor, balance, activeProposals: floorProposals.length, memberCount: floorProfiles.length };
			});

			floors = floorStats;
			totalBalance = floorStats.reduce((acc, f) => acc + f.balance, 0);
			totalActiveProposals = activeProposals.length;
			totalMembers = profilesData.filter((p) => p.is_approved).length;
			activityTrend = dailyActivity;
			governanceIntensity = totalActiveProposals;
			if (governanceIntensity > 10) operationalState = 'Peak Activity';
			else if (governanceIntensity > 5) operationalState = 'High Activity';
			else if (governanceIntensity === 0) operationalState = 'Quiet';
			else operationalState = 'Nominal';
		} catch (err) {
			console.error('Error fetching tower stats:', err);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-transparent">
		<div class="relative">
			<div class="absolute inset-0 bg-primary-500/10 blur-[100px] rounded-full animate-pulse"></div>
			<Loader2 class="w-10 h-10 animate-spin text-primary-600 relative z-10" />
		</div>
	</div>
{:else}
	<div class="w-full h-full space-y-12 animate-slide-up">
		<!-- Header -->
		<header
			class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-8"
		>
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="w-8 h-[2px] bg-primary-600"></div>
					<span class="text-primary-600 font-black tracking-[0.2em] uppercase text-[10px]"
						>Tower Status Overview</span
					>
				</div>
			</div>
		</header>

		<!-- Dashboard Layout -->
		<div class="grid grid-cols-1 xl:grid-cols-12 gap-10">
			<!-- Primary Balance Metric -->
			<div
				class="xl:col-span-8 bg-white border border-slate-200 p-10 rounded-[3rem] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.08)] transition-all duration-700"
			>
				<div class="flex justify-between items-start mb-16">
					<div>
						<span
							class="inline-block px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6"
							>Aggregate Treasury Assets</span
						>
						<div
							class="text-7xl md:text-9xl font-display font-extrabold tracking-tighter text-slate-900 leading-none"
						>
							${totalBalance.toLocaleString(undefined, {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0
							})}
							<span class="text-3xl align-top text-slate-200 ml-2"
								>.{(totalBalance % 1).toFixed(2).split('.')[1]}</span
							>
						</div>
					</div>
					<div
						class="p-6 bg-primary-50 rounded-[2rem] shadow-sm transform hover:rotate-6 transition-transform"
					>
						<BadgeDollarSign class="w-12 h-12 text-primary-600" />
					</div>
				</div>

				<div class="space-y-8">
					<div
						class="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4"
					>
						<span>Global Treasury Distribution per Floor</span>
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-2">
								<div class="w-2 h-2 rounded-full bg-primary-600"></div>
								Liquid Funds
							</span>
						</div>
					</div>
					<div class="h-[300px]">
						<Visualizations type="treasury" data={chartData} />
					</div>
				</div>
			</div>

			<!-- Secondary Metrics Column -->
			<div class="xl:col-span-4 flex flex-col gap-10">
				<!-- Governance Activity Card -->
				<div
					class="flex-1 bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-500"
				>
					<div
						class="absolute top-0 right-0 p-10 text-white/5 opacity-50 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"
					>
						<Activity class="w-64 h-64 translate-x-20 -translate-y-20" />
					</div>
					<div class="relative z-10 flex flex-col h-full justify-between gap-12">
						<div>
							<div class="flex justify-between items-center mb-4">
								<span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400"
									>Governance Intensity</span
								>
								<TrendingUp class="w-5 h-5 text-primary-400" />
							</div>
							<div class="text-8xl font-display font-extrabold tracking-tighter leading-none">
								{governanceIntensity}
							</div>
							<p class="text-sm font-bold text-white/40 mt-4 uppercase tracking-[0.1em]">
								Verified Active Missions
							</p>
						</div>
						<div class="mt-auto">
							<p class="text-[10px] font-black text-white/60 uppercase tracking-widest mb-6">
								Temporal Activity Trend (30D)
							</p>
							<div class="h-32">
								<Visualizations type="activity" data={activityTrend} />
							</div>
						</div>
					</div>
				</div>

				<!-- Tower Residency -->
				<div
					class="bg-white border border-slate-200 p-10 rounded-[3rem] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]"
				>
					<div class="flex justify-between items-center mb-8">
						<span class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
							>Tower Residency</span
						>
						<div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
							<Users class="w-6 h-6" />
						</div>
					</div>
					<div class="text-6xl font-display font-extrabold text-slate-900 tracking-tighter mb-4">
						{totalMembers}
					</div>
					<div class="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">
						Verified Frontier Citizens
					</div>
				</div>
			</div>
		</div>

		<!-- Footer info -->
		<div class="pt-24 opacity-20 hover:opacity-100 transition-opacity duration-1000">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-200 pt-12">
				<div>
					<h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
						Architecture
					</h4>
					<p class="text-xs font-bold text-slate-600 leading-relaxed">
						Modular governance hierarchy utilizing sixteenth-floor distributed ledgers.
					</p>
				</div>
				<div>
					<h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
						Consensus
					</h4>
					<p class="text-xs font-bold text-slate-600 leading-relaxed">
						Conviction-based voting with a 40% quorum requirement for automated execution.
					</p>
				</div>
				<div>
					<h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
						Last Update
					</h4>
					<p class="text-xs font-bold text-slate-600 leading-relaxed">
						Synced {new Date().toLocaleTimeString()} • Horizontal scaling active
					</p>
				</div>
			</div>
		</div>

		<footer class="pt-24 pb-12 flex justify-between items-center border-t border-slate-100">
			<div class="flex items-center gap-3 grayscale opacity-30">
				<Building2 class="w-4 h-4" />
				<span class="font-display font-black text-xs tracking-widest uppercase"
					>Frontier Vertical OS</span
				>
			</div>
			<p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
				Verticality • Stability • Flourishing
			</p>
		</footer>
	</div>
{/if}
