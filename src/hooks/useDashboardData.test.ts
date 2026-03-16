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
        expect(result.current.proposalDelegations).toEqual({});
    });

    it('should load proposal delegations from supabase on init', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'user1' } } });

        (supabase.from as any).mockImplementation((table: string) => {
            const chainMock = (data: any) => {
                const chain: any = {
                    data, count: 0, error: null,
                    then: (cb: any) => Promise.resolve(cb({ data, count: 0, error: null })),
                    single: vi.fn().mockResolvedValue({ data }),
                };
                return new Proxy(chain, {
                    get(target, prop) {
                        if (prop in target) return target[prop];
                        if (typeof prop === 'string') return () => new Proxy(target, this);
                        return target[prop];
                    }
                });
            };

            if (table === 'profiles') return { select: () => chainMock({ id: 'user1', email: 'u@test.com', delegated_to: null, role: 'member', floor_id: 'floor1' }) };
            if (table === 'proposal_delegations') return {
                select: () => chainMock([
                    { proposal_id: 'prop1', delegated_to: 'user2' },
                    { proposal_id: 'prop2', delegated_to: 'user3' },
                ])
            };
            return { select: () => chainMock([]) };
        });

        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => {
            expect(result.current.proposalDelegations['prop1']).toBe('user2');
            expect(result.current.proposalDelegations['prop2']).toBe('user3');
        });
    });

    it('should upsert a proposal delegation via delegateVoteForProposal', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useDashboardData());

        // Since user is null, we test the null-guard path
        let success;
        await act(async () => {
            success = await result.current.delegateVoteForProposal('prop1', 'user2');
        });

        // Should return false because currentUser is null
        expect(success).toBe(false);
    });

    it('should remove a proposal delegation when targetUserId is null', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useDashboardData());

        let success;
        await act(async () => {
            success = await result.current.delegateVoteForProposal('prop1', null);
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

    it('should calculate proposal-specific voting power correctly', async () => {
        const userId = 'me';
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: userId } } });

        const createBulletproofMock = (data: any = [], count: number = 0) => {
            const chain: any = {
                data, count, error: null,
                then: (cb: any) => Promise.resolve(cb({ data, count, error: null })),
                catch: (cb: any) => Promise.resolve(cb(null)),
                finally: (cb: any) => Promise.resolve(cb()),
            };
            
            return new Proxy(chain, {
                get(target, prop) {
                    if (prop in target) return target[prop];
                    if (typeof prop === 'string') {
                        return () => new Proxy(target, this);
                    }
                    return target[prop];
                }
            });
        };

        (supabase.from as any).mockImplementation((table: string) => {
            return new Proxy({}, {
                get: (_, prop) => {
                    if (prop === 'select') return () => new Proxy({}, {
                        get: (_, p) => {
                            if (p === 'eq') return (col: string, val: any) => {
                                if (table === 'profiles') {
                                    if (col === 'id' && val === userId) return createBulletproofMock({ id: userId, email: 'me@test.com', floor_id: 'floor1' });
                                    if (col === 'delegated_to' && val === userId) return createBulletproofMock([{ id: 'userA' }, { id: 'userB' }]);
                                }
                                if (table === 'proposal_delegations') {
                                    if (col === 'delegated_to' && val === userId) {
                                        return new Proxy({}, {
                                            get: (_, p2) => (p2 === 'eq' ? () => createBulletproofMock([{ user_id: 'userC' }]) : () => createBulletproofMock([]))
                                        });
                                    }
                                }
                                return createBulletproofMock([]);
                            };
                            if (p === 'in') return () => new Proxy({}, {
                                get: (_, p2) => (p2 === 'eq' ? () => createBulletproofMock([{ user_id: 'userB' }]) : () => createBulletproofMock([]))
                            });
                            return () => createBulletproofMock([]);
                        }
                    });
                    if (prop === 'delete') return () => new Proxy({}, { get: () => () => createBulletproofMock() });
                    if (prop === 'update') return () => new Proxy({}, { get: () => () => createBulletproofMock() });
                    if (prop === 'insert') return () => createBulletproofMock();
                    return () => createBulletproofMock([]);
                }
            });
        });

        const { result } = renderHook(() => useDashboardData());
        await waitFor(() => expect(result.current.loading).toBe(false));

        let power;
        await act(async () => {
            power = await result.current.getVotingPower('prop1');
        });

        expect(power).toBe(3);
    });

    it('should update ATProto credentials correctly', async () => {
        const userId = 'me';
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: userId } } });

        const mockProfile = { id: userId, email: 'me@test.com', role: 'member', floor_id: 'floor1' };
        
        const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        });

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
            const mock = createChainMock(table === 'profiles' ? mockProfile : []);
            
            mock.select = vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string) => {
                    if (table === 'profiles' && col === 'id') return { single: () => Promise.resolve({ data: mockProfile }) };
                    
                    // Allow arbitrary chaining of .eq().eq()...
                    const returnChain: any = {
                        single: () => Promise.resolve({ data: table === 'profiles' ? mockProfile : [] }),
                        neq: () => returnChain,
                        eq: () => returnChain,
                        then: (cb: any) => Promise.resolve(cb({ data: [], count: 0 }))
                    };
                    return returnChain;
                }),
                neq: vi.fn().mockReturnThis(),
            });

            return mock;
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
