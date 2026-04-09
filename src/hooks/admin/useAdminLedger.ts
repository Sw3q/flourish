import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getNextBillingDate, type RecurringExpense } from '../useAdminActions';

export function useAdminLedger(currentFloorId: string | null, currentUserRole?: string) {
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [fundBalance, setFundBalanceState] = useState<number>(0);

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
        if (!currentFloorId) {
            console.warn('[Ledger] No currentFloorId provided to fetchFundBalance');
            return 0;
        }
        
        console.log('[Ledger] Fetching balance for floor:', currentFloorId);
        const { data, error } = await supabase
            .from('floors')
            .select('id, name, balance')
            .eq('id', currentFloorId)
            .single();
        
        if (error) {
            console.error('[Ledger] Error fetching floor balance:', error);
            return 0;
        }

        if (data) {
            const balance = Number(data.balance) || 0;
            console.log(`[Ledger] Floor "${data.name}" balance is:`, balance);
            setFundBalanceState(balance);
            return balance;
        }
        return 0;
    };

    const autoProcessDueExpenses = async (expenses: RecurringExpense[], balance: number) => {
        const now = new Date();
        const due = expenses.filter(e => e.is_active && getNextBillingDate(e) <= now);
        if (due.length === 0) return;

        let runningBalance = balance;
        for (const expense of due) {
            const transFloorId = expense.floor_id || currentFloorId;
            
            // Updating floors.balance now automatically creates an audit transaction via DB trigger
            const { error: txError } = await supabase
                .from('floors')
                .update({ balance: runningBalance - expense.amount })
                .eq('id', transFloorId);

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

    const setBalance = async (targetBalance: number): Promise<string | null> => {
        if (isNaN(targetBalance) || !currentFloorId) return 'Invalid amount or floor.';
        
        // Updating floors.balance now automatically creates an audit transaction via DB trigger
        const { error } = await supabase
            .from('floors')
            .update({ balance: targetBalance })
            .eq('id', currentFloorId);

        if (!error) {
            setFundBalanceState(targetBalance);
            return null;
        }
        console.error('setBalance error:', error);
        return error.message;
    };

    const addFunds = async (amount: number) => {
        if (isNaN(amount) || amount <= 0 || !currentFloorId) return false;
        
        // Single update - DB trigger handles the transaction record
        const { error } = await supabase
            .from('floors')
            .update({ balance: fundBalance + amount })
            .eq('id', currentFloorId);
        
        if (!error) {
            setFundBalanceState((prev: number) => prev + amount);
            return true;
        }
        return false;
    };

    const createRecurringExpense = async (title: string, amount: number, categoryId: string, interval: string = 'monthly') => {
        if (!title.trim() || isNaN(amount) || amount <= 0 || !categoryId || !currentFloorId) return false;

        const { data, error } = await supabase
            .from('recurring_expenses')
            .insert([{ title, amount, category_id: categoryId, floor_id: currentFloorId, recurrence_interval: interval }])
            .select('*, categories(name, color_theme)')
            .single();

        if (data && !error) {
            setRecurringExpenses(prev => [data, ...prev]);
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
            setRecurringExpenses(prev => prev.map((e: RecurringExpense) => e.id === expenseId ? { ...e, is_active: isActive } : e));
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
            setRecurringExpenses(prev => prev.map((e: RecurringExpense) => e.id === expenseId ? data : e));
            return true;
        }
        if (error) console.error('updateRecurringExpense error:', error);
        return false;
    };

    const processRecurringExpense = async (expense: RecurringExpense) => {
        if (!currentFloorId && !expense.floor_id) return false;
        const targetFloorId = expense.floor_id || currentFloorId!;

        // Single update - DB trigger handles the transaction record
        const { error } = await supabase
            .from('floors')
            .update({ balance: fundBalance - expense.amount })
            .eq('id', targetFloorId);

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
        processRecurringExpense
    };
}
