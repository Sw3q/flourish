import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Comment = {
    id: string;
    proposal_id: string;
    author_id: string;
    content: string;
    created_at: string;
    floor_id: string;
    profiles: { email: string };
};

export function useComments(proposalId: string | null, currentFloorId: string | null) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchComments = async () => {
        if (!proposalId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('proposal_comments')
            .select('*, profiles:author_id (email)')
            .eq('proposal_id', proposalId)
            .order('created_at', { ascending: true });

        if (data && !error) {
            setComments(data as unknown as Comment[]);
        }
        setLoading(false);
    };

    const addComment = async (authorId: string, content: string) => {
        if (!proposalId || !currentFloorId || !content.trim()) return false;

        const { data, error } = await supabase
            .from('proposal_comments')
            .insert([{
                proposal_id: proposalId,
                author_id: authorId,
                content: content.trim(),
                floor_id: currentFloorId
            }])
            .select('*, profiles:author_id (email)')
            .single();

        if (data && !error) {
            // Manual refetch ensures immediate update even if real-time has a delay
            await fetchComments();
            return true;
        }
        return false;
    };

    const deleteComment = async (commentId: string) => {
        const { error } = await supabase
            .from('proposal_comments')
            .delete()
            .eq('id', commentId);
        
        return !error;
    };

    useEffect(() => {
        if (!proposalId) {
            setComments([]);
            return;
        }

        fetchComments();

        // Real-time subscription
        const channel = supabase
            .channel(`proposal_comments:${proposalId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'proposal_comments',
                    filter: `proposal_id=eq.${proposalId}`
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [proposalId]);

    return {
        comments,
        loading,
        addComment,
        deleteComment,
        refreshComments: fetchComments
    };
}
