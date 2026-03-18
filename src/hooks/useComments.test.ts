import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useComments } from './useComments';
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
            if (typeof prop === 'string') {
                if (prop === 'on') return () => new Proxy(target, this);
                if (prop === 'subscribe') return () => ({ unsubscribe: vi.fn() });
                return () => new Proxy(target, this);
            }
            return target[prop];
        }
    });
};

const safeMock = () => {
    return {
        select: () => createBulletproofMock(),
        insert: vi.fn().mockReturnValue({
            select: () => ({
                single: () => Promise.resolve({ data: {}, error: null })
            })
        }),
        delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        }),
        channel: vi.fn().mockReturnValue(createBulletproofMock()),
        removeChannel: vi.fn(),
    };
};

describe('useComments Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as any).mockImplementation(() => safeMock());
        (supabase.channel as any).mockImplementation(() => createBulletproofMock());
    });

    it('initializes with empty comments', async () => {
        const { result } = renderHook(() => useComments(null, null));
        expect(result.current.comments).toEqual([]);
    });

    it('fetches comments for a proposal', async () => {
        const mockComments = [
            { id: 'c1', content: 'Hello', author_id: 'u1', profiles: { email: 'u1@t.com' } }
        ];
        (supabase.from as any).mockImplementation((table: string) => 
            table === 'proposal_comments' 
                ? { ...safeMock(), select: () => createBulletproofMock(mockComments) }
                : safeMock()
        );

        const { result } = renderHook(() => useComments('p1', 'f1'));
        await waitFor(() => expect(result.current.comments).toHaveLength(1));
        expect(result.current.comments[0].content).toBe('Hello');
    });

    it('adds a comment', async () => {
        const mockInsert = vi.fn().mockReturnValue({
            select: () => ({
                single: () => Promise.resolve({ data: { id: 'c2' }, error: null })
            })
        });
        (supabase.from as any).mockImplementation((table: string) => 
            table === 'proposal_comments' 
                ? { ...safeMock(), insert: mockInsert }
                : safeMock()
        );

        const { result } = renderHook(() => useComments('p1', 'f1'));
        
        let success: boolean | undefined;
        await act(async () => {
            success = await result.current.addComment('u1', 'New comment');
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([{
            proposal_id: 'p1',
            author_id: 'u1',
            content: 'New comment',
            floor_id: 'f1'
        }]);
    });

    it('deletes a comment', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockImplementation((table: string) => 
            table === 'proposal_comments' 
                ? { ...safeMock(), delete: mockDelete }
                : safeMock()
        );

        const { result } = renderHook(() => useComments('p1', 'f1'));
        
        let success: boolean | undefined;
        await act(async () => {
            success = await result.current.deleteComment('c1');
        });

        expect(success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'c1');
    });
});
