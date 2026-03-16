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

    it('should call signInWithPassword and redirect to / on successful login', async () => {
        // Setup mock to succeed
        (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({ data: {}, error: null });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const emailInput = screen.getByPlaceholderText('you@frontier.com');
        const passwordInput = screen.getByPlaceholderText('••••••••');
        const submitBtn = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            // The bug: it wasn't navigating. We test that it should navigate.
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        });
    });
});
