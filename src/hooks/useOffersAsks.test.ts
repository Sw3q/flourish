// @ts-expect-error - waitFor is sometimes missing from types in this env
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useOffersAsks } from './useOffersAsks';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(),
        removeChannel: vi.fn(),
    }
}));

const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
};

describe('useOffersAsks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.channel as any).mockReturnValue(mockChannel);
    });

    it('should initialize and fetch local posts correctly', async () => {
        const mockPosts = [
            { id: '1', title: 'Offer 1', type: 'offer', status: 'active', floor_id: 'floor1' },
            { id: '2', title: 'Ask 1', type: 'ask', status: 'active', floor_id: 'floor1' }
        ];

        const mockGte = vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockPosts, error: null }) // floor filter eq
            })
        });

        const mockEq = vi.fn().mockReturnValue({ gte: mockGte });
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({ eq: mockEq }) // status filter eq
        });

        const { result } = renderHook(() => useOffersAsks('floor1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.posts).toEqual([]);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.posts).toEqual(mockPosts);
        expect(supabase.from).toHaveBeenCalledWith('offers_asks');
        expect(mockEq).toHaveBeenCalledWith('status', 'active');
        expect(mockGte).toHaveBeenCalledWith('created_at', expect.any(String));
        expect(supabase.channel).toHaveBeenCalledWith('offers_asks_changes');
    });

    it('should initialize and fetch global posts with limits correctly', async () => {
        const mockPosts = [
            { id: '1', title: 'Offer Global 1', type: 'offer', status: 'active', floor_id: 'floor1' },
            { id: '2', title: 'Ask Global 1', type: 'ask', status: 'active', floor_id: 'floor2' }
        ];

        const mockLimit = vi.fn().mockResolvedValue({ data: mockPosts, error: null });
        const mockGte = vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ limit: mockLimit })
        });
        const mockEq = vi.fn().mockReturnValue({ gte: mockGte });

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({ eq: mockEq }) // status filter eq
        });

        const { result } = renderHook(() => useOffersAsks(undefined, 10));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.posts).toEqual(mockPosts);
        expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should create a post successfully', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });

        const mockGte = vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
        });

        const mockEq = vi.fn().mockReturnValue({ gte: mockGte });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'offers_asks') {
                return {
                    select: vi.fn().mockReturnValue({ eq: mockEq }),
                    insert: mockInsert
                };
            }
        });

        const { result } = renderHook(() => useOffersAsks('floor1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
             success = await result.current.createPost('offer', 'Testing', 'Description', 'creator123', 'floor1');
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([{
            type: 'offer',
            title: 'Testing',
            description: 'Description',
            creator_id: 'creator123',
            floor_id: 'floor1'
        }]);
    });

    it('should update a post status successfully', async () => {
        const mockPosts = [
            { id: 'post1', title: 'Offer 1', type: 'offer', status: 'active', floor_id: 'floor1' }
        ];

         const mockGte = vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockPosts, error: null })
            })
        });

        const mockEqSelect = vi.fn().mockReturnValue({ gte: mockGte });
        const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });

        (supabase.from as any).mockImplementation((_table: string) => {
            return {
                select: vi.fn().mockReturnValue({ eq: mockEqSelect }),
                update: vi.fn().mockReturnValue({ eq: mockEqUpdate })
            };
        });

        const { result } = renderHook(() => useOffersAsks('floor1'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
             success = await result.current.updatePostStatus('post1', 'completed');
        });

        expect(success).toBe(true);
        expect(mockEqUpdate).toHaveBeenCalledWith('id', 'post1');
    });
});
