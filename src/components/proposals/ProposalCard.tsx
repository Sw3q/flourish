import React, { useState } from 'react';
import { X, ShieldCheck, ArrowRight, MessageSquare, Edit3, Save } from 'lucide-react';
import { ProposalTimer, ConvictionStatus, DelegationPills, VoteButton } from './ProposalWidgets';
import ProposalChat from '../ProposalChat';
import type { Proposal, Profile, Category } from '../../types';

export interface ProposalCardProps {
    proposal: Proposal;
    isTinderStyle: boolean;
    slideDir: 'left' | 'right' | null;
    currentUserId: string;
    currentFloorId: string | null;
    totalApprovedUsers: number;
    userStateVote?: boolean;
    proposalVoteStats: { yes: number, total: number };
    globalDelegatedTo: string | null;
    proposalDelegations: Record<string, string>;
    members: Profile[];
    disabled: boolean;
    categories: Category[];
    getVotingPower: (proposalId: string) => Promise<number>;
    updateProposal: (id: string, title: string, desc: string, amount: number, catId: string) => Promise<boolean>;
    deleteProposal: (id: string) => Promise<boolean>;
    castVoteWithSwipe: (id: string, isYes: boolean) => Promise<void>;
    onDelegateProposal: (proposalId: string, targetId: string | null) => Promise<boolean>;
    onShowToast: () => void;
}

export default function ProposalCard({
    proposal,
    isTinderStyle,
    slideDir,
    currentUserId,
    currentFloorId,
    totalApprovedUsers,
    userStateVote,
    proposalVoteStats,
    globalDelegatedTo,
    proposalDelegations,
    members,
    disabled,
    categories,
    getVotingPower,
    updateProposal,
    deleteProposal,
    castVoteWithSwipe,
    onDelegateProposal,
    onShowToast,
}: ProposalCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editTitle, setEditTitle] = useState(proposal.title);
    const [editDesc, setEditDesc] = useState(proposal.description);
    const [editAmount, setEditAmount] = useState(proposal.amount.toString());
    const [editCatId, setEditCatId] = useState(proposal.category_id);

    const catColor = proposal.categories?.color_theme || 'slate';
    const threshold = totalApprovedUsers / 2;
    const progress = Math.min(100, Math.round((proposalVoteStats.yes / Math.max(threshold, 1)) * 100)) || 0;
    const isCreator = proposal.creator_id === currentUserId;

    const transitionClass = isTinderStyle
        ? (slideDir === 'right' ? 'translate-x-full opacity-0' : slideDir === 'left' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100')
        : 'opacity-100';

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const success = await updateProposal(proposal.id, editTitle, editDesc, Number(editAmount), editCatId);
        if (success) {
            setIsEditing(false);
            onShowToast();
        }
        setSubmitting(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        await deleteProposal(proposal.id);
        setDeleting(false);
    };

    return (
        <div className={`w-full bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] flex flex-col group hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 relative overflow-hidden ${transitionClass} ${isTinderStyle ? 'max-w-3xl mx-auto shadow-2xl' : ''}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${catColor}-500/10 rounded-full -translate-y-16 translate-x-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

            {isEditing ? (
                <form onSubmit={handleUpdate} className="relative z-10 space-y-6 flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Refining Intent.</h4>
                        <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
                            <input type="text" required value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                            <select required value={editCatId} onChange={e => setEditCatId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm appearance-none">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                            <textarea required value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-medium text-slate-900 transition-all text-sm leading-relaxed"></textarea>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount ($)</label>
                            <input type="number" required value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary-400 outline-none font-bold text-slate-900 transition-all text-sm" />
                        </div>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary-600 transition-all shadow-lg flex items-center justify-center gap-2">
                        {submitting ? 'Updating...' : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
                    </button>
                </form>
            ) : isChatting ? (
                <div className="relative z-10 flex-1 flex flex-col">
                    <ProposalChat
                        proposalId={proposal.id}
                        currentUserId={currentUserId}
                        currentFloorId={currentFloorId}
                        onClose={() => setIsChatting(false)}
                    />
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex flex-col gap-2">
                            <span className={`w-fit px-3 py-1 bg-${catColor}-50 text-${catColor}-700 text-[10px] font-black uppercase tracking-widest rounded-full`}>
                                {proposal.categories?.name}
                            </span>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                                By {proposal.profiles?.email.split('@')[0]}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-3xl font-display font-extrabold text-slate-900">${proposal.amount.toLocaleString()}</div>
                            <ProposalTimer expiresAt={proposal.expires_at} createdAt={proposal.created_at} />
                        </div>
                    </div>

                    <div className="mb-10 flex-1 relative z-10">
                        <h4 className="text-3xl font-display font-extrabold text-slate-900 mb-4 tracking-tight leading-tight group-hover:text-primary-700 transition-colors">
                            {proposal.title}
                        </h4>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            {proposal.description}
                        </p>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <span>Quorum Progress</span>
                                <span>{proposalVoteStats.yes} / {Math.ceil(threshold + 1)} YES</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-900 transition-all duration-700 ease-out rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        {!globalDelegatedTo && !proposalDelegations[proposal.id] ? (
                            <div className="flex gap-4">
                                <VoteButton
                                    proposalId={proposal.id}
                                    isYes={true}
                                    isActive={userStateVote === true}
                                    onVote={castVoteWithSwipe}
                                    getVotingPower={getVotingPower}
                                    disabled={disabled}
                                />
                                <VoteButton
                                    proposalId={proposal.id}
                                    isYes={false}
                                    isActive={userStateVote === false}
                                    onVote={castVoteWithSwipe}
                                    getVotingPower={getVotingPower}
                                    disabled={disabled}
                                />
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/delegation">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-primary-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Voting power delegated</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover/delegation:translate-x-1 transition-transform" />
                            </div>
                        )}

                        <ConvictionStatus quorumReachedAt={proposal.quorum_reached_at} />

                        <DelegationPills
                            proposalId={proposal.id}
                            currentUserId={currentUserId}
                            members={members}
                            proposalDelegations={proposalDelegations}
                            onDelegateProposal={onDelegateProposal}
                        />

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center gap-4">
                            <button
                                onClick={() => setIsChatting(true)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Discuss
                            </button>

                            {isCreator && (
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Modify
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
