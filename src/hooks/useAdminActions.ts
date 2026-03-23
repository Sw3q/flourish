import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';

export type Profile = {
    id: string;
    email: string;
    role: 'admin' | 'member' | 'super_admin';
    is_approved: boolean;
    floor_id?: string;
    floors?: {
        name: string;
        floor_number: number;
    };
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
    floor_id?: string;
    is_active: boolean;
    created_at: string;
    categories?: { name: string; color_theme: string };
};

export function useAdminActions(currentFloorId: string | null, currentUserRole?: string) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [fundBalance, setFundBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const fetchCategories = async () => {
        let q = supabase.from('categories').select('*').order('name');
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);
        
        const { data } = await q;
        if (data) setCategories(data as Category[]);
    };

    const fetchRecurringExpenses = async () => {
        let q = supabase.from('recurring_expenses').select('*, categories(name, color_theme)').order('created_at', { ascending: false });
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) setRecurringExpenses(data as RecurringExpense[]);
    };

    const fetchFundBalance = async () => {
        let q = supabase.from('transactions').select('amount, type');
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) {
            const balance = data.reduce((acc: number, curr: any) => {
                return curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount);
            }, 0);
            setFundBalance(balance);
        }
    };

    const fetchUsers = async () => {
        let q = supabase.from('profiles').select('*, floors(name, floor_number)').order('email', { ascending: true });
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) setUsers(data as Profile[]);
        setLoading(false);
    };

    const checkAdminStatus = async () => {
        if (CONFIG.BYPASS_AUTH) {
            setIsAdmin(true);
            await Promise.all([fetchUsers(), fetchCategories(), fetchFundBalance(), fetchRecurringExpenses()]);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (data?.role === 'admin' || data?.role === 'super_admin') {
            setIsAdmin(true);
            await Promise.all([fetchUsers(), fetchCategories(), fetchFundBalance(), fetchRecurringExpenses()]);
        } else {
            setLoading(false);
        }
    };

    const createCategory = async (name: string, color: string) => {
        if (!name.trim() || !currentFloorId) return false;

        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, color_theme: color, floor_id: currentFloorId }])
            .select()
            .single();

        if (data && !error) {
            setCategories([...categories, data]);
            return true;
        }
        return false;
    };

    const addFunds = async (amount: number) => {
        if (isNaN(amount) || amount <= 0 || !currentFloorId) return false;

        const { error } = await supabase
            .from('transactions')
            .insert([{ amount, type: 'deposit', description: 'Admin Manual Deposit', floor_id: currentFloorId }]);

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

    const deleteProposal = async (proposalId: string) => {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId);
        return !error;
    };

    const createRecurringExpense = async (title: string, amount: number, categoryId: string) => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId || !currentFloorId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .insert([{ title, amount, category_id: categoryId, floor_id: currentFloorId }])
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
                description: `Recurring Expense: ${expense.title}`,
                floor_id: expense.floor_id || currentFloorId
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
        fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        approveUser,
        revokeUser,
        promoteUser,
        demoteUser,
        deleteProposal,
        createRecurringExpense,
        toggleRecurringExpense,
        updateRecurringExpense,
        processRecurringExpense,
    };
}
