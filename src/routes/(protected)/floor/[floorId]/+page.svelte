<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { BskyAgent } from '@atproto/api';
	import { CONFIG } from '$lib/config';
	import type { AuthContext, Profile } from '$lib/types';
	import ProposalsList from '$lib/components/ProposalsList.svelte';
	import { UserPlus, RotateCcw, Check, ArrowLeft, ArrowUpRight, Plus, X } from 'lucide-svelte';

	const auth = getContext<AuthContext>('auth');

	let floorIdParam = $derived(page.params.floorId);

	// ── Dashboard Data ─────────────────────────────────────────────────────────
	let currentUser = $state<Profile | null>(null);
	let members = $state<Profile[]>([]);
	let votingPower = $state(1);
	let floorName = $state('');
	let fundBalance = $state(0);
	let monthlyBurnRate = $state(0);
	let loading = $state(true);
	let proposalDelegations = $state<Record<string, string>>({});

	// ── UI State ───────────────────────────────────────────────────────────────
	let isCreating = $state(false);
	let handle = $state('');
	let appPassword = $state('');
	let linking = $state(false);

	let isCurrentFloor = $derived(
		!floorIdParam || floorIdParam === (currentUser as any)?.floor_id
	);

	async function fetchDashboardData() {
		let user: any;
		if (CONFIG.BYPASS_AUTH) {
			user = { id: '00000000-0000-0000-0000-000000000001', email: 'demo@flourish.test' };
		} else {
			const { data } = await supabase.auth.getUser();
			user = data.user;
		}

		if (!user) return;

		const { data: profile } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();

		if (profile) {
			currentUser = profile as Profile;
			handle = profile.atproto_handle || '';
			appPassword = profile.atproto_app_password || '';
		}

		const activeFloorId = floorIdParam || profile?.floor_id;
		if (!activeFloorId) { loading = false; return; }

		const [membersRes, floorRes, delegationCountRes, propDelsRes, txsRes, expensesRes] =
			await Promise.all([
				supabase.from('profiles').select('*').eq('is_approved', true).eq('floor_id', activeFloorId).neq('id', user.id),
				supabase.from('floors').select('name').eq('id', activeFloorId).single(),
				supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('floor_id', activeFloorId).eq('delegated_to', user.id),
				supabase.from('proposal_delegations').select('proposal_id, delegated_to').eq('user_id', user.id),
				supabase.from('transactions').select('amount, type').eq('floor_id', activeFloorId),
				supabase.from('recurring_expenses').select('amount').eq('floor_id', activeFloorId).eq('is_active', true)
			]);

		if (membersRes.data) members = membersRes.data as Profile[];
		if (floorRes.data) floorName = floorRes.data.name;
		votingPower = 1 + (delegationCountRes.count || 0);

		if (propDelsRes.data) {
			const map: Record<string, string> = {};
			propDelsRes.data.forEach((pd: any) => { map[pd.proposal_id] = pd.delegated_to; });
			proposalDelegations = map;
		}

		if (txsRes.data) {
			fundBalance = txsRes.data.reduce((acc: number, curr: any) =>
				curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);
		}

		if (expensesRes.data) {
			monthlyBurnRate = expensesRes.data.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
		}

		loading = false;
	}

	async function getVotingPower(proposalId: string): Promise<number> {
		if (!currentUser) return 1;

		const [globalRes, propDelsRes] = await Promise.all([
			supabase.from('profiles').select('id').eq('delegated_to', currentUser.id),
			supabase.from('proposal_delegations').select('user_id').eq('delegated_to', currentUser.id).eq('proposal_id', proposalId)
		]);

		const globalIds = (globalRes.data || []).map((d: any) => d.id);
		const propIds = (propDelsRes.data || []).map((d: any) => d.user_id);

		const { data: overrides } = await supabase
			.from('proposal_delegations')
			.select('user_id')
			.in('user_id', globalIds.length > 0 ? globalIds : ['00000000-0000-0000-0000-000000000000'])
			.eq('proposal_id', proposalId);

		const overrideIds = new Set((overrides || []).map((o: any) => o.user_id));
		const effectiveGlobal = globalIds.filter((id: string) => !overrideIds.has(id));
		const unique = new Set([...propIds, ...effectiveGlobal]);
		return 1 + unique.size;
	}

	async function delegateVote(targetUserId: string | null) {
		if (!currentUser) return false;

		await supabase.from('proposal_delegations').delete().eq('user_id', currentUser.id);

		if (targetUserId !== null) {
			await supabase.from('votes').delete().eq('voter_id', currentUser.id);
		}

		const { error } = await supabase
			.from('profiles')
			.update({ delegated_to: targetUserId })
			.eq('id', currentUser.id);

		if (!error) {
			currentUser = { ...currentUser, delegated_to: targetUserId };
			proposalDelegations = {};
			return true;
		}
		return false;
	}

	async function delegateVoteForProposal(proposalId: string, targetUserId: string | null): Promise<boolean> {
		if (!currentUser) return false;

		if (targetUserId === null) {
			const { error } = await supabase
				.from('proposal_delegations')
				.delete()
				.eq('user_id', currentUser.id)
				.eq('proposal_id', proposalId);

			if (!error) {
				const next = { ...proposalDelegations };
				delete next[proposalId];
				proposalDelegations = next;
				return true;
			}
			return false;
		}

		await supabase.from('votes').delete().eq('voter_id', currentUser.id).eq('proposal_id', proposalId);
		await supabase.from('proposal_delegations').delete().eq('user_id', currentUser.id).eq('proposal_id', proposalId);

		const { error } = await supabase.from('proposal_delegations').insert([{
			user_id: currentUser.id,
			proposal_id: proposalId,
			delegated_to: targetUserId
		}]);

		if (!error) {
			proposalDelegations = { ...proposalDelegations, [proposalId]: targetUserId };
			return true;
		}
		return false;
	}

	async function handleSaveCredentials(e: SubmitEvent) {
		e.preventDefault();
		if (!currentUser || !handle.trim() || !appPassword.trim()) return;
		linking = true;

		let did: string | undefined = currentUser.atproto_did;
		if (!did) {
			try {
				const agent = new BskyAgent({ service: 'https://bsky.social' });
				const { data } = await agent.resolveHandle({ handle: handle.trim() });
				did = data.did;
				if (did) {
					await supabase.from('profiles').update({ atproto_did: did }).eq('id', currentUser.id);
				}
			} catch {}
		}

		const { error } = await supabase
			.from('profiles')
			.update({ atproto_handle: handle.trim(), atproto_app_password: appPassword.trim() })
			.eq('id', currentUser.id);

		if (!error) {
			currentUser = { ...currentUser, atproto_handle: handle.trim(), atproto_app_password: appPassword.trim() };
			await fetchDashboardData();
		}
		linking = false;
	}

	onMount(() => {
		fetchDashboardData();
	});

	$effect(() => {
		// Re-fetch when floorId changes
		void floorIdParam;
		if (!loading) fetchDashboardData();
	});
