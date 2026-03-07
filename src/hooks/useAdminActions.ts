import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
    id: string;
    email: string;
    role: 'admin' | 'member';
    is_approved: boolean;
};

export type Category = {
    id: string;
    name: string;
    color_theme: string;
};

export function useAdminActions() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [fundBalance, setFundBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchFundBalance = async () => {
        const { data } = await supabase.from('transactions').select('amount, type');
        if (data) {
            const balance = data.reduce((acc, curr) => {
                return curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount);
            }, 0);
            setFundBalance(balance);
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setUsers(data as Profile[]);
        setLoading(false);
    };

    const checkAdminStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (data?.role === 'admin') {
            setIsAdmin(true);
            await Promise.all([fetchUsers(), fetchCategories(), fetchFundBalance()]);
        } else {
            setLoading(false);
        }
    };

    const createCategory = async (name: string, color: string) => {
        if (!name.trim()) return;

        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, color_theme: color }])
            .select()
            .single();

        if (data && !error) {
            setCategories([...categories, data]);
            return true;
        }
        return false;
    };

    const addFunds = async (amount: number) => {
        if (isNaN(amount) || amount <= 0) return false;

        const { error } = await supabase
            .from('transactions')
            .insert([{ amount, type: 'deposit', description: 'Admin Manual Deposit' }]);

        if (!error) {
            setFundBalance(prev => prev + amount);
            return true;
        }
        return false;
    };

    const approveUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: true } : u));
            return true;
        }
        return false;
    };

    const revokeUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: false })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: false } : u));
            return true;
        }
        return false;
    };

    const deleteProposal = async (proposalId: string) => {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId);
        return !error;
    };

    return {
        users,
        categories,
        fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        approveUser,
        revokeUser,
        deleteProposal,
    };
}
