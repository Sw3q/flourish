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

        // 4. Fetch total votes for active proposals to calculate thresholds
        await calculateAllVotes(props as unknown as Proposal[]);

        // 5. Fetch total approved users for threshold math (50%)
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', true);
        setTotalApprovedUsers(count || 0);
    };

    const calculateAllVotes = async (props: Proposal[] | null) => {
        if (!props) return;
        const active = props.filter(p => p.status === 'active');
        if (active.length === 0) return;

        // Fetch all votes for active proposals
        const { data: allVotes } = await supabase
            .from('votes')
            .select('*, profiles(delegated_to, id)');

        if (!allVotes) return;

        // First, map how many delegations everyone has
        const { data: allProfiles } = await supabase.from('profiles').select('id, delegated_to');
        const delegationCounts: Record<string, number> = {};
        if (allProfiles) {
            allProfiles.forEach(p => {
                if (p.delegated_to) {
                    delegationCounts[p.delegated_to] = (delegationCounts[p.delegated_to] || 0) + 1;
                }
            });
        }

        const voteTotals: Record<string, { yes: number, total: number }> = {};
        active.forEach(p => voteTotals[p.id] = { yes: 0, total: 0 });

        allVotes.forEach((v: any) => {
            if (!voteTotals[v.proposal_id]) return;
            const weight = 1 + (delegationCounts[v.voter_id] || 0);
            voteTotals[v.proposal_id].total += weight;
            if (v.vote) voteTotals[v.proposal_id].yes += weight;
        });

        setProposalVotes(voteTotals);

        // Evaluate thresholds automatically
        for (const p of active) {
            const counts = voteTotals[p.id];
            if (!counts) continue;

            const threshold = totalApprovedUsers / 2;

            if (counts.yes > threshold) {
                await supabase.from('proposals').update({ status: 'passed' }).eq('id', p.id);
            } else if (new Date(p.expires_at) < new Date()) {
                await supabase.from('proposals').update({ status: 'rejected' }).eq('id', p.id);
            }
        }
        
        // If evaluations happened, we should probably refetch to show 'passed' status, 
        // but for now we rely on the component or another fetchData call.
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
        // Optimistic UI update
        setUserVotes({ ...userVotes, [proposalId]: isYes });

        const { error } = await supabase
            .from('votes')
            .upsert({
                proposal_id: proposalId,
                voter_id: currentUserId,
                vote: isYes
            }, { onConflict: 'proposal_id, voter_id' });

        if (!error) {
            // Recalculate everything to evaluate threshold
            await fetchData();
            return true;
        }
        return false;
    };

    useEffect(() => {
        fetchData();
    }, [currentUserId]);

    return {
        proposals,
        categories,
        userVotes,
        proposalVotes,
        totalApprovedUsers,
        createProposal,
        castVote,
        refreshData: fetchData
    };
}
