import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
    id: string;
    email: string;
    delegated_to: string | null;
    role: string;
};

export function useDashboardData() {
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [votingPower, setVotingPower] = useState<number>(1);
    const [fundBalance, setFundBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

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

        // Calculate voting power (1 + sum of people delegating to me)
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('delegated_to', user.id);

        setVotingPower(1 + (count || 0));

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

    return {
        currentUser,
        members,
        votingPower,
        fundBalance,
        loading,
        delegateVote,
    };
}
