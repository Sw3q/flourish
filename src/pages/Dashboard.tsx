import { Users, UserPlus, BadgeDollarSign, RotateCcw, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import ProposalsList from '../components/ProposalsList';
import { useDashboardData } from '../hooks/useDashboardData';
import { useHypercerts } from '../hooks/useHypercerts';

export default function Dashboard() {
    const {
        currentUser,
        members,
        votingPower,
        fundBalance,
        monthlyBurnRate,
        loading,
        categoryDelegations,
        updateAtProtoCredentials,
        delegateVote,
        delegateVoteForCategory,
        getVotingPower,
        refreshData,
    } = useDashboardData();
    const { linkAtProtoIdentity, resolveHandle, error: hypercertError } = useHypercerts();
    const [handle, setHandle] = useState(currentUser?.atproto_handle || '');
    const [appPassword, setAppPassword] = useState(currentUser?.atproto_app_password || '');
    const [linking, setLinking] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !handle.trim() || !appPassword.trim()) return;
        setLinking(true);
        setSuccessMessage(null);

        // First, resolve handle to DID if not already present
        let did: string | undefined = currentUser.atproto_did;
        if (!did) {
            const resolved = await resolveHandle(handle.trim());
            did = resolved ?? undefined;
            if (did) {
                await linkAtProtoIdentity(currentUser.id, did);
            }
        }

        const success = await updateAtProtoCredentials(handle.trim(), appPassword.trim());
        if (success) {
            setSuccessMessage('Credentials saved successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
            await refreshData();
        }
        setLinking(false);
    };

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
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 md:w-48 relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-green-100 rounded-full mix-blend-multiply opacity-50"></div>
                        <div className="flex items-center text-slate-500 text-sm font-medium mb-1 relative z-10">
                            <BadgeDollarSign className="w-4 h-4 mr-2 text-green-600" /> Virtual Pot
                        </div>
                        <div className="text-2xl font-bold text-slate-900 relative z-10">${fundBalance.toFixed(2)}</div>
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

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center">
                            <Link2 className="w-5 h-5 mr-2 text-primary-500" />
                            Linked Identities
                        </h2>
                        <p className="text-slate-500 text-sm mb-6">
                            Connect your ATProto (Bluesky) identity to receive Hypercerts for your impact.
                        </p>

                        {currentUser?.atproto_handle && currentUser?.atproto_app_password ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Connected Handle</div>
                                        <div className="text-slate-900 font-medium text-sm truncate">
                                            {currentUser.atproto_handle}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex-shrink-0 flex items-center justify-center ml-2">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setHandle(currentUser.atproto_handle || '');
                                        setAppPassword(currentUser.atproto_app_password || '');
                                        updateAtProtoCredentials('', '');
                                    }}
                                    className="text-xs text-slate-400 hover:text-primary-600 underline font-medium"
                                >
                                    Update Credentials
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveCredentials} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase">Bluesky Handle</label>
                                    <input
                                        type="text"
                                        required
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        placeholder="alice.bsky.social"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase">App Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={appPassword}
                                        onChange={(e) => setAppPassword(e.target.value)}
                                        placeholder="abcd-efgh-ijkl-mnop"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={linking || !handle.trim() || !appPassword.trim()}
                                    className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    {linking ? 'Saving...' : 'Secure & Save Credentials'}
                                </button>
                                {successMessage && (
                                    <p className="mt-2 text-xs text-green-600 font-medium text-center">{successMessage}</p>
                                )}
                                {hypercertError && (
                                    <p className="mt-2 text-xs text-red-500 font-medium text-center">{hypercertError}</p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
