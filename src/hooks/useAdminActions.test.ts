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
});
