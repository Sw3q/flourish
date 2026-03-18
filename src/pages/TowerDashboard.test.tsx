import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TowerDashboard from './TowerDashboard';
import { useTowerStats } from '../hooks/useTowerStats';

// Mock the hooks
vi.mock('../hooks/useTowerStats', () => ({
    useTowerStats: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useParams: () => ({}),
    };
});

describe('TowerDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', () => {
        (useTowerStats as any).mockReturnValue({
            floors: [],
            totalBalance: 0,
            totalActiveProposals: 0,
            totalMembers: 0,
            loading: true,
        });

        render(<TowerDashboard />, { wrapper: BrowserRouter });
        expect(document.querySelector('.animate-spin')).toBeDefined();
    });

    it('renders expanded stats with new design', () => {
        (useTowerStats as any).mockReturnValue({
            floors: [
                {
                    floor: { id: 'f1', name: 'Tech Floor', floor_number: 1 },
                    balance: 1000,
                    activeProposals: 2,
                    memberCount: 5,
                },
            ],
            totalBalance: 1234.56,
            totalActiveProposals: 2,
            totalMembers: 5,
            loading: false,
        });

        render(<TowerDashboard />, { wrapper: BrowserRouter });

        expect(screen.getByText(/Frontier/)).toBeDefined();
        expect(screen.getByText(/Verticality/)).toBeDefined();
        expect(screen.getAllByText(/\$1,234/)).toBeDefined();
        expect(screen.getByText('2')).toBeDefined();
        expect(screen.getByText('5')).toBeDefined();
    });
});
