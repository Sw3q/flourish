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
    activityTrend: number[];
    governanceIntensity: number;
    operationalState: 'Nominal' | 'High Activity' | 'Peak Activity' | 'Quiet';
    loading: boolean;
};

export function useTowerStats() {
    const [stats, setStats] = useState<TowerStats>({
        floors: [],
        totalBalance: 0,
        totalActiveProposals: 0,
        totalMembers: 0,
        activityTrend: [],
        governanceIntensity: 0,
        operationalState: 'Nominal',
        loading: true,
    });

    useEffect(() => {
        const fetchTowerStats = async () => {
            try {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

                // 3. Fetch all active proposals (for direct count)
                const { data: activeProposalsData, error: activeProposalsError } = await supabase
                    .from('proposals')
                    .select('id, floor_id, status, expires_at')
                    .eq('status', 'active');

                if (activeProposalsError) throw activeProposalsError;

                // 4. Fetch recent proposals for trend (last 30 days)
                const { data: recentProposalsData, error: recentProposalsError } = await supabase
                    .from('proposals')
                    .select('id, created_at')
                    .gt('created_at', thirtyDaysAgo.toISOString());

                if (recentProposalsError) throw recentProposalsError;

                // Sync DB (fire and forget)
                supabase.rpc('evaluate_cleanup').then();

                // 5. Fetch all transactions (to calculate balances)
                const { data: transactionsData, error: transactionsError } = await supabase
                    .from('transactions')
                    .select('amount, type, floor_id');

                if (transactionsError) throw transactionsError;

                const floors = floorsData as Floor[];
                const profiles = profilesData as Profile[];
                const activeProposals = ((activeProposalsData || []) as Proposal[]).filter(p => new Date(p.expires_at) > now);
                const recentProposals = (recentProposalsData || []) as { id: string; created_at: string }[];
                const transactions = transactionsData as Transaction[];

                // Calculate activity trend (group proposals by day)
                const dailyActivity = new Array(30).fill(0);
                recentProposals.forEach(p => {
                    const daysAgo = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysAgo >= 0 && daysAgo < 30) {
                        dailyActivity[29 - daysAgo]++;
                    }
                });

                const floorStats: FloorStats[] = floors.map(floor => {
                    const floorProfiles = profiles.filter(p => p.floor_id === floor.id && p.is_approved);
                    const floorProposals = activeProposals.filter(p => p.floor_id === floor.id);
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
                const totalActiveProposals = activeProposals.length;
                const totalMembers = profiles.filter(p => p.is_approved).length;

                // Governance Intensity and Operational State logic
                const governanceIntensity = totalActiveProposals;
                let operationalState: TowerStats['operationalState'] = 'Nominal';
                if (governanceIntensity > 10) operationalState = 'Peak Activity';
                else if (governanceIntensity > 5) operationalState = 'High Activity';
                else if (governanceIntensity === 0) operationalState = 'Quiet';

                setStats({
                    floors: floorStats,
                    totalBalance,
                    totalActiveProposals,
                    totalMembers,
                    activityTrend: dailyActivity,
                    governanceIntensity,
                    operationalState,
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
