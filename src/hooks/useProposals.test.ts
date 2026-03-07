import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProposals } from './useProposals';
import { supabase } from '../lib/supabase';

// Safe default factory — returns empty data for every table
const safeMock = () => ({
    select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [] }),
        eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
        single: vi.fn().mockResolvedValue({ data: null }),
    }),
    insert: vi.fn().mockReturnValue({
        select: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
});

describe('useProposals Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as any).mockImplementation(() => safeMock());
    });

    it('initializes with empty proposals', async () => {
        const { result } = renderHook(() => useProposals('user1'));
        await waitFor(() => expect(result.current.proposals).toEqual([]));
    });

    it('creates a proposal and prepends it to state', async () => {
        const fakeProposal = {
            id: 'p1', title: 'Chair', description: 'Need chairs', amount: 200, status: 'active',
            created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 604800000).toISOString(),
            category_id: 'cat1', creator_id: 'user1',
            categories: { name: 'Furniture', color_theme: 'blue' }, profiles: { email: 'u@t.com' }
        };
        const mockInsert = vi.fn().mockReturnValue({
            select: () => ({ single: vi.fn().mockResolvedValue({ data: fakeProposal, error: null }) })
        });
        (supabase.from as any).mockImplementation((table: string) =>
            table === 'proposals'
                ? { ...safeMock(), insert: mockInsert, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] }) }) }
                : safeMock()
        );

        const { result } = renderHook(() => useProposals('user1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(0));

        await act(async () => {
            await result.current.createProposal('Chair', 'Need chairs', 200, 'cat1');
        });
        await waitFor(() => expect(result.current.proposals[0].id).toBe('p1'));
    });

    it('deletes a proposal and removes it from state', async () => {
        const proposal = {
            id: 'p-del', title: 'Gone', description: 'd', amount: 50, status: 'active',
            created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(),
            category_id: 'cat1', creator_id: 'user1',
            categories: { name: 'Tech', color_theme: 'blue' }, profiles: { email: 'u@t.com' }
        };
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

        (supabase.from as any).mockImplementation((table: string) =>
            table === 'proposals'
                ? { ...safeMock(), delete: mockDelete, select: () => ({ order: vi.fn().mockResolvedValue({ data: [proposal] }) }) }
                : safeMock()
        );

        const { result } = renderHook(() => useProposals('user1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(1));

        await act(async () => { await result.current.deleteProposal('p-del'); });
        expect(mockDelete).toHaveBeenCalled();
        expect(result.current.proposals).toHaveLength(0);
    });

    describe('castVote', () => {
        // Shared setup: renders hook with no prior votes
        const renderHookWithVotes = (existingVote?: boolean) => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
            const mockDeleteEq2 = vi.fn().mockResolvedValue({ error: null });
            const mockDeleteEq1 = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq1 });

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'votes') return {
                    insert: mockInsert,
                    update: mockUpdate,
                    delete: mockDelete,
                    select: () => ({
                        eq: vi.fn().mockResolvedValue({
                            data: existingVote !== undefined
                                ? [{ proposal_id: 'prop1', vote: existingVote }]
                                : []
                        })
                    }),
                };
                return safeMock();
            });
            const { result } = renderHook(() => useProposals('user1'));
            return { result, mockInsert, mockUpdate, mockDelete };
        };

        it('casts a new Yes vote via insert', async () => {
            const { result, mockInsert } = renderHookWithVotes();
            await waitFor(() => expect(result.current.userVotes).toEqual({}));

            await act(async () => { await result.current.castVote('prop1', true); });

            expect(mockInsert).toHaveBeenCalledWith([{ proposal_id: 'prop1', voter_id: 'user1', vote: true }]);
        });

        it('switches from Yes to No via delete then insert', async () => {
            // Simulate already having voted Yes
            const { result, mockInsert, mockDelete } = renderHookWithVotes(true);
            await waitFor(() => expect(result.current.userVotes['prop1']).toBe(true));

            // Click No — should be a switch
            await act(async () => { await result.current.castVote('prop1', false); });

            expect(mockDelete).toHaveBeenCalled();
            expect(mockInsert).toHaveBeenCalledWith([{ proposal_id: 'prop1', voter_id: 'user1', vote: false }]);
        });

        it('retracts a Yes vote by clicking Yes again via delete', async () => {
            const { result, mockInsert, mockDelete } = renderHookWithVotes(true);
            await waitFor(() => expect(result.current.userVotes['prop1']).toBe(true));

            // Click Yes again — should retract
            await act(async () => { await result.current.castVote('prop1', true); });

            expect(mockDelete).toHaveBeenCalled();
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('rolls back optimistic update when DB returns error', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } });
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'votes') return {
                    insert: mockInsert,
                    // fetchData re-reads votes — confirm no vote exists in DB
                    select: () => ({ eq: vi.fn().mockResolvedValue({ data: [] }) }),
                };
                return safeMock();
            });

            const { result } = renderHook(() => useProposals('user1'));
            await waitFor(() => expect(result.current.userVotes).toEqual({}));

            let success: any;
            await act(async () => { success = await result.current.castVote('prop1', true); });

            // Should have returned false on error
            expect(success).toBe(false);
            // After fetchData rolls back, userVotes should be empty again (DB has no vote)
            expect(result.current.userVotes['prop1']).toBeUndefined();
        });

        it('does not mutate proposal status client-side', async () => {
            // No update() call on proposals should ever happen from castVote
            const mockProposalUpdate = vi.fn();
            (supabase.from as any).mockImplementation((table: string) => {
                const m = safeMock();
                if (table === 'proposals') m.update = mockProposalUpdate;
                return m;
            });

            const { result } = renderHook(() => useProposals('user1'));
            await waitFor(() => expect(result.current.proposals).toEqual([]));
            await act(async () => { await result.current.castVote('prop1', true); });

            expect(mockProposalUpdate).not.toHaveBeenCalled();
        });
    });
});
