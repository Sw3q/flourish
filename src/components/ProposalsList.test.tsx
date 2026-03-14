import { render, screen } from '@testing-library/react';
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
    members: [{ id: 'user-2', email: 'user2@test.com', delegated_to: null, role: 'member' }],
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

        const yesButtons = await screen.findAllByText(/Yes \(1\)/);
        expect(yesButtons.length).toBe(2); // both proposals show Yes button
        expect(screen.queryByText(/Voting power delegated/)).toBeNull();
    });

    it('hides all voting buttons when global delegation is set', async () => {
        render(<ProposalsList {...defaultProps} globalDelegatedTo="user-2" />);

        // No Yes buttons — both proposals are delegated globally
        expect(screen.queryByText(/Yes \(1\)/)).toBeNull();
        const delegatedMsgs = screen.getAllByText(/Voting power delegated/);
        expect(delegatedMsgs.length).toBe(2);
    });

    it('hides buttons only for the specific proposal when per-proposal delegation is set', async () => {
        render(
            <ProposalsList
                {...defaultProps}
                // Only prop-1 is delegated
                proposalDelegations={{ [PROPOSAL_ID]: 'user-2' }}
            />
        );

        // prop-1 should show "Voting power delegated"
        expect(screen.getByText(/Voting power delegated/)).toBeDefined();

        // prop-2 should still show Yes button (async because it waits for power fetch)
        expect(await screen.findByText(/Yes \(1\)/)).toBeDefined();
    });

    it('per-proposal delegation does NOT affect other proposals in the same category', async () => {
        render(
            <ProposalsList
                {...defaultProps}
                proposalDelegations={{ [PROPOSAL_ID]: 'user-2' }}
            />
        );

        // Exactly 1 delegation message (for prop-1)
        const delegatedMsgs = screen.getAllByText(/Voting power delegated/);
        expect(delegatedMsgs.length).toBe(1);

        // prop-2 (same category-1) should still render its Yes button
        expect(await screen.findByText(/Yes \(1\)/)).toBeDefined();
    });
});
