import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, X, ShieldAlert, UserCheck, Shield, ShieldOff } from 'lucide-react';
import { useAdminActions, type RecurringExpense } from '../hooks/useAdminActions';

const getThemeClass = (theme: string) => {
    const classes: Record<string, string> = {
        emerald: 'bg-emerald-100 text-emerald-700',
        rose: 'bg-rose-100 text-rose-700',
        blue: 'bg-blue-100 text-blue-700',
        amber: 'bg-amber-100 text-amber-700',
        purple: 'bg-purple-100 text-purple-700',
    };
    return classes[theme] || classes.blue;
};

export default function AdminDashboard() {
    const { currentFloorId, userRole } = useOutletContext<{ currentFloorId: string | null; userRole: string }>();

    const {
        users,
        categories,
        recurringExpenses,
        fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        approveUser,
        revokeUser,
        promoteUser,
        demoteUser,
        createRecurringExpense,
        toggleRecurringExpense,
        updateRecurringExpense,
        processRecurringExpense,
    } = useAdminActions(currentFloorId, userRole);

    // Form states
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('blue');
    const [depositAmount, setDepositAmount] = useState('');
    const [newExpenseTitle, setNewExpenseTitle] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpenseCategory, setNewExpenseCategory] = useState('');

    // Edit recurring expense states
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editExpenseTitle, setEditExpenseTitle] = useState('');
    const [editExpenseAmount, setEditExpenseAmount] = useState('');
    const [editExpenseCategory, setEditExpenseCategory] = useState('');

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await createCategory(newCategoryName, newCategoryColor);
        if (success) {
            setNewCategoryName('');
        }
    };

    const handleAddFunds = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await addFunds(Number(depositAmount));
        if (success) {
            setDepositAmount('');
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await createRecurringExpense(newExpenseTitle, Number(newExpenseAmount), newExpenseCategory);
        if (success) {
            setNewExpenseTitle('');
            setNewExpenseAmount('');
            setNewExpenseCategory('');
        }
    };

    const handleApprove = async (userId: string) => {
        await approveUser(userId);
    };

    const handleRevoke = async (userId: string) => {
        await revokeUser(userId);
    };

    const handlePromote = async (userId: string) => {
        await promoteUser(userId);
    };
    
    const handleDemote = async (userId: string) => {
        await demoteUser(userId);
    };

    const startEditExpense = (expense: RecurringExpense) => {
        setEditingExpenseId(expense.id);
        setEditExpenseTitle(expense.title);
        setEditExpenseAmount(expense.amount.toString());
        setEditExpenseCategory(expense.category_id);
    };

    const handleUpdateExpense = async (e: React.FormEvent, expenseId: string) => {
        e.preventDefault();
        const success = await updateRecurringExpense(expenseId, editExpenseTitle, Number(editExpenseAmount), editExpenseCategory);
        if (success) {
            setEditingExpenseId(null);
        }
    };

    if (loading) return <div className="p-8">Loading administration panel...</div>;

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShieldAlert className="w-16 h-16 text-danger-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-500">You must be an administrator to view this page.</p>
            </div>
        );
    }

    const pendingUsers = users.filter((u: any) => !u.is_approved && u.role !== 'admin');
    const approvedUsers = users.filter((u: any) => u.is_approved || u.role === 'admin');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage platform access and master settings.</p>
                </div>
                <div className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold flex items-center">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Master User Active
                </div>
            </div>

            {pendingUsers.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-accent-500 mr-2"></span>
                        Pending Approvals ({pendingUsers.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="mb-4">
                                    <p className="font-medium text-slate-900 truncate" title={user.email}>{user.email}</p>
                                    <p className="text-xs text-slate-400 mt-1">Requested access recently</p>
                                </div>
                                <button
                                    onClick={() => handleApprove(user.id)}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 rounded-xl font-medium transition-colors"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Approve Member
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Members</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {approvedUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.role === 'super_admin' ? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-sm' :
                                            user.role === 'admin' ? 'bg-primary-100 text-primary-800' :
                                            'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {user.role === 'super_admin' ? 'Super Admin' : user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            {user.role !== 'super_admin' && (
                                                <button
                                                    onClick={() => handlePromote(user.id)}
                                                    className="text-primary-600 hover:text-primary-800 flex items-center"
                                                    title={user.role === 'member' ? 'Promote to Admin' : 'Promote to Super Admin'}
                                                >
                                                    <Shield className="w-4 h-4 mr-1" />
                                                    Promote
                                                </button>
                                            )}
                                            {user.role !== 'member' && (
                                                <button
                                                    onClick={() => handleDemote(user.id)}
                                                    className="text-amber-600 hover:text-amber-800 flex items-center"
                                                    title={user.role === 'super_admin' ? 'Demote to Admin' : 'Demote to Member'}
                                                >
                                                    <ShieldOff className="w-4 h-4 mr-1" />
                                                    Demote
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRevoke(user.id)}
                                                className="text-danger-500 hover:text-danger-700 flex items-center"
                                                title="Revoke Access"
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Revoke
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Pot Balance</h2>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
                        <div className="text-sm text-slate-500 mb-1">Current Virtual Balance</div>
                        <div className="text-4xl font-bold text-success-400">${fundBalance.toFixed(2)}</div>
                    </div>

                    <form onSubmit={handleAddFunds} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Add Monthly Funds</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-slate-400">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="200.00"
                                />
                            </div>
                        </div>
                        <button type="submit" className="self-end px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors">
                            Deposit
                        </button>
                    </form>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Proposal Categories</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
                        {categories.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500">No categories defined yet.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {categories.map((cat: any) => (
                                    <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                        <span className="font-medium text-slate-800">{cat.name}</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getThemeClass(cat.color_theme)}`}>
                                            {cat.color_theme} theme
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <form onSubmit={handleCreateCategory} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Create New Category</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g. Snacks, Events"
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <select
                                value={newCategoryColor}
                                onChange={(e) => setNewCategoryColor(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl outline-none"
                            >
                                <option value="blue">Blue</option>
                                <option value="emerald">Emerald</option>
                                <option value="amber">Amber</option>
                                <option value="rose">Rose</option>
                                <option value="purple">Purple</option>
                            </select>
                            <button type="submit" className="px-6 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">
                                Add
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Manage Recurring Expenses
                </h2>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
                    {(!recurringExpenses || recurringExpenses.length === 0) ? (
                        <div className="p-6 text-center text-sm text-slate-500">No recurring expenses defined yet.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recurringExpenses.map((exp: any) => (
                                <li key={exp.id} className="border-b last:border-b-0 border-slate-100 flex p-0">
                                    {editingExpenseId === exp.id ? (
                                        <form onSubmit={(e) => handleUpdateExpense(e, exp.id)} className="p-4 flex flex-col xl:flex-row gap-4 w-full items-start xl:items-center bg-slate-50">
                                            <input
                                                type="text"
                                                value={editExpenseTitle}
                                                onChange={(e) => setEditExpenseTitle(e.target.value)}
                                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full xl:w-auto"
                                                placeholder="Title"
                                                required
                                            />
                                            <div className="relative w-full xl:w-32">
                                                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={editExpenseAmount}
                                                    onChange={(e) => setEditExpenseAmount(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="Amount"
                                                    required
                                                />
                                            </div>
                                            <select
                                                value={editExpenseCategory}
                                                onChange={(e: any) => setEditExpenseCategory(e.target.value)}
                                                className="w-full xl:w-48 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                required
                                            >
                                                {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                            </select>
                                            <div className="flex gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                                                <button type="button" onClick={() => setEditingExpenseId(null)} className="flex-1 xl:flex-none px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-white text-slate-600 transition-colors">Cancel</button>
                                                <button type="submit" className="flex-1 xl:flex-none px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Save</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between hover:bg-slate-50 gap-4 w-full">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">{exp.title}</span>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${exp.is_active ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {exp.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-500 mt-1">
                                                    ${Number(exp.amount).toFixed(2)} / mo • {exp.categories?.name}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => startEditExpense(exp)}
                                                    className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => toggleRecurringExpense(exp.id, !exp.is_active)}
                                                    className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                                >
                                                    {exp.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => processRecurringExpense(exp)}
                                                    disabled={!exp.is_active}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${exp.is_active ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                >
                                                    Process Payment
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <form onSubmit={handleCreateExpense} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <label className="block text-xs font-medium text-slate-500 uppercase">Create Recurring Expense</label>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={newExpenseTitle}
                            onChange={(e) => setNewExpenseTitle(e.target.value)}
                            placeholder="Expense Title"
                            className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full"
                        />
                        <div className="relative">
                            <span className="absolute left-4 top-2.5 text-slate-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newExpenseAmount}
                                onChange={(e) => setNewExpenseAmount(e.target.value)}
                                placeholder="Amount"
                                className="pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={newExpenseCategory}
                            onChange={(e: any) => setNewExpenseCategory(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white"
                        >
                            <option value="" disabled>Select Category</option>
                            {categories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <button type="submit" disabled={!newExpenseCategory} className="px-6 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-primary-300 disabled:cursor-not-allowed">
                            Add
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
