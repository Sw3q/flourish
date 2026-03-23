import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { MemoryRouter } from 'react-router-dom';
import * as useDashboardDataHook from '../hooks/useDashboardData';
import * as useProposalsHook from '../hooks/useProposals';

vi.mock('../hooks/useDashboardData');
vi.mock('../hooks/useProposals');
vi.mock('../hooks/useHypercerts', () => ({
    useHypercerts: () => ({
        linkAtProtoIdentity: vi.fn(),
        resolveHandle: vi.fn(),
    }),
}));

describe('Dashboard', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        floor_id: 'floor-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useDashboardDataHook.useDashboardData as any).mockReturnValue({
            currentUser: mockUser,
            members: [],
            votingPower: 100,
            fundBalance: 5000,
            monthlyBurnRate: 1500,
            loading: false,
            proposalDelegations: {},
            updateAtProtoCredentials: vi.fn(),
            delegateVote: vi.fn(),
            delegateVoteForProposal: vi.fn(),
            getVotingPower: vi.fn(),
            refreshData: vi.fn(),
            floorName: 'Test Floor',
        });

        (useProposalsHook.useProposals as any).mockReturnValue({
            proposals: [],
            categories: [],
            userVotes: {},
            proposalVotes: {},
            participationMap: {},
            totalApprovedUsers: 1,
            createProposal: vi.fn(),
            castVote: vi.fn(),
            deleteProposal: vi.fn(),
            updateProposalHypercert: vi.fn(),
            refreshData: vi.fn(),
        });
    });

    it('renders the condensed one-line header with stats', () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Floor')).toBeDefined();
        expect(screen.getByText('Liquidity Pool')).toBeDefined();
        expect(screen.getByText('$5,000')).toBeDefined();
        expect(screen.getByText('Voting Weight')).toBeDefined();
        expect(screen.getByText('100')).toBeDefined();
        expect(screen.getByText('Monthly Expenses')).toBeDefined();
        expect(screen.getByText('$1,500')).toBeDefined();
    });

    it('renders the Launch New Proposal button', () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText(/Launch New Proposal/i)).toBeDefined();
    });

    it('disables delegation button for members who delegate to current user', () => {
        (useDashboardDataHook.useDashboardData as any).mockReturnValue({
            currentUser: mockUser,
            members: [
                { id: 'user-abc', email: 'normal@test.com', delegated_to: null, role: 'member' },
                { id: 'user-xyz', email: 'circular@test.com', delegated_to: 'user-123', role: 'member' },
            ],
            votingPower: 100,
            fundBalance: 5000,
            monthlyBurnRate: 1500,
            loading: false,
            proposalDelegations: {},
            updateAtProtoCredentials: vi.fn(),
            delegateVote: vi.fn(),
            delegateVoteForProposal: vi.fn(),
            getVotingPower: vi.fn(),
            refreshData: vi.fn(),
            floorName: 'Test Floor',
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        const normalBtn = screen.getByText('normal').closest('button');
        expect(normalBtn).toBeDefined();
        expect(normalBtn).not.toHaveProperty('disabled', true);

        const circularBtn = screen.getByText('circular').closest('button');
        expect(circularBtn).toBeDefined();
        expect(screen.getByText('Delegates to you')).toBeDefined();
        expect(circularBtn).toHaveProperty('title', 'This user is already delegating to you. Circular delegation is not allowed.');
        expect(circularBtn).toHaveProperty('disabled', true);
    });
});
