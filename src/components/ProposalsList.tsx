import { useState } from 'react';
import { Plus, Check, X, Clock, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { useProposals } from '../hooks/useProposals';

export default function ProposalsList({ currentUserId, votingPower }: { currentUserId: string, votingPower: number }) {
    const {
        proposals,
        categories,
        userVotes,
        proposalVotes,
        totalApprovedUsers,
        createProposal,
        castVote
    } = useProposals(currentUserId);

    // New Proposal Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newCatId, setNewCatId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleCreateProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const success = await createProposal(newTitle, newDesc, Number(newAmount), newCatId);

        if (success) {
            setIsCreating(false);
            setNewTitle('');
            setNewDesc('');
            setNewAmount('');

            // Show playful toast
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
        }
        setSubmitting(false);
    };

    const handleVote = async (proposalId: string, isYes: boolean) => {
        await castVote(proposalId, isYes);
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
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center animate-in slide-in-from-bottom-8 duration-500 z-50">
                    <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold">Proposal Submitted!</h4>
                        <p className="text-sm text-slate-300">Wait for the floor to vote.</p>
                    </div>
                </div>
            )}

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
                    </div>
                    <button type="submit" disabled={submitting} className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {submitting ? 'Submitting...' : 'Submit Proposal to Vote'}
                    </button>
                </form>
            )}

            {/* Active Proposals Grid */}
            <h3 className="text-lg font-semibold text-slate-500 flex items-center mb-1">
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
                    const progress = Math.min(100, Math.round((votes.yes / threshold) * 100)) || 0;

                    return (
                        <div key={proposal.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-${catColor}-500/20`}></div>
                            <div className={`absolute top-0 left-0 h-1 bg-${catColor}-500 transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>

                            <div className="flex justify-between items-start mb-4 mt-2">
                                <span className={`px-2.5 py-1 bg-${catColor}-50 text-${catColor}-700 text-xs font-bold uppercase tracking-wider rounded-lg`}>
                                    {proposal.categories?.name}
                                </span>
                                <span className="text-xl font-bold text-slate-900">${proposal.amount}</span>
                            </div>

                            <h4 className="text-xl font-bold text-slate-800 mb-2">{proposal.title}</h4>
                            <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-3">{proposal.description}</p>

                            <div className="mt-auto space-y-4">
                                <div className="flex justify-between text-xs font-medium text-slate-500">
                                    <span>Proposed by {proposal.profiles?.email.split('@')[0]}</span>
                                    <span>{progress}% to threshold</span>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleVote(proposal.id, true)}
                                        className={`flex-1 flex items-center justify-center py-2.5 rounded-xl font-medium transition-colors ${userVotes[proposal.id] === true
                                            ? 'bg-success-500 text-white shadow-lg shadow-success-500/30'
                                            : 'bg-slate-50 text-slate-600 hover:bg-success-100 hover:text-success-700 border border-slate-100'
                                            }`}
                                    >
                                        <ThumbsUp className={`w-4 h-4 mr-2 ${userVotes[proposal.id] === true ? 'animate-bounce' : ''}`} /> ({votingPower})
                                    </button>
                                    <button
                                        onClick={() => handleVote(proposal.id, false)}
                                        className={`flex-1 flex items-center justify-center py-2.5 rounded-xl font-medium transition-colors ${userVotes[proposal.id] === false
                                            ? 'bg-danger-500 text-white shadow-lg shadow-danger-500/30'
                                            : 'bg-slate-50 text-slate-600 hover:bg-danger-100 hover:text-danger-700 border border-slate-100'
                                            }`}
                                    >
                                        <ThumbsDown className="w-4 h-4 mr-2" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {pastProposals.length > 0 && (
                <div className="pt-8 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-500 mb-6">Past Proposals</h3>
                    <div className="space-y-4">
                        {pastProposals.map(proposal => (
                            <div key={proposal.id} className="bg-white/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-4">
                                    {proposal.status === 'passed'
                                        ? <div className="w-10 h-10 bg-success-100 text-success-600 rounded-full flex items-center justify-center"><Check className="w-5 h-5" /></div>
                                        : <div className="w-10 h-10 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></div>
                                    }
                                    <div>
                                        <h4 className="font-semibold text-slate-800 line-through decoration-slate-300">{proposal.title}</h4>
                                        <span className="text-xs text-slate-500">{new Date(proposal.expires_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="font-bold text-slate-900">${proposal.amount}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )
            }
        </div >
    );
}
