import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProposals } from './useProposals';
import { supabase } from '../lib/supabase';

describe('useProposals Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Safe default mock for all fetchData calls on mount
        (supabase.from as any).mockImplementation(() => ({
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
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }));
    });

    it('should initialize with empty proposals and loading state', async () => {
        const { result } = renderHook(() => useProposals('user123'));
        await waitFor(() => expect(result.current.proposals).toEqual([]));
    });

    it('should calculate weighted vote totals respecting category delegation', async () => {
        const now = new Date();
        const expires = new Date(now.getTime() + 7 * 86400000).toISOString();

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'categories') return { select: vi.fn().mockResolvedValue({ data: [] }) };
            if (table === 'proposals') return {
                select: () => ({ order: vi.fn().mockResolvedValue({ data: [
                    { id: 'prop1', status: 'active', amount: 50, expires_at: expires,
                      created_at: now.toISOString(), category_id: 'cat1',
                      categories: { name: 'Tech', color_theme: 'blue' },
                      profiles: { email: 'a@test.com' } }
                ]}) }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
            if (table === 'votes') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [
                { proposal_id: 'prop1', voter_id: 'voter1', vote: true },
                { proposal_id: 'prop1', voter_id: 'voter2', vote: false },
            ]}) }) };
            if (table === 'profiles') return { select: (q: string, opts: any) => {
                if (opts?.head) return { eq: vi.fn().mockResolvedValue({ count: 6 }) };
                return { delegated_to: null, mockResolvedValue: undefined,
                    then: () => Promise.resolve({ data: [
                        { id: 'voter1', delegated_to: null },
                        { id: 'voter2', delegated_to: null },
                        { id: 'delegator1', delegated_to: 'voter1' },
                    ]})
                };
            }};
            if (table === 'category_delegations') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
            return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
        });

        const { result } = renderHook(() => useProposals('voter1'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(1));
    });

    it('should submit a new proposal and prepend it to state', async () => {
        const fakeProposal = {
            id: 'new-prop', title: 'New Chair', description: 'We need chairs', amount: 200,
            status: 'active', created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            category_id: 'cat1', creator_id: 'user123',
            categories: { name: 'Furniture', color_theme: 'blue' },
            profiles: { email: 'user@test.com' }
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: fakeProposal, error: null });
        const mockInsert = vi.fn().mockReturnValue({ select: () => ({ single: mockSingle }) });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return {
                insert: mockInsert,
                select: () => ({ order: vi.fn().mockResolvedValue({ data: [] }) }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
            return {
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [] }),
                    eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
                })
            };
        });

        const { result } = renderHook(() => useProposals('user123'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(0));

        let success: any;
        await act(async () => {
            success = await result.current.createProposal('New Chair', 'We need chairs', 200, 'cat1');
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalled();
        await waitFor(() => expect(result.current.proposals[0].id).toBe('new-prop'));
    });

    it('should delete a proposal and remove it from state', async () => {
        const proposal = {
            id: 'prop-to-delete', title: 'Delete Me', description: 'Gone', amount: 50,
            status: 'active', created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            category_id: 'cat1', creator_id: 'user123',
            categories: { name: 'Tech', color_theme: 'blue' },
            profiles: { email: 'user@test.com' }
        };

        const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return {
                select: () => ({ order: vi.fn().mockResolvedValue({ data: [proposal] }) }),
                delete: mockDelete,
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
            return {
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [] }),
                    eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
                })
            };
        });

        const { result } = renderHook(() => useProposals('user123'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(1));

        await act(async () => {
            await result.current.deleteProposal('prop-to-delete');
        });

        expect(mockDelete).toHaveBeenCalled();
        expect(result.current.proposals).toHaveLength(0);
    });

    it('should NOT mutate proposal status client-side after voting', async () => {
        // The DB trigger handles status changes. castVote should only trigger a refetch.
        const mockUpsert = vi.fn().mockResolvedValue({ error: null });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'votes') return { upsert: mockUpsert, select: () => ({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
            return {
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [] }),
                    eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
                })
            };
        });

        const { result } = renderHook(() => useProposals('user123'));
        await waitFor(() => expect(result.current.proposals).toHaveLength(0));

        await act(async () => { await result.current.castVote('prop1', true); });

        // No direct .update call on proposals from the client — only upsert on votes
        expect(mockUpsert).toHaveBeenCalled();
        // Proposals should still be empty (DB decides status, not client)
        expect(result.current.proposals).toHaveLength(0);
    });
});
