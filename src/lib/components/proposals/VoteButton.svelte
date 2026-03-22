<script lang="ts">
	import { ThumbsUp, ThumbsDown } from 'lucide-svelte';

	interface Props {
		proposalId: string;
		isYes: boolean;
		isActive: boolean;
		onVote: (id: string, yes: boolean) => Promise<void>;
		getVotingPower: (proposalId: string) => Promise<number>;
		disabled?: boolean;
	}

	let { proposalId, isYes, isActive, onVote, getVotingPower, disabled = false }: Props = $props();

	let power = $state<number | null>(null);

	$effect(() => {
		getVotingPower(proposalId).then((v) => (power = v));
	});
</script>

<button
	onclick={() => !disabled && onVote(proposalId, isYes)}
	{disabled}
	class="flex-1 flex items-center justify-center py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all {isActive
		? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30'
		: 'bg-white border border-slate-200 text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'} {disabled
		? 'opacity-50 cursor-not-allowed'
		: ''}"
>
	{#if isYes}
		<ThumbsUp class="w-4 h-4 mr-2" />
	{:else}
		<ThumbsDown class="w-4 h-4 mr-2" />
	{/if}
	{isYes ? 'Yes' : 'No'} ({power ?? '..'})
</button>
