import React, { useState } from 'react';
import { Award, X, Loader2, ExternalLink } from 'lucide-react';
import { useHypercerts } from '../hooks/useHypercerts';
import { type Proposal } from '../hooks/useProposals';
import { useDashboardData } from '../hooks/useDashboardData';

interface Props {
    proposal: Proposal;
    onClose: () => void;
    onSuccess: (hypercertUri: string) => Promise<boolean>;
}

export default function HypercertIssuanceModal({ proposal, onClose, onSuccess }: Props) {
    const { currentUser } = useDashboardData();
    const { createHypercert } = useHypercerts();
    const [issuingLoading, setIssuingLoading] = useState(false);
    const [issuanceError, setIssuanceError] = useState<string | null>(null);

    const hasCredentials = !!(currentUser?.atproto_handle && currentUser?.atproto_app_password);

    const handleIssue = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!currentUser?.atproto_handle || !currentUser?.atproto_app_password) {
            setIssuanceError('Please configure your Bluesky credentials in the Dashboard first.');
            return;
        }

        setIssuingLoading(true);
        setIssuanceError(null);

        const result = await createHypercert(
            currentUser.atproto_handle, 
            currentUser.atproto_app_password, 
            {
                title: proposal.title,
                description: proposal.description,
                shortDescription: `Frontier Tower impact: ${proposal.amount} for ${proposal.categories?.name}`,
                createdAt: new Date().toISOString(),
            }
        );

        if (result && result.uri) {
            const success = await onSuccess(result.uri);
            if (success) {
                onClose();
            } else {
                setIssuanceError('Hypercert created but failed to link to proposal.');
            }
        } else {
            setIssuanceError('Failed to create Hypercert on ATProto. Please verify your handle and app password in the Dashboard.');
        }
        setIssuingLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary-500" />
                        Issue Hypercert
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 mb-2">
                        <div className="text-xs font-bold text-primary-600 uppercase mb-1">Proposal</div>
                        <div className="text-slate-900 font-medium">{proposal.title}</div>
                        <div className="text-sm text-slate-500">${proposal.amount} · {proposal.categories?.name}</div>
                    </div>

                    {!hasCredentials ? (
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                                <ExternalLink className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-900">Credentials Missing</h4>
                                <p className="text-sm text-slate-500">
                                    You need to link your Bluesky account and save an App Password in your Dashboard before you can issue Hypercerts.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleIssue} className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Using Identity</span>
                                    <span className="text-primary-500 underline cursor-pointer" onClick={onClose}>Change</span>
                                </div>
                                <div className="text-slate-900 font-medium text-sm truncate">
                                    {currentUser?.atproto_handle}
                                </div>
                            </div>

                            {issuanceError && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
                                    {issuanceError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={issuingLoading}
                                className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                            >
                                {issuingLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating Impact Record...
                                    </>
                                ) : (
                                    'Issue Verifiable Hypercert'
                                )}
                            </button>
                            <p className="text-[10px] text-slate-400 text-center px-4">
                                This will create a permanent, verifiable record of your participation on the ATProto network.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
