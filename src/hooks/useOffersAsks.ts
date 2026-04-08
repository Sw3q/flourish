import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { OfferAsk } from '../types';

export function useOffersAsks(floorId?: string, limit: number = 20) {
    const [posts, setPosts] = useState<OfferAsk[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        // We use a join query. Supabase/PostgREST doesn't inherently aggregate comment counts cleanly without a view or RPC in a single select query.
        // For simplicity we will query basic info, then side-load comment counts if needed, but the UI might not even need comment counts initially. Let's just fetch the posts.
        let q = supabase
            .from('offers_asks')
            .select(`
                *,
                profiles (email, atproto_handle),
                floors (name, floor_number)
            `)
            .in('status', ['active', 'completed'])
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });

        if (floorId) {
            q = q.eq('floor_id', floorId);
        } else {
            q = q.limit(limit);
        }

        const { data, error } = await q;

        if (!error && data) {
            // we will simulate fetching comment counts by querying offers_asks_comments locally or we can build an RPC later.
            // For now, let's just stick to the main data.
            setPosts(data as any as OfferAsk[]);
        } else {
            console.error('Error fetching offers/asks:', error);
        }
        setLoading(false);
    }, [floorId, limit]);

    useEffect(() => {
        fetchPosts();
        
        const sub = supabase.channel('offers_asks_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'offers_asks' }, fetchPosts)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [fetchPosts]);

    const createPost = async (type: 'offer' | 'ask', title: string, description: string, creatorId: string, currentFloorId: string) => {
        if (!title.trim() || !description.trim()) return false;

        const { error } = await supabase
            .from('offers_asks')
            .insert([{
                type,
                title,
                description,
                creator_id: creatorId,
                floor_id: currentFloorId
            }]);

        if (error) {
            console.error('Error creating post:', error);
            return false;
        }
        
        await fetchPosts();
        return true;
    };

    const updatePostStatus = async (postId: string, status: 'active' | 'completed') => {
        const { error } = await supabase
            .from('offers_asks')
            .update({ status })
            .eq('id', postId);
            
        if (!error) {
            await fetchPosts();
            return true;
        }
        return false;
    };

    return {
        posts,
        loading,
        fetchPosts,
        createPost,
        updatePostStatus
    };
}
