import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from './Login';
import { supabase } from '../lib/supabase';

// Mock useFloors
vi.mock('../hooks/useFloors', () => ({
    useFloors: () => [{ id: 'floor1', name: 'Test Floor' }]
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call signInWithOtp and show success message', async () => {
        // Setup mock to succeed
        (supabase.auth.signInWithOtp as any).mockResolvedValueOnce({ data: {}, error: null });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        // Wait for check existence debounce to clear
        await waitFor(() => expect(screen.queryByRole('button', { name: /sign in/i })).toBeDefined());

        const emailInput = screen.getByPlaceholderText('you@frontier.com');
        const submitBtn = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
                email: 'test@example.com',
                options: expect.anything()
            });
            expect(screen.getByText(/Check your email for the magic link!/i)).toBeDefined();
        });
    });
});
