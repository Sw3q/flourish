import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { supabase } from '../lib/supabase';

// Mock the components and hooks
vi.mock('./Sidebar', () => ({
    default: ({ isOpen, onToggle }: any) => (
        <div data-testid="sidebar">
            Sidebar {isOpen ? 'Open' : 'Closed'}
            <button onClick={onToggle}>Toggle</button>
        </div>
    ),
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { is_approved: true, role: 'member' } })),
                })),
            })),
        })),
    },
}));

describe('AuthLayout Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders sidebar and outlet when session and approved', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({ 
            data: { session: { user: { id: 'u1', email: 'test@test.com' } } } 
        });

        render(<AuthLayout />, { wrapper: BrowserRouter });

        // Wait for loading to finish
        const sidebar = await screen.findByTestId('sidebar');
        expect(sidebar).toBeDefined();
        expect(screen.getByText('Sidebar Open')).toBeDefined();
    });
});
