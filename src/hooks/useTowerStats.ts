import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Floor, Profile, Proposal, Transaction } from '../types';

export type FloorStats = {
    floor: Floor;
    balance: number;
    activeProposals: number;
    memberCount: number;
};

export type TowerStats = {
    floors: FloorStats[];
    totalBalance: number;
    totalActiveProposals: number;
    totalMembers: number;
    loading: boolean;
};

export function useTowerStats() {
    const [stats, setStats] = useState<TowerStats>({
        floors: [],
        totalBalance: 0,
        totalActiveProposals: 0,
        totalMembers: 0,
        loading: true,
    });

    useEffect(() => {
        const fetchTowerStats = async () => {
            try {
                // 1. Fetch all floors
                const { data: floorsData, error: floorsError } = await supabase
                    .from('floors')
                    .select('*')
                    .order('floor_number', { ascending: true });

                if (floorsError) throw floorsError;

                // 2. Fetch all profiles (to count members)
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, floor_id, is_approved');

                if (profilesError) throw profilesError;

                // 3. Fetch all active proposals
                const { data: proposalsData, error: proposalsError } = await supabase
                    .from('proposals')
                    .select('id, floor_id, status, expires_at')
                    .eq('status', 'active');

                if (proposalsError) throw proposalsError;

                // Sync DB (fire and forget)
                supabase.rpc('evaluate_cleanup').then();

                // 4. Fetch all transactions (to calculate balances)
                const { data: transactionsData, error: transactionsError } = await supabase
                    .from('transactions')
                    .select('amount, type, floor_id');

                if (transactionsError) throw transactionsError;

                const now = new Date();
                const floors = floorsData as Floor[];
                const profiles = profilesData as Profile[];
                const proposals = ((proposalsData || []) as Proposal[]).filter(p => new Date(p.expires_at) > now);
                const transactions = transactionsData as Transaction[];

                const floorStats: FloorStats[] = floors.map(floor => {
                    const floorProfiles = profiles.filter(p => p.floor_id === floor.id && p.is_approved);
                    const floorProposals = proposals.filter(p => p.floor_id === floor.id);
                    const floorTransactions = transactions.filter(t => t.floor_id === floor.id);

                    const balance = floorTransactions.reduce((acc, t) => {
                        return t.type === 'deposit' ? acc + Number(t.amount) : acc - Number(t.amount);
                    }, 0);

                    return {
                        floor,
                        balance,
                        activeProposals: floorProposals.length,
                        memberCount: floorProfiles.length,
                    };
                });

                const totalBalance = floorStats.reduce((acc, f) => acc + f.balance, 0);
                const totalActiveProposals = proposals.length;
                const totalMembers = profiles.filter(p => p.is_approved).length;

                setStats({
                    floors: floorStats,
                    totalBalance,
                    totalActiveProposals,
                    totalMembers,
                    loading: false,
                });
            } catch (error) {
                console.error('Error fetching tower stats:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchTowerStats();
    }, []);

    return stats;
}
