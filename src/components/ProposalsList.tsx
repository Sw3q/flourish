import { useState, useEffect, useCallback } from 'react';
import { Plus, X, CheckCircle2, ExternalLink, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProposals, type Proposal } from '../hooks/useProposals';
import HypercertIssuanceModal from './HypercertIssuanceModal';
import ProposalCard from './proposals/ProposalCard';
import type { Profile } from '../types';

export interface ProposalsListProps {
    currentUserId: string;
    currentFloorId: string | null;
    members: Profile[];
    proposalDelegations: Record<string, string>;
    globalDelegatedTo: string | null;
    onDelegateProposal: (proposalId: string, targetUserId: string | null) => Promise<boolean>;
    getVotingPower: (proposalId: string) => Promise<number>;
    disabled?: boolean;
    hideHeader?: boolean;
    isCreatingOverride?: boolean;
    onCloseCreating?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProposalsList Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProposalsList({
    currentUserId,
    currentFloorId,
    members,
    proposalDelegations,
    globalDelegatedTo,
    onDelegateProposal,
    getVotingPower,
    onCloseCreating,
    disabled = false,
    hideHeader = false,
    isCreatingOverride = false,
}: ProposalsListProps) {
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
        updateProposal,
        updateProposalHypercert,
    } = useProposals(currentUserId, currentFloorId);

