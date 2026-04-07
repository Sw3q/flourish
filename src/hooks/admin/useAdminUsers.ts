import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../useAdminActions'; // We'll export Profile types from a shared types file or useAdminActions if kept. Actually, let's keep types in useAdminActions and import them. Wait, better to move types to the top of useAdminActions and just export them.

export function useAdminUsers(currentFloorId: string | null, currentUserRole?: string) {
    const [users, setUsers] = useState<Profile[]>([]);

    const fetchUsers = async () => {
        let q = supabase.from('profiles').select('*, floors(name, floor_number)').order('email', { ascending: true });
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) setUsers(data as Profile[]);
    };

    const approveUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, is_approved: true } : u));
            return true;
        }
        return false;
    };

    const rejectUser = async (userId: string) => {
        const { error } = await supabase.rpc('reject_user', { target_user_id: userId });

        if (!error) {
            setUsers(users.filter((u: Profile) => u.id !== userId));
            return true;
        }
        console.error('rejectUser error:', error);
        return false;
    };

    const revokeUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: false })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, is_approved: false } : u));
            return true;
        }
        return false;
    };

    const promoteUser = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return false;

        let nextRole: 'admin' | 'super_admin' = 'admin';
        if (user.role === 'admin') nextRole = 'super_admin';
        if (user.role === 'super_admin') return false;

        const { error } = await supabase
            .from('profiles')
            .update({ role: nextRole, is_approved: true })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, role: nextRole, is_approved: true } : u));
            return true;
        }
        return false;
    };

    const demoteUser = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return false;

        let nextRole: 'admin' | 'member' = 'member';
        if (user.role === 'super_admin') nextRole = 'admin';
        if (user.role === 'member') return false;

        const { error } = await supabase
            .from('profiles')
            .update({ role: nextRole })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, role: nextRole } : u));
            return true;
        }
        return false;
    };

    return {
        users,
        fetchUsers,
        approveUser,
        rejectUser,
        revokeUser,
        promoteUser,
        demoteUser,
    };
}
