import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProposals } from './useProposals';
import { supabase } from '../lib/supabase';

describe('useProposals Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default safe mock for all Supabase queries triggered by fetchData on mount
        (supabase.from as any).mockImplementation(() => {
            const mockSelect = vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
                eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
                single: vi.fn().mockResolvedValue({ data: null })
            });
            return {
                select: mockSelect,
                insert: vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
                upsert: vi.fn().mockResolvedValue({ error: null })
            };
        });
    });

    it('should calculate voting weight from user delegation maps', async () => {
        // We mock the internals of fetchData
        const mockCats = vi.fn().mockResolvedValueOnce({ data: [{ id: 'cat1', name: 'Tech' }] });
        const mockProps = vi.fn().mockResolvedValueOnce({ data: [
            { id: 'prop1', status: 'active', amount: 50, expires_at: new Date('2050-01-01').toISOString() }
        ]});
        const mockUserVotes = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValueOnce({ data: [] }) });
        
        const mockAllVotes = vi.fn().mockResolvedValueOnce({ data: [
            { proposal_id: 'prop1', voter_id: 'voter1', vote: true },
            { proposal_id: 'prop1', voter_id: 'voter2', vote: false }
        ]});
        const mockProfiles = vi.fn().mockResolvedValueOnce({ data: [
            { id: 'voter1', delegated_to: null }, 
            { id: 'delegator1', delegated_to: 'voter1'},
            { id: 'delegator2', delegated_to: 'voter1'},
            { id: 'voter2', delegated_to: null }
        ]});
        
        const mockCount = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValueOnce({ count: 10 }) });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'categories') return { select: mockCats };
            if (table === 'proposals') return { 
                select: () => ({ order: mockProps }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
            };
            if (table === 'votes') return { select: (query: string) => {
                if (query.includes('profiles')) return mockAllVotes();
                return mockUserVotes();
            }};
            if (table === 'profiles') return { select: (query: string, options: any) => {
                if (options?.head) return mockCount();
                return mockProfiles();
            }};
            return {};
        });

        const { result } = renderHook(() => useProposals('user123'));

        await waitFor(() => {
             // Total approved users = 10, threshold = 5
             // prop1: voter1 has 1 + 2 delegated = 3 weight (yes)
             // voter2 has 1 weight (no)
             // total yes should be 3, total votes 4
             expect(result.current.proposalVotes['prop1']).toBeDefined();
             expect(result.current.proposalVotes['prop1'].yes).toBe(3);
             expect(result.current.proposalVotes['prop1'].total).toBe(4);
        });
    });

    it('should submit a new proposal successfully', async () => {
        const fakeProposal = {
            id: 'new-prop',
            title: 'Title',
            description: 'Desc',
            amount: 100,
            status: 'active',
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            category_id: 'cat1',
            creator_id: 'user123',
            categories: { name: 'Tech', color_theme: 'blue' },
            profiles: { email: 'user@test.com' }
        };

        const mockSingleInsert = vi.fn().mockResolvedValue({ data: fakeProposal, error: null });
        const mockInsert = vi.fn().mockReturnValue({
            select: () => ({ single: mockSingleInsert })
        });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'proposals') return {
                insert: mockInsert,
                select: () => ({ order: vi.fn().mockResolvedValue({ data: [] }) }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
            };
            return {
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [] }),
                    eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
                    single: vi.fn().mockResolvedValue({ data: null })
                })
            };
        });

        const { result } = renderHook(() => useProposals('user123'));

        // Wait for the mount-time fetchData to fully settle before calling createProposal
        await waitFor(() => {
            expect(result.current.proposals).toHaveLength(0);
        });

        let success;
        await act(async () => {
            success = await result.current.createProposal('Title', 'Desc', 100, 'cat1');
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalled();
        // After createProposal, proposals should have the new item prepended
        await waitFor(() => {
            expect(result.current.proposals).toHaveLength(1);
            expect(result.current.proposals[0].id).toBe('new-prop');
        });
    });
});
