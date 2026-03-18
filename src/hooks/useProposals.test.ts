import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProposals } from './useProposals';
import { supabase } from '../lib/supabase';

const createBulletproofMock = (data: any = [], count: number = 0) => {
    const chain: any = {
        data, count, error: null,
        then: (cb: any) => Promise.resolve(cb({ data, count, error: null })),
        catch: (cb: any) => Promise.resolve(cb(null)),
        finally: (cb: any) => Promise.resolve(cb()),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    return new Proxy(chain, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === 'string') return () => new Proxy(target, this);
            return target[prop];
        }
    });
};

// Safe default factory — returns empty data for every table
const safeMock = () => {
    return {
        select: () => createBulletproofMock(),
        insert: vi.fn().mockReturnValue({
            select: () => createBulletproofMock()
        }),
        update: vi.fn().mockReturnValue(createBulletproofMock()),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue(createBulletproofMock()),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
};

describe('useProposals Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as any).mockImplementation(() => safeMock());
    });

    it('initializes with empty proposals', async () => {
        const { result } = renderHook(() => useProposals('user1', 'floor1'));
        await waitFor(() => expect(result.current.proposals).toEqual([]));
    });

    it('creates a proposal and prepends it to state', async () => {
        const fakeProposal = {
            id: 'p1', title: 'Chair', description: 'Need chairs', amount: 200, status: 'active',
            created_at: new Date().toISOString(), expires_at: new Date(Date.now() + (10 * 86400000)).toISOString(),
            category_id: 'cat1', creator_id: 'user1',
            categories: { name: 'Furniture', color_theme: 'blue' }, profiles: { email: 'u@t.com' }
        };
        const mockInsert = vi.fn().mockReturnValue({
            select: () => createBulletproofMock(fakeProposal)
        });
        (supabase.from as any).mockImplementation((table: string) =>
            table === 'proposals'
                ? { ...safeMock(), insert: mockInsert, select: () => createBulletproofMock([]) }
                : safeMock()
        );

        const { result } = renderHook(() => useProposals('user1', 'floor1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(0));

        await act(async () => {
            await result.current.createProposal('Chair', 'Need chairs', 200, 'cat1', 10);
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
                ? { ...safeMock(), delete: mockDelete, select: () => createBulletproofMock([proposal]) }
                : safeMock()
        );

        const { result } = renderHook(() => useProposals('user1', 'floor1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(1));

        await act(async () => { await result.current.deleteProposal('p-del'); });
        expect(mockDelete).toHaveBeenCalled();
        expect(result.current.proposals).toHaveLength(0);
    });

    it('updates a proposal and refetches data', async () => {
        const proposal = {
            id: 'p-upd', title: 'Old Title', description: 'Old Desc', amount: 50, status: 'active',
            created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(),
            category_id: 'cat1', creator_id: 'user1',
            categories: { name: 'Tech', color_theme: 'blue' }, profiles: { email: 'u@t.com' }
        };
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

        (supabase.from as any).mockImplementation((table: string) =>
            table === 'proposals'
                ? { ...safeMock(), update: mockUpdate, select: () => createBulletproofMock([proposal]) }
                : safeMock()
        );

        const { result } = renderHook(() => useProposals('user1', 'floor1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(1));

        await act(async () => { 
            await result.current.updateProposal('p-upd', 'New Title', 'New Desc', 100, 'cat1'); 
        });

        expect(mockUpdate).toHaveBeenCalledWith({
            title: 'New Title',
            description: 'New Desc',
            amount: 100,
            category_id: 'cat1'
        });
        expect(mockUpdateEq).toHaveBeenCalledWith('id', 'p-upd');
    });

    describe('castVote', () => {
        // Shared setup: renders hook with no prior votes
        const renderHookWithVotes = (existingVote?: boolean) => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
            const mockDeleteEq2 = vi.fn().mockResolvedValue({ error: null });
            const mockDeleteEq1 = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq1 });

        // Votes for prop1 (as the currentUser's own vote)
        const currentUserVote = existingVote !== undefined
            ? [{ proposal_id: 'prop1', voter_id: 'user1', vote: existingVote }]
            : [];

        let isDeleted = false;
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return createBulletproofMock([{ id: 'prop1', status: 'active' }]);
            if (table === 'profiles') return createBulletproofMock([{ id: 'user1', delegated_to: null, count: 1 }]);
            if (table === 'categories') return createBulletproofMock([]);
            if (table === 'proposal_delegations') return createBulletproofMock([]);
            if (table === 'votes') return {
                insert: mockInsert,
                update: mockUpdate,
                delete: (...args: any[]) => {
                    isDeleted = true;
                    return mockDelete(...args);
                },
                select: () => {
                    // if it's been deleted, return empty array to simulate removal during refetch
                    if (isDeleted) return createBulletproofMock([]); 
                    return createBulletproofMock(currentUserVote);
                },
            };
            return safeMock();
        });
        const { result } = renderHook(() => useProposals('user1', 'floor1'));
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
                    select: () => createBulletproofMock([]),
                };
                return safeMock();
            });

            const { result } = renderHook(() => useProposals('user1', 'floor1'));
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

            const { result } = renderHook(() => useProposals('user1', 'floor1'));
            await waitFor(() => expect(result.current.proposals).toEqual([]));
            await act(async () => { await result.current.castVote('prop1', true); });

            expect(mockProposalUpdate).not.toHaveBeenCalled();
        });
    });

    it('calculates weighted vote totals correctly with delegation overrides', async () => {
        const activeProposal = {
            id: 'prop-weighted', title: 'T', description: 'D', amount: 100, status: 'active',
            category_id: 'cat-x', categories: { name: 'X', color_theme: 'c' },
            profiles: { email: 'creator@t.com' }, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(),
            quorum_reached_at: null
        };

        const mockVotes = [
            { proposal_id: 'prop-weighted', voter_id: 'voter1', vote: true },
            { proposal_id: 'prop-weighted', voter_id: 'voter2', vote: false }
        ];
        const mockProfiles = [
            { id: 'voter1', delegated_to: null },
            { id: 'voter2', delegated_to: null },
            { id: 'voter3', delegated_to: 'voter1' }, // global
            { id: 'voter4', delegated_to: null }
        ];
        const mockPropDelegations = [
            { user_id: 'voter4', proposal_id: 'prop-weighted', delegated_to: 'voter2' }
        ];

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return createBulletproofMock([activeProposal]);
            if (table === 'categories') return createBulletproofMock([]);
            if (table === 'votes') {
                return new Proxy({}, {
                    get: (_, prop) => (prop === 'select' 
                        ? (q: string) => (q && q.includes('voter_id') ? createBulletproofMock(mockVotes) : createBulletproofMock([]))
                        : () => createBulletproofMock([]))
                });
            }
            if (table === 'profiles') {
                return new Proxy({}, {
                    get: (_, prop) => (prop === 'select'
                        ? (q: string) => (q === 'count' || (q && typeof q === 'object')) ? createBulletproofMock([], 4) : createBulletproofMock(mockProfiles)
                        : () => createBulletproofMock([]))
                });
            }
            if (table === 'proposal_delegations') return createBulletproofMock(mockPropDelegations);
            return createBulletproofMock([]);
        });

        const { result } = renderHook(() => useProposals('user1', 'floor1'));

        await waitFor(() => {
            const votes = result.current.proposalVotes['prop-weighted'];
            expect(votes).toBeDefined();
            expect(votes?.yes).toBe(2);
            expect(votes?.total).toBe(4);
        });
    });

    it('filters out expired active proposals from the state', async () => {
        const now = new Date();
        const expiredProp = {
            id: 'expired', title: 'Old', status: 'active',
            expires_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
            created_at: new Date(now.getTime() - 172800000).toISOString(),
            categories: { name: 'X', color_theme: 'c' }, profiles: { email: 'u@t.com' }
        };
        const activeProp = {
            id: 'active', title: 'New', status: 'active',
            expires_at: new Date(now.getTime() + 86400000).toISOString(), // 1 day from now
            created_at: now.toISOString(),
            categories: { name: 'X', color_theme: 'c' }, profiles: { email: 'u@t.com' }
        };

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return createBulletproofMock([expiredProp, activeProp]);
            return safeMock();
        });

        const { result } = renderHook(() => useProposals('user1', 'floor1'));
        
        await waitFor(() => {
            expect(result.current.proposals).toHaveLength(1);
            expect(result.current.proposals[0].id).toBe('active');
        });
    });
});
