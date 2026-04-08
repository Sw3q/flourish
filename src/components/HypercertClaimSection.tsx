import { useState } from 'react';
import { Award, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { useHypercertClaims } from '../hooks/useHypercertClaims';
import { useHypercerts } from '../hooks/useHypercerts';
import type { Profile, OfferAsk } from '../types';

interface Props {
    post: OfferAsk;
    currentUser?: Profile;
}

// Inline section attached to a completed offer/ask card.
// Three audiences: non-creator (claim flow), creator (approve/deny pending), nobody otherwise.
export default function HypercertClaimSection({ post, currentUser }: Props) {
    const { claims, requestClaim, resolveClaim, attachUri } = useHypercertClaims('offer_ask', post.id);
    const { createHypercert, loading: issuing } = useHypercerts();
    const [error, setError] = useState<string | null>(null);

    if (!currentUser) return null;

    const isCreator = currentUser.id === post.creator_id;
    const myClaim = claims.find(c => c.claimant_id === currentUser.id);
    const pending = claims.filter(c => c.status === 'pending');
    const issued = claims.filter(c => !!c.hypercert_uri);

    const hyperscanUrl = (uri: string) => {
        // at://did:plc:xxx/collection/rkey  → did is parts[2]
        const did = uri.split('/')[2];
        return `https://www.hyperscan.dev/data?did=${encodeURIComponent(did)}`;
    };

    const handleRequest = async () => {
        setError(null);
        const ok = await requestClaim(currentUser.id, post.creator_id);
        if (!ok) setError('Could not submit claim.');
    };

    const handleIssue = async () => {
        if (!myClaim) return;
        setError(null);
        if (!currentUser.atproto_handle || !currentUser.atproto_app_password) {
            setError('Configure your Bluesky credentials in the Dashboard first.');
            return;
        }
        const result = await createHypercert(
            currentUser.atproto_handle,
            currentUser.atproto_app_password,
            {
                title: post.title,
                description: post.description,
                shortDescription: `Frontier Tower ${post.type}: ${post.title}`,
                createdAt: new Date().toISOString(),
            }
        );
        if (result?.uri) await attachUri(myClaim.id, result.uri);
        else setError('Failed to issue Hypercert on ATProto.');
    };

    if (isCreator) {
        if (pending.length === 0 && issued.length === 0) return null;
        return (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                {pending.length > 0 && (
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Pending Claims ({pending.length})
                    </div>
                )}
                {pending.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="truncate text-slate-600">
                            {c.claimant?.email?.split('@')[0] ?? 'member'}
                        </span>
                        <div className="flex gap-1">
                            <button
                                aria-label="approve"
                                onClick={() => resolveClaim(c.id, 'approved')}
                                className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            >
                                <Check className="w-3 h-3" />
                            </button>
                            <button
                                aria-label="deny"
                                onClick={() => resolveClaim(c.id, 'denied')}
                                className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {issued.length > 0 && (
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 pt-1">
                        Issued ({issued.length})
                    </div>
                )}
                {issued.map(c => (
                    <a
                        key={c.id}
                        href={hyperscanUrl(c.hypercert_uri!)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                        <span className="truncate">{c.claimant?.email?.split('@')[0] ?? 'member'}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-slate-100">
            {error && <div className="text-[10px] text-rose-600 mb-1">{error}</div>}
            {!myClaim && (
                <button
                    onClick={handleRequest}
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary-50 text-primary-700 hover:bg-primary-100"
                >
                    <Award className="w-3 h-3" /> Claim HyperCert
                </button>
            )}
            {myClaim?.status === 'pending' && (
                <div className="text-[10px] text-center text-slate-500 font-medium">
                    Awaiting creator verification…
                </div>
            )}
            {myClaim?.status === 'denied' && (
                <div className="text-[10px] text-center text-rose-500 font-medium">Claim denied</div>
            )}
            {myClaim?.status === 'approved' && !myClaim.hypercert_uri && (
                <button
                    onClick={handleIssue}
                    disabled={issuing}
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                    {issuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3" />}
                    Issue Hypercert
                </button>
            )}
            {myClaim?.hypercert_uri && (
                <a
                    href={hyperscanUrl(myClaim.hypercert_uri)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                >
                    <ExternalLink className="w-3 h-3" /> View on Hyperscan
                </a>
            )}
        </div>
    );
}
