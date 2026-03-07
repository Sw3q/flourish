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

        // Upsert the category delegation
        const { error } = await supabase
            .from('category_delegations')
            .upsert({
                user_id: currentUser.id,
                category_id: categoryId,
                delegated_to: targetUserId,
            }, { onConflict: 'user_id, category_id' });

        if (!error) {
            setCategoryDelegations(prev => ({ ...prev, [categoryId]: targetUserId }));
            return true;
        }
        return false;
    };

    return {
        currentUser,
        members,
        votingPower,
        fundBalance,
        loading,
        categoryDelegations,
        delegateVote,
        delegateVoteForCategory,
    };
}
