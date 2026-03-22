<script lang="ts">
	interface Member {
		id: string;
		email: string;
	}

	interface Props {
		proposalId: string;
		members: Member[];
		proposalDelegations: Record<string, string>;
		onDelegateProposal: (proposalId: string, targetId: string | null) => Promise<boolean>;
	}

	let { proposalId, members, proposalDelegations, onDelegateProposal }: Props = $props();

	let activeDelegateId = $derived(proposalDelegations[proposalId] ?? null);

	async function handleClick(memberId: string) {
		if (activeDelegateId === memberId) {
			await onDelegateProposal(proposalId, null);
		} else {
			await onDelegateProposal(proposalId, memberId);
		}
	}
</script>

{#if members.length > 0}
	<div class="mt-6 pt-6 border-t border-slate-50">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2"
				>Delegate Power:</span
			>
			{#each members as member (member.id)}
				{@const name = member.email.split('@')[0]}
				{@const isActive = activeDelegateId === member.id}
				<button
					onclick={() => handleClick(member.id)}
					class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border {isActive
						? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20'
						: 'bg-slate-50 text-slate-500 border-slate-200 hover:border-primary-400 hover:text-primary-600 hover:bg-white'}"
				>
					{name}
				</button>
			{/each}
		</div>
	</div>
{/if}
