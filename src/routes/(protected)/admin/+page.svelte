<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { CONFIG } from '$lib/config';
	import type { AuthContext } from '$lib/types';
	import { Check, X, ShieldAlert, UserCheck, Shield, ShieldOff } from 'lucide-svelte';

	const auth = getContext<AuthContext>('auth');

	type AdminProfile = {
		id: string;
		email: string;
		role: 'admin' | 'member' | 'super_admin';
		is_approved: boolean;
	};

	type Category = { id: string; name: string; color_theme: string };

	type RecurringExpense = {
		id: string;
		title: string;
		amount: number;
		category_id: string;
		floor_id?: string;
		is_active: boolean;
		created_at: string;
		categories?: { name: string; color_theme: string };
	};

	let users = $state<AdminProfile[]>([]);
	let categories = $state<Category[]>([]);
	let recurringExpenses = $state<RecurringExpense[]>([]);
	let fundBalance = $state(0);
	let loading = $state(true);
	let isAdmin = $state(false);

	// Form states
	let newCategoryName = $state('');
	let newCategoryColor = $state('blue');
	let depositAmount = $state('');
	let newExpenseTitle = $state('');
	let newExpenseAmount = $state('');
	let newExpenseCategory = $state('');
	let editingExpenseId = $state<string | null>(null);
	let editExpenseTitle = $state('');
	let editExpenseAmount = $state('');
	let editExpenseCategory = $state('');

	let pendingUsers = $derived(users.filter((u) => !u.is_approved && u.role !== 'admin'));
	let approvedUsers = $derived(users.filter((u) => u.is_approved || u.role === 'admin'));

	const themeClasses: Record<string, string> = {
		emerald: 'bg-emerald-100 text-emerald-700',
		rose: 'bg-rose-100 text-rose-700',
		blue: 'bg-blue-100 text-blue-700',
		amber: 'bg-amber-100 text-amber-700',
		purple: 'bg-purple-100 text-purple-700'
	};

	function getThemeClass(theme: string) {
		return themeClasses[theme] || themeClasses.blue;
	}

	async function fetchData() {
		const currentFloorId = auth.currentFloorId;
		const userRole = auth.userRole;

		let usersQ = supabase.from('profiles').select('*').order('email', { ascending: true });
		let catsQ = supabase.from('categories').select('*').order('name');
		let expQ = supabase.from('recurring_expenses').select('*, categories(name, color_theme)').order('created_at', { ascending: false });
		let txQ = supabase.from('transactions').select('amount, type');

		if (userRole !== 'super_admin' && currentFloorId) {
			usersQ = usersQ.eq('floor_id', currentFloorId) as any;
			catsQ = catsQ.eq('floor_id', currentFloorId) as any;
			expQ = expQ.eq('floor_id', currentFloorId) as any;
			txQ = txQ.eq('floor_id', currentFloorId) as any;
		}

		const [usersRes, catsRes, expRes, txRes] = await Promise.all([
			usersQ, catsQ, expQ, txQ
		]);

		if (usersRes.data) users = usersRes.data as AdminProfile[];
		if (catsRes.data) categories = catsRes.data as Category[];
		if (expRes.data) recurringExpenses = expRes.data as RecurringExpense[];
		if (txRes.data) {
			fundBalance = txRes.data.reduce((acc: number, curr: any) =>
				curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);
		}
		loading = false;
	}

	onMount(async () => {
		if (CONFIG.BYPASS_AUTH) {
			isAdmin = true;
			await fetchData();
			return;
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) { loading = false; return; }

		const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (data?.role === 'admin' || data?.role === 'super_admin') {
			isAdmin = true;
			await fetchData();
		} else {
			loading = false;
		}
	});

	async function approveUser(userId: string) {
		const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
		if (!error) users = users.map((u) => u.id === userId ? { ...u, is_approved: true } : u);
	}

	async function revokeUser(userId: string) {
		const { error } = await supabase.from('profiles').update({ is_approved: false }).eq('id', userId);
		if (!error) users = users.map((u) => u.id === userId ? { ...u, is_approved: false } : u);
	}

	async function promoteUser(userId: string) {
		const user = users.find((u) => u.id === userId);
		if (!user || user.role === 'super_admin') return;
		const nextRole = user.role === 'admin' ? 'super_admin' : 'admin';
		const { error } = await supabase.from('profiles').update({ role: nextRole, is_approved: true }).eq('id', userId);
		if (!error) users = users.map((u) => u.id === userId ? { ...u, role: nextRole, is_approved: true } : u);
	}

	async function demoteUser(userId: string) {
		const user = users.find((u) => u.id === userId);
		if (!user || user.role === 'member') return;
		const nextRole = user.role === 'super_admin' ? 'admin' : 'member';
		const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('id', userId);
		if (!error) users = users.map((u) => u.id === userId ? { ...u, role: nextRole } : u);
	}

	async function handleCreateCategory(e: SubmitEvent) {
		e.preventDefault();
		if (!newCategoryName.trim() || !auth.currentFloorId) return;

		const { data, error } = await supabase
			.from('categories')
			.insert([{ name: newCategoryName, color_theme: newCategoryColor, floor_id: auth.currentFloorId }])
			.select().single();

		if (data && !error) {
			categories = [...categories, data];
			newCategoryName = '';
		}
	}

	async function handleAddFunds(e: SubmitEvent) {
		e.preventDefault();
		const amount = Number(depositAmount);
		if (isNaN(amount) || amount <= 0 || !auth.currentFloorId) return;

		const { error } = await supabase.from('transactions').insert([{
			amount, type: 'deposit', description: 'Admin Manual Deposit', floor_id: auth.currentFloorId
		}]);

		if (!error) {
			fundBalance += amount;
			depositAmount = '';
		}
	}

	async function handleCreateExpense(e: SubmitEvent) {
		e.preventDefault();
		const amount = Number(newExpenseAmount);
		if (!newExpenseTitle.trim() || isNaN(amount) || amount <= 0 || !newExpenseCategory || !auth.currentFloorId) return;

		const { data, error } = await supabase
			.from('recurring_expenses')
			.insert([{ title: newExpenseTitle, amount, category_id: newExpenseCategory, floor_id: auth.currentFloorId }])
			.select('*, categories(name, color_theme)').single();

		if (data && !error) {
			recurringExpenses = [data, ...recurringExpenses];
			newExpenseTitle = ''; newExpenseAmount = ''; newExpenseCategory = '';
		}
	}

	function startEditExpense(exp: RecurringExpense) {
		editingExpenseId = exp.id;
		editExpenseTitle = exp.title;
		editExpenseAmount = exp.amount.toString();
		editExpenseCategory = exp.category_id;
	}

	async function handleUpdateExpense(e: SubmitEvent, expenseId: string) {
		e.preventDefault();
		const amount = Number(editExpenseAmount);
		if (!editExpenseTitle.trim() || isNaN(amount) || amount <= 0 || !editExpenseCategory) return;

		const { data, error } = await supabase
			.from('recurring_expenses')
			.update({ title: editExpenseTitle, amount, category_id: editExpenseCategory })
			.eq('id', expenseId)
			.select('*, categories(name, color_theme)').single();

		if (data && !error) {
			recurringExpenses = recurringExpenses.map((e) => e.id === expenseId ? data : e);
			editingExpenseId = null;
		}
	}

	async function toggleExpense(expenseId: string, isActive: boolean) {
		const { error } = await supabase.from('recurring_expenses').update({ is_active: isActive }).eq('id', expenseId);
		if (!error) recurringExpenses = recurringExpenses.map((e) => e.id === expenseId ? { ...e, is_active: isActive } : e);
	}

	async function processExpense(exp: RecurringExpense) {
		const { error } = await supabase.from('transactions').insert([{
			amount: exp.amount,
			type: 'withdrawal',
			description: `Recurring Expense: ${exp.title}`,
			floor_id: exp.floor_id || auth.currentFloorId
		}]);
		if (!error) fundBalance -= exp.amount;
	}
