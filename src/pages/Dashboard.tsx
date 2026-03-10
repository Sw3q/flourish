import { Users, UserPlus, BadgeDollarSign, RotateCcw } from 'lucide-react';
import ProposalsList from '../components/ProposalsList';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Dashboard() {
    const {
        currentUser,
        members,
        votingPower,
        fundBalance,
        monthlyBurnRate,
        loading,
        categoryDelegations,
        delegateVote,
        delegateVoteForCategory,
        getVotingPower,
    } = useDashboardData();

    const handleDelegate = async (targetUserId: string | null) => {
        await delegateVote(targetUserId);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome back,
                    </h1>
                    <p className="text-xl text-primary-600 font-medium mt-1">
                        {currentUser?.email.split('@')[0]}
                    </p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 md:w-48">
                        <div className="flex items-center text-slate-500 text-sm font-medium mb-1">
                            <BadgeDollarSign className="w-4 h-4 mr-2 text-green-600" /> Virtual Pot
                        </div>
                        <div className="text-2xl font-bold text-slate-900">${fundBalance.toFixed(2)}</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 md:w-48 relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-rose-100 rounded-full mix-blend-multiply opacity-50"></div>
                        <div className="flex items-center text-slate-500 text-sm font-medium mb-1 relative z-10">
                            <RotateCcw className="w-4 h-4 mr-2 text-rose-500" /> Recurring Expenses
                        </div>
                        <div className="text-2xl font-bold text-slate-900 relative z-10">
                            ${monthlyBurnRate.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 md:w-48 relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-primary-100 rounded-full mix-blend-multiply opacity-50"></div>
                        <div className="flex items-center text-slate-500 text-sm font-medium mb-1 relative z-10">
                            <Users className="w-4 h-4 mr-2 text-primary-500" /> Voting Power
                        </div>
                        <div className="text-2xl font-bold text-slate-900 relative z-10 flex items-baseline">
                            {votingPower} <span className="text-sm font-normal text-slate-500 ml-1">votes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    {currentUser && (
                        <ProposalsList
                            currentUserId={currentUser.id}
                            members={members}
                            categoryDelegations={categoryDelegations}
                            onDelegateCategory={delegateVoteForCategory}
                            getVotingPower={getVotingPower}
                        />
                    )}
                </div>

                <div className="md:col-span-1">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 p-6 rounded-3xl border border-primary-100/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-primary-200 rounded-full blur-2xl opacity-50"></div>

                        <h2 className="text-xl font-bold text-primary-900 mb-2 relative z-10 flex items-center">
                            <UserPlus className="w-5 h-5 mr-2" />
                            Global Delegation
                        </h2>
                        <p className="text-primary-700 text-sm mb-6 relative z-10">
                            Trust someone across all categories. You can also delegate per-proposal directly in each vote card below.
                        </p>

                        <div className="space-y-3 relative z-10">
                            {currentUser?.delegated_to && (
                                <div className="mb-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-primary-100">
                                    <div className="text-xs font-semibold text-primary-600 uppercase mb-1">Currently Delegating To:</div>
                                    <div className="text-slate-900 font-medium truncate">
                                        {members.find(m => m.id === currentUser.delegated_to)?.email.split('@')[0] || 'Unknown User'}
                                    </div>
                                    <button
                                        onClick={() => handleDelegate(null)}
                                        className="mt-3 text-xs font-medium text-red-500 hover:text-red-600 underline"
                                    >
                                        Revoke Global Delegation
                                    </button>
                                </div>
                            )}

                            {!currentUser?.delegated_to && members.length === 0 && (
                                <div className="text-sm text-slate-500 text-center py-4 bg-white/40 rounded-xl">
                                    No other approved members yet.
                                </div>
                            )}

                            {!currentUser?.delegated_to && members.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleDelegate(member.id)}
                                    className="w-full text-left p-3 bg-white hover:bg-white/80 transition-colors rounded-xl border border-primary-100/50 shadow-sm group flex justify-between items-center"
                                >
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700 truncate mr-2">
                                        {member.email.split('@')[0]}
                                    </span>
                                    <span className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        Delegate All
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
