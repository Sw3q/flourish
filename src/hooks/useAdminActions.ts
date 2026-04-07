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
    last_processed_at?: string | null;
    recurrence_interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    categories?: { name: string; color_theme: string };
};

/** Returns the next billing date for an expense based on its recurrence_interval. */
export function getNextBillingDate(expense: RecurringExpense): Date {
    const base = expense.last_processed_at
        ? new Date(expense.last_processed_at)
        : new Date(expense.created_at);
    const next = new Date(base);

    switch (expense.recurrence_interval) {
        case 'daily':
            next.setUTCDate(next.getUTCDate() + 1);
            break;
        case 'weekly':
            next.setUTCDate(next.getUTCDate() + 7);
            break;
        case 'biweekly':
            next.setUTCDate(next.getUTCDate() + 14);
            break;
        case 'monthly':
            next.setUTCMonth(next.getUTCMonth() + 1);
            break;
        case 'quarterly':
            next.setUTCMonth(next.getUTCMonth() + 3);
            break;
        case 'yearly':
            next.setUTCFullYear(next.getUTCFullYear() + 1);
            break;
        default:
            next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next;
}

export function useAdminActions(currentFloorId: string | null, currentUserRole?: string) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [fundBalance, setFundBalanceState] = useState<number>(0);
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

    const fetchRecurringExpenses = async (): Promise<RecurringExpense[]> => {
        let q = supabase.from('recurring_expenses').select('*, categories(name, color_theme)').order('created_at', { ascending: false });
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) {
            setRecurringExpenses(data as RecurringExpense[]);
            return data as RecurringExpense[];
        }
        return [];
    };

    const fetchFundBalance = async (): Promise<number> => {
        let q = supabase.from('transactions').select('amount, type');
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) {
            const balance = data.reduce((acc: number, curr: any) => {
                return curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount);
            }, 0);
            setFundBalanceState(balance);
            return balance;
        }
        return 0;
    };

    const fetchUsers = async () => {
        let q = supabase.from('profiles').select('*, floors(name, floor_number)').order('email', { ascending: true });
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) setUsers(data as Profile[]);
        setLoading(false);
    };

    /** Auto-process any active recurring expenses whose next billing date has passed. */
    const autoProcessDueExpenses = async (expenses: RecurringExpense[], balance: number) => {
        const now = new Date();
        const due = expenses.filter(e => e.is_active && getNextBillingDate(e) <= now);
        if (due.length === 0) return;

        let runningBalance = balance;
        for (const expense of due) {
            const transFloorId = expense.floor_id || currentFloorId;
            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    amount: expense.amount,
                    type: 'withdrawal',
                    description: `Auto Recurring: ${expense.title}`,
                    floor_id: transFloorId,
                }]);

            if (!txError) {
                const nowIso = now.toISOString();
                await supabase
                    .from('recurring_expenses')
                    .update({ last_processed_at: nowIso })
                    .eq('id', expense.id);

                runningBalance -= expense.amount;
                setRecurringExpenses(prev =>
                    prev.map(e => e.id === expense.id ? { ...e, last_processed_at: nowIso } : e)
                );
            }
        }
        setFundBalanceState(runningBalance);
    };

    const checkAdminStatus = async () => {
        if (CONFIG.BYPASS_AUTH) {
            setIsAdmin(true);
            const [expenses, balance] = await Promise.all([
                fetchRecurringExpenses(),
                fetchFundBalance(),
                fetchUsers(),
                fetchCategories(),
            ]);
            await autoProcessDueExpenses(expenses, balance);
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
            const [expenses, balance] = await Promise.all([
                fetchRecurringExpenses(),
                fetchFundBalance(),
                fetchUsers(),
                fetchCategories(),
            ]);
            await autoProcessDueExpenses(expenses, balance);
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

    /**
     * Set balance to a specific target value.
     * Computes the delta vs current balance and inserts a deposit or withdrawal transaction.
     * Returns null on success, or an error message string on failure.
     */
    const setBalance = async (targetBalance: number, currentBalance: number): Promise<string | null> => {
        if (isNaN(targetBalance) || !currentFloorId) return 'Invalid amount or floor.';
        const delta = targetBalance - currentBalance;
        if (delta === 0) return null;

        const type = delta > 0 ? 'deposit' : 'withdrawal';
        const { error } = await supabase
            .from('transactions')
            .insert([{
                amount: Math.abs(delta),
                type,
                description: delta > 0 ? 'Admin Balance Adjustment (deposit)' : 'Admin Balance Adjustment (withdrawal)',
                floor_id: currentFloorId,
            }]);

        if (!error) {
            setFundBalanceState(targetBalance);
            return null;
        }
        console.error('setBalance error:', error);
        return error.message;
    };

    // Keep addFunds for backward compatibility (used in tests)
    const addFunds = async (amount: number) => {
        if (isNaN(amount) || amount <= 0 || !currentFloorId) return false;
        const { error } = await supabase
            .from('transactions')
            .insert([{ amount, type: 'deposit', description: 'Admin Manual Deposit', floor_id: currentFloorId }]);
        if (!error) {
            setFundBalanceState((prev: number) => prev + amount);
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

    const deleteProposal = async (proposalId: string) => {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId);
        return !error;
    };

    const createRecurringExpense = async (title: string, amount: number, categoryId: string, interval: string = 'monthly') => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId || !currentFloorId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .insert([{ title, amount, category_id: categoryId, floor_id: currentFloorId, recurrence_interval: interval }])
            .select('*, categories(name, color_theme)')
            .single();

        if (data && !error) {
            setRecurringExpenses([data, ...recurringExpenses]);
            return true;
        }
        if (error) console.error('createRecurringExpense error:', error);
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
        console.error('toggleRecurringExpense error:', error);
        return false;
    };

    const updateRecurringExpense = async (expenseId: string, title: string, amount: number, categoryId: string, interval: string = 'monthly') => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .update({ title, amount, category_id: categoryId, recurrence_interval: interval })
            .eq('id', expenseId)
            .select('*, categories(name, color_theme)')
            .single();

        if (data && !error) {
            setRecurringExpenses(recurringExpenses.map((e: RecurringExpense) => e.id === expenseId ? data : e));
            return true;
        }
        if (error) console.error('updateRecurringExpense error:', error);
        return false;
    };

    // Kept for backward compatibility / manual override
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
            const nowIso = new Date().toISOString();
            await supabase
                .from('recurring_expenses')
                .update({ last_processed_at: nowIso })
                .eq('id', expense.id);

            setFundBalanceState(prev => prev - expense.amount);
            setRecurringExpenses(prev =>
                prev.map(e => e.id === expense.id ? { ...e, last_processed_at: nowIso } : e)
            );
            return true;
        }
        console.error('processRecurringExpense error:', error);
        return false;
    };

    return {
        users,
        categories,
        recurringExpenses,
        fundBalance: fundBalance,
        loading,
        isAdmin,
        createCategory,
        addFunds,
        setBalance,
        approveUser,
        rejectUser,
        revokeUser,
        promoteUser,
        demoteUser,
        deleteProposal,
        createRecurringExpense,
        toggleRecurringExpense,
        updateRecurringExpense,
        processRecurringExpense,
        getNextBillingDate,
    };
}
