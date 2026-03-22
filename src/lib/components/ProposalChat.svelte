<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { Comment } from '$lib/types';
	import { MessageSquare, Send, X } from 'lucide-svelte';

	interface Props {
		proposalId: string;
		currentUserId: string;
		currentFloorId: string | null;
		onClose: () => void;
	}

	let { proposalId, currentUserId, currentFloorId, onClose }: Props = $props();

	let comments = $state<Comment[]>([]);
	let loading = $state(false);
	let newComment = $state('');
	let submitting = $state(false);
	let scrollEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (scrollEl && comments.length > 0) {
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	});

	async function fetchComments() {
		if (!proposalId) return;
		loading = true;
		const { data, error } = await supabase
			.from('proposal_comments')
			.select('*, profiles:author_id (email)')
			.eq('proposal_id', proposalId)
			.order('created_at', { ascending: true });
		if (data && !error) comments = data as unknown as Comment[];
		loading = false;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!newComment.trim() || submitting) return;

		submitting = true;
		const { data, error } = await supabase
			.from('proposal_comments')
			.insert([{
				proposal_id: proposalId,
				author_id: currentUserId,
				content: newComment.trim(),
				floor_id: currentFloorId
			}])
			.select('*, profiles:author_id (email)')
			.single();

		if (data && !error) {
			newComment = '';
			await fetchComments();
		}
		submitting = false;
	}

	onMount(() => {
		fetchComments();

		const channel = supabase
			.channel(`proposal_comments:${proposalId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'proposal_comments',
					filter: `proposal_id=eq.${proposalId}`
				},
				() => fetchComments()
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});
</script>

<div
	class="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-inner"
>
	<div class="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
		<div class="flex items-center gap-2">
			<MessageSquare class="w-4 h-4 text-primary-600" />
			<span class="text-[10px] font-black uppercase tracking-widest text-slate-900"
				>Proposal Discussion</span
			>
		</div>
		<button onclick={onClose} class="text-slate-400 hover:text-slate-600 transition-colors">
			<X class="w-4 h-4" />
		</button>
	</div>

	<div
		bind:this={scrollEl}
		class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px] scroll-smooth"
	>
		{#if loading}
			<div class="flex justify-center py-8">
				<div
					class="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"
				></div>
			</div>
		{/if}

		{#if !loading && comments.length === 0}
			<div class="text-center py-12">
				<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
					No discussion yet. Start the conversation.
				</p>
			</div>
		{/if}

		{#each comments as comment (comment.id)}
			<div
				class="flex flex-col {comment.author_id === currentUserId ? 'items-end' : 'items-start'}"
			>
				<div class="flex items-center gap-1.5 mb-1 px-1">
					<span class="text-[8px] font-black uppercase tracking-tighter text-slate-400">
						{comment.profiles?.email.split('@')[0]}
					</span>
					<span class="text-[8px] text-slate-300">
						{new Date(comment.created_at).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit'
						})}
					</span>
				</div>
				<div
					class="max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm {comment.author_id ===
					currentUserId
						? 'bg-primary-600 text-white rounded-tr-none'
						: 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}"
				>
					{comment.content}
				</div>
			</div>
		{/each}
	</div>

	<form onsubmit={handleSubmit} class="p-4 bg-white border-t border-slate-100 flex gap-2">
		<input
			type="text"
			bind:value={newComment}
			placeholder="Refinement suggestion..."
			class="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary-400 transition-all"
		/>
		<button
			type="submit"
			disabled={!newComment.trim() || submitting}
			class="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-primary-600 disabled:opacity-20 transition-all shadow-lg shadow-black/5"
		>
			<Send class="w-4 h-4" />
		</button>
	</form>
</div>
