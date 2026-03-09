import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminActions } from './useAdminActions';
import { supabase } from '../lib/supabase';

describe('useAdminActions Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with loading true and isAdmin false', () => {
        // Mock getUser to return null to simulate no user
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });

        const { result } = renderHook(() => useAdminActions());

        expect(result.current.loading).toBe(true);
        expect(result.current.isAdmin).toBe(false);
    });

    it('should set isAdmin to true if user has admin role', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'admin123' } } });
        
        const mockSingle = vi.fn().mockResolvedValueOnce({ data: { role: 'admin' } });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        (supabase.from as any).mockReturnValue({ select: () => ({ eq: mockEq, order: vi.fn().mockResolvedValue({ data: [] }) }) });
        
        const { result } = renderHook(() => useAdminActions());

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(true);
        });
    });

    it('should set isAdmin to false and stop loading if user has member role', async () => {
         (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'member123' } } });
        
        const mockSingle = vi.fn().mockResolvedValueOnce({ data: { role: 'member' } });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        (supabase.from as any).mockReturnValue({ select: () => ({ eq: mockEq, order: vi.fn().mockResolvedValue({ data: [] }) }) });
        
        const { result } = renderHook(() => useAdminActions());

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(false);
            expect(result.current.loading).toBe(false);
        });
    });

    it('should successfully add funds', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions());

        const mockInsert = vi.fn().mockResolvedValueOnce({ error: null });
        (supabase.from as any).mockReturnValue({ insert: mockInsert, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) });

        let success;
        await act(async () => {
            success = await result.current.addFunds(100);
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([
            { amount: 100, type: 'deposit', description: 'Admin Manual Deposit' }
        ]);
        expect(result.current.fundBalance).toBe(100);
    });

    it('should fail to add negative funds', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions());

        let success;
        await act(async () => {
            success = await result.current.addFunds(-50);
        });

        expect(success).toBe(false);
    });

    it('should create a recurring expense successfully', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions());

        const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', title: 'New Expense', amount: 50, category_id: 'cat1', is_active: true }});
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        (supabase.from as any).mockReturnValue({ insert: mockInsert, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) });

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
        const { result } = renderHook(() => useAdminActions());

        let success = await result.current.createRecurringExpense('', 50, 'cat1');
        expect(success).toBe(false);
        success = await result.current.createRecurringExpense('Test', -10, 'cat1');
        expect(success).toBe(false);
    });

    it('should toggle a recurring expense', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
        const { result } = renderHook(() => useAdminActions());
        
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
        const { result } = renderHook(() => useAdminActions());
        
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
        const { result } = renderHook(() => useAdminActions());

        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({ insert: mockInsert, select: () => ({ order: vi.fn().mockResolvedValue({ data: [] })}) });

        let success;
        await act(async () => {
            success = await result.current.processRecurringExpense({ id: 'exp1', title: 'Test', amount: 30, category_id: 'cat1', is_active: true, created_at: '' });
        });

        expect(success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith([{ amount: 30, type: 'withdrawal', description: 'Recurring Expense: Test' }]);
        expect(result.current.fundBalance).toBe(-30);
    });
});
