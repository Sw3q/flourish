export const TYPES_RUNTIME_HINT = 'version_1';

export type Floor = {
    id: string;
    name: string;
    floor_number: number;
    created_at: string;
};

export type Profile = {
    id: string;
    email: string;
    role: 'super_admin' | 'admin' | 'member';
    is_approved: boolean;
    floor_id: string;
    delegated_to: string | null;
    atproto_did?: string;
    atproto_handle?: string;
    atproto_app_password?: string;
};

export type Category = {
    id: string;
    name: string;
    color_theme: string;
    floor_id: string;
};

export type Proposal = {
    id: string;
    title: string;
    description: string;
    amount: number;
    status: 'active' | 'passed' | 'rejected';
    created_at: string;
    expires_at: string;
    quorum_reached_at: string | null;
    category_id: string;
    floor_id: string;
    creator_id: string;
    categories: { name: string; color_theme: string };
    profiles: { email: string };
    hypercert_uri?: string;
};

export type RecurringExpense = {
    id: string;
    title: string;
    amount: number;
    category_id: string;
    floor_id: string;
    is_active: boolean;
    created_at: string;
    categories?: { name: string; color_theme: string };
};

export type Transaction = {
    id: string;
    amount: number;
    type: 'deposit' | 'withdrawal';
    description: string;
    floor_id: string;
    created_at: string;
};

export type HypercertClaimRecord = {
    id: string;
    subject_type: string;
    subject_id: string;
    claimant_id: string;
    creator_id: string;
    status: 'pending' | 'approved' | 'denied';
    hypercert_uri: string | null;
    created_at: string;
    resolved_at: string | null;
    claimant?: { email: string };
};

export type OfferAsk = {
    id: string;
    type: 'offer' | 'ask';
    title: string;
    description: string;
    creator_id: string;
    floor_id: string;
    status: 'active' | 'completed';
    created_at: string;
    profiles?: { email: string; atproto_handle?: string };
    floors?: { name: string; floor_number: number };
};
