import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HypercertClaimSection from './HypercertClaimSection';
import type { OfferAsk, Profile, HypercertClaimRecord } from '../types';

const mockHookState: {
    claims: HypercertClaimRecord[];
    requestClaim: any;
    resolveClaim: any;
    attachUri: any;
} = {
    claims: [],
    requestClaim: vi.fn().mockResolvedValue(true),
    resolveClaim: vi.fn().mockResolvedValue(true),
    attachUri: vi.fn().mockResolvedValue(true),
};

vi.mock('../hooks/useHypercertClaims', () => ({
    useHypercertClaims: () => mockHookState,
}));

vi.mock('../hooks/useHypercerts', () => ({
    useHypercerts: () => ({
        createHypercert: vi.fn().mockResolvedValue({ uri: 'at://did:plc:x/coll/rkey' }),
        loading: false,
    }),
}));

const post: OfferAsk = {
    id: 'p1',
    type: 'offer',
    title: 'Help with React',
    description: 'I helped them',
    creator_id: 'creator-1',
    floor_id: 'f1',
    status: 'completed',
    created_at: new Date().toISOString(),
};

const baseUser: Profile = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'member',
    is_approved: true,
    floor_id: 'f1',
    delegated_to: null,
};

describe('HypercertClaimSection', () => {
    beforeEach(() => {
        mockHookState.claims = [];
        mockHookState.requestClaim = vi.fn().mockResolvedValue(true);
        mockHookState.resolveClaim = vi.fn().mockResolvedValue(true);
        mockHookState.attachUri = vi.fn().mockResolvedValue(true);
    });

    it('renders nothing without a current user', () => {
        const { container } = render(
            <HypercertClaimSection post={post} currentUser={undefined} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('shows the claim button on active posts as well', () => {
        render(
            <HypercertClaimSection post={{ ...post, status: 'active' }} currentUser={baseUser} />
        );
        expect(screen.getByRole('button', { name: /claim hypercert/i })).toBeInTheDocument();
    });

    it('non-creator with no claim sees the Claim HyperCert button and can submit', async () => {
        render(<HypercertClaimSection post={post} currentUser={baseUser} />);
        const btn = screen.getByRole('button', { name: /claim hypercert/i });
        fireEvent.click(btn);
        await waitFor(() => {
            expect(mockHookState.requestClaim).toHaveBeenCalledWith('user-1', 'creator-1');
        });
    });

    it('shows pending state when claim exists', () => {
        mockHookState.claims = [{
            id: 'c1', subject_type: 'offer_ask', subject_id: 'p1',
            claimant_id: 'user-1', creator_id: 'creator-1',
            status: 'pending', hypercert_uri: null,
            created_at: '', resolved_at: null,
        }];
        render(<HypercertClaimSection post={post} currentUser={baseUser} />);
        expect(screen.getByText(/awaiting creator verification/i)).toBeInTheDocument();
    });

    it('creator sees pending claims with approve/deny controls', () => {
        mockHookState.claims = [{
            id: 'c1', subject_type: 'offer_ask', subject_id: 'p1',
            claimant_id: 'user-1', creator_id: 'creator-1',
            status: 'pending', hypercert_uri: null,
            created_at: '', resolved_at: null,
            claimant: { email: 'helper@example.com' },
        }];
        const creator = { ...baseUser, id: 'creator-1' };
        render(<HypercertClaimSection post={post} currentUser={creator} />);
        expect(screen.getByText(/pending claims/i)).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('approve'));
        expect(mockHookState.resolveClaim).toHaveBeenCalledWith('c1', 'approved');
        fireEvent.click(screen.getByLabelText('deny'));
        expect(mockHookState.resolveClaim).toHaveBeenCalledWith('c1', 'denied');
    });

    it('approved claim with no uri shows Issue Hypercert; missing creds errors', async () => {
        mockHookState.claims = [{
            id: 'c1', subject_type: 'offer_ask', subject_id: 'p1',
            claimant_id: 'user-1', creator_id: 'creator-1',
            status: 'approved', hypercert_uri: null,
            created_at: '', resolved_at: null,
        }];
        render(<HypercertClaimSection post={post} currentUser={baseUser} />);
        fireEvent.click(screen.getByRole('button', { name: /issue hypercert/i }));
        await waitFor(() => {
            expect(screen.getByText(/configure your bluesky credentials/i)).toBeInTheDocument();
        });
    });

    it('renders hyperscan link once a uri is attached', () => {
        mockHookState.claims = [{
            id: 'c1', subject_type: 'offer_ask', subject_id: 'p1',
            claimant_id: 'user-1', creator_id: 'creator-1',
            status: 'approved',
            hypercert_uri: 'at://did:plc:yojr5ir6niert55qerxsjqha/org.hypercerts.claim.activity/rkey1',
            created_at: '', resolved_at: null,
        }];
        render(<HypercertClaimSection post={post} currentUser={baseUser} />);
        const link = screen.getByRole('link', { name: /view on hyperscan/i });
        expect(link).toHaveAttribute(
            'href',
            'https://www.hyperscan.dev/data?did=did%3Aplc%3Ayojr5ir6niert55qerxsjqha'
        );
    });
});
