import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Clock, ThumbsUp, ThumbsDown, CheckCircle2, Trash2, Users, ExternalLink, Award } from 'lucide-react';
import { useProposals, type Proposal } from '../hooks/useProposals';
import HypercertIssuanceModal from './HypercertIssuanceModal';
import type { Profile } from '../hooks/useDashboardData';

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Timer Sub-Component
// ─────────────────────────────────────────────────────────────────────────────
function ProposalTimer({ expiresAt, createdAt }: { expiresAt: string; createdAt: string }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [colorClass, setColorClass] = useState('text-green-600');
    const [bgClass, setBgClass] = useState('bg-green-50');

    const compute = useCallback(() => {
        const now = Date.now();
        const end = new Date(expiresAt).getTime();
        const start = new Date(createdAt).getTime();
        const totalMs = end - start;
        const remainingMs = end - now;

        if (remainingMs <= 0) {
            setTimeLeft('Expired');
            setColorClass('text-slate-400');
            setBgClass('bg-slate-100');
            return;
        }

        const pct = remainingMs / totalMs;
        if (pct > 0.5) {
            setColorClass('text-green-700');
            setBgClass('bg-green-50 border-green-200');
        } else if (pct > 0.25) {
            setColorClass('text-yellow-700');
            setBgClass('bg-yellow-50 border-yellow-200');
        } else {
            setColorClass('text-red-700');
            setBgClass('bg-red-50 border-red-200');
        }

        const days = Math.floor(remainingMs / 86400000);
        const hours = Math.floor((remainingMs % 86400000) / 3600000);
        const mins = Math.floor((remainingMs % 3600000) / 60000);

        if (days > 0) setTimeLeft(`${days}d ${hours}h left`);
        else if (hours > 0) setTimeLeft(`${hours}h ${mins}m left`);
        else setTimeLeft(`${mins}m left`);
    }, [expiresAt, createdAt]);

    useEffect(() => {
        compute();
        const interval = setInterval(compute, 60000);
        return () => clearInterval(interval);
    }, [compute]);

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${colorClass} ${bgClass}`}>
            <Clock className="w-3 h-3" />
            {timeLeft}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conviction Progress Sub-Component
// ─────────────────────────────────────────────────────────────────────────────
function ConvictionStatus({ quorumReachedAt }: { quorumReachedAt: string | null }) {
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!quorumReachedAt) {
            setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            const start = new Date(quorumReachedAt).getTime();
            const now = Date.now();
            const duration = 24 * 60 * 60 * 1000; // 24 hours
            const elapsed = now - start;
            const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
            setProgress(pct);

            const remaining = duration - elapsed;
            if (remaining > 0) {
                const hours = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                setTimeLeft(`${hours}h ${mins}m until pass`);
            } else {
                setTimeLeft('Passing soon...');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [quorumReachedAt]);

    if (!quorumReachedAt) return (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <Users className="w-3 h-3" />
            Waiting for Quorum...
        </div>
    );

    return (
        <div className="space-y-1.5 w-full">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-primary-600">
                <span>Conviction Building</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-primary-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="text-[10px] text-primary-500 font-medium">{timeLeft}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delegation Pills Sub-Component (shown inside each proposal card)
// ─────────────────────────────────────────────────────────────────────────────
function DelegationPills({
    categoryId,
    members,
    categoryDelegations,
    onDelegateCategory,
}: {
    categoryId: string;
    members: Profile[];
    categoryDelegations: Record<string, string>;
    onDelegateCategory: (categoryId: string, targetId: string | null) => Promise<boolean>;
}) {
    const activeDelegateId = categoryDelegations[categoryId] ?? null;

    const handleClick = async (memberId: string) => {
        if (activeDelegateId === memberId) {
            // Clicking the active delegate removes the category delegation
            await onDelegateCategory(categoryId, null);
        } else {
            await onDelegateCategory(categoryId, memberId);
        }
    };

    if (members.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Delegate:
                </span>
                {members.map(member => {
                    const name = member.email.split('@')[0];
                    const isActive = activeDelegateId === member.id;
                    return (
                        <button
                            key={member.id}
                            onClick={() => handleClick(member.id)}
                            title={isActive ? `Remove delegation from ${name}` : `Delegate this category to ${name}`}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${isActive
                                ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-500/30'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50'
                                }`}
                        >
                            {isActive && <span className="mr-1">✓</span>}
                            {name}
                        </button>
                    );
                })}
                {activeDelegateId && (
                    <span className="text-xs text-primary-500 font-medium ml-1">
                        — voting via {members.find(m => m.id === activeDelegateId)?.email.split('@')[0]}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Vote Button Sub-Component (shows per-category weight)
// ─────────────────────────────────────────────────────────────────────────────
function VoteButton({
    proposalId,
    categoryId,
    isYes,
    isActive,
    onVote,
    getVotingPower,
}: {
    proposalId: string;
    categoryId: string;
    isYes: boolean;
    isActive: boolean;
    onVote: (id: string, yes: boolean) => Promise<void>;
    getVotingPower: (categoryId: string) => Promise<number>;
}) {
    const [power, setPower] = useState<number | null>(null);

    useEffect(() => {
        getVotingPower(categoryId).then(setPower);
    }, [categoryId, getVotingPower]);

    return (
        <button
            onClick={() => onVote(proposalId, isYes)}
            title={isActive ? `Click to retract your ${isYes ? 'Yes' : 'No'} vote` : `Vote ${isYes ? 'Yes' : 'No'}`}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl font-medium transition-colors ${isActive
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-2 ring-offset-1 ring-green-400'
                : 'bg-slate-50 text-slate-600 hover:bg-green-100 hover:text-green-700 border border-slate-100'
                }`}
        >
            <ThumbsUp className={`w-4 h-4 mr-2 ${isActive ? 'animate-bounce' : ''}`} />
            Yes ({power ?? '...'})
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProposalsList Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProposalsList({
    currentUserId,
    members,
    categoryDelegations,
    onDelegateCategory,
    getVotingPower,
}: {
    currentUserId: string;
    members: Profile[];
    categoryDelegations: Record<string, string>;
    onDelegateCategory: (categoryId: string, targetId: string | null) => Promise<boolean>;
    getVotingPower: (categoryId: string) => Promise<number>;
}) {
    const {
        proposals,
        categories,
        userVotes,
        proposalVotes,
        participationMap,
        totalApprovedUsers,
        createProposal,
        castVote,
        deleteProposal,
        updateProposalHypercert,
    } = useProposals(currentUserId);

    // New Proposal Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDurationDays, setNewDurationDays] = useState('7'); // Default 7 days
    const [newCatId, setNewCatId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Hypercert issuance state
    const [issuingProposal, setIssuingProposal] = useState<Proposal | null>(null);

    const handleIssueHypercertSuccess = async (uri: string) => {
        if (!issuingProposal) return false;
        return await updateProposalHypercert(issuingProposal.id, uri);
    };

    const handleCreateProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const success = await createProposal(newTitle, newDesc, Number(newAmount), newCatId, Number(newDurationDays));
        if (success) {
            setIsCreating(false);
            setNewTitle('');
            setNewDesc('');
            setNewAmount('');
            setNewDurationDays('7');
            setNewCatId('');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
        }
        setSubmitting(false);
    };

    const handleVote = async (proposalId: string, isYes: boolean) => {
        await castVote(proposalId, isYes);
    };

    const handleDelete = async (proposalId: string) => {
        setDeletingId(proposalId);
        await deleteProposal(proposalId);
        setDeletingId(null);
    };

    const activeProposals = proposals.filter(p => p.status === 'active');
    const pastProposals = proposals.filter(p => p.status !== 'active');

    return (
        <div className="space-y-8 mt-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Proposals</h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                >
                    {isCreating ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isCreating ? 'Cancel' : 'New Proposal'}
                </button>
            </div>

            {/* Toast notification */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center animate-in slide-in-from-bottom-8 duration-500 z-50">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold">Proposal Submitted!</h4>
                        <p className="text-sm text-slate-300">Wait for the floor to vote.</p>
                    </div>
                </div>
            )}

            {/* New Proposal Form */}
            {isCreating && (
                <form onSubmit={handleCreateProposal} className="bg-white p-6 rounded-3xl border border-primary-200 shadow-xl shadow-primary-500/10 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Request Communal Funds</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Title</label>
                            <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. New Espresso Machine" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Category</label>
                            <select required value={newCatId} onChange={e => setNewCatId(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none">
                                <option value="" disabled>Select a predefined category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Description</label>
                            <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Why do we need this and where are we buying it from?"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Amount Requested ($)</label>
                            <input type="number" required min="1" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="150.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Duration (Days)</label>
                            <input type="number" required min="3" value={newDurationDays} onChange={e => setNewDurationDays(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="7" />
                        </div>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {submitting ? 'Submitting...' : 'Submit Proposal to Vote'}
                    </button>
                </form>
            )}

            {/* Active Proposals Grid */}
            <h3 className="text-lg font-semibold text-slate-500 flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2" /> Active Votes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
                {activeProposals.length === 0 && (
                    <div className="md:col-span-2 p-8 text-center text-slate-400 bg-white/50 border border-slate-200 border-dashed rounded-3xl">
                        No active proposals at the moment!
                    </div>
                )}

                {activeProposals.map(proposal => {
                    const catColor = proposal.categories?.color_theme || 'slate';
                    const votes = proposalVotes[proposal.id] || { yes: 0, total: 0 };
                    const threshold = totalApprovedUsers / 2;
                    const progress = Math.min(100, Math.round((votes.yes / Math.max(threshold, 1)) * 100)) || 0;
                    const isCreator = proposal.creator_id === currentUserId;

                    return (
                        <div key={proposal.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
                            {/* Category color progress bar */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-${catColor}-500/20`}></div>
                            <div className={`absolute top-0 left-0 h-1 bg-${catColor}-500 transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>

                            {/* Header row: category badge + amount + delete */}
                            <div className="flex justify-between items-start mb-3 mt-2">
                                <span className={`px-2.5 py-1 bg-${catColor}-50 text-${catColor}-700 text-xs font-bold uppercase tracking-wider rounded-lg`}>
                                    {proposal.categories?.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-slate-900">${proposal.amount}</span>
                                    {isCreator && (
                                        <button
                                            onClick={() => handleDelete(proposal.id)}
                                            disabled={deletingId === proposal.id}
                                            title="Delete your proposal"
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h4 className="text-xl font-bold text-slate-800 mb-2">{proposal.title}</h4>
                            <p className="text-slate-500 text-sm mb-4 flex-1 line-clamp-3">{proposal.description}</p>

                            <div className="mt-auto space-y-3">
                                {/* Meta row: proposer + timer */}
                                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                    <span>by {proposal.profiles?.email.split('@')[0]}</span>
                                    <ProposalTimer expiresAt={proposal.expires_at} createdAt={proposal.created_at} />
                                </div>

                                {/* Vote progress */}
                                <div className="text-xs text-slate-400 font-medium">{progress}% to threshold ({votes.yes}/{Math.ceil(threshold + 1)} yes needed)</div>

                                {/* Vote buttons */}
                                <div className="flex gap-3">
                                    <VoteButton
                                        proposalId={proposal.id}
                                        categoryId={proposal.category_id}
                                        isYes={true}
                                        isActive={userVotes[proposal.id] === true}
                                        onVote={handleVote}
                                        getVotingPower={getVotingPower}
                                    />
                                    <button
                                        onClick={() => handleVote(proposal.id, false)}
                                        title={userVotes[proposal.id] === false ? 'Click to retract your No vote' : 'Vote No'}
                                        className={`flex-1 flex items-center justify-center py-2.5 rounded-xl font-medium transition-colors ${userVotes[proposal.id] === false
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-offset-1 ring-red-400'
                                            : 'bg-slate-50 text-slate-600 hover:bg-red-100 hover:text-red-700 border border-slate-100'
                                            }`}
                                    >
                                        <ThumbsDown className="w-4 h-4 mr-2" />
                                        No
                                    </button>
                                </div>

                                {/* Conviction / Quorum Status */}
                                <div className="mt-2">
                                    <ConvictionStatus quorumReachedAt={proposal.quorum_reached_at} />
                                </div>

                                {/* Per-category delegation pills */}
                                <DelegationPills
                                    categoryId={proposal.category_id}
                                    members={members}
                                    categoryDelegations={categoryDelegations}
                                    onDelegateCategory={onDelegateCategory}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Past Proposals */}
            {pastProposals.length > 0 && (
                <div className="pt-8 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-500 mb-6">Past Proposals</h3>
                    <div className="space-y-4">
                        {pastProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-4">
                                    {proposal.status === 'passed'
                                        ? <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><Check className="w-5 h-5" /></div>
                                        : <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></div>
                                    }
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{proposal.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">
                                                {proposal.status === 'passed' ? '✓ Passed' : '✗ Rejected'} · {new Date(proposal.expires_at).toLocaleDateString()}
                                            </span>
                                            {proposal.hypercert_uri ? (
                                                <a
                                                    href={`https://psky.app/profile/${proposal.hypercert_uri.split('/')[2]}/post/${proposal.hypercert_uri.split('/')[4]}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-tight rounded-md border border-primary-100 hover:bg-primary-100 transition-colors"
                                                >
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                    Hypercert
                                                </a>
                                            ) : (proposal.status === 'passed' && participationMap[proposal.id]) && (
                                                <button
                                                    onClick={() => setIssuingProposal(proposal)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-600 text-[10px] font-bold uppercase tracking-tight rounded-md border border-accent-100 hover:bg-accent-100 transition-colors"
                                                >
                                                    <Award className="w-2.5 h-2.5" />
                                                    Issue Hypercert
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="font-bold text-slate-900">${proposal.amount}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Issuance Modal */}
            {issuingProposal && (
                <HypercertIssuanceModal
                    proposal={issuingProposal}
                    onClose={() => setIssuingProposal(null)}
                    onSuccess={handleIssueHypercertSuccess}
                />
            )}
        </div>
    );
}
