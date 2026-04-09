import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';

import type { Profile } from '../types';
export type { Profile };

export function useDashboardData(floorIdOverride?: string | null) {
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [votingPower, setVotingPower] = useState<number>(1);
    const [floorName, setFloorName] = useState<string>('');
    const [fundBalance, setFundBalance] = useState<number>(0);
    const [monthlyBurnRate, setMonthlyBurnRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    // Map of proposal_id → delegated_to user_id (per-proposal delegations for current user)
    const [proposalDelegations, setProposalDelegations] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [floorIdOverride]);

    const fetchDashboardData = async () => {
        let user;
        if (CONFIG.BYPASS_AUTH) {
            user = { id: '00000000-0000-0000-0000-000000000001', email: 'demo@frontiertower.test' };
        } else {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        }
        
        if (!user) return;

        // Fetch current user profile
        let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            setCurrentUser(profile as Profile);
        } else if (CONFIG.BYPASS_AUTH) {
            const bypassUser: Profile = {
                id: user.id,
                email: user.email!,
                role: 'super_admin',
                floor_id: '00000000-0000-0000-0000-000000000000',
                delegated_to: null,
                is_approved: true,
                atproto_did: undefined,
                atproto_handle: undefined,
                atproto_app_password: undefined
            };
            setCurrentUser(bypassUser);
            profile = { floor_id: '00000000-0000-0000-0000-000000000000' } as Profile;
        }

        const activeFloorId = floorIdOverride || profile?.floor_id;

        if (!activeFloorId) {
             setLoading(false);
             return;
        }

        // Fetch all approved members for delegation list on THIS floor
        const { data: allMembers } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_approved', true)
            .eq('floor_id', activeFloorId)
            .neq('id', user.id);

        if (allMembers) setMembers(allMembers as Profile[]);

        // Fetch floor data (name and balance source of truth)
        const { data: floorRecord, error: floorDataError } = await supabase
            .from('floors')
            .select('name, balance')
            .eq('id', activeFloorId)
            .single();
        
        console.log('[Dashboard] Raw Floor Data for', activeFloorId, ':', { data: floorRecord, error: floorDataError });

        if (floorRecord) {
            setFloorName(floorRecord.name);
            setFundBalance(Number(floorRecord.balance) || 0);
        }

        // Calculate global voting power (1 + direct delegations to me)
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', activeFloorId)
            .eq('delegated_to', user.id);

        setVotingPower(1 + (count || 0));

        // Fetch my per-proposal delegations
        const { data: propDelegations } = await supabase
            .from('proposal_delegations')
            .select('proposal_id, delegated_to')
            .eq('user_id', user.id);

        if (propDelegations) {
            const map: Record<string, string> = {};
            propDelegations.forEach(pd => { map[pd.proposal_id] = pd.delegated_to; });
            setProposalDelegations(map);
        }

        // Fetch active recurring expenses for monthly expenses rate on this floor
        const { data: expenses } = await supabase
            .from('recurring_expenses')
            .select('amount')
            .eq('floor_id', activeFloorId)
            .eq('is_active', true);

        if (expenses) {
            const burn = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
            setMonthlyBurnRate(burn);
        }

        setLoading(false);
    };

    const updateAtProtoCredentials = async (handle: string, appPassword: string) => {
        if (!currentUser) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ 
                atproto_handle: handle,
                atproto_app_password: appPassword 
            })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({ 
                ...currentUser, 
                atproto_handle: handle, 
                atproto_app_password: appPassword 
            });
            return true;
        }
        return false;
    };

    // Global delegation — applies to all proposals unless overridden per-proposal.
    // Also: retracts all currently cast votes and clears all per-proposal delegations.
    const delegateVote = async (targetUserId: string | null) => {
        if (!currentUser) return false;

        // 1. Clear all per-proposal delegations for this user
        await supabase
            .from('proposal_delegations')
            .delete()
            .eq('user_id', currentUser.id);

        if (targetUserId !== null) {
            // 2. Retract all votes cast by this user (they are now delegating globally)
            await supabase
                .from('votes')
                .delete()
                .eq('voter_id', currentUser.id);
        }

        // 3. Set global delegation
        const { error } = await supabase
            .from('profiles')
            .update({ delegated_to: targetUserId })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({ ...currentUser, delegated_to: targetUserId });
            setProposalDelegations({});
            return true;
        }
        return false;
    };

    // Per-proposal delegation — this proposal ONLY.
    // Also retracts any existing vote for that specific proposal.
    const delegateVoteForProposal = async (proposalId: string, targetUserId: string | null) => {
        if (!currentUser) return false;

        if (targetUserId === null) {
            // Remove the proposal delegation (revert to global or no delegation)
            const { error } = await supabase
                .from('proposal_delegations')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('proposal_id', proposalId);

            if (!error) {
                setProposalDelegations(prev => {
                    const next = { ...prev };
                    delete next[proposalId];
                    return next;
                });
                return true;
            }
            return false;
        }

        // 1. Retract any existing vote for this specific proposal
        await supabase
            .from('votes')
            .delete()
            .eq('voter_id', currentUser.id)
            .eq('proposal_id', proposalId);

        // 2. Delete + insert (PostgREST upsert fails silently without formal PK)
        await supabase
            .from('proposal_delegations')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('proposal_id', proposalId);

        const { error } = await supabase
            .from('proposal_delegations')
            .insert([{
                user_id: currentUser.id,
                proposal_id: proposalId,
                delegated_to: targetUserId,
            }]);

        if (!error) {
            setProposalDelegations(prev => ({ ...prev, [proposalId]: targetUserId }));
            return true;
        }
        return false;
    };

    // Helper to calculate voting power for a specific proposal
    const getVotingPower = async (proposalId: string) => {
        if (!currentUser) return 1;

        const { data: globalDelegators } = await supabase
            .from('profiles')
            .select('id')
            .eq('delegated_to', currentUser.id);

        const { data: proposalDelegators } = await supabase
            .from('proposal_delegations')
            .select('user_id')
            .eq('delegated_to', currentUser.id)
            .eq('proposal_id', proposalId);

        // Count unique people who effectively delegate to us for this proposal:
        // 1. They have a proposal-specific delegation to us for this proposalId.
        // 2. OR they have a global delegation to us AND NO proposal-specific override for this proposal.

        const globalIds = (globalDelegators || []).map(d => d.id);
        const propIds = (proposalDelegators || []).map(d => d.user_id);

        // Filter out global delegators who have a proposal-specific override
        const { data: overrides } = await supabase
            .from('proposal_delegations')
            .select('user_id')
            .in('user_id', globalIds.length > 0 ? globalIds : ['00000000-0000-0000-0000-000000000000'])
            .eq('proposal_id', proposalId);
        
        const overrideIds = new Set((overrides || []).map(o => o.user_id));
        const effectiveGlobalDelegators = globalIds.filter(id => !overrideIds.has(id));

        const uniqueDelegators = new Set([...propIds, ...effectiveGlobalDelegators]);
        return 1 + uniqueDelegators.size;
    };

    return {
        currentUser,
        members,
        votingPower,
        fundBalance,
        monthlyBurnRate,
        loading,
        proposalDelegations,
        floorName,
        updateAtProtoCredentials,
        delegateVote,
        delegateVoteForProposal,
        getVotingPower,
        refreshData: fetchDashboardData,
    };
}
