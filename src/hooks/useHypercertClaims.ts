import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HypercertClaimRecord } from '../types';

// Modular hypercert claim hook keyed by polymorphic (subject_type, subject_id).
// Reuse for any future claimable subject by passing a different subject_type.
export function useHypercertClaims(subjectType: string, subjectId?: string) {
    const [claims, setClaims] = useState<HypercertClaimRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchClaims = useCallback(async () => {
        if (!subjectId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('hypercert_claims')
            .select('*, claimant:profiles!hypercert_claims_claimant_id_fkey(email)')
            .eq('subject_type', subjectType)
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: false });

        if (!error && data) setClaims(data as unknown as HypercertClaimRecord[]);
        setLoading(false);
    }, [subjectType, subjectId]);

    useEffect(() => {
        fetchClaims();
    }, [fetchClaims]);

    const requestClaim = async (claimantId: string, creatorId: string) => {
        if (!subjectId) return false;
        const { error } = await supabase.from('hypercert_claims').insert([{
            subject_type: subjectType,
            subject_id: subjectId,
            claimant_id: claimantId,
            creator_id: creatorId,
            status: 'pending',
        }]);
        if (error) return false;
        await fetchClaims();
        return true;
    };

    const resolveClaim = async (claimId: string, status: 'approved' | 'denied') => {
        const { error } = await supabase
            .from('hypercert_claims')
            .update({ status, resolved_at: new Date().toISOString() })
            .eq('id', claimId);
        if (error) return false;
        await fetchClaims();
        return true;
    };

    const attachUri = async (claimId: string, uri: string) => {
        const { error } = await supabase
            .from('hypercert_claims')
            .update({ hypercert_uri: uri })
            .eq('id', claimId);
        if (error) return false;
        await fetchClaims();
        return true;
    };

    return { claims, loading, fetchClaims, requestClaim, resolveClaim, attachUri };
}
