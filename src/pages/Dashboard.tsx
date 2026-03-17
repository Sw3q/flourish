import { UserPlus, BadgeDollarSign, RotateCcw, Check, ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProposalsList from '../components/ProposalsList';
import { useDashboardData } from '../hooks/useDashboardData';
import { useHypercerts } from '../hooks/useHypercerts';

export default function Dashboard() {
    const { floorId: floorIdParam } = useParams();
    const {
        currentUser,
        members,
        votingPower,
        fundBalance,
        monthlyBurnRate,
        loading,
        proposalDelegations,
        updateAtProtoCredentials,
        delegateVote,
        delegateVoteForProposal,
        getVotingPower,
        refreshData,
        floorName,
    } = useDashboardData(floorIdParam);

    const isCurrentFloor = !floorIdParam || floorIdParam === (currentUser as any)?.floor_id;
    const { linkAtProtoIdentity, resolveHandle } = useHypercerts();
    const [handle, setHandle] = useState(currentUser?.atproto_handle || '');
    const [appPassword, setAppPassword] = useState(currentUser?.atproto_app_password || '');
    const [linking, setLinking] = useState(false);

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !handle.trim() || !appPassword.trim()) return;
        setLinking(true);

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
            await refreshData();
        }
        setLinking(false);
    };

    const handleDelegate = async (targetUserId: string | null) => {
        await delegateVote(targetUserId);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-500/10 blur-[80px] rounded-full animate-pulse"></div>
                    <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin relative z-10"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 grain">
            
            {/* Context Awareness Bar */}
            {!isCurrentFloor && (
                <div className="bg-slate-900 text-white p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border border-white/10 group">
                    <div className="flex items-center text-sm font-bold tracking-tight px-4">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mr-3 animate-pulse"></div>
                        VIRTUAL PERSPECTIVE: YOU ARE VIEWING {floorName?.toUpperCase()}
                    </div>
                    <Link
                        to={`/floor/${(currentUser as any)?.floor_id}`}
                        className="px-6 py-2 bg-white text-slate-900 text-xs font-black rounded-full hover:bg-primary-50 transition-all flex items-center gap-2 uppercase tracking-widest shadow-lg"
                    >
                        Return to Personal Floor
                        <ArrowLeft className="w-3 h-3" />
                    </Link>
                </div>
            )}

            {/* Premium Header & High-Impact Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 flex flex-col gap-8">
                    <header className="border-b border-slate-200 pb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-[2px] bg-primary-600"></div>
                            <span className="text-primary-600 font-bold tracking-[0.3em] uppercase text-[10px]">Floor Identity</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[0.95] text-slate-900 mb-6">
                            {floorName || 'Operational'} <br />
                            <span className="text-slate-400">Dashboard.</span>
                        </h1>
                        <div className="flex items-center gap-4 text-slate-500 font-medium italic">
                            <span>Welcome, {currentUser?.email.split('@')[0]}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </header>

                    {/* Dynamic Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-primary-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 animate-float">
                                <BadgeDollarSign className="w-32 h-32" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 block">Liquidity Pool</span>
                            <div className="text-6xl font-display font-extrabold text-slate-900 mb-2">
                                ${fundBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                <span className="text-xl align-top text-slate-300 ml-1">.{(fundBalance % 1).toFixed(2).split('.')[1]}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-full uppercase tracking-widest">Available</div>
                            </div>
                        </div>

                        <div className="grid grid-rows-2 gap-6">
                            <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white flex flex-col justify-between group overflow-hidden relative hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Voting Weight</span>
                                    <ShieldCheck className="w-5 h-5 opacity-40 group-hover:rotate-12 transition-transform" />
                                </div>
                                <div className="relative z-10">
                                    <div className="text-5xl font-display font-extrabold mb-1">{votingPower} units</div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Current Influence</div>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col justify-between hover:border-slate-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Burn</span>
                                    <RotateCcw className="w-5 h-5 text-slate-200 group-hover:rotate-180 transition-transform duration-1000" />
                                </div>
                                <div>
                                    <div className="text-4xl font-display font-extrabold text-slate-900 mb-1">${monthlyBurnRate.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Committed Expenses</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6 pt-12 lg:pt-0">
                    {/* Delegation Module */}
                    <div className="bg-[#FAF9F6] border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col h-full relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-100/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-display font-extrabold tracking-tight">Trust Network</h2>
                            <UserPlus className="w-5 h-5 text-primary-600" />
                        </div>
                        
                        <p className="text-slate-500 text-sm leading-relaxed mb-10">
                            Empower a peer to act on your behalf across all floor initiatives.
                        </p>

                        <div className="space-y-4 flex-1">
                            {currentUser?.delegated_to && (
                                <div className="p-6 bg-white border border-primary-100 rounded-[2rem] shadow-sm mb-6">
                                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-[0.2em] mb-3 block">Primary Delegate</span>
                                    <div className="flex items-center justify-between">
                                        <div className="font-display font-bold text-lg text-slate-900">
                                            {members.find(m => m.id === currentUser.delegated_to)?.email.split('@')[0] || 'Peer'}
                                        </div>
                                        {isCurrentFloor && (
                                            <button
                                                onClick={() => handleDelegate(null)}
                                                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-100 transition-colors"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!currentUser?.delegated_to && (
                                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                    {members.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 font-medium text-xs uppercase tracking-widest">No active peers found.</div>
                                    ) : (
                                        members.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => handleDelegate(member.id)}
                                                disabled={!isCurrentFloor}
                                                className="w-full text-left p-5 bg-white border border-slate-100 rounded-2xl hover:border-primary-200 transition-all flex items-center justify-between group/btn disabled:opacity-40"
                                            >
                                                <span className="font-bold text-slate-700 text-sm">{member.email.split('@')[0]}</span>
                                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover/btn:text-primary-600 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Identity Linkage */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-transparent opacity-50"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-2xl font-display font-extrabold tracking-tight mb-8">Impact ID</h2>
                            
                            {currentUser?.atproto_handle ? (
                                <div className="space-y-6">
                                    <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1">ATProto Linked</div>
                                            <div className="font-medium text-sm truncate opacity-90">{currentUser.atproto_handle}</div>
                                        </div>
                                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/20">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setHandle(currentUser.atproto_handle || '');
                                            setAppPassword(currentUser.atproto_app_password || '');
                                            updateAtProtoCredentials('', '');
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                    >
                                        Update Identity
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveCredentials} className="space-y-4">
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            required
                                            value={handle}
                                            onChange={(e) => setHandle(e.target.value)}
                                            placeholder="Bluesky Handle"
                                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:ring-1 focus:ring-primary-400 outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            type="password"
                                            required
                                            value={appPassword}
                                            onChange={(e) => setAppPassword(e.target.value)}
                                            placeholder="App Password"
                                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:ring-1 focus:ring-primary-400 outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={linking || !handle.trim() || !appPassword.trim()}
                                        className="w-full py-3 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary-50 transition-colors disabled:opacity-20"
                                    >
                                        {linking ? 'Verifying...' : 'Link AT Protocol'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Activities Section */}
            <div className="space-y-8">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-6">
                    <h2 className="text-4xl font-display font-extrabold tracking-tight">Governance Deck</h2>
                    <span className="text-xs font-bold text-slate-400 tracking-widest">ACTIVE PROPOSALS</span>
                </div>
                
                <div className="relative">
                    {currentUser && (
                        <ProposalsList
                            currentUserId={currentUser.id}
                            currentFloorId={floorIdParam || (currentUser as any).floor_id}
                            members={members}
                            proposalDelegations={proposalDelegations}
                            globalDelegatedTo={currentUser.delegated_to}
                            onDelegateProposal={isCurrentFloor ? delegateVoteForProposal : async () => false}
                            getVotingPower={getVotingPower}
                            disabled={!isCurrentFloor}
                        />
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
