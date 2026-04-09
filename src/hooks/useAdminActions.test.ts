import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminActions, getNextBillingDate } from './useAdminActions';
import { supabase } from '../lib/supabase';

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
            if (typeof prop === 'string') return () => new Proxy(target, this);
            return target[prop];
        }
    });
};

describe('useAdminActions Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with loading true and isAdmin false', () => {
        // Mock getUser to return null to simulate no user
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });

        const { result } = renderHook(() => useAdminActions('floor1', 'member'));

        expect(result.current.loading).toBe(true);
        expect(result.current.isAdmin).toBe(false);
    });

    it('should set isAdmin to true if user has admin role', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'admin123' } } });
        
        const mockData = { role: 'admin' };
        const bpMock = createBulletproofMock([mockData]);
        bpMock.single = vi.fn().mockResolvedValue({ data: mockData });
        const mockEq = vi.fn().mockReturnValue(bpMock);
        const mockOrder = vi.fn().mockReturnValue(bpMock);
        (supabase.from as any).mockReturnValue({ select: () => ({ eq: mockEq, order: mockOrder }) });
        
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(true);
        });
    });

    it('should set isAdmin to false and stop loading if user has member role', async () => {
         (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'member123' } } });
        
        const mockData = { role: 'member' };
        const bpMock = createBulletproofMock([mockData]);
        bpMock.single = vi.fn().mockResolvedValue({ data: mockData });
        const mockEq = vi.fn().mockReturnValue(bpMock);
        const mockOrder = vi.fn().mockReturnValue(bpMock);
        (supabase.from as any).mockReturnValue({ select: () => ({ eq: mockEq, order: mockOrder }) });
        
        const { result } = renderHook(() => useAdminActions('floor1', 'member'));

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.loading).toBe(false);
        });
    });

    it('should successfully add funds', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        const mockInsert = vi.fn().mockResolvedValueOnce({ error: null });
        const mockSelectReturn: any = { eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) };
        (supabase.from as any).mockReturnValue({ insert: mockInsert, select: () => mockSelectReturn });

        let success;
        await act(async () => {
            success = await result.current.addFunds(100);
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([
            { amount: 100, type: 'deposit', description: 'Admin Manual Deposit', floor_id: 'floor1' }
        ]);
        expect(result.current.fundBalance).toBe(100);
    });

    it('should fail to add negative funds', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        let success;
        await act(async () => {
            success = await result.current.addFunds(-50);
        });

        expect(success).toBe(false);
    });

    it('should create a recurring expense successfully', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', title: 'New Expense', amount: 50, category_id: 'cat1', is_active: true }});
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockSelectReturn: any = { eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) };
        (supabase.from as any).mockReturnValue({ insert: mockInsert, select: () => mockSelectReturn });

        let success;
        await act(async () => {
            success = await result.current.createRecurringExpense('New Expense', 50, 'cat1');
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalled();
        expect(result.current.recurringExpenses.length).toBe(1);
        expect(result.current.recurringExpenses[0].title).toBe('New Expense');
    });

    it('should fail to create a recurring expense with invalid data', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        let success = await result.current.createRecurringExpense('', 50, 'cat1');
        expect(success).toBe(false);
        success = await result.current.createRecurringExpense('Test', -10, 'cat1');
        expect(success).toBe(false);
    });

    it('should toggle a recurring expense', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));
        
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'exp1', title: 'Test', amount: 10, category_id: 'cat1', is_active: true }});
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'recurring_expenses') {
                return { insert: mockInsert, update: mockUpdate, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) };
            }
            return { select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) };
        });

        await act(async () => {
            await result.current.createRecurringExpense('Test', 10, 'cat1');
        });

        expect(result.current.recurringExpenses[0].is_active).toBe(true);

        await act(async () => {
            await result.current.toggleRecurringExpense('exp1', false);
        });

        expect(result.current.recurringExpenses[0].is_active).toBe(false);
    });

    it('should update a recurring expense', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));
        
        const mockSingleInsert = vi.fn().mockResolvedValue({ data: { id: 'exp1', title: 'Test', amount: 10, category_id: 'cat1', is_active: true }});
        const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });
        
        const mockSingleUpdate = vi.fn().mockResolvedValue({ data: { id: 'exp1', title: 'Updated Test', amount: 20, category_id: 'cat2', is_active: true }});
        const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
        const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'recurring_expenses') {
                return { insert: mockInsert, update: mockUpdate, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) };
            }
            return { select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) };
        });

        await act(async () => {
            await result.current.createRecurringExpense('Test', 10, 'cat1');
        });

        await act(async () => {
            await result.current.updateRecurringExpense('exp1', 'Updated Test', 20, 'cat2');
        });

        expect(result.current.recurringExpenses[0].title).toBe('Updated Test');
        expect(result.current.recurringExpenses[0].amount).toBe(20);
    });

    it('should process a recurring expense as a withdrawal', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({
            insert: mockInsert,
            update: mockUpdate,
            select: () => ({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) }),
        });

        let success;
        await act(async () => {
            success = await result.current.processRecurringExpense({ id: 'exp1', title: 'Test', amount: 30, category_id: 'cat1', is_active: true, created_at: '', recurrence_interval: 'monthly' });
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([{ amount: 30, type: 'withdrawal', description: 'Recurring Expense: Test', floor_id: 'floor1' }]);
        expect(result.current.fundBalance).toBe(-30);
    });
    it('should promote a member to admin', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'admin123' } } });
        
        const mockUser = { id: 'user123', email: 'user@test.com', role: 'member' as const, is_approved: true };
        const mockUpdate = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' } });
        const mockOrder = vi.fn().mockReturnThis();

        const mockProfiles = {
            select: mockSelect,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
            order: mockOrder,
            then: (cb: any) => Promise.resolve(cb({ data: [mockUser], error: null }))
        };
        (supabase.from as any).mockReturnValue(mockProfiles);

        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
            success = await result.current.promoteUser('user123');
        });

        expect(success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin', is_approved: true });
        expect(result.current.users[0].role).toBe('admin');
    });

    it('should promote an admin to super_admin', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'admin123' } } });
        
        const mockUser = { id: 'admin123', email: 'admin@test.com', role: 'admin' as const, is_approved: true };
        const mockUpdate = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' } });
        const mockOrder = vi.fn().mockReturnThis();

        const mockProfiles = {
            select: mockSelect,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
            order: mockOrder,
            then: (cb: any) => Promise.resolve(cb({ data: [mockUser], error: null }))
        };
        (supabase.from as any).mockReturnValue(mockProfiles);

        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
            success = await result.current.promoteUser('admin123');
        });

        expect(success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ role: 'super_admin', is_approved: true });
        expect(result.current.users[0].role).toBe('super_admin');
    });

    it('should demote a super_admin to admin', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'admin123' } } });
        
        const mockUser = { id: 'sa123', email: 'sa@test.com', role: 'super_admin' as const, is_approved: true };
        const mockUpdate = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' } });
        const mockOrder = vi.fn().mockReturnThis();

        const mockProfiles = {
            select: mockSelect,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
            order: mockOrder,
            then: (cb: any) => Promise.resolve(cb({ data: [mockUser], error: null }))
        };
        (supabase.from as any).mockReturnValue(mockProfiles);

        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
            success = await result.current.demoteUser('sa123');
        });

        expect(success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' });
        expect(result.current.users[0].role).toBe('admin');
    });

    it('should demote an admin to member', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'admin123' } } });
        
        const mockUser = { id: 'admin567', email: 'admin@test.com', role: 'admin' as const, is_approved: true };
        const mockUpdate = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' } });
        const mockOrder = vi.fn().mockReturnThis();

        const mockProfiles = {
            select: mockSelect,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
            order: mockOrder,
            then: (cb: any) => Promise.resolve(cb({ data: [mockUser], error: null }))
        };
        (supabase.from as any).mockReturnValue(mockProfiles);

        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success;
        await act(async () => {
            success = await result.current.demoteUser('admin567');
        });

        expect(success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ role: 'member' });
        expect(result.current.users[0].role).toBe('member');
    });

    it('should setBalance by inserting a deposit transaction for the delta', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ update: mockUpdate, select: () => ({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) }) });

        let success;
        await act(async () => {
            success = await result.current.setBalance(800);
        });

        expect(success).toBe(null);
        expect(mockUpdate).toHaveBeenCalledWith({ balance: 800 });
        expect(mockEq).toHaveBeenCalledWith('id', 'floor1');
        expect(result.current.fundBalance).toBe(800);
    });

    it('should setBalance to a lower value via floors update', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ update: mockUpdate, select: () => ({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) }) });

        let success;
        await act(async () => {
            success = await result.current.setBalance(600);
        });

        expect(success).toBe(null);
        expect(mockUpdate).toHaveBeenCalledWith({ balance: 600 });
        expect(mockEq).toHaveBeenCalledWith('id', 'floor1');
        expect(result.current.fundBalance).toBe(600);
    });

    it('should reject and delete a user successfully', async () => {
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'admin123' } } });
        
        const mockUser = { id: 'user123', email: 'user@test.com', role: 'member' as const, is_approved: false };
        
        // Mock the RPC call
        (supabase.rpc as any).mockResolvedValue({ error: null });

        // Robust mock for profiles queries
        const mockProfiles = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
            order: vi.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve(cb({ data: [mockUser], error: null }))
        };
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') return mockProfiles;
            return createBulletproofMock([]);
        });

        const { result } = renderHook(() => useAdminActions('floor1', 'admin'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.users.length).toBe(1);

        let success;
        await act(async () => {
            success = await result.current.rejectUser('user123');
        });

        expect(success).toBe(true);
        expect(supabase.rpc).toHaveBeenCalledWith('reject_user', { target_user_id: 'user123' });
        expect(result.current.users.length).toBe(0);
    });
});

