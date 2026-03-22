<script lang="ts">
	import { BskyAgent } from '@atproto/api';
	import { supabase } from '$lib/supabase';
	import type { Proposal, Profile } from '$lib/types';
	import { Award, X, Loader2, ExternalLink } from 'lucide-svelte';

	const HYPERCERT_COLLECTION = 'org.hypercerts.claim.activity';

	interface Props {
		proposal: Proposal;
		currentUser: Profile | null;
		onClose: () => void;
		onSuccess: (hypercertUri: string) => Promise<boolean>;
	}

	let { proposal, currentUser, onClose, onSuccess }: Props = $props();

	let issuingLoading = $state(false);
	let issuanceError = $state<string | null>(null);

	let hasCredentials = $derived(
		!!(currentUser?.atproto_handle && currentUser?.atproto_app_password)
	);

	async function handleIssue(e?: SubmitEvent) {
		if (e) e.preventDefault();
		if (!currentUser?.atproto_handle || !currentUser?.atproto_app_password) {
			issuanceError = 'Please configure your Bluesky credentials in the Dashboard first.';
			return;
		}

		issuingLoading = true;
		issuanceError = null;

		try {
			const agent = new BskyAgent({ service: 'https://bsky.social' });
			await agent.login({
				identifier: currentUser.atproto_handle,
				password: currentUser.atproto_app_password
			});

			if (!agent.session?.did) throw new Error('Failed to get DID from session');

			const result = await agent.com.atproto.repo.createRecord({
				repo: agent.session.did,
				collection: HYPERCERT_COLLECTION,
				record: {
					$type: HYPERCERT_COLLECTION,
					title: proposal.title,
					description: proposal.description,
					shortDescription: `Flourish Fund impact: ${proposal.amount} for ${proposal.categories?.name}`,
					createdAt: new Date().toISOString()
				}
			});

			if (result?.data?.uri) {
				const success = await onSuccess(result.data.uri);
				if (success) {
					onClose();
				} else {
					issuanceError = 'Hypercert created but failed to link to proposal.';
				}
			} else {
				issuanceError =
					'Failed to create Hypercert on ATProto. Please verify your handle and app password in the Dashboard.';
			}
		} catch (err: any) {
			issuanceError = err.message || 'Failed to create Hypercert';
		} finally {
			issuingLoading = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
>
	<div
		class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
	>
		<div class="p-6 border-b border-slate-100 flex justify-between items-center">
			<h3 class="text-xl font-bold text-slate-900 flex items-center gap-2">
				<Award class="w-5 h-5 text-primary-500" />
				Issue Hypercert
			</h3>
			<button onclick={onClose} class="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
				<X class="w-5 h-5 text-slate-400" />
			</button>
		</div>

		<div class="p-6 space-y-4">
			<div class="bg-primary-50 p-4 rounded-2xl border border-primary-100 mb-2">
				<div class="text-xs font-bold text-primary-600 uppercase mb-1">Proposal</div>
				<div class="text-slate-900 font-medium">{proposal.title}</div>
				<div class="text-sm text-slate-500">${proposal.amount} · {proposal.categories?.name}</div>
			</div>

			{#if !hasCredentials}
				<div class="p-6 text-center space-y-4">
					<div
						class="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto"
					>
						<ExternalLink class="w-6 h-6" />
					</div>
					<div class="space-y-1">
						<h4 class="font-bold text-slate-900">Credentials Missing</h4>
						<p class="text-sm text-slate-500">
							You need to link your Bluesky account and save an App Password in your Dashboard before
							you can issue Hypercerts.
						</p>
					</div>
					<button
						onclick={onClose}
						class="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
					>
						Go to Dashboard
					</button>
				</div>
			{:else}
				<form onsubmit={handleIssue} class="space-y-4">
					<div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
						<div
							class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase"
						>
							<span>Using Identity</span>
							<button
								type="button"
								class="text-primary-500 underline cursor-pointer"
								onclick={onClose}>Change</button
							>
						</div>
						<div class="text-slate-900 font-medium text-sm truncate">
							{currentUser?.atproto_handle}
						</div>
					</div>

					{#if issuanceError}
						<div class="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
							{issuanceError}
						</div>
					{/if}

					<button
						type="submit"
						disabled={issuingLoading}
						class="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
					>
						{#if issuingLoading}
							<Loader2 class="w-4 h-4 animate-spin" />
							Creating Impact Record...
						{:else}
							Issue Verifiable Hypercert
						{/if}
					</button>
					<p class="text-[10px] text-slate-400 text-center px-4">
						This will create a permanent, verifiable record of your participation on the ATProto
						network.
					</p>
				</form>
			{/if}
		</div>
	</div>
</div>