    const [isCreatingInternal, setIsCreatingInternal] = useState(false);
    const isCreating = isCreatingOverride || isCreatingInternal;
    const setIsCreating = onCloseCreating || setIsCreatingInternal;
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDurationDays, setNewDurationDays] = useState('7');
    const [newCatId, setNewCatId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [issuingProposal, setIssuingProposal] = useState<Proposal | null>(null);

    const [activeTab, setActiveTab] = useState<'to-vote' | 'my-votes'>('to-vote');
    const [activeIndex, setActiveIndex] = useState(0);
    const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);

    const handleIssueHypercertSuccess = async (uri: string) => {
        if (!issuingProposal) return false;
        return await updateProposalHypercert(issuingProposal.id, uri);
    };

    const handleCreateProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const success = await createProposal(newTitle, newDesc, Number(newAmount), newCatId, Number(newDurationDays));
        if (success) {
            if (onCloseCreating) {
                onCloseCreating();
            } else {
                setIsCreatingInternal(false);
            }
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

    const activeProposals = proposals.filter(p => p.status === 'active');
    const unvotedProposals = activeProposals.filter(p => userVotes[p.id] === undefined);
    const votedProposals = activeProposals.filter(p => userVotes[p.id] !== undefined);
    const pastProposals = proposals.filter(p => p.status !== 'active');

    const clampedIndex = Math.min(activeIndex, Math.max(0, unvotedProposals.length - 1));

    const navigate = useCallback((dir: 'left' | 'right') => {
        if (activeTab !== 'to-vote') return;
        if (dir === 'right' && clampedIndex < unvotedProposals.length - 1) {
            setSlideDir('right');
            setActiveIndex(i => i + 1);
            setTimeout(() => setSlideDir(null), 100);
        } else if (dir === 'left' && clampedIndex > 0) {
            setSlideDir('left');
            setActiveIndex(i => i - 1);
            setTimeout(() => setSlideDir(null), 100);
        }
    }, [activeTab, clampedIndex, unvotedProposals.length]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (activeTab === 'to-vote') {
                if (e.key === 'ArrowRight') navigate('right');
                if (e.key === 'ArrowLeft') navigate('left');
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [navigate, activeTab]);

    const handleVoteWithSwipe = async (proposalId: string, isYes: boolean) => {
        if (activeTab === 'to-vote') {
            setSlideDir(isYes ? 'right' : 'left');
            setTimeout(async () => {
                await castVote(proposalId, isYes);
                setSlideDir(null);
                setActiveIndex(Math.max(0, Math.min(clampedIndex, unvotedProposals.length - 2)));
            }, 300);
        } else {
            await castVote(proposalId, isYes);
        }
    };

    const renderCard = (proposal: Proposal, isTinderStyle: boolean) => (
        <ProposalCard
            key={proposal.id}
            proposal={proposal}
            isTinderStyle={isTinderStyle}
            slideDir={isTinderStyle ? slideDir : null}
            currentUserId={currentUserId}
            currentFloorId={currentFloorId}
            totalApprovedUsers={totalApprovedUsers}
            userStateVote={userVotes[proposal.id]}
            proposalVoteStats={proposalVotes[proposal.id] || { yes: 0, total: 0 }}
            globalDelegatedTo={globalDelegatedTo}
            proposalDelegations={proposalDelegations}
            members={members}
            disabled={disabled}
            categories={categories}
            getVotingPower={getVotingPower}
            updateProposal={updateProposal}
            deleteProposal={deleteProposal}
            castVoteWithSwipe={handleVoteWithSwipe}
            onDelegateProposal={onDelegateProposal}
            onShowToast={() => {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
            }}
        />
    );

    const currentTinderProposal = unvotedProposals[clampedIndex];

    return (
        <div className="space-y-12 mt-12 bg-transparent pb-32">

            {!hideHeader && !isCreatingOverride && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-12">
                    <div>
                        <h2 className="text-4xl font-display font-extrabold tracking-tight text-slate-900 mb-2">Initiatives.</h2>
                        <p className="text-slate-500 font-medium italic">Communal requests for the floor's flourishing.</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-primary-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full transition-all shadow-xl shadow-slate-900/10"
                    >
                        {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isCreating ? 'Abandon Draft' : 'Launch New Proposal'}
                    </button>
                </div>
            )}

            {showToast && (
                <div className="fixed bottom-12 right-12 bg-slate-900 text-white px-8 py-6 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-12 duration-500 z-50 border border-white/10">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-display font-extrabold text-xl tracking-tight">Success.</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Proposal is now live in the directory.</p>
                    </div>
                </div>
            )}

            {isCreating && (
                <form onSubmit={handleCreateProposal} className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl animate-in slide-in-from-top-8 duration-500 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-8 mb-12">
                        <div className="md:col-span-2">
                            <h3 className="text-3xl font-display font-extrabold mb-8 tracking-tight">Drafting New Intent.</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Intent Title</label>
                            <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all" placeholder="e.g. Garden Refurbishment" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category Domain</label>
                            <select required value={newCatId} onChange={e => setNewCatId(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all appearance-none cursor-pointer">
                                <option value="" disabled>Select category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Context & Rationale</label>
                            <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={4} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-medium text-slate-900 transition-all leading-relaxed" placeholder="Detailed objective for requested funds..."></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Capital Required ($)</label>
                            <input type="number" required min="1" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all" placeholder="00.00" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Voting Window (Days)</label>
                            <input type="number" required min="3" value={newDurationDays} onChange={e => setNewDurationDays(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all" placeholder="7" />
                        </div>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full md:w-auto px-12 py-5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 disabled:opacity-50">
                        {submitting ? 'Broadcasting Intent...' : 'Deploy Proposal to Floor'}
                    </button>
                </form>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-0">
                <div className="flex gap-12">
                    <button
                        onClick={() => setActiveTab('to-vote')}
                        className={`flex items-center gap-3 pb-6 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-[3px] -mb-[3px] ${activeTab === 'to-vote' ? 'text-primary-600 border-primary-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                        Pending Actions
                        <span className="bg-slate-100 group-hover:bg-primary-50 text-slate-500 py-1 px-3 rounded-full text-[10px] font-black">{unvotedProposals.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('my-votes')}
                        className={`flex items-center gap-3 pb-6 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-[3px] -mb-[3px] ${activeTab === 'my-votes' ? 'text-primary-600 border-primary-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                        Personal Record
                        <span className={`py-1 px-3 rounded-full text-[10px] font-black ${votedProposals.length > 0 ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{votedProposals.length}</span>
                    </button>
                </div>

                {activeTab === 'to-vote' && unvotedProposals.length > 0 && (
                    <span className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {clampedIndex + 1} of {unvotedProposals.length} Entries
                    </span>
                )}
            </div>

            {/* Content Rendering */}
            <div>
                {activeTab === 'to-vote' && (
                    unvotedProposals.length === 0 ? (
                        <div className="p-24 text-center bg-white border border-slate-100 rounded-[3rem] animate-in fade-in duration-700 group">
                            <div className="w-20 h-20 bg-primary-50 text-primary-300 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary-100 group-hover:scale-110 transition-transform duration-700">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-3xl font-display font-extrabold text-slate-900 mb-4 tracking-tight">System Refinement Complete.</h4>
                            <p className="text-slate-400 font-medium italic max-w-sm mx-auto">All active proposals have been evaluated. The directory is clear.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-12">
                            <div className="flex items-center gap-8 w-full max-w-5xl mx-auto">
                                <button
                                    onClick={() => navigate('left')}
                                    disabled={clampedIndex === 0}
                                    aria-label="Previous proposal"
                                    className="hidden md:flex flex-shrink-0 w-16 h-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-all disabled:opacity-20 shadow-xl shadow-black/5"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>

                                <div className="flex-1 w-full relative">
                                    {currentTinderProposal && renderCard(currentTinderProposal, true)}
                                </div>

                                <button
                                    onClick={() => navigate('right')}
                                    disabled={clampedIndex === unvotedProposals.length - 1}
                                    aria-label="Next proposal"
                                    className="hidden md:flex flex-shrink-0 w-16 h-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-all disabled:opacity-20 shadow-xl shadow-black/5"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Mobile Nav */}
                            <div className="flex md:hidden gap-6">
                                <button aria-label="Previous proposal" onClick={() => navigate('left')} disabled={clampedIndex === 0} className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center disabled:opacity-20 shadow-lg"><ChevronLeft className="w-5 h-5" /></button>
                                <button aria-label="Next proposal" onClick={() => navigate('right')} disabled={clampedIndex === unvotedProposals.length - 1} className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center disabled:opacity-20 shadow-lg"><ChevronRight className="w-5 h-5" /></button>
                            </div>

                            {unvotedProposals.length > 1 && (
                                <div className="flex items-center gap-2">
                                    {unvotedProposals.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setSlideDir(i > clampedIndex ? 'right' : 'left');
                                                setActiveIndex(i);
                                                setTimeout(() => setSlideDir(null), 100);
                                            }}
                                            className={`rounded-full transition-all duration-700 ${i === clampedIndex
                                                ? 'w-12 h-1.5 bg-primary-600'
                                                : 'w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                )}

                {activeTab === 'my-votes' && (
                    votedProposals.length === 0 ? (
                        <div className="p-20 text-center text-slate-400 font-medium italic border border-slate-100 border-dashed rounded-[3rem]">
                            No personal voting record found in currently active proposals.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                            {votedProposals.map(proposal => renderCard(proposal, false))}
                        </div>
                    )
                )}
            </div>

            {/* Historical Records */}
            {pastProposals.length > 0 && (
                <div className="pt-12 border-t border-slate-200">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-12 flex items-center gap-4">
                        Historical Archives
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {pastProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between group hover:border-primary-100 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        {proposal.status === 'passed'
                                            ? <div className="px-2 py-1 bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-green-100">Finalized.Passed</div>
                                            : <div className="px-2 py-1 bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-100">Finalized.Rejected</div>
                                        }
                                        <div className="text-xl font-display font-black text-slate-900">${proposal.amount.toLocaleString()}</div>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-2 truncate group-hover:text-primary-700 transition-colors">{proposal.title}</h4>
                                    <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-6">{proposal.description}</p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                        Exp: {new Date(proposal.expires_at).toLocaleDateString()}
                                    </span>
                                    {proposal.hypercert_uri ? (
                                        <a
                                            href={`https://psky.app/profile/${proposal.hypercert_uri.split('/')[2]}/post/${proposal.hypercert_uri.split('/')[4]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-primary-600 transition-all flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            Hypercert
                                        </a>
                                    ) : (proposal.status === 'passed' && participationMap[proposal.id]) && (
                                        <button
                                            onClick={() => setIssuingProposal(proposal)}
                                            className="px-3 py-1.5 bg-primary-100 text-primary-700 text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-primary-600 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Award className="w-2.5 h-2.5" />
                                            Certify
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