describe('getNextBillingDate utility', () => {
    it('returns created_at + 1 month when interval is monthly and last_processed_at is null', () => {
        const created = new Date('2026-01-01T00:00:00Z');
        const expense: any = {
            id: '1', title: 'Test', amount: 100, category_id: 'cat1',
            is_active: true, created_at: created.toISOString(), last_processed_at: null,
            recurrence_interval: 'monthly'
        };
        const next = getNextBillingDate(expense);
        expect(next.getUTCMonth()).toBe(1); // Feb
        expect(next.getUTCDate()).toBe(1);
    });

    it('returns base + 7 days when interval is weekly', () => {
        const created = new Date('2026-01-01T00:00:00Z');
        const expense: any = {
            id: '1', title: 'Test', amount: 100, category_id: 'cat1',
            is_active: true, created_at: created.toISOString(), last_processed_at: null,
            recurrence_interval: 'weekly'
        };
        const next = getNextBillingDate(expense);
        expect(next.getUTCDate()).toBe(8);
    });

    it('returns base + 1 year when interval is yearly', () => {
        const created = new Date('2026-01-01T00:00:00Z');
        const expense: any = {
            id: '1', title: 'Test', amount: 100, category_id: 'cat1',
            is_active: true, created_at: created.toISOString(), last_processed_at: null,
            recurrence_interval: 'yearly'
        };
        const next = getNextBillingDate(expense);
        expect(next.getUTCFullYear()).toBe(2027);
    });

    it('respects last_processed_at when computing next date', () => {
        const processed = new Date('2026-02-15T00:00:00Z');
        const expense: any = {
            id: '1', title: 'Test', amount: 100, category_id: 'cat1',
            is_active: true, created_at: '2026-01-01T00:00:00Z', 
            last_processed_at: processed.toISOString(),
            recurrence_interval: 'monthly'
        };
        const next = getNextBillingDate(expense);
        expect(next.getUTCMonth()).toBe(2); // March
        expect(next.getUTCDate()).toBe(15);
    });
});

