import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';
import { type Proposal } from './useProposals';

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

export type RecurringExpense = {
    id: string;
    title: string;
    amount: number;
    category_id: string;
    is_active: boolean;
    created_at: string;
    categories?: { name: string; color_theme: string };
};

export function useAdminActions() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
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

    const fetchRecurringExpenses = async () => {
        const { data } = await supabase
            .from('recurring_expenses')
            .select('*, categories(name, color_theme)')
            .order('created_at', { ascending: false });
        if (data) setRecurringExpenses(data as RecurringExpense[]);
    };

    const fetchProposals = async () => {
        const { data } = await supabase
            .from('proposals')
            .select('*, categories (name, color_theme), profiles:creator_id (email)')
            .order('created_at', { ascending: false });
        if (data) setProposals(data as unknown as Proposal[]);
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
            .order('email', { ascending: true });

        if (data) setUsers(data as Profile[]);
        setLoading(false);
    };

    const checkAdminStatus = async () => {
        if (CONFIG.BYPASS_AUTH) {
            setIsAdmin(true);
            await Promise.all([fetchUsers(), fetchCategories(), fetchFundBalance(), fetchRecurringExpenses(), fetchProposals()]);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (data?.role === 'admin') {
            setIsAdmin(true);
            await Promise.all([fetchUsers(), fetchCategories(), fetchFundBalance(), fetchRecurringExpenses(), fetchProposals()]);
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
            setFundBalance((prev: number) => prev + amount);
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
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, is_approved: true } : u));
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
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, is_approved: false } : u));
            return true;
        }
        return false;
    };

    const promoteUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map((u: Profile) => u.id === userId ? { ...u, role: 'admin' } : u));
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

    const issueHypercertForProposal = async (proposalId: string, hypercertUri: string) => {
        const { error } = await supabase
            .from('proposals')
            .update({ hypercert_uri: hypercertUri })
            .eq('id', proposalId);
        
        return !error;
    };

    const createRecurringExpense = async (title: string, amount: number, categoryId: string) => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .insert([{ title, amount, category_id: categoryId }])
            .select('*, categories(name, color_theme)')
            .single();

        if (data && !error) {
            setRecurringExpenses([data, ...recurringExpenses]);
            return true;
        }
        return false;
    };

    const toggleRecurringExpense = async (expenseId: string, isActive: boolean) => {
        const { error } = await supabase
            .from('recurring_expenses')
            .update({ is_active: isActive })
            .eq('id', expenseId);

        if (!error) {
            setRecurringExpenses(recurringExpenses.map((e: RecurringExpense) => e.id === expenseId ? { ...e, is_active: isActive } : e));
            return true;
        }
        return false;
    };

    const updateRecurringExpense = async (expenseId: string, title: string, amount: number, categoryId: string) => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .update({ title, amount, category_id: categoryId })
            .eq('id', expenseId)
            .select('*, categories(name, color_theme)')
            .single();

        if (data && !error) {
            setRecurringExpenses(recurringExpenses.map((e: RecurringExpense) => e.id === expenseId ? data : e));
            return true;
        }
        return false;
    };

    const processRecurringExpense = async (expense: RecurringExpense) => {
        const { error } = await supabase
            .from('transactions')
            .insert([{ 
                amount: expense.amount, 
                type: 'withdrawal', 
                description: `Recurring Expense: ${expense.title}` 
            }]);

        if (!error) {
            setFundBalance(prev => prev - expense.amount);
            return true;
        }
        return false;
    };

    return {
        users,
        categories,
        recurringExpenses,
        proposals,
        fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        approveUser,
        revokeUser,
        promoteUser,
        deleteProposal,
        createRecurringExpense,
        toggleRecurringExpense,
        updateRecurringExpense,
        processRecurringExpense,
        issueHypercertForProposal,
    };
}
