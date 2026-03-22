<script lang="ts">
	import { onMount } from 'svelte';
	import { Users } from 'lucide-svelte';

	interface Props {
		quorumReachedAt: string | null;
	}

	let { quorumReachedAt }: Props = $props();

	let progress = $state(0);
	let timeLeft = $state('');

	onMount(() => {
		if (!quorumReachedAt) return;

		const interval = setInterval(() => {
			const start = new Date(quorumReachedAt).getTime();
			const now = Date.now();
			const duration = 24 * 60 * 60 * 1000;
			const elapsed = now - start;
			const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
			progress = pct;

			const remaining = duration - elapsed;
			if (remaining > 0) {
				const hours = Math.floor(remaining / 3600000);
				const mins = Math.floor((remaining % 3600000) / 60000);
				timeLeft = `${hours}h ${mins}m until pass`;
			} else {
				timeLeft = 'Passing soon...';
			}
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

{#if !quorumReachedAt}
	<div
		class="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-full"
	>
		<Users class="w-3 h-3" />
		Waiting for Quorum
	</div>
{:else}
	<div class="space-y-2 w-full pt-4 border-t border-slate-50">
		<div
			class="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-primary-600"
		>
			<span>Force of Conviction</span>
			<span>{progress}%</span>
		</div>
		<div class="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
			<div
				class="h-full bg-primary-600 transition-all duration-1000 ease-linear rounded-full"
				style="width: {progress}%"
			></div>
		</div>
		<div class="text-[9px] text-primary-500 font-bold uppercase tracking-widest">{timeLeft}</div>
	</div>
{/if}
