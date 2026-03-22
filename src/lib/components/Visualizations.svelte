<script lang="ts">
	interface FloorBar {
		name: string;
		balance: number;
	}

	interface Props {
		type: 'treasury' | 'activity';
		data: number[] | FloorBar[];
	}

	let { type, data }: Props = $props();

	// Treasury chart
	let chartData = $derived(type === 'treasury' ? (data as FloorBar[]) : []);
	let maxBalance = $derived(Math.max(...chartData.map((d) => d.balance), 1));
	const chartHeight = 200;
	const barWidth = 40;
	const gap = 20;

	// Activity chart
	let activityData = $derived(type === 'activity' ? (data as number[]) : []);
	let maxActivity = $derived(Math.max(...activityData, 1));
	const activityHeight = 150;
	const activityWidth = 400;

	let points = $derived(
		activityData.length < 2
			? ''
			: activityData
					.map((v, i) => {
						const step = activityWidth / (activityData.length - 1);
						return `${i * step},${activityHeight - (v / maxActivity) * activityHeight}`;
					})
					.join(' ')
	);

	let areaPoints = $derived(
		points ? `${points} ${activityWidth},${activityHeight} 0,${activityHeight}` : ''
	);
</script>

{#if type === 'treasury'}
	<div class="w-full overflow-x-auto pb-4">
		<svg
			width={chartData.length * (barWidth + gap)}
			height={chartHeight + 40}
			class="overflow-visible"
		>
			{#each chartData as d, i (d.name)}
				{@const normalizedHeight = (d.balance / maxBalance) * chartHeight}
				{@const x = i * (barWidth + gap)}
				<g class="group cursor-help transition-all duration-500">
					<rect
						{x}
						y={chartHeight - normalizedHeight}
						width={barWidth}
						height={normalizedHeight}
						fill="currentColor"
						class="text-primary-600/10 group-hover:text-primary-600 transition-colors duration-500"
						rx="4"
					/>
					<rect
						{x}
						y={chartHeight - normalizedHeight}
						width={barWidth}
						height={4}
						fill="currentColor"
						class="text-primary-600"
					/>
					<text
						x={x + barWidth / 2}
						y={chartHeight + 20}
						text-anchor="middle"
						class="text-[9px] font-black fill-slate-400 group-hover:fill-slate-900 transition-colors uppercase tracking-widest"
					>
						{d.name.split(' ')[0]}
					</text>
					<title>{d.name}: ${d.balance.toLocaleString()}</title>
				</g>
			{/each}
		</svg>
	</div>
{:else if type === 'activity'}
	<div class="w-full">
		<svg viewBox="0 0 {activityWidth} {activityHeight}" class="w-full h-auto overflow-visible">
			<defs>
				<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#2563eb" stop-opacity="0.2" />
					<stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
				</linearGradient>
			</defs>
			{#if areaPoints}
				<path d="M {areaPoints}" fill="url(#areaGradient)" class="transition-all duration-1000" />
				<polyline
					fill="none"
					stroke="#2563eb"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
					points={points}
					class="transition-all duration-1000"
				/>
				{#each activityData as v, i (i)}
					{@const step = activityWidth / (activityData.length - 1)}
					<circle
						cx={i * step}
						cy={activityHeight - (v / maxActivity) * activityHeight}
						r="4"
						class="fill-white stroke-primary-600 stroke-2 cursor-pointer"
					>
						<title>Activity Level: {v}</title>
					</circle>
				{/each}
			{/if}
		</svg>
	</div>
{/if}
