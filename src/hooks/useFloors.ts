import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Floor } from '../types';

export function useFloors() {
    const [floors, setFloors] = useState<Floor[]>([]);

    useEffect(() => {
        const fetchFloors = async () => {
            const { data } = await supabase.from('floors').select('*').order('name');
            if (data) setFloors(data as Floor[]);
        };
        fetchFloors();
    }, []);

    return floors;
}
