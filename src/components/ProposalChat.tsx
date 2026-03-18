import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useComments } from '../hooks/useComments';

interface ProposalChatProps {
    proposalId: string;
    currentUserId: string;
    currentFloorId: string | null;
    onClose: () => void;
}

export default function ProposalChat({ proposalId, currentUserId, currentFloorId, onClose }: ProposalChatProps) {
    const { comments, loading, addComment } = useComments(proposalId, currentFloorId);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        const success = await addComment(currentUserId, newComment);
        if (success) {
            setNewComment('');
        }
        setSubmitting(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Proposal Discussion</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px] scroll-smooth"
            >
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                    </div>
                )}
                
                {!loading && comments.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No discussion yet. Start the conversation.</p>
                    </div>
                )}

                {comments.map((comment) => (
                    <div 
                        key={comment.id} 
                        className={`flex flex-col ${comment.author_id === currentUserId ? 'items-end' : 'items-start'}`}
                    >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">
                                {comment.profiles?.email.split('@')[0]}
                            </span>
                            <span className="text-[8px] text-slate-300">
                                {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div 
                            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                comment.author_id === currentUserId 
                                    ? 'bg-primary-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                            }`}
                        >
                            {comment.content}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Refinement suggestion..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary-400 transition-all"
                />
                <button 
                    type="submit" 
                    disabled={!newComment.trim() || submitting}
                    className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-primary-600 disabled:opacity-20 transition-all shadow-lg shadow-black/5"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
