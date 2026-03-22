<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { Proposal, Category } from '$lib/types';
	import ProposalTimer from './proposals/ProposalTimer.svelte';
	import ConvictionStatus from './proposals/ConvictionStatus.svelte';
	import DelegationPills from './proposals/DelegationPills.svelte';
	import VoteButton from './proposals/VoteButton.svelte';
	import HypercertIssuanceModal from './HypercertIssuanceModal.svelte';
	import ProposalChat from './ProposalChat.svelte';
	import type { Profile } from '$lib/types';
	import {
		Plus,
		X,
		CheckCircle2,
		ExternalLink,
		Award,
		ChevronLeft,
		ChevronRight,
		ArrowRight,
		ShieldCheck,
		MessageSquare,
		Edit3,
		Save
	} from 'lucide-svelte';

	interface Props {
		currentUserId: string;
		currentFloorId: string | null;
		members: Profile[];
		proposalDelegations: Record<string, string>;
		globalDelegatedTo: string | null;
		onDelegateProposal: (proposalId: string, targetUserId: string | null) => Promise<boolean>;
		getVotingPower: (proposalId: string) => Promise<number>;
		disabled?: boolean;
		hideHeader?: boolean;
		isCreatingOverride?: boolean;
		onCloseCreating?: (() => void) | null;
		onProposalsReady?: (refresh: () => Promise<void>) => void;
	}

	let {
		currentUserId,
		currentFloorId,
		members,
		proposalDelegations,
		globalDelegatedTo,
		onDelegateProposal,
		getVotingPower,
		disabled = false,
		hideHeader = false,
		isCreatingOverride = false,
		onCloseCreating = null,
		onProposalsReady = undefined
	}: Props = $props();

	// ── Data State ──────────────────────────────────────────────────────────────
	let proposals = $state<Proposal[]>([]);
	let categories = $state<Category[]>([]);
	let userVotes = $state<Record<string, boolean>>({});
	let proposalVotes = $state<Record<string, { yes: number; total: number }>>({});
	let participationMap = $state<Record<string, boolean>>({});
	let totalApprovedUsers = $state(0);

	// ── UI State ─────────────────────────────────────────────────────────────────
	let isCreatingInternal = $state(false);
	let isCreating = $derived(isCreatingOverride || isCreatingInternal);
	let newTitle = $state('');
	let newDesc = $state('');
	let newAmount = $state('');
	let newDurationDays = $state('7');
	let newCatId = $state('');
	let submitting = $state(false);
	let showToast = $state(false);
	let deletingId = $state<string | null>(null);
	let issuingProposal = $state<Proposal | null>(null);
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editDesc = $state('');
	let editAmount = $state('');
	let editCatId = $state('');
	let showChatId = $state<string | null>(null);
	let activeTab = $state<'to-vote' | 'my-votes'>('to-vote');
	let activeIndex = $state(0);
	let slideDir = $state<'left' | 'right' | null>(null);

	// ── Derived ──────────────────────────────────────────────────────────────────
	let activeProposals = $derived(proposals.filter((p) => p.status === 'active'));
	let unvotedProposals = $derived(activeProposals.filter((p) => userVotes[p.id] === undefined));
	let votedProposals = $derived(activeProposals.filter((p) => userVotes[p.id] !== undefined));
	let pastProposals = $derived(proposals.filter((p) => p.status !== 'active'));
	let clampedIndex = $derived(Math.min(activeIndex, Math.max(0, unvotedProposals.length - 1)));
	let currentTinderProposal = $derived(unvotedProposals[clampedIndex]);

	// ── Data Fetching ─────────────────────────────────────────────────────────────
	async function fetchVoteTotals(props: Proposal[]) {
		const active = props.filter((p) => p.status === 'active');
		if (active.length === 0) return;

		const [votesRes, profilesRes, propDelegationsRes] = await Promise.all([
			supabase.from('votes').select('proposal_id, voter_id, vote'),
			supabase.from('profiles').select('id, delegated_to'),
			supabase.from('proposal_delegations').select('user_id, proposal_id, delegated_to')
		]);

		const allVotes = votesRes.data || [];
		const allProfiles = profilesRes.data || [];
		const allPropDelegations = propDelegationsRes.data || [];

		const globalDelegationMap: Record<string, string | null> = {};
		allProfiles.forEach((p) => { globalDelegationMap[p.id] = p.delegated_to; });

		const propDelegationMap: Record<string, string> = {};
		allPropDelegations.forEach((pd) => {
			propDelegationMap[`${pd.user_id}_${pd.proposal_id}`] = pd.delegated_to;
		});

		const totals: Record<string, { yes: number; total: number }> = {};
		active.forEach((p) => { totals[p.id] = { yes: 0, total: 0 }; });

		allVotes.forEach((v: any) => {
			const proposal = active.find((p) => p.id === v.proposal_id);
			if (!proposal || !totals[v.proposal_id]) return;

			let weight = 1;
			allProfiles.forEach((p) => {
				if (p.id === v.voter_id) return;
				const propKey = `${p.id}_${v.proposal_id}`;
				const effectiveDelegate = propDelegationMap[propKey] ?? globalDelegationMap[p.id];
				if (effectiveDelegate === v.voter_id) {
					const hasVotedSelf = allVotes.some(
						(av: any) => av.proposal_id === v.proposal_id && av.voter_id === p.id
					);
					if (!hasVotedSelf) weight++;
				}
			});

			totals[v.proposal_id].total += weight;
			if (v.vote) totals[v.proposal_id].yes += weight;
		});

		proposalVotes = totals;
	}

	async function fetchData() {
		if (!currentFloorId) return;

		const [catsRes, propsRes] = await Promise.all([
			supabase.from('categories').select('*').eq('floor_id', currentFloorId),
			supabase
				.from('proposals')
				.select('*, categories (name, color_theme), profiles:creator_id (email)')
				.eq('floor_id', currentFloorId)
				.order('created_at', { ascending: false })
		]);

		if (catsRes.data) categories = catsRes.data as Category[];

		supabase.rpc('evaluate_cleanup').then();

		const now = new Date();
		const filteredProps = (propsRes.data || []).filter((p: any) => {
			if (p.status === 'active' && new Date(p.expires_at) < now) return false;
			return true;
		});
		if (propsRes.data) proposals = filteredProps as unknown as Proposal[];

		const [allVotesRes, profileRes, propDelsRes] = await Promise.all([
			supabase.from('votes').select('*'),
			supabase.from('profiles').select('delegated_to').eq('id', currentUserId).single(),
			supabase.from('proposal_delegations').select('*').eq('user_id', currentUserId)
		]);

		const allVotes = allVotesRes.data || [];
		const profile = profileRes.data;
		const propDelegations = propDelsRes.data || [];

		if (allVotes && propsRes.data) {
			const pMap: Record<string, boolean> = {};
			const userVoteMap: Record<string, boolean> = {};

			propsRes.data.forEach((proposal: any) => {
				const directVote = allVotes.find(
					(v: any) => v.proposal_id === proposal.id && v.voter_id === currentUserId
				);
				if (directVote) {
					pMap[proposal.id] = true;
					userVoteMap[proposal.id] = directVote.vote;
				} else {
					const proposalDelegate = propDelegations?.find(
						(pd: any) => pd.proposal_id === proposal.id
					)?.delegated_to;
					const effectiveDelegate = proposalDelegate || profile?.delegated_to;
					if (effectiveDelegate) {
						const delegateVoted = allVotes.some(
							(v: any) => v.proposal_id === proposal.id && v.voter_id === effectiveDelegate
						);
						if (delegateVoted) pMap[proposal.id] = true;
					}
				}
			});

			participationMap = pMap;
			userVotes = userVoteMap;
		}

		await fetchVoteTotals(filteredProps as unknown as Proposal[]);

		const { count } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.eq('floor_id', currentFloorId)
			.eq('is_approved', true);
		totalApprovedUsers = count || 0;
	}

	onMount(() => {
		if (currentUserId && currentFloorId) fetchData();
		if (onProposalsReady) onProposalsReady(fetchData);

		const handler = (e: KeyboardEvent) => {
			if (activeTab === 'to-vote') {
				if (e.key === 'ArrowRight') navigateCards('right');
				if (e.key === 'ArrowLeft') navigateCards('left');
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	});

	// ── Actions ───────────────────────────────────────────────────────────────────
	function navigateCards(dir: 'left' | 'right') {
		if (activeTab !== 'to-vote') return;
		if (dir === 'right' && clampedIndex < unvotedProposals.length - 1) {
			slideDir = 'right';
			activeIndex = clampedIndex + 1;
			setTimeout(() => (slideDir = null), 100);
		} else if (dir === 'left' && clampedIndex > 0) {
			slideDir = 'left';
			activeIndex = clampedIndex - 1;
			setTimeout(() => (slideDir = null), 100);
		}
	}

	async function handleVoteWithSwipe(proposalId: string, isYes: boolean) {
		if (activeTab === 'to-vote') {
			slideDir = isYes ? 'right' : 'left';
			setTimeout(async () => {
				await castVote(proposalId, isYes);
				slideDir = null;
				activeIndex = Math.max(0, Math.min(clampedIndex, unvotedProposals.length - 2));
			}, 300);
		} else {
			await castVote(proposalId, isYes);
		}
	}

	async function castVote(proposalId: string, isYes: boolean) {
		const isRetract = userVotes[proposalId] === isYes;
		const isSwitch = userVotes[proposalId] !== undefined && userVotes[proposalId] !== isYes;

		// Optimistic update
		if (isRetract) {
			const next = { ...userVotes };
			delete next[proposalId];
			userVotes = next;
		} else {
			userVotes = { ...userVotes, [proposalId]: isYes };
		}

		if (isRetract) {
			await supabase.from('votes').delete().eq('proposal_id', proposalId).eq('voter_id', currentUserId);
		} else if (isSwitch) {
			await supabase.from('votes').delete().eq('proposal_id', proposalId).eq('voter_id', currentUserId);
			await supabase.from('votes').insert([{ proposal_id: proposalId, voter_id: currentUserId, vote: isYes }]);
		} else {
			await supabase.from('votes').insert([{ proposal_id: proposalId, voter_id: currentUserId, vote: isYes }]);
		}

		await fetchData();
	}

	async function createProposal(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		if (!currentFloorId) { submitting = false; return; }

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + Number(newDurationDays));

		const { data, error } = await supabase
			.from('proposals')
			.insert([{
				title: newTitle,
				description: newDesc,
				amount: Number(newAmount),
				category_id: newCatId,
				creator_id: currentUserId,
				expires_at: expiresAt.toISOString(),
				floor_id: currentFloorId
			}])
			.select('*, categories (name, color_theme), profiles:creator_id (email)')
			.single();

		if (data && !error) {
			if (onCloseCreating) {
				onCloseCreating();
			} else {
				isCreatingInternal = false;
			}
			newTitle = ''; newDesc = ''; newAmount = ''; newDurationDays = '7'; newCatId = '';
			showToast = true;
			setTimeout(() => (showToast = false), 4000);
			proposals = [data as unknown as Proposal, ...proposals];
		}
		submitting = false;
	}

	async function updateProposal(e: SubmitEvent) {
		e.preventDefault();
		if (!editingId) return;
		submitting = true;

		const { error } = await supabase
			.from('proposals')
			.update({ title: editTitle, description: editDesc, amount: Number(editAmount), category_id: editCatId })
			.eq('id', editingId);

		if (!error) {
			editingId = null;
			showToast = true;
			setTimeout(() => (showToast = false), 4000);
			await fetchData();
		}
		submitting = false;
	}

	function startEditing(proposal: Proposal) {
		editingId = proposal.id;
		editTitle = proposal.title;
		editDesc = proposal.description;
		editAmount = proposal.amount.toString();
		editCatId = proposal.category_id;
	}

	async function deleteProposal(proposalId: string) {
		deletingId = proposalId;
		await supabase.from('proposals').delete().eq('id', proposalId);
		proposals = proposals.filter((p) => p.id !== proposalId);
		deletingId = null;
	}

	async function handleIssueHypercertSuccess(uri: string): Promise<boolean> {
		if (!issuingProposal) return false;
		const { error } = await supabase
			.from('proposals')
			.update({ hypercert_uri: uri })
			.eq('id', issuingProposal.id);
		if (!error) await fetchData();
		return !error;
	}
</script>

<div class="space-y-12 mt-12 bg-transparent pb-32">
	{#if !hideHeader && !isCreatingOverride}
		<div
			class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-12"
		>
			<div>
				<h2 class="text-4xl font-display font-extrabold tracking-tight text-slate-900 mb-2">
					Initiatives.
				</h2>
				<p class="text-slate-500 font-medium italic">
					Communal requests for the floor's flourishing.
				</p>
			</div>
			<button
				onclick={() => (isCreatingInternal = !isCreatingInternal)}
				class="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-primary-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full transition-all shadow-xl shadow-slate-900/10"
			>
				{#if isCreating}
					<X class="w-4 h-4" />
					Abandon Draft
				{:else}
					<Plus class="w-4 h-4" />
					Launch New Proposal
				{/if}
			</button>
		</div>
	{/if}

	{#if showToast}
		<div
			class="fixed bottom-12 right-12 bg-slate-900 text-white px-8 py-6 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-slide-up z-50 border border-white/10"
		>
			<div
				class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20"
			>
				<CheckCircle2 class="w-6 h-6 text-white" />
			</div>
			<div>
				<h4 class="font-display font-extrabold text-xl tracking-tight">Success.</h4>
				<p class="text-xs text-slate-400 font-bold uppercase tracking-widest">
					Proposal is now live in the directory.
				</p>
			</div>
		</div>
	{/if}

	{#if isCreating}
		<form
			onsubmit={createProposal}
			class="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl animate-slide-up relative overflow-hidden group"
		>
			<div class="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
			<div class="relative z-10 grid md:grid-cols-2 gap-8 mb-12">
				<div class="md:col-span-2">
					<h3 class="text-3xl font-display font-extrabold mb-8 tracking-tight">
						Drafting New Intent.
					</h3>
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
						>Intent Title</label
					>
					<input
						type="text"
						required
						bind:value={newTitle}
						class="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all"
						placeholder="e.g. Garden Refurbishment"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
						>Category Domain</label
					>
					<select
						required
						bind:value={newCatId}
						class="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all appearance-none cursor-pointer"
					>
						<option value="" disabled>Select category...</option>
						{#each categories as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>
				<div class="md:col-span-2 space-y-2">
					<label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
						>Context & Rationale</label
					>
					<textarea
						required
						bind:value={newDesc}
						rows={4}
						class="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-medium text-slate-900 transition-all leading-relaxed"
						placeholder="Detailed objective for requested funds..."
					></textarea>
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
						>Capital Required ($)</label
					>
					<input
						type="number"
						required
						min="1"
						step="0.01"
						bind:value={newAmount}
						class="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all"
						placeholder="00.00"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
						>Voting Window (Days)</label
					>
					<input
						type="number"
						required
						min="3"
						bind:value={newDurationDays}
						class="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all"
						placeholder="7"
					/>
				</div>
			</div>
			<button
				type="submit"
				disabled={submitting}
				class="w-full md:w-auto px-12 py-5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 disabled:opacity-50"
			>
				{submitting ? 'Broadcasting Intent...' : 'Deploy Proposal to Floor'}
			</button>
		</form>
	{/if}

	<!-- Navigation Tabs -->
	<div
		class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-0"
	>
		<div class="flex gap-12">
			<button
				onclick={() => (activeTab = 'to-vote')}
				class="flex items-center gap-3 pb-6 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-[3px] -mb-[3px] {activeTab ===
				'to-vote'
					? 'text-primary-600 border-primary-600'
					: 'text-slate-400 border-transparent hover:text-slate-600'}"
			>
				Pending Actions
				<span class="bg-slate-100 text-slate-500 py-1 px-3 rounded-full text-[10px] font-black"
					>{unvotedProposals.length}</span
				>
			</button>
			<button
				onclick={() => (activeTab = 'my-votes')}
				class="flex items-center gap-3 pb-6 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-[3px] -mb-[3px] {activeTab ===
				'my-votes'
					? 'text-primary-600 border-primary-600'
					: 'text-slate-400 border-transparent hover:text-slate-600'}"
			>
				Personal Record
				<span
					class="py-1 px-3 rounded-full text-[10px] font-black {votedProposals.length > 0
						? 'bg-primary-600 text-white'
						: 'bg-slate-100 text-slate-500'}">{votedProposals.length}</span
				>
			</button>
		</div>

		{#if activeTab === 'to-vote' && unvotedProposals.length > 0}
			<span class="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
				{clampedIndex + 1} of {unvotedProposals.length} Entries
			</span>
		{/if}
	</div>

	<!-- Content -->
	<div>
		{#if activeTab === 'to-vote'}
			{#if unvotedProposals.length === 0}
				<div
					class="p-24 text-center bg-white border border-slate-100 rounded-[3rem] animate-slide-up group"
				>
					<div
						class="w-20 h-20 bg-primary-50 text-primary-300 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary-100 group-hover:scale-110 transition-transform duration-700"
					>
						<CheckCircle2 class="w-8 h-8" />
					</div>
					<h4 class="text-3xl font-display font-extrabold text-slate-900 mb-4 tracking-tight">
						System Refinement Complete.
					</h4>
					<p class="text-slate-400 font-medium italic max-w-sm mx-auto">
						All active proposals have been evaluated. The directory is clear.
					</p>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-12">
					<div class="flex items-center gap-8 w-full max-w-5xl mx-auto">
						<button
							onclick={() => navigateCards('left')}
							disabled={clampedIndex === 0}
							class="hidden md:flex flex-shrink-0 w-16 h-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-all disabled:opacity-20 shadow-xl shadow-black/5"
						>
							<ChevronLeft class="w-6 h-6" />
						</button>

						<div class="flex-1 w-full relative">
							{#if currentTinderProposal}
								{@render proposalCard(currentTinderProposal, true)}
							{/if}
						</div>

						<button
							onclick={() => navigateCards('right')}
							disabled={clampedIndex === unvotedProposals.length - 1}
							class="hidden md:flex flex-shrink-0 w-16 h-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-all disabled:opacity-20 shadow-xl shadow-black/5"
						>
							<ChevronRight class="w-6 h-6" />
						</button>
					</div>

					<!-- Mobile Nav -->
					<div class="flex md:hidden gap-6">
						<button
							onclick={() => navigateCards('left')}
							disabled={clampedIndex === 0}
							class="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center disabled:opacity-20 shadow-lg"
						>
							<ChevronLeft class="w-5 h-5" />
						</button>
						<button
							onclick={() => navigateCards('right')}
							disabled={clampedIndex === unvotedProposals.length - 1}
							class="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center disabled:opacity-20 shadow-lg"
						>
							<ChevronRight class="w-5 h-5" />
						</button>
					</div>

					{#if unvotedProposals.length > 1}
						<div class="flex items-center gap-2">
							{#each unvotedProposals as _, i (i)}
								<button
									onclick={() => {
										slideDir = i > clampedIndex ? 'right' : 'left';
										activeIndex = i;
										setTimeout(() => (slideDir = null), 100);
									}}
									class="rounded-full transition-all duration-700 {i === clampedIndex
										? 'w-12 h-1.5 bg-primary-600'
										: 'w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300'}"
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		{#if activeTab === 'my-votes'}
			{#if votedProposals.length === 0}
				<div
					class="p-20 text-center text-slate-400 font-medium italic border border-slate-100 border-dashed rounded-[3rem]"
				>
					No personal voting record found in currently active proposals.
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
					{#each votedProposals as proposal (proposal.id)}
						{@render proposalCard(proposal, false)}
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Historical Records -->
	{#if pastProposals.length > 0}
		<div class="pt-24 border-t border-slate-200">
			<h3
				class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-12 flex items-center gap-4"
			>
				Historical Archives
				<div class="h-[1px] flex-1 bg-slate-100"></div>
			</h3>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{#each pastProposals as proposal (proposal.id)}
					<div
						class="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between group hover:border-primary-100 transition-colors"
					>
						<div>
							<div class="flex justify-between items-start mb-6">
								{#if proposal.status === 'passed'}
									<div
										class="px-2 py-1 bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-green-100"
									>
										Finalized.Passed
									</div>
								{:else}
									<div
										class="px-2 py-1 bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-100"
									>
										Finalized.Rejected
									</div>
								{/if}
								<div class="text-xl font-display font-black text-slate-900">
									${proposal.amount.toLocaleString()}
								</div>
							</div>
							<h4
								class="font-bold text-slate-800 mb-2 truncate group-hover:text-primary-700 transition-colors"
							>
								{proposal.title}
							</h4>
							<p class="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-6">
								{proposal.description}
							</p>
						</div>
						<div class="flex items-center justify-between pt-4 border-t border-slate-50">
							<span class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
								Exp: {new Date(proposal.expires_at).toLocaleDateString()}
							</span>
							{#if proposal.hypercert_uri}
								<a
									href="https://psky.app/profile/{proposal.hypercert_uri.split('/')[2]}/post/{proposal.hypercert_uri.split('/')[4]}"
									target="_blank"
									rel="noopener noreferrer"
									class="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-primary-600 transition-all flex items-center gap-2"
								>
									<ExternalLink class="w-2.5 h-2.5" />
									Hypercert
								</a>
							{:else if proposal.status === 'passed' && participationMap[proposal.id]}
								<button
									onclick={() => (issuingProposal = proposal)}
									class="px-3 py-1.5 bg-primary-100 text-primary-700 text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-primary-600 hover:text-white transition-all flex items-center gap-2"
								>
									<Award class="w-2.5 h-2.5" />
									Certify
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if issuingProposal}
		<HypercertIssuanceModal
			proposal={issuingProposal}
			currentUser={null}
			onClose={() => (issuingProposal = null)}
			onSuccess={handleIssueHypercertSuccess}
		/>
	{/if}
</div>

{#snippet proposalCard(proposal: Proposal, isTinderStyle: boolean)}
	{@const catColor = proposal.categories?.color_theme || 'slate'}
	{@const votes = proposalVotes[proposal.id] || { yes: 0, total: 0 }}
	{@const threshold = totalApprovedUsers / 2}
	{@const progress = Math.min(100, Math.round((votes.yes / Math.max(threshold, 1)) * 100)) || 0}
	{@const isCreator = proposal.creator_id === currentUserId}
	{@const isEditing = editingId === proposal.id}
	{@const isChatting = showChatId === proposal.id}
	{@const transitionClass = isTinderStyle
		? slideDir === 'right'
			? 'translate-x-full opacity-0'
			: slideDir === 'left'
				? '-translate-x-full opacity-0'
				: 'translate-x-0 opacity-100'
		: 'opacity-100'}

	<div
		class="w-full bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] flex flex-col group hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 relative overflow-hidden {transitionClass} {isTinderStyle
			? 'max-w-3xl mx-auto shadow-2xl'
			: ''}"
	>
		<div
			class="absolute top-0 right-0 w-32 h-32 bg-{catColor}-500/10 rounded-full -translate-y-16 translate-x-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
		></div>

		{#if isEditing}
			<form onsubmit={updateProposal} class="relative z-10 space-y-6 flex-1">
				<div class="flex justify-between items-center mb-4">
					<h4 class="text-xl font-display font-extrabold text-slate-900 tracking-tight">
						Refining Intent.
					</h4>
					<button
						type="button"
						onclick={() => (editingId = null)}
						class="text-slate-400 hover:text-slate-600"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
				<div class="space-y-4">
					<div class="space-y-1">
						<label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1"
							>Title</label
						>
						<input
							type="text"
							required
							bind:value={editTitle}
							class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm"
						/>
					</div>
					<div class="space-y-1">
						<label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1"
							>Category</label
						>
						<select
							required
							bind:value={editCatId}
							class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm appearance-none"
						>
							{#each categories as c (c.id)}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1"
							>Description</label
						>
						<textarea
							required
							bind:value={editDesc}
							rows={3}
							class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-medium text-slate-900 transition-all text-sm leading-relaxed"
						></textarea>
					</div>
					<div class="space-y-1">
						<label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1"
							>Amount ($)</label
						>
						<input
							type="number"
							required
							bind:value={editAmount}
							class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm"
						/>
					</div>
				</div>
				<button
					type="submit"
					disabled={submitting}
					class="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary-600 transition-all shadow-lg flex items-center justify-center gap-2"
				>
					{#if submitting}
						Updating...
					{:else}
						<Save class="w-3.5 h-3.5" /> Save Changes
					{/if}
				</button>
			</form>
		{:else if isChatting}
			<div class="relative z-10 flex-1 flex flex-col">
				<ProposalChat
					proposalId={proposal.id}
					{currentUserId}
					{currentFloorId}
					onClose={() => (showChatId = null)}
				/>
			</div>
		{:else}
			<!-- Header -->
			<div class="flex justify-between items-start mb-8 relative z-10">
				<div class="flex flex-col gap-2">
					<span
						class="w-fit px-3 py-1 bg-{catColor}-50 text-{catColor}-700 text-[10px] font-black uppercase tracking-widest rounded-full"
					>
						{proposal.categories?.name}
					</span>
					<div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
						By {proposal.profiles?.email.split('@')[0]}
					</div>
				</div>
				<div class="flex flex-col items-end gap-1">
					<div class="text-3xl font-display font-extrabold text-slate-900">
						${proposal.amount.toLocaleString()}
					</div>
					<ProposalTimer expiresAt={proposal.expires_at} createdAt={proposal.created_at} />
				</div>
			</div>

			<!-- Title & Description -->
			<div class="mb-10 flex-1 relative z-10">
				<h4
					class="text-3xl font-display font-extrabold text-slate-900 mb-4 tracking-tight leading-tight group-hover:text-primary-700 transition-colors"
				>
					{proposal.title}
				</h4>
				<p class="text-slate-500 font-medium leading-relaxed">{proposal.description}</p>
			</div>

			<!-- Engagement -->
			<div class="space-y-6 relative z-10">
				<div class="space-y-2">
					<div
						class="flex justify-between items-baseline text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"
					>
						<span>Quorum Progress</span>
						<span>{votes.yes} / {Math.ceil(threshold + 1)} YES</span>
					</div>
					<div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
						<div
							class="h-full bg-slate-900 transition-all duration-700 ease-out rounded-full"
							style="width: {progress}%"
						></div>
					</div>
				</div>

				{#if !globalDelegatedTo && !proposalDelegations[proposal.id]}
					<div class="flex gap-4">
						<VoteButton
							proposalId={proposal.id}
							isYes={true}
							isActive={userVotes[proposal.id] === true}
							onVote={handleVoteWithSwipe}
							{getVotingPower}
							{disabled}
						/>
						<VoteButton
							proposalId={proposal.id}
							isYes={false}
							isActive={userVotes[proposal.id] === false}
							onVote={handleVoteWithSwipe}
							{getVotingPower}
							{disabled}
						/>
					</div>
				{:else}
					<div
						class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/delegation"
					>
						<div class="flex items-center gap-3">
							<ShieldCheck class="w-5 h-5 text-primary-500" />
							<span class="text-xs font-bold text-slate-500 uppercase tracking-widest italic"
								>Voting power delegated</span
							>
						</div>
						<ArrowRight
							class="w-4 h-4 text-slate-300 group-hover/delegation:translate-x-1 transition-transform"
						/>
					</div>
				{/if}

				<ConvictionStatus quorumReachedAt={proposal.quorum_reached_at} />

				<DelegationPills
					proposalId={proposal.id}
					{members}
					{proposalDelegations}
					{onDelegateProposal}
				/>

				<div class="pt-4 border-t border-slate-50 flex justify-between items-center gap-4">
					<button
						onclick={() => (showChatId = proposal.id)}
						class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors"
					>
						<MessageSquare class="w-3.5 h-3.5" />
						Discuss
					</button>

					{#if isCreator}
						<div class="flex items-center gap-6">
							<button
								onclick={() => startEditing(proposal)}
								class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors"
							>
								<Edit3 class="w-3.5 h-3.5" />
								Modify
							</button>
							<button
								onclick={() => deleteProposal(proposal.id)}
								disabled={deletingId === proposal.id}
								class="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
							>
								Withdraw
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/snippet}