</script>

{#if loading}
	<div class="min-h-[60vh] flex items-center justify-center">
		<div class="relative">
			<div class="absolute inset-0 bg-primary-500/10 blur-[80px] rounded-full animate-pulse"></div>
			<div
				class="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin relative z-10"
			></div>
		</div>
	</div>
{:else}
	<div class="space-y-12 animate-slide-up pb-32">
		<!-- Context Awareness Bar -->
		{#if !isCurrentFloor}
			<div
				class="bg-slate-900 text-white p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border border-white/10"
			>
				<div class="flex items-center text-sm font-bold tracking-tight px-4">
					<div class="w-2 h-2 bg-amber-500 rounded-full mr-3 animate-pulse"></div>
					VIRTUAL PERSPECTIVE: YOU ARE VIEWING {floorName?.toUpperCase()}
				</div>
				<a
					href="/floor/{(currentUser as any)?.floor_id}"
					class="px-6 py-2 bg-white text-slate-900 text-xs font-black rounded-full hover:bg-primary-50 transition-all flex items-center gap-2 uppercase tracking-widest shadow-lg"
				>
					Return to Personal Floor
					<ArrowLeft class="w-3 h-3" />
				</a>
			</div>
		{/if}

		<!-- Header & Stats -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<div class="lg:col-span-8 flex flex-col gap-8">
				<!-- Stats Header -->
				<header
					class="bg-white border border-slate-200 p-6 md:p-8 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-8 shadow-sm"
				>
					<div class="flex flex-col">
						<span
							class="text-primary-600 font-bold tracking-[0.3em] uppercase text-[9px] mb-1"
							>Floor Identity</span
						>
						<h1 class="text-3xl font-display font-extrabold tracking-tight text-slate-900">
							{floorName || 'Operational'}
						</h1>
					</div>

					<div class="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

					<div class="flex flex-col">
						<span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"
							>Liquidity Pool</span
						>
						<div class="text-2xl font-display font-extrabold text-slate-900">
							${fundBalance.toLocaleString(undefined, {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0
							})}
						</div>
					</div>

					<div class="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

					<div class="flex flex-col">
						<span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"
							>Voting Weight</span
						>
						<div class="text-2xl font-display font-extrabold text-slate-900">
							{votingPower} <span class="text-[10px] opacity-40">units</span>
						</div>
					</div>

					<div class="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

					<div class="flex flex-col">
						<span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"
							>Monthly Expenses</span
						>
						<div class="text-2xl font-display font-extrabold text-slate-900">
							${monthlyBurnRate.toLocaleString()}
						</div>
					</div>
				</header>

				<!-- Launch Section -->
				<div class="flex flex-col gap-6">
					<div class="flex items-center justify-between">
						<h2 class="text-3xl font-display font-extrabold tracking-tight">Governance.</h2>
						<button
							onclick={() => (isCreating = !isCreating)}
							disabled={!isCurrentFloor}
							class="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[9px] rounded-full transition-all shadow-lg disabled:opacity-40"
						>
							{#if isCreating}
								<X class="w-3.5 h-3.5" />
								Cancel
							{:else}
								<Plus class="w-3.5 h-3.5" />
								Launch New Proposal
							{/if}
						</button>
					</div>

					{#if isCreating && currentUser}
						<div class="animate-slide-up">
							<ProposalsList
								currentUserId={currentUser.id}
								currentFloorId={floorIdParam || (currentUser as any).floor_id}
								{members}
								{proposalDelegations}
								globalDelegatedTo={currentUser.delegated_to}
								onDelegateProposal={isCurrentFloor ? delegateVoteForProposal : async () => false}
								{getVotingPower}
								disabled={!isCurrentFloor}
								isCreatingOverride={true}
								onCloseCreating={() => (isCreating = false)}
							/>
						</div>
					{/if}
				</div>

				<!-- Proposals -->
				{#if !isCreating}
					<div class="space-y-8">
						{#if currentUser}
							<ProposalsList
								currentUserId={currentUser.id}
								currentFloorId={floorIdParam || (currentUser as any).floor_id}
								{members}
								{proposalDelegations}
								globalDelegatedTo={currentUser.delegated_to}
								onDelegateProposal={isCurrentFloor ? delegateVoteForProposal : async () => false}
								{getVotingPower}
								disabled={!isCurrentFloor}
								hideHeader={true}
							/>
						{/if}
					</div>
				{/if}
			</div>

			<div class="lg:col-span-4 flex flex-col gap-6 pt-12 lg:pt-0">
				<!-- Delegation Module -->
				<div
					class="bg-[#FAF9F6] border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col h-full relative overflow-hidden group"
				>
					<div
						class="absolute -top-12 -right-12 w-32 h-32 bg-primary-100/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"
					></div>

					<div class="flex items-center justify-between mb-8">
						<h2 class="text-2xl font-display font-extrabold tracking-tight">Trust Network</h2>
						<UserPlus class="w-5 h-5 text-primary-600" />
					</div>

					<p class="text-slate-500 text-sm leading-relaxed mb-10">
						Empower a peer to act on your behalf across all floor initiatives.
					</p>

					<div class="space-y-4 flex-1">
						{#if currentUser?.delegated_to}
							<div class="p-6 bg-white border border-primary-100 rounded-[2rem] shadow-sm mb-6">
								<span
									class="text-[9px] font-black text-primary-600 uppercase tracking-[0.2em] mb-3 block"
									>Primary Delegate</span
								>
								<div class="flex items-center justify-between">
									<div class="font-display font-bold text-lg text-slate-900">
										{members.find((m) => m.id === currentUser?.delegated_to)?.email.split('@')[0] ||
											'Peer'}
									</div>
									{#if isCurrentFloor}
										<button
											onclick={() => delegateVote(null)}
											class="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-100 transition-colors"
										>
											<RotateCcw class="w-4 h-4" />
										</button>
									{/if}
								</div>
							</div>
						{:else}
							<div class="space-y-2 overflow-y-auto max-h-[300px] pr-2">
								{#if members.length === 0}
									<div
										class="py-12 text-center text-slate-400 font-medium text-xs uppercase tracking-widest"
									>
										No active peers found.
									</div>
								{:else}
									{#each members as member (member.id)}
										<button
											onclick={() => delegateVote(member.id)}
											disabled={!isCurrentFloor}
											class="w-full text-left p-5 bg-white border border-slate-100 rounded-2xl hover:border-primary-200 transition-all flex items-center justify-between group/btn disabled:opacity-40"
										>
											<span class="font-bold text-slate-700 text-sm"
												>{member.email.split('@')[0]}</span
											>
											<ArrowUpRight
												class="w-4 h-4 text-slate-300 group-hover/btn:text-primary-600 transition-all"
											/>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Identity Linkage -->
				<div class="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden group">
					<div
						class="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-transparent opacity-50"
					></div>

					<div class="relative z-10">
						<h2 class="text-2xl font-display font-extrabold tracking-tight mb-8">Impact ID</h2>

						{#if currentUser?.atproto_handle}
							<div class="space-y-6">
								<div
									class="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between"
								>
									<div class="min-w-0">
										<div
											class="text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1"
										>
											ATProto Linked
										</div>
										<div class="font-medium text-sm truncate opacity-90">
											{currentUser.atproto_handle}
										</div>
									</div>
									<div
										class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/20"
									>
										<Check class="w-5 h-5" />
									</div>
								</div>
								<button
									onclick={() => {
										if (currentUser) {
											handle = currentUser.atproto_handle || '';
											appPassword = currentUser.atproto_app_password || '';
											// Clear credentials to show form
											currentUser = { ...currentUser, atproto_handle: undefined, atproto_app_password: undefined };
										}
									}}
									class="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
								>
									Update Identity
								</button>
							</div>
						{:else}
							<form onsubmit={handleSaveCredentials} class="space-y-4">
								<div class="space-y-1">
									<input
										type="text"
										required
										bind:value={handle}
										placeholder="Bluesky Handle"
										class="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:ring-1 focus:ring-primary-400 outline-none transition-all placeholder:text-white/20"
									/>
								</div>
								<div class="space-y-1">
									<input
										type="password"
										required
										bind:value={appPassword}
										placeholder="App Password"
										class="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:ring-1 focus:ring-primary-400 outline-none transition-all placeholder:text-white/20"
									/>
								</div>
								<button
									type="submit"
									disabled={linking || !handle.trim() || !appPassword.trim()}
									class="w-full py-3 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary-50 transition-colors disabled:opacity-20"
								>
									{linking ? 'Verifying...' : 'Link AT Protocol'}
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.custom-scrollbar::-webkit-scrollbar) { width: 4px; }
	:global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
	:global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: #e2e8f0; border-radius: 10px; }
	:global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) { background: #cbd5e1; }
</style>