</script>

{#if loading}
	<div class="p-8">Loading administration panel...</div>
{:else if !isAdmin}
	<div class="flex flex-col items-center justify-center py-20 text-center">
		<ShieldAlert class="w-16 h-16 text-danger-400 mb-4" />
		<h2 class="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
		<p class="text-slate-500">You must be an administrator to view this page.</p>
	</div>
{:else}
	<div class="space-y-8 animate-slide-up">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
				<p class="text-slate-500 text-sm mt-1">Manage platform access and master settings.</p>
			</div>
			<div
				class="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold flex items-center"
			>
				<UserCheck class="w-4 h-4 mr-2" />
				Master User Active
			</div>
		</div>

		{#if pendingUsers.length > 0}
			<section>
				<h2 class="text-lg font-semibold text-slate-900 mb-4 flex items-center">
					<span class="w-2 h-2 rounded-full bg-accent-400 mr-2"></span>
					Pending Approvals ({pendingUsers.length})
				</h2>
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each pendingUsers as user (user.id)}
						<div
							class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
						>
							<div class="mb-4">
								<p class="font-medium text-slate-900 truncate" title={user.email}>{user.email}</p>
								<p class="text-xs text-slate-400 mt-1">Requested access recently</p>
							</div>
							<button
								onclick={() => approveUser(user.id)}
								class="w-full flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 rounded-xl font-medium transition-colors"
							>
								<Check class="w-4 h-4 mr-2" />
								Approve Member
							</button>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section>
			<h2 class="text-lg font-semibold text-slate-900 mb-4">Active Members</h2>
			<div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
				<table class="min-w-full divide-y divide-slate-100">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-slate-100">
						{#each approvedUsers as user (user.id)}
							<tr class="hover:bg-slate-50/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-slate-900">{user.email}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {user.role === 'super_admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : user.role === 'admin' ? 'bg-primary-100 text-primary-800' : 'bg-emerald-100 text-emerald-800'}">
										{user.role === 'super_admin' ? 'Super Admin' : user.role}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div class="flex items-center justify-end gap-3">
										{#if user.role !== 'super_admin'}
											<button
												onclick={() => promoteUser(user.id)}
												class="text-primary-600 hover:text-primary-800 flex items-center"
												title={user.role === 'member' ? 'Promote to Admin' : 'Promote to Super Admin'}
											>
												<Shield class="w-4 h-4 mr-1" />
												Promote
											</button>
										{/if}
										{#if user.role !== 'member'}
											<button
												onclick={() => demoteUser(user.id)}
												class="text-amber-600 hover:text-amber-800 flex items-center"
											>
												<ShieldOff class="w-4 h-4 mr-1" />
												Demote
											</button>
										{/if}
										<button
											onclick={() => revokeUser(user.id)}
											class="text-danger-400 hover:text-red-600 flex items-center"
										>
											<X class="w-4 h-4 mr-1" />
											Revoke
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<div class="grid md:grid-cols-2 gap-8">
			<section>
				<h2 class="text-lg font-semibold text-slate-900 mb-4">Pot Balance</h2>
				<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
					<div class="text-sm text-slate-500 mb-1">Current Virtual Balance</div>
					<div class="text-4xl font-bold text-success-400">${fundBalance.toFixed(2)}</div>
				</div>
				<form onsubmit={handleAddFunds} class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
					<div class="flex-1">
						<label class="block text-xs font-medium text-slate-500 uppercase mb-2">Add Monthly Funds</label>
						<div class="relative">
							<span class="absolute left-4 top-3 text-slate-400">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								bind:value={depositAmount}
								class="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
								placeholder="200.00"
							/>
						</div>
					</div>
					<button type="submit" class="self-end px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors">
						Deposit
					</button>
				</form>
			</section>

			<section>
				<h2 class="text-lg font-semibold text-slate-900 mb-4">Proposal Categories</h2>
				<div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
					{#if categories.length === 0}
						<div class="p-6 text-center text-sm text-slate-500">No categories defined yet.</div>
					{:else}
						<ul class="divide-y divide-slate-100">
							{#each categories as cat (cat.id)}
								<li class="p-4 flex items-center justify-between hover:bg-slate-50">
									<span class="font-medium text-slate-800">{cat.name}</span>
									<span class="px-2 py-1 text-xs font-semibold rounded-full {getThemeClass(cat.color_theme)}">
										{cat.color_theme} theme
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<form onsubmit={handleCreateCategory} class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
					<label class="block text-xs font-medium text-slate-500 uppercase mb-2">Create New Category</label>
					<div class="flex gap-4">
						<input
							type="text"
							bind:value={newCategoryName}
							placeholder="e.g. Snacks, Events"
							class="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
						/>
						<select bind:value={newCategoryColor} class="px-4 py-2 border border-slate-200 rounded-xl outline-none">
							<option value="blue">Blue</option>
							<option value="emerald">Emerald</option>
							<option value="amber">Amber</option>
							<option value="rose">Rose</option>
							<option value="purple">Purple</option>
						</select>
						<button type="submit" class="px-6 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">
							Add
						</button>
					</div>
				</form>
			</section>
		</div>

		<section>
			<h2 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-rose-500"></span>
				Manage Recurring Expenses
			</h2>

			<div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
				{#if recurringExpenses.length === 0}
					<div class="p-6 text-center text-sm text-slate-500">No recurring expenses defined yet.</div>
				{:else}
					<ul class="divide-y divide-slate-100">
						{#each recurringExpenses as exp (exp.id)}
							<li class="border-b last:border-b-0 border-slate-100 flex p-0">
								{#if editingExpenseId === exp.id}
									<form onsubmit={(e) => handleUpdateExpense(e, exp.id)} class="p-4 flex flex-col xl:flex-row gap-4 w-full items-start xl:items-center bg-slate-50">
										<input type="text" bind:value={editExpenseTitle} required placeholder="Title" class="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full xl:w-auto" />
										<div class="relative w-full xl:w-32">
											<span class="absolute left-3 top-2 text-slate-400 text-sm">$</span>
											<input type="number" min="0" step="0.01" bind:value={editExpenseAmount} required placeholder="Amount" class="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
										</div>
										<select bind:value={editExpenseCategory} required class="w-full xl:w-48 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">
											{#each categories as cat (cat.id)}
												<option value={cat.id}>{cat.name}</option>
											{/each}
										</select>
										<div class="flex gap-2 w-full xl:w-auto">
											<button type="button" onclick={() => (editingExpenseId = null)} class="flex-1 xl:flex-none px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-white text-slate-600 transition-colors">Cancel</button>
											<button type="submit" class="flex-1 xl:flex-none px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Save</button>
										</div>
									</form>
								{:else}
									<div class="p-4 flex flex-col xl:flex-row xl:items-center justify-between hover:bg-slate-50 gap-4 w-full">
										<div>
											<div class="flex items-center gap-2">
												<span class="font-medium text-slate-800">{exp.title}</span>
												<span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md {exp.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
													{exp.is_active ? 'Active' : 'Inactive'}
												</span>
											</div>
											<div class="text-sm text-slate-500 mt-1">
												${Number(exp.amount).toFixed(2)} / mo • {exp.categories?.name}
											</div>
										</div>
										<div class="flex items-center gap-2">
											<button onclick={() => startEditExpense(exp)} class="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">Edit</button>
											<button onclick={() => toggleExpense(exp.id, !exp.is_active)} class="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-white text-slate-600 transition-colors">
												{exp.is_active ? 'Disable' : 'Enable'}
											</button>
											<button onclick={() => processExpense(exp)} disabled={!exp.is_active} class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {exp.is_active ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}">
												Process Payment
											</button>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<form onsubmit={handleCreateExpense} class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
				<label class="block text-xs font-medium text-slate-500 uppercase">Create Recurring Expense</label>
				<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
					<input type="text" bind:value={newExpenseTitle} placeholder="Expense Title" class="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full" />
					<div class="relative">
						<span class="absolute left-4 top-2.5 text-slate-400">$</span>
						<input type="number" min="0" step="0.01" bind:value={newExpenseAmount} placeholder="Amount" class="pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full" />
					</div>
				</div>
				<div class="flex gap-4">
					<select bind:value={newExpenseCategory} class="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white">
						<option value="" disabled>Select Category</option>
						{#each categories as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
					<button type="submit" disabled={!newExpenseCategory} class="px-6 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-primary-300 disabled:cursor-not-allowed">
						Add
					</button>
				</div>
			</form>
		</section>
	</div>
{/if}
