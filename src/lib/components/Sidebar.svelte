<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { cn } from '$lib/utils';
	import type { Floor } from '$lib/types';
	import {
		LayoutDashboard,
		Building2,
		LogOut,
		ChevronRight,
		Search,
		User,
		Settings,
		Layers,
		PanelLeftClose,
		PanelLeftOpen,
		ArrowLeftRight
	} from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onToggle: () => void;
	}

	let { isOpen, onToggle }: Props = $props();

	let floors = $state<Floor[]>([]);
	let searchQuery = $state('');

	let currentFloorId = $derived(page.params.floorId);
	let onFloorPage = $derived(!!page.params.floorId);

	let filteredFloors = $derived(
		floors.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.floor_number.toString().includes(searchQuery)
		)
	);

	onMount(async () => {
		const { data } = await supabase.from('floors').select('*').order('name');
		if (data) floors = data as Floor[];
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/login');
	}
</script>

<aside
	class={cn(
		'h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-500 ease-in-out overflow-hidden shadow-2xl',
		isOpen ? 'w-80' : 'w-20'
	)}
>
	<!-- Brand Header -->
	<div class="p-5 border-b border-slate-50 flex items-center justify-between min-w-[320px]">
		<a
			href="/building"
			class={cn(
				'flex items-center gap-3 group transition-opacity duration-300',
				!isOpen && 'opacity-0 pointer-events-none'
			)}
		>
			<div
				class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500"
			>
				<Building2 class="w-5 h-5 text-white" />
			</div>
			<div>
				<h1 class="font-display font-extrabold text-xl tracking-tight text-slate-900 leading-tight">
					Frontier <span class="text-primary-600">Fund</span>
				</h1>
				<p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vertical OS</p>
			</div>
		</a>
		<button
			onclick={onToggle}
			class={cn(
				'p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all duration-300',
				!isOpen && 'fixed left-5 top-5 bg-white border border-slate-100 shadow-lg'
			)}
		>
			{#if isOpen}
				<PanelLeftClose class="w-5 h-5" />
			{:else}
				<PanelLeftOpen class="w-5 h-5" />
			{/if}
		</button>
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 overflow-y-auto p-4 space-y-8">
		<!-- Primary Actions -->
		<div class="space-y-1">
			<button
				onclick={() => goto('/building')}
				class={cn(
					'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group',
					!onFloorPage
						? 'bg-primary-50 text-primary-900'
						: 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
					!isOpen && 'justify-center px-0'
				)}
				title="Tower Overview"
			>
				<LayoutDashboard
					class={cn(
						'w-5 h-5 flex-shrink-0',
						!onFloorPage ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'
					)}
				/>
				{#if isOpen}
					<span class="font-bold text-sm whitespace-nowrap">Tower Overview</span>
				{/if}
				{#if isOpen && !onFloorPage}
					<ChevronRight class="w-4 h-4 ml-auto" />
				{/if}
			</button>
			<button
				onclick={() => goto('/admin')}
				class={cn(
					'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 group',
					!isOpen && 'justify-center px-0'
				)}
				title="Administration"
			>
				<Settings class="w-5 h-5 flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
				{#if isOpen}
					<span class="font-bold text-sm whitespace-nowrap">Administration</span>
				{/if}
			</button>
		</div>

		<!-- Floor Directory -->
		<div class={cn('transition-opacity duration-300', !isOpen && 'opacity-0 pointer-events-none h-0')}>
			<div class="px-4 mb-4 flex items-center justify-between">
				<h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
					Floors Directory
				</h3>
				<Layers class="w-3 h-3 text-slate-300" />
			</div>

			<div class="px-2 mb-4">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
					<input
						type="text"
						placeholder="Search floors..."
						bind:value={searchQuery}
						class="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
					/>
				</div>
			</div>

			<div class="space-y-1">
				{#each filteredFloors as floor (floor.id)}
					<button
						onclick={() => goto(`/floor/${floor.id}`)}
						class={cn(
							'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group',
							currentFloorId === floor.id
								? 'bg-slate-900 text-white'
								: 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
						)}
					>
						<span
							class={cn(
								'text-[10px] font-black w-6 text-center flex-shrink-0',
								currentFloorId === floor.id ? 'text-primary-400' : 'text-slate-300'
							)}
						>
							{floor.floor_number.toString().padStart(2, '0')}
						</span>
						<span class="font-bold text-xs truncate">{floor.name}</span>
						{#if currentFloorId === floor.id}
							<div
								class="w-1.5 h-1.5 rounded-full bg-primary-500 ml-auto animate-pulse flex-shrink-0"
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Collapsed Floor Indicators -->
		{#if !isOpen}
			<div class="space-y-4 flex flex-col items-center pt-4">
				<div class="w-8 h-[1px] bg-slate-100"></div>
				<ArrowLeftRight class="w-4 h-4 text-slate-300" />
				<div class="space-y-2">
					{#each floors.slice(0, 5) as f (f.id)}
						<div
							class={cn(
								'w-2 h-2 rounded-full',
								currentFloorId === f.id ? 'bg-primary-500' : 'bg-slate-100'
							)}
						></div>
					{/each}
				</div>
			</div>
		{/if}
	</nav>

	<!-- Profile Section -->
	<div class="p-4 border-t border-slate-50">
		<div
			class={cn(
				'p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100 mb-2 transition-all duration-300',
				!isOpen && 'p-2 bg-transparent border-none'
			)}
		>
			<div
				class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm"
			>
				<User class="w-5 h-5 text-slate-400" />
			</div>
			{#if isOpen}
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black text-slate-900 truncate">Resident Profile</div>
					<div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
						Approved Member
					</div>
				</div>
			{/if}
		</div>
		<button
			onclick={handleLogout}
			class={cn(
				'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all duration-300 group',
				!isOpen && 'justify-center px-0'
			)}
			title="Terminate Session"
		>
			<LogOut class="w-4 h-4 text-red-400 group-hover:text-red-600 flex-shrink-0" />
			{#if isOpen}
				<span class="font-bold text-xs whitespace-nowrap">Log Out</span>
			{/if}
		</button>
	</div>
</aside>
