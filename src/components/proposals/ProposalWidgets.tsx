import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Profile } from '../../types';

export function ProposalTimer({ expiresAt, createdAt }: { expiresAt: string; createdAt: string }) {
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
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${colorClass} ${bgClass}`}>
            <Clock className="w-3 h-3" />
            {timeLeft}
        </span>
    );
}

export function ConvictionStatus({ quorumReachedAt }: { quorumReachedAt: string | null }) {
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
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-full">
            <Users className="w-3 h-3" />
            Waiting for Quorum
        </div>
    );

    return (
        <div className="space-y-2 w-full pt-4 border-t border-slate-50">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-primary-600">
                <span>Force of Conviction</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary-600 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="text-[9px] text-primary-500 font-bold uppercase tracking-widest">{timeLeft}</div>
        </div>
    );
}

export function DelegationPills({
    proposalId,
    currentUserId,
    members,
    proposalDelegations,
    onDelegateProposal,
}: {
    proposalId: string;
    currentUserId: string;
    members: Profile[];
    proposalDelegations: Record<string, string>;
    onDelegateProposal: (proposalId: string, targetId: string | null) => Promise<boolean>;
}) {
    const activeDelegateId = proposalDelegations[proposalId] ?? null;

    const handleClick = async (memberId: string) => {
        if (activeDelegateId === memberId) {
            await onDelegateProposal(proposalId, null);
        } else {
            await onDelegateProposal(proposalId, memberId);
        }
    };

    if (members.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Delegate Power:</span>
                {members.map(member => {
                    const name = member.email.split('@')[0];
                    const isActive = activeDelegateId === member.id;
                    const isCircular = member.delegated_to === currentUserId;
                    return (
                        <button
                            key={member.id}
                            onClick={() => !isCircular && handleClick(member.id)}
                            disabled={isCircular}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border ${isActive
                                ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20'
                                : isCircular
                                ? 'bg-slate-50 text-slate-400 border-red-200 opacity-50 cursor-not-allowed'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-primary-400 hover:text-primary-600 hover:bg-white'
                                }`}
                            title={isCircular ? "Delegates to you" : ""}
                        >
                            {name} {isCircular ? " (Loop)" : ""}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function VoteButton({
    proposalId,
    isYes,
    isActive,
    onVote,
    getVotingPower,
    disabled = false,
}: {
    proposalId: string;
    isYes: boolean;
    isActive: boolean;
    onVote: (id: string, yes: boolean) => Promise<void>;
    getVotingPower: (proposalId: string) => Promise<number>;
    disabled?: boolean;
}) {
    const [power, setPower] = useState<number | null>(null);

    useEffect(() => {
        getVotingPower(proposalId).then(setPower);
    }, [proposalId, getVotingPower]);

    return (
        <button
            onClick={() => !disabled && onVote(proposalId, isYes)}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${isActive
                ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isYes ? <ThumbsUp className="w-4 h-4 mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
            {isYes ? 'Yes' : 'No'} ({power ?? '..'})
        </button>
    );
}
