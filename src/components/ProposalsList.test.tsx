import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProposalsList from './ProposalsList';
import { useProposals } from '../hooks/useProposals';

// Mock the hook
vi.mock('../hooks/useProposals', () => ({
    useProposals: vi.fn(),
}));

const PROPOSAL_ID = 'prop-1';
const OTHER_PROPOSAL_ID = 'prop-2';
const CATEGORY_ID = 'cat-1';

const mockProposal = {
    id: PROPOSAL_ID,
    title: 'Test Proposal',
    description: 'A test proposal description',
    amount: 100,
    status: 'active' as const,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    quorum_reached_at: null,
    category_id: CATEGORY_ID,
    creator_id: 'user-2',
    categories: { name: 'Tech', color_theme: 'blue' },
    profiles: { email: 'user2@test.com' },
};

const mockProposal2 = {
    ...mockProposal,
    id: OTHER_PROPOSAL_ID,
    title: 'Other Proposal in Same Category',
};

const defaultProps = {
    currentUserId: 'user-1',
    currentFloorId: 'floor-1',
    members: [{ id: 'user-2', email: 'user2@test.com', delegated_to: null, role: 'member' as const, is_approved: true, floor_id: 'floor-1' }],
    proposalDelegations: {},
    globalDelegatedTo: null,
    onDelegateProposal: vi.fn(),
    getVotingPower: vi.fn().mockResolvedValue(1),
};

const mockUseProposals = {
    proposals: [mockProposal, mockProposal2],
    categories: [{ id: CATEGORY_ID, name: 'Tech', color_theme: 'blue' }],
    userVotes: {},
    proposalVotes: {
        [PROPOSAL_ID]: { yes: 0, total: 1 },
        [OTHER_PROPOSAL_ID]: { yes: 0, total: 1 },
    },
    participationMap: {},
    totalApprovedUsers: 2,
    createProposal: vi.fn(),
    castVote: vi.fn(),
    deleteProposal: vi.fn(),
    updateProposalHypercert: vi.fn(),
};

describe('ProposalsList Component — Delegation Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useProposals as any).mockReturnValue(mockUseProposals);
    });

    it('shows voting buttons when NO delegation is active for any proposal', async () => {
        render(<ProposalsList {...defaultProps} />);

        // Only one card is shown at a time
        const yesButtons = await screen.findAllByText(/Yes \(1\)/);
        expect(yesButtons.length).toBe(1); 
        expect(screen.queryByText(/Voting power delegated/)).toBeNull();
    });

    it('hides all voting buttons when global delegation is set', async () => {
        render(<ProposalsList {...defaultProps} globalDelegatedTo="user-2" />);

        // No Yes buttons — the visible proposal is delegated globally
        expect(screen.queryByText(/Yes \(1\)/)).toBeNull();
        const delegatedMsgs = screen.getAllByText(/Voting power delegated/);
        expect(delegatedMsgs.length).toBe(1);
    });

    it('hides buttons only for the specific proposal when per-proposal delegation is set', async () => {
        render(
            <ProposalsList
                {...defaultProps}
                // Only prop-1 is delegated
                proposalDelegations={{ [PROPOSAL_ID]: 'user-2' }}
            />
        );

        // prop-1 (visible initially) should show "Voting power delegated"
        expect(screen.getByText(/Voting power delegated/)).toBeDefined();

        // Navigate to prop-2
        fireEvent.click(screen.getAllByLabelText('Next proposal')[0]);

        // prop-2 should still show Yes button
        expect(await screen.findByText(/Yes \(1\)/)).toBeDefined();
    });

    it('per-proposal delegation does NOT affect other proposals in the same category', async () => {
        render(
            <ProposalsList
                {...defaultProps}
                proposalDelegations={{ [PROPOSAL_ID]: 'user-2' }}
            />
        );

        // Exactly 1 delegation message for prop-1
        let delegatedMsgs = screen.getAllByText(/Voting power delegated/);
        expect(delegatedMsgs.length).toBe(1);

        // Navigate to prop-2
        fireEvent.click(screen.getAllByLabelText('Next proposal')[0]);

        // prop-2 (same category-1) should still render its Yes button
        expect(await screen.findByText(/Yes \(1\)/)).toBeDefined();
    });

    it('disables per-proposal delegation when peer delegates globally to current user', async () => {
        const circularProps = {
            ...defaultProps,
            members: [{ id: 'user-2', email: 'user2@test.com', delegated_to: 'user-1', role: 'member' as const, is_approved: true, floor_id: 'floor-1' }],
        };
        render(<ProposalsList {...circularProps} />);

        // The DelegationPill button should be disabled and have title "Delegates to you" and text "(Loop)"
        const delegateBtn = await screen.findByText(/user2.*\(Loop\)/);
        expect(delegateBtn).toBeDefined();
        expect((delegateBtn as HTMLButtonElement).disabled).toBe(true);
        expect(delegateBtn.getAttribute('title')).toBe('Delegates to you');
    });
});

describe('ProposalsList Component — Tab Navigation & Swipe-to-Dismiss', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Since userVotes is empty initially, both mock proposals are unvoted
        (useProposals as any).mockReturnValue({
            ...mockUseProposals,
            userVotes: {},
        });
    });

    it('shows the To Vote tab with unvoted proposals by default', () => {
        render(<ProposalsList {...defaultProps} />);
        
        // Tab exists and shows correct counts
        expect(screen.getByText(/Pending Actions/i)).toBeDefined();
        expect(screen.getByText(/Personal Record/i)).toBeDefined();
        
        // Counter "1 of 2" in the To Vote tab
        expect(screen.getByText('1 of 2 Entries')).toBeDefined();
        
        // The first card's title is visible
        expect(screen.getByText('Test Proposal')).toBeDefined();
    });

    it('moves a proposal to My Votes when voted on', async () => {
        // We'll mock castVote to simulate the user voting, 
        // but since we don't have a real DB backend in the unit test, 
        // we test the internal state / mock update mechanism.
        // For testing the component behavior, we can remock useProposals midway.

        const { rerender } = render(<ProposalsList {...defaultProps} />);
        
        expect(screen.getByText('1 of 2 Entries')).toBeDefined();

        // Simulate casting a vote from the app layer
        (useProposals as any).mockReturnValue({
            ...mockUseProposals,
            userVotes: { [PROPOSAL_ID]: true }, // User voted YES on prop-1
        });

        // Re-render with the updated hook state
        rerender(<ProposalsList {...defaultProps} />);

        // Now To Vote tab only has 1 proposal (prop-2)
        expect(screen.getByText('1 of 1 Entries')).toBeDefined();
        
        // The visible card in To Vote should now be prop-2
        expect(screen.getByText('Other Proposal in Same Category')).toBeDefined();
        expect(screen.queryByText('Test Proposal')).toBeNull();

        // Switch to My Votes tab
        fireEvent.click(screen.getByText(/Personal Record/i));

        // The voted proposal should be here
        expect(screen.getByText('Test Proposal')).toBeDefined();
    });
});
