import { useState } from 'react';
import { Check, X, ShieldAlert, UserCheck } from 'lucide-react';
import { useAdminActions } from '../hooks/useAdminActions';

export default function AdminDashboard() {
    const {
        users,
        categories,
        fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        approveUser,
        revokeUser
    } = useAdminActions();

    // Form states
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('blue');
    const [depositAmount, setDepositAmount] = useState('');

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

    const handleApprove = async (userId: string) => {
        await approveUser(userId);
    };

    const handleRevoke = async (userId: string) => {
        await revokeUser(userId);
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

    const pendingUsers = users.filter(u => !u.is_approved && u.role !== 'admin');
    const approvedUsers = users.filter(u => u.is_approved || u.role === 'admin');

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
                            {approvedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
                                            ? 'bg-primary-100 text-primary-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {user.role !== 'admin' && (
                                            <button
                                                onClick={() => handleRevoke(user.id)}
                                                className="text-danger-500 hover:text-danger-700 flex items-center justify-end w-full"
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Revoke Access
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Communal Pot</h2>
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
                                {categories.map(cat => (
                                    <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                        <span className="font-medium text-slate-800">{cat.name}</span>
                                        <span className={`px-2 py-1 bg-${cat.color_theme}-100 text-${cat.color_theme}-700 text-xs font-semibold rounded-full`}>
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
        </div>
    );
}
