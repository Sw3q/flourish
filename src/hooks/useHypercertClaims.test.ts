// @ts-expect-error - waitFor is sometimes missing from types in this env
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useHypercertClaims } from './useHypercertClaims';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: { from: vi.fn() }
}));

describe('useHypercertClaims', () => {
    beforeEach(() => vi.clearAllMocks());

    const mockFetchChain = (claims: any[]) => {
        const order = vi.fn().mockResolvedValue({ data: claims, error: null });
        const eq2 = vi.fn().mockReturnValue({ order });
        const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, eq1, eq2, order };
    };

    it('fetches claims for a subject', async () => {
        const claims = [{ id: 'c1', status: 'pending', claimant_id: 'u1', creator_id: 'u2' }];
        const chain = mockFetchChain(claims);
        (supabase.from as any).mockReturnValue({ select: chain.select });

        const { result } = renderHook(() => useHypercertClaims('offer_ask', 'post1'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.claims).toEqual(claims);
        expect(supabase.from).toHaveBeenCalledWith('hypercert_claims');
        expect(chain.eq1).toHaveBeenCalledWith('subject_type', 'offer_ask');
        expect(chain.eq2).toHaveBeenCalledWith('subject_id', 'post1');
    });

    it('skips fetch when subjectId missing', async () => {
        renderHook(() => useHypercertClaims('offer_ask', undefined));
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('requestClaim inserts a pending row', async () => {
        const chain = mockFetchChain([]);
        const insert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({ select: chain.select, insert });

        const { result } = renderHook(() => useHypercertClaims('offer_ask', 'post1'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        let ok;
        await act(async () => {
            ok = await result.current.requestClaim('claimant1', 'creator1');
        });

        expect(ok).toBe(true);
        expect(insert).toHaveBeenCalledWith([{
            subject_type: 'offer_ask',
            subject_id: 'post1',
            claimant_id: 'claimant1',
            creator_id: 'creator1',
            status: 'pending',
        }]);
    });

    it('resolveClaim updates status', async () => {
        const chain = mockFetchChain([]);
        const eqUpdate = vi.fn().mockResolvedValue({ error: null });
        const update = vi.fn().mockReturnValue({ eq: eqUpdate });
        (supabase.from as any).mockReturnValue({ select: chain.select, update });

        const { result } = renderHook(() => useHypercertClaims('offer_ask', 'post1'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.resolveClaim('c1', 'approved');
        });

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'approved', resolved_at: expect.any(String) })
        );
        expect(eqUpdate).toHaveBeenCalledWith('id', 'c1');
    });

    it('attachUri stores hypercert uri', async () => {
        const chain = mockFetchChain([]);
        const eqUpdate = vi.fn().mockResolvedValue({ error: null });
        const update = vi.fn().mockReturnValue({ eq: eqUpdate });
        (supabase.from as any).mockReturnValue({ select: chain.select, update });

        const { result } = renderHook(() => useHypercertClaims('offer_ask', 'post1'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.attachUri('c1', 'at://did:plc:x/org.hypercerts.claim.activity/abc');
        });

        expect(update).toHaveBeenCalledWith({ hypercert_uri: 'at://did:plc:x/org.hypercerts.claim.activity/abc' });
        expect(eqUpdate).toHaveBeenCalledWith('id', 'c1');
    });
});
