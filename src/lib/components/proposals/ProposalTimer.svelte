<script lang="ts">
	import { onMount } from 'svelte';
	import { Clock } from 'lucide-svelte';

	interface Props {
		expiresAt: string;
		createdAt: string;
	}

	let { expiresAt, createdAt }: Props = $props();

	let timeLeft = $state('');
	let colorClass = $state('text-green-700');
	let bgClass = $state('bg-green-50 border-green-200');

	function compute() {
		const now = Date.now();
		const end = new Date(expiresAt).getTime();
		const start = new Date(createdAt).getTime();
		const totalMs = end - start;
		const remainingMs = end - now;

		if (remainingMs <= 0) {
			timeLeft = 'Expired';
			colorClass = 'text-slate-400';
			bgClass = 'bg-slate-100';
			return;
		}

		const pct = remainingMs / totalMs;
		if (pct > 0.5) {
			colorClass = 'text-green-700';
			bgClass = 'bg-green-50 border-green-200';
		} else if (pct > 0.25) {
			colorClass = 'text-yellow-700';
			bgClass = 'bg-yellow-50 border-yellow-200';
		} else {
			colorClass = 'text-red-700';
			bgClass = 'bg-red-50 border-red-200';
		}

		const days = Math.floor(remainingMs / 86400000);
		const hours = Math.floor((remainingMs % 86400000) / 3600000);
		const mins = Math.floor((remainingMs % 3600000) / 60000);

		if (days > 0) timeLeft = `${days}d ${hours}h left`;
		else if (hours > 0) timeLeft = `${hours}h ${mins}m left`;
		else timeLeft = `${mins}m left`;
	}

	onMount(() => {
		compute();
		const interval = setInterval(compute, 60000);
		return () => clearInterval(interval);
	});
</script>

<span
	class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border {colorClass} {bgClass}"
>
	<Clock class="w-3 h-3" />
	{timeLeft}
</span>
