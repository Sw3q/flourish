import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types';
export type { Category };

export function useAdminCategories(currentFloorId: string | null, currentUserRole?: string) {
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchCategories = async () => {
        let q = supabase.from('categories').select('*').order('name');
        if (currentUserRole !== 'super_admin' && currentFloorId) q = q.eq('floor_id', currentFloorId);

        const { data } = await q;
        if (data) setCategories(data as Category[]);
    };

    const createCategory = async (name: string, color: string) => {
        if (!name.trim() || !currentFloorId) return false;

        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, color_theme: color, floor_id: currentFloorId }])
            .select()
            .single();

        if (data && !error) {
            setCategories(prev => [...prev, data]);
            return true;
        }
        return false;
    };

    return {
        categories,
        fetchCategories,
        createCategory,
    };
}
