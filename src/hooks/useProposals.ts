import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Category = {
    id: string;
    name: string;
    color_theme: string;
};

export type Proposal = {
    id: string;
    title: string;
    description: string;
    amount: number;
    status: 'active' | 'passed' | 'rejected';
    created_at: string;
    expires_at: string;
    category_id: string;
    creator_id: string;
    categories: { name: string; color_theme: string };
    profiles: { email: string };
};

export function useProposals(currentUserId: string) {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
    const [proposalVotes, setProposalVotes] = useState<Record<string, { yes: number, total: number }>>({});
    const [totalApprovedUsers, setTotalApprovedUsers] = useState(0);

    const fetchData = async () => {
        // 1. Fetch Categories
        const { data: cats } = await supabase.from('categories').select('*');
        if (cats) setCategories(cats);

        // 2. Fetch Proposals with relations
        const { data: props } = await supabase
            .from('proposals')
            .select(`
                *,
                categories (name, color_theme),
                profiles:creator_id (email)
            `)
            .order('created_at', { ascending: false });
        if (props) setProposals(props as unknown as Proposal[]);

        // 3. Fetch User's past votes
        const { data: votes } = await supabase
            .from('votes')
            .select('proposal_id, vote')
            .eq('voter_id', currentUserId);

        if (votes) {
            const voteMap: Record<string, boolean> = {};
            votes.forEach(v => voteMap[v.proposal_id] = v.vote);
            setUserVotes(voteMap);
        }

        // 4. Fetch weighted vote totals for display (read-only, DB trigger handles evaluation)
        await fetchVoteTotals(props as unknown as Proposal[]);

        // 5. Fetch total approved users for threshold display
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_approved', true);
        setTotalApprovedUsers(count || 0);
    };

    // Fetches vote totals for UI display only — no status mutation happens here.
    // All proposal status changes happen server-side via the DB trigger.
    const fetchVoteTotals = async (props: Proposal[] | null) => {
        if (!props) return;
        const active = props.filter(p => p.status === 'active');
        if (active.length === 0) return;

        const { data: allVotes } = await supabase
            .from('votes')
            .select('proposal_id, voter_id, vote');

        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, delegated_to');

        const { data: allCatDelegations } = await supabase
            .from('category_delegations')
            .select('user_id, category_id, delegated_to');

        if (!allVotes || !allProfiles) return;

        // Build global delegation map: user_id → delegated_to
        const globalDelegationMap: Record<string, string | null> = {};
        allProfiles.forEach(p => { globalDelegationMap[p.id] = p.delegated_to; });

        // Build category delegation map: `${user_id}_${category_id}` → delegated_to
        const catDelegationMap: Record<string, string> = {};
        if (allCatDelegations) {
            allCatDelegations.forEach(cd => {
                catDelegationMap[`${cd.user_id}_${cd.category_id}`] = cd.delegated_to;
            });
        }

        const voteTotals: Record<string, { yes: number, total: number }> = {};
        active.forEach(p => voteTotals[p.id] = { yes: 0, total: 0 });

        allVotes.forEach((v: any) => {
            const proposal = active.find(p => p.id === v.proposal_id);
            if (!proposal || !voteTotals[v.proposal_id]) return;

            // Effective delegate: category-specific first, then global
            const catKey = `${v.voter_id}_${proposal.category_id}`;
            // Count how many people resolve to voting through this voter
            let weight = 1; // self
            allProfiles.forEach(p => {
                if (p.id === v.voter_id) return;
                const pCatKey = `${p.id}_${proposal.category_id}`;
                const effectiveDelegate = catDelegationMap[pCatKey] ?? globalDelegationMap[p.id];
                if (effectiveDelegate === v.voter_id) weight++;
            });
            // Suppress self if this voter has delegated away (category or global)
            const myDelegate = catDelegationMap[catKey] ?? globalDelegationMap[v.voter_id];
            if (myDelegate && myDelegate !== v.voter_id) {
                // This voter has delegated: their self-vote is counted under their delegate
                return;
            }

            voteTotals[v.proposal_id].total += weight;
            if (v.vote) voteTotals[v.proposal_id].yes += weight;
        });

        setProposalVotes(voteTotals);
    };

    const createProposal = async (title: string, description: string, amount: number, categoryId: string) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 1 week voting period

        const { data, error } = await supabase
            .from('proposals')
            .insert([{
                title,
                description,
                amount,
                category_id: categoryId,
                creator_id: currentUserId,
                expires_at: expiresAt.toISOString(),
            }])
            .select(`
                *,
                categories (name, color_theme),
                profiles:creator_id (email)
            `)
            .single();

        if (data && !error) {
            setProposals(prev => [data as unknown as Proposal, ...prev]);
            return true;
        }
        return false;
    };

    const castVote = async (proposalId: string, isYes: boolean) => {
        const alreadyVotedSame = userVotes[proposalId] === isYes;

        if (alreadyVotedSame) {
            // Clicking the active button → retract the vote
            setUserVotes(prev => {
                const next = { ...prev };
                delete next[proposalId];
                return next;
            });

            const { error } = await supabase
                .from('votes')
                .delete()
                .eq('proposal_id', proposalId)
                .eq('voter_id', currentUserId);

            if (!error) {
                await fetchData();
                return true;
            }
            // Rollback optimistic update on failure
            await fetchData();
            return false;
        }

        // Casting a new vote (or switching sides)
        setUserVotes(prev => ({ ...prev, [proposalId]: isYes }));

        const { error } = await supabase
            .from('votes')
            .upsert({
                proposal_id: proposalId,
                voter_id: currentUserId,
                vote: isYes
            }, { onConflict: 'proposal_id, voter_id' });

        if (!error) {
            await fetchData();
            return true;
        }
        return false;
    };

    const deleteProposal = async (proposalId: string) => {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId);

        if (!error) {
            setProposals(prev => prev.filter(p => p.id !== proposalId));
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (currentUserId) fetchData();
    }, [currentUserId]);

    return {
        proposals,
        categories,
        userVotes,
        proposalVotes,
        totalApprovedUsers,
        createProposal,
        castVote,
        deleteProposal,
        refreshData: fetchData
    };
}
