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
    quorum_reached_at: string | null;
    category_id: string;
    creator_id: string;
    categories: { name: string; color_theme: string };
    profiles: { email: string };
    hypercert_uri?: string;
};

export function useProposals(currentUserId: string, currentFloorId: string | null) {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
    const [proposalVotes, setProposalVotes] = useState<Record<string, { yes: number, total: number }>>({});
    const [participationMap, setParticipationMap] = useState<Record<string, boolean>>({});
    const [totalApprovedUsers, setTotalApprovedUsers] = useState(0);

    const fetchData = async () => {
        if (!currentFloorId) return;

        const { data: cats } = await supabase.from('categories').select('*').eq('floor_id', currentFloorId);
        if (cats) setCategories(cats);

        const { data: props } = await supabase
            .from('proposals')
            .select('*, categories (name, color_theme), profiles:creator_id (email)')
            .eq('floor_id', currentFloorId)
            .order('created_at', { ascending: false });
        
        // Sync DB (fire and forget)
        supabase.rpc('evaluate_cleanup').then();

        const now = new Date();
        const filteredProps = (props || []).filter((p: any) => {
            if (p.status === 'active' && new Date(p.expires_at) < now) return false;
            return true;
        });

        if (props) setProposals(filteredProps as unknown as Proposal[]);

        // Participation tracking: Direct votes + Delegated participation
        const { data: allVotes } = await supabase.from('votes').select('*');
        const { data: profile } = await supabase.from('profiles').select('delegated_to').eq('id', currentUserId).single();
        const { data: propDelegations } = await supabase.from('proposal_delegations').select('*').eq('user_id', currentUserId);

        if (allVotes && props) {
            const pMap: Record<string, boolean> = {};
            const userVoteMap: Record<string, boolean> = {};

            props.forEach((proposal: any) => {
                const directVote = allVotes.find(v => v.proposal_id === proposal.id && v.voter_id === currentUserId);
                if (directVote) {
                    pMap[proposal.id] = true;
                    userVoteMap[proposal.id] = directVote.vote;
                } else {
                    // Check proposal-specific delegation first, then fall back to global
                    const proposalDelegate = propDelegations?.find(pd => pd.proposal_id === proposal.id)?.delegated_to;
                    const effectiveDelegate = proposalDelegate || profile?.delegated_to;
                    
                    if (effectiveDelegate) {
                        const delegateVoted = allVotes.some(v => v.proposal_id === proposal.id && v.voter_id === effectiveDelegate);
                        if (delegateVoted) pMap[proposal.id] = true;
                    }
                }
            });

            setParticipationMap(pMap);
            setUserVotes(userVoteMap);
        }

        await fetchVoteTotals(props as unknown as Proposal[]);

        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', currentFloorId)
            .eq('is_approved', true);
        setTotalApprovedUsers(count || 0);
    };

    // Read-only vote totals for UI display. Status changes are owned by the DB trigger.
    const fetchVoteTotals = async (props: Proposal[] | null) => {
        if (!props) return;
        const active = props.filter(p => p.status === 'active');
        if (active.length === 0) return;

        const { data: allVotes } = await supabase.from('votes').select('proposal_id, voter_id, vote');
        const { data: allProfiles } = await supabase.from('profiles').select('id, delegated_to');
        const { data: allPropDelegations } = await supabase.from('proposal_delegations').select('user_id, proposal_id, delegated_to');

        if (!allVotes || !allProfiles) return;

        const globalDelegationMap: Record<string, string | null> = {};
        allProfiles.forEach(p => { globalDelegationMap[p.id] = p.delegated_to; });

        // Map of "user_id_proposal_id" → delegated_to for proposal-specific overrides
        const propDelegationMap: Record<string, string> = {};
        if (allPropDelegations) {
            allPropDelegations.forEach(pd => { propDelegationMap[`${pd.user_id}_${pd.proposal_id}`] = pd.delegated_to; });
        }

        const voteTotals: Record<string, { yes: number, total: number }> = {};
        active.forEach(p => { voteTotals[p.id] = { yes: 0, total: 0 }; });

        allVotes.forEach((v: any) => {
            const proposal = active.find(p => p.id === v.proposal_id);
            if (!proposal || !voteTotals[v.proposal_id]) return;

            // In the new logic, anyone who cast a direct vote HAS weight.
            // But we need to calculate the weight of that direct voter by counting 
            // their delegators WHO HAVEN'T VOTED themselves.

            let weight = 1;
            allProfiles.forEach(p => {
                // If this is the voter themselves, skip
                if (p.id === v.voter_id) return;

                // Proposal-specific delegation takes precedence over global
                const propKey = `${p.id}_${v.proposal_id}`;
                const effectiveDelegate = propDelegationMap[propKey] ?? globalDelegationMap[p.id];
                
                // If this person p delegates to our voter v
                if (effectiveDelegate === v.voter_id) {
                    // ONLY add to weight if p HAS NOT cast their own vote on this proposal
                    const hasVotedSelf = allVotes.some(av => av.proposal_id === v.proposal_id && av.voter_id === p.id);
                    if (!hasVotedSelf) {
                        weight++;
                    }
                }
            });

            voteTotals[v.proposal_id].total += weight;
            if (v.vote) voteTotals[v.proposal_id].yes += weight;
        });

        setProposalVotes(voteTotals);
    };

    const createProposal = async (title: string, description: string, amount: number, categoryId: string, durationDays: number) => {
        if (!currentFloorId) return false;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const { data, error } = await supabase
            .from('proposals')
            .insert([{ 
                title, description, amount, category_id: categoryId, 
                creator_id: currentUserId, expires_at: expiresAt.toISOString(),
                floor_id: currentFloorId
            }])
            .select('*, categories (name, color_theme), profiles:creator_id (email)')
            .single();

        if (data && !error) {
            setProposals(prev => [data as unknown as Proposal, ...prev]);
            return true;
        }
        return false;
    };

    const castVote = async (proposalId: string, isYes: boolean) => {
        const isRetract = userVotes[proposalId] === isYes;
        const isSwitch = userVotes[proposalId] !== undefined && userVotes[proposalId] !== isYes;

        // Optimistic update
        setUserVotes(prev => {
            if (isRetract) {
                const next = { ...prev };
                delete next[proposalId];
                return next;
            }
            return { ...prev, [proposalId]: isYes };
        });

        let dbError = null;

        if (isRetract) {
            const { error } = await supabase.from('votes')
                .delete()
                .eq('proposal_id', proposalId)
                .eq('voter_id', currentUserId);
            dbError = error;
        } else if (isSwitch) {
            // PostgREST silently fails updates on tables without a formal primary key.
            // Since `votes` only has a UNIQUE constraint, we delete and re-insert to switch cleanly.
            await supabase.from('votes')
                .delete()
                .eq('proposal_id', proposalId)
                .eq('voter_id', currentUserId);
                
            const { error } = await supabase.from('votes')
                .insert([{ proposal_id: proposalId, voter_id: currentUserId, vote: isYes }]);
            dbError = error;
        } else {
            const { error } = await supabase.from('votes')
                .insert([{ proposal_id: proposalId, voter_id: currentUserId, vote: isYes }]);
            dbError = error;
        }

        // Always refetch — syncs with DB truth and rolls back optimistic state on error
        await fetchData();
        return !dbError;
    };

    const deleteProposal = async (proposalId: string) => {
        const { error } = await supabase.from('proposals').delete().eq('id', proposalId);
        if (!error) setProposals(prev => prev.filter(p => p.id !== proposalId));
        return !error;
    };

    const updateProposal = async (proposalId: string, title: string, description: string, amount: number, categoryId: string) => {
        const { error } = await supabase
            .from('proposals')
            .update({ 
                title, 
                description, 
                amount, 
                category_id: categoryId 
            })
            .eq('id', proposalId);

        if (!error) {
            await fetchData();
            return true;
        }
        return false;
    };

    const updateProposalHypercert = async (proposalId: string, hypercertUri: string) => {
        const { error } = await supabase
            .from('proposals')
            .update({ hypercert_uri: hypercertUri })
            .eq('id', proposalId);

        if (!error) {
            await fetchData();
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (currentUserId && currentFloorId) fetchData();
    }, [currentUserId, currentFloorId]);

    return { 
        proposals, 
        categories, 
        userVotes, 
        proposalVotes, 
        participationMap,
        totalApprovedUsers, 
        createProposal, 
        castVote, 
        deleteProposal, 
        updateProposal,
        updateProposalHypercert,
        refreshData: fetchData 
    };
}
