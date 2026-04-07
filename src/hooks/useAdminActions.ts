import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';
import { useAdminUsers } from './admin/useAdminUsers';
import { useAdminLedger } from './admin/useAdminLedger';
import { useAdminCategories } from './admin/useAdminCategories';

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
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const {
        users,
        fetchUsers,
        approveUser,
        rejectUser,
        revokeUser,
        promoteUser,
        demoteUser,
    } = useAdminUsers(currentFloorId, currentUserRole);

    const {
        recurringExpenses,
        fundBalance,
        fetchRecurringExpenses,
        fetchFundBalance,
        autoProcessDueExpenses,
        setBalance,
        addFunds,
        createRecurringExpense,
        toggleRecurringExpense,
        updateRecurringExpense,
        processRecurringExpense,
    } = useAdminLedger(currentFloorId, currentUserRole);

    const {
        categories,
        fetchCategories,
        createCategory,
    } = useAdminCategories(currentFloorId, currentUserRole);

    useEffect(() => {
        checkAdminStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            setLoading(false);
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
        }
        setLoading(false);
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
        recurringExpenses,
        fundBalance,
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
