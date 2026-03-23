import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PendingApproval from './PendingApproval';
import { supabase } from '../lib/supabase';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('PendingApproval Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should navigate to / if manual status check returns approved', async () => {
        // Mock getUser
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'user123' } } });

        // Mock the profiles fetch to return is_approved: true
        const mockSingle = vi.fn().mockResolvedValueOnce({ data: { is_approved: true } });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        render(
            <MemoryRouter>
                <PendingApproval />
            </MemoryRouter>
        );

        const checkBtn = screen.getByRole('button', { name: /sync status/i });
        fireEvent.click(checkBtn);

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('profiles');
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('should stay on page if status check returns unapproved', async () => {
        (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: { id: 'user123' } } });
        const mockSingle = vi.fn().mockResolvedValueOnce({ data: { is_approved: false } });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        (supabase.from as any).mockReturnValue({ select: () => ({ eq: mockEq }) });

        render(
            <MemoryRouter>
                <PendingApproval />
            </MemoryRouter>
        );

        const checkBtn = screen.getByRole('button', { name: /sync status/i });
        fireEvent.click(checkBtn);

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('profiles');
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});
