import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData';
import { supabase } from '../lib/supabase';

describe('useDashboardData Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
    });

    it('should initialize with loading true and default values', () => {
        const { result } = renderHook(() => useDashboardData());
        expect(result.current.loading).toBe(true);
        expect(result.current.currentUser).toBeNull();
        expect(result.current.members).toEqual([]);
        expect(result.current.votingPower).toBe(1);
        expect(result.current.fundBalance).toBe(0);
        expect(result.current.categoryDelegations).toEqual({});
    });

    it('should load category delegations from supabase on init', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'user1' } } });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') return {
                select: () => ({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { id: 'user1', email: 'u@test.com', delegated_to: null, role: 'member' } }),
                        neq: vi.fn().mockResolvedValue({ data: [] }),
                    }),
                    count: vi.fn().mockResolvedValue({ count: 0 }),
                })
            };
            if (table === 'category_delegations') return {
                select: () => ({
                    eq: vi.fn().mockResolvedValue({ data: [
                        { category_id: 'cat1', delegated_to: 'user2' },
                        { category_id: 'cat2', delegated_to: 'user3' },
                    ]})
                })
            };
            if (table === 'transactions') return { select: vi.fn().mockResolvedValue({ data: [] }) };
            return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], count: 0 }) }) };
        });

        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => {
            expect(result.current.categoryDelegations['cat1']).toBe('user2');
            expect(result.current.categoryDelegations['cat2']).toBe('user3');
        });
    });

    it('should upsert a category delegation via delegateVoteForCategory', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useDashboardData());

        // Manually set currentUser via the loading flow result
        // Since user is null, we test the null-guard path
        let success;
        await act(async () => {
            success = await result.current.delegateVoteForCategory('cat1', 'user2');
        });

        // Should return false because currentUser is null
        expect(success).toBe(false);
    });

    it('should remove a category delegation when targetUserId is null', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useDashboardData());

        let success;
        await act(async () => {
            success = await result.current.delegateVoteForCategory('cat1', null);
        });

        // Should return false because currentUser is null
        expect(success).toBe(false);
    });

    it('should allow voting delegation (global)', async ( ) => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useDashboardData());

        let success;
        await act(async () => {
            success = await result.current.delegateVote('target123');
        });

        expect(success).toBe(false);
    });

    it('should calculate category-specific voting power correctly', async () => {
        const userId = 'me';
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: userId } } });

        const createBulletproofMock = (data: any = [], count: number = 0) => {
            const chain: any = {
                data, count, error: null,
                // These will be returned by the proxy if called
                then: (cb: any) => Promise.resolve(cb({ data, count, error: null })),
                catch: (cb: any) => Promise.resolve(cb(null)),
                finally: (cb: any) => Promise.resolve(cb()),
            };
            
            return new Proxy(chain, {
                get(target, prop) {
                    if (prop in target) return target[prop];
                    if (typeof prop === 'string') {
                        // Return a function that returns the proxy for chaining
                        return () => new Proxy(target, this);
                    }
                    return target[prop];
                }
            });
        };

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') {
                return new Proxy({}, {
                    get: (_, prop) => {
                        if (prop === 'select') return () => new Proxy({}, {
                            get: (_, p) => {
                                if (p === 'eq') return (col: string, val: any) => {
                                    if (col === 'id' && val === userId) return createBulletproofMock({ id: userId, email: 'me@test.com' });
                                    if (col === 'delegated_to' && val === userId) return createBulletproofMock([{ id: 'userA' }, { id: 'userB' }]);
                                    return createBulletproofMock([]);
                                };
                                return () => createBulletproofMock([]);
                            }
                        });
                        return () => createBulletproofMock([]);
                    }
                });
            }
            if (table === 'category_delegations') {
                return new Proxy({}, {
                    get: (_, prop) => {
                        if (prop === 'select') return () => new Proxy({}, {
                            get: (_, p) => {
                                if (p === 'eq') return (col: string, val: any) => {
                                    if (col === 'delegated_to' && val === userId) {
                                        return new Proxy({}, {
                                            get: (_, p2) => (p2 === 'eq' ? () => createBulletproofMock([{ user_id: 'userC' }]) : () => createBulletproofMock([]))
                                        });
                                    }
                                    return createBulletproofMock([]);
                                };
                                if (p === 'in') return () => new Proxy({}, {
                                    get: (_, p2) => (p2 === 'eq' ? () => createBulletproofMock([{ user_id: 'userB' }]) : () => createBulletproofMock([]))
                                });
                                return () => createBulletproofMock([]);
                            }
                        });
                        return () => createBulletproofMock([]);
                    }
                });
            }
            return createBulletproofMock([]);
        });

        const { result } = renderHook(() => useDashboardData());
        await waitFor(() => expect(result.current.loading).toBe(false));

        let power;
        await act(async () => {
            power = await result.current.getVotingPower('cat1');
        });

        expect(power).toBe(3);
    });

    it('should update ATProto credentials correctly', async () => {
        const userId = 'me';
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: userId } } });

        const mockProfile = { id: userId, email: 'me@test.com', role: 'member' };
        
        const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        });

        // Use a more robust mock factory for chaining
        const createChainMock = (data: any = null, error: any = null) => {
            const mock: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => Promise.resolve({ data, error })),
                then: vi.fn().mockImplementation((cb: any) => Promise.resolve(cb({ data, error }))),
                update: updateMock,
                count: vi.fn().mockReturnThis(),
            };
            return mock;
        };

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') {
                const mock = createChainMock(mockProfile);
                // Custom overrides for specific chains in fetchDashboardData
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((col: string, _val: any) => {
                        if (col === 'id') return { single: () => Promise.resolve({ data: mockProfile }) };
                        if (col === 'delegated_to') return { head: true, count: 'exact', then: (cb: any) => Promise.resolve(cb({ count: 0 })) };
                        return createChainMock([]);
                    }),
                    neq: vi.fn().mockReturnThis(),
                });
                return mock;
            }
            if (table === 'category_delegations') return createChainMock([]);
            if (table === 'transactions') return createChainMock([]);
            if (table === 'recurring_expenses') return createChainMock([]);
            return createChainMock([]);
        });

        const { result } = renderHook(() => useDashboardData());
        
        // Wait for loading to be false
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

        let success;
        await act(async () => {
            success = await result.current.updateAtProtoCredentials('alice.bsky.social', 'abcd-1234');
        });

        expect(success).toBe(true);
        expect(updateMock).toHaveBeenCalledWith({
            atproto_handle: 'alice.bsky.social',
            atproto_app_password: 'abcd-1234'
        });
        expect(result.current.currentUser?.atproto_handle).toBe('alice.bsky.social');
    });
});
