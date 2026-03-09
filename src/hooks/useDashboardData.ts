import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
    id: string;
    email: string;
    delegated_to: string | null;
    role: string;
};

export type CategoryDelegation = {
    user_id: string;
    category_id: string;
    delegated_to: string;
};

export function useDashboardData() {
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [votingPower, setVotingPower] = useState<number>(1);
    const [fundBalance, setFundBalance] = useState<number>(0);
    const [monthlyBurnRate, setMonthlyBurnRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    // Map of category_id → delegated_to user_id (for MY delegations)
    const [categoryDelegations, setCategoryDelegations] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch current user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) setCurrentUser(profile as Profile);

        // Fetch all approved members for delegation list
        const { data: allMembers } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_approved', true)
            .neq('id', user.id);

        if (allMembers) setMembers(allMembers as Profile[]);

        // Calculate global voting power (1 + direct delegations to me)
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('delegated_to', user.id);

        setVotingPower(1 + (count || 0));

        // Fetch my category-specific delegations
        const { data: catDelegations } = await supabase
            .from('category_delegations')
            .select('category_id, delegated_to')
            .eq('user_id', user.id);

        if (catDelegations) {
            const map: Record<string, string> = {};
            catDelegations.forEach(cd => { map[cd.category_id] = cd.delegated_to; });
            setCategoryDelegations(map);
        }

        // Fetch total pot balance
        const { data: txs } = await supabase.from('transactions').select('amount, type');
        if (txs) {
            const balance = txs.reduce((acc, curr) => {
                return curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount);
            }, 0);
            setFundBalance(balance);
        }

        // Fetch active recurring expenses for monthly burn rate
        const { data: expenses } = await supabase
            .from('recurring_expenses')
            .select('amount')
            .eq('is_active', true);

        if (expenses) {
            const burn = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
            setMonthlyBurnRate(burn);
        }

        setLoading(false);
    };

    // Global delegation — applies to all categories unless overridden
    const delegateVote = async (targetUserId: string | null) => {
        if (!currentUser) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ delegated_to: targetUserId })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({ ...currentUser, delegated_to: targetUserId });
            return true;
        }
        return false;
    };

    // Category-specific delegation — overrides global for a given category
    const delegateVoteForCategory = async (categoryId: string, targetUserId: string | null) => {
        if (!currentUser) return false;

        if (targetUserId === null) {
            // Remove the category delegation (revert to global)
            const { error } = await supabase
                .from('category_delegations')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('category_id', categoryId);

            if (!error) {
                setCategoryDelegations(prev => {
                    const next = { ...prev };
                    delete next[categoryId];
                    return next;
                });
                return true;
            }
            return false;
        }

        // PostgREST silently fails on upsert conflicts for tables without a formal primary key id column.
        // So we delete existing constraints and then insert the new one.
        await supabase
            .from('category_delegations')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('category_id', categoryId);

        const { error } = await supabase
            .from('category_delegations')
            .insert([{
                user_id: currentUser.id,
                category_id: categoryId,
                delegated_to: targetUserId,
            }]);

        if (!error) {
            setCategoryDelegations(prev => ({ ...prev, [categoryId]: targetUserId }));
            return true;
        }
        return false;
    };

    // Helper to calculate voting power for a specific category
    // weight = 1 (self) + count of people who delegated to me (globally or for this specific category)
    const getVotingPower = async (categoryId: string) => {
        if (!currentUser) return 1;

        const { data: globalDelegations } = await supabase
            .from('profiles')
            .select('id')
            .eq('delegated_to', currentUser.id);

        const { data: categoryDelegations } = await supabase
            .from('category_delegations')
            .select('user_id')
            .eq('delegated_to', currentUser.id)
            .eq('category_id', categoryId);

        // We need to count unique people who effectively delegate to us for this category.
        // A person P delegates to us if:
        // 1. They have a category-specific delegation to us for this category.
        // 2. OR they have a global delegation to us AND NO category-specific override for this category.

        const globalIds = (globalDelegations || []).map(d => d.id);
        const catIds = (categoryDelegations || []).map(d => d.user_id);

        // People delegating to us globally who DON'T have a category override
        const { data: overrides } = await supabase
            .from('category_delegations')
            .select('user_id')
            .in('user_id', globalIds)
            .eq('category_id', categoryId);
        
        const overrideIds = new Set((overrides || []).map(o => o.user_id));
        const effectiveGlobalDelegators = globalIds.filter(id => !overrideIds.has(id));

        const uniqueDelegators = new Set([...catIds, ...effectiveGlobalDelegators]);
        return 1 + uniqueDelegators.size;
    };

    return {
        currentUser,
        members,
        votingPower,
        fundBalance,
        monthlyBurnRate,
        loading,
        categoryDelegations,
        delegateVote,
        delegateVoteForCategory,
        getVotingPower,
    };
}
