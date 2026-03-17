import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import BuildingView from './BuildingView';
import { useTowerStats } from '../hooks/useTowerStats';

// Mock the hook
vi.mock('../hooks/useTowerStats', () => ({
    useTowerStats: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
    };
});

describe('BuildingView Component', () => {
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

        render(<BuildingView />, { wrapper: BrowserRouter });
        expect(screen.getByRole('status', { hidden: true }) || document.querySelector('.animate-spin')).toBeDefined();
    });

    it('renders stats and floor cards', () => {
        (useTowerStats as any).mockReturnValue({
            floors: [
                {
                    floor: { id: 'f1', name: 'Tech Floor', floor_number: 1 },
                    balance: 1000,
                    activeProposals: 2,
                    memberCount: 5,
                },
            ],
            totalBalance: 1000,
            totalActiveProposals: 2,
            totalMembers: 5,
            loading: false,
        });

        render(<BuildingView />, { wrapper: BrowserRouter });

        expect(screen.getByText('Building')).toBeDefined();
        expect(screen.getByText('$1,000.00')).toBeDefined();
        expect(screen.getByText('2')).toBeDefined();
        expect(screen.getByText('5')).toBeDefined();
        expect(screen.getByText('Tech Floor')).toBeDefined();
    });

    it('navigates to floor on click', () => {
        (useTowerStats as any).mockReturnValue({
            floors: [
                {
                    floor: { id: 'f1', name: 'Tech Floor', floor_number: 1 },
                    balance: 1000,
                    activeProposals: 2,
                    memberCount: 5,
                },
            ],
            totalBalance: 1000,
            totalActiveProposals: 2,
            totalMembers: 5,
            loading: false,
        });

        render(<BuildingView />, { wrapper: BrowserRouter });

        const floorCard = screen.getByText('Tech Floor').closest('button');
        if (floorCard) {
            fireEvent.click(floorCard);
            expect(mockNavigate).toHaveBeenCalledWith('/floor/f1');
        }
    });
});
