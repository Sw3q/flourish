import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTowerStats } from './useTowerStats';
import { supabase } from '../lib/supabase';

const createMock = (data: any = []) => {
    return {
        data,
        error: null,
        then: (cb: any) => Promise.resolve(cb({ data, error: null })),
    };
};

describe('useTowerStats Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches and aggregates tower stats correctly', async () => {
        const mockFloors = [
            { id: 'f1', name: 'Floor 1', floor_number: 1 },
            { id: 'f2', name: 'Floor 2', floor_number: 2 },
        ];
        const mockProfiles = [
            { id: 'u1', floor_id: 'f1', is_approved: true },
            { id: 'u2', floor_id: 'f1', is_approved: true },
            { id: 'u3', floor_id: 'f2', is_approved: true },
        ];
        const mockProposals = [
            { id: 'p1', floor_id: 'f1', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() },
            { id: 'p2', floor_id: 'f2', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() },
        ];
        const mockTransactions = [
            { floor_id: 'f1', amount: 100, type: 'deposit' },
            { floor_id: 'f1', amount: 20, type: 'withdrawal' },
            { floor_id: 'f2', amount: 50, type: 'deposit' },
        ];

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'floors') {
                return {
                    select: () => ({
                        order: () => createMock(mockFloors)
                    })
                };
            }
            if (table === 'profiles') {
                return {
                    select: () => createMock(mockProfiles)
                };
            }
            if (table === 'proposals') {
                return {
                    select: () => ({
                        eq: () => createMock(mockProposals),
                        gt: () => createMock([])
                    })
                };
            }
            if (table === 'transactions') {
                return {
                    select: () => createMock(mockTransactions)
                };
            }
            return { select: () => createMock([]) };
        });

        const { result } = renderHook(() => useTowerStats());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.totalMembers).toBe(3);
        expect(result.current.totalActiveProposals).toBe(2);
        expect(result.current.totalBalance).toBe(130); // (100-20) + 50
        
        expect(result.current.floors).toHaveLength(2);
        expect(result.current.floors[0].balance).toBe(80);
        expect(result.current.floors[1].balance).toBe(50);
        expect(result.current.floors[0].memberCount).toBe(2);
        expect(result.current.floors[1].memberCount).toBe(1);
    });

    it('handles errors gracefully', async () => {
        (supabase.from as any).mockImplementation(() => ({
            select: () => ({
                order: () => ({
                    data: null,
                    error: { message: 'Database error' },
                    then: (cb: any) => Promise.resolve(cb({ data: null, error: { message: 'Database error' } })),
                })
            })
        }));

        const { result } = renderHook(() => useTowerStats());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.floors).toEqual([]);
    });
});
