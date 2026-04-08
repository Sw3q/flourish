import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOffersAsks } from '../hooks/useOffersAsks';
import { Plus, MessageSquare, Tag, HandHeart, Briefcase } from 'lucide-react';
import type { Profile } from '../types';
import HypercertClaimSection from './HypercertClaimSection';

interface OffersAsksBoardProps {
    floorId?: string;
    mode: 'local' | 'global';
    currentUser?: Profile;
    floorName?: string;
    limit?: number; // Added to support "Latest 3" view
}

export default function OffersAsksBoard({ floorId, mode, currentUser, limit }: OffersAsksBoardProps) {
    const { posts, loading, createPost, updatePostStatus } = useOffersAsks(floorId, limit ? 15 : 50);
    const [filter, setFilter] = useState<'all' | 'offer' | 'ask'>('all');
    const [statusTab, setStatusTab] = useState<'active' | 'completed'>('active');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newType, setNewType] = useState<'offer' | 'ask'>('offer');
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !floorId) return;
        setSubmitting(true);
        const success = await createPost(newType, newTitle, newDescription, currentUser.id, floorId);
        if (success) {
            setIsCreating(false);
            setNewTitle('');
            setNewDescription('');
            setNewType('offer');
        }
        setSubmitting(false);
    };

    if (loading && posts.length === 0) {
        return (
            <div className="w-full h-32 flex items-center justify-center animate-pulse bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (posts.length === 0 && !isCreating && mode === 'global') {
        return null; // Don't show anything on the global view if there are no posts.
    }

    const activePosts = posts.filter(p => p.status === 'active');
    const completedPosts = posts.filter(p => p.status === 'completed');
    
    const postsForCurrentTab = statusTab === 'active' ? activePosts : completedPosts;
    const filteredPosts = postsForCurrentTab.filter(p => filter === 'all' || p.type === filter);
    
    // For non-expanded mode on tower dashboard, only show the first N posts
    const displayedPosts = (limit && !isExpanded) ? filteredPosts.slice(0, limit) : filteredPosts;
    const hasMore = limit && filteredPosts.length > limit;

    return (
        <div className="w-full mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-display font-extrabold tracking-tight text-slate-900">
                        {mode === 'global' ? 'Building Exchange' : 'Floor Exchange'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {mode === 'global' 
                            ? 'Latest offers and asks from across the tower.' 
                            : 'Trade, collaborate, and assist your direct neighbors.'
                        }
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Status Tabs (Live vs Fulfilled) */}
                    <div className="flex bg-slate-100 p-1 rounded-full shadow-inner w-full md:w-auto">
                        <button
                            onClick={() => setStatusTab('active')}
                            className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                statusTab === 'active'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Live
                        </button>
                        <button
                            onClick={() => setStatusTab('completed')}
                            className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                statusTab === 'completed'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Fulfilled
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>

                    {posts.length > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-full shadow-inner w-full md:w-auto">
                            {['all', 'offer', 'ask'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                        filter === f
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                    {mode === 'local' && currentUser && (
                        <button
                            onClick={() => setIsCreating(!isCreating)}
                            className={`flex items-center justify-center whitespace-nowrap gap-2 px-5 py-2.5 rounded-full font-black uppercase tracking-widest text-[9px] transition-all shadow-sm border w-full md:w-auto ${
                                isCreating 
                                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' 
                                : 'bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100 hover:text-primary-800'
                            }`}
                        >
                            {isCreating ? 'Cancel' : <><Plus className="w-3.5 h-3.5" /> Post Listing</>}
                        </button>
                    )}
                </div>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setNewType('offer')}
                            className={`flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                newType === 'offer' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <HandHeart className="w-4 h-4" />
                            I have an Offer
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewType('ask')}
                            className={`flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                newType === 'ask' 
                                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            I need something (Ask)
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder={newType === 'offer' ? "What are you offering? (e.g. Graphic design, extra monitors)" : "What do you need? (e.g. Help with AWS, a desk chair)"}
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                required
                            />
                        </div>
                        <div>
                            <textarea
                                placeholder="Provide more details..."
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400 text-sm min-h-[100px] resize-y"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting || !newTitle.trim() || !newDescription.trim()}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Publishing...' : 'Publish to Board'}
                        </button>
                    </div>
                </form>
            )}

            {posts.length === 0 && !isCreating && (
                <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Tag className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">The board is empty</h3>
                    <p className="text-slate-500 text-sm max-w-sm">No active offers or asks right now. Be the first to start the exchange!</p>
                </div>
            )}

            {displayedPosts.length === 0 && posts.length > 0 && !isCreating && (
                <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Tag className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No {filter}s found</h3>
                    <p className="text-slate-500 text-sm max-w-sm">There are no {filter}s currently active. Try changing the filter.</p>
                </div>
            )}

            {displayedPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedPosts.map(post => {
                        const isOffer = post.type === 'offer';
                        const isCreator = currentUser?.id === post.creator_id;
                        const isCompleted = post.status === 'completed';
                        
                        return (
                            <div 
                                key={post.id} 
                                className={`bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col group hover:border-primary-200 transition-all ${
                                    isCompleted ? 'opacity-60 grayscale-[0.2] bg-slate-50/50' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                            isOffer 
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                            {post.type}
                                        </div>
                                        {isCompleted && (
                                            <div className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                                                ✓ Done
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5 translate-y-0.5">
                                        {post.floors && (
                                            <>
                                                <Link 
                                                    to={`/floor/${post.floor_id}`}
                                                    className="font-black text-slate-500 uppercase tracking-widest text-[8px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 transition-all hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                                                >
                                                    F{post.floors.floor_number}
                                                </Link>
                                                <span className="opacity-50">·</span>
                                            </>
                                        )}
                                        <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-display font-extrabold text-slate-900 leading-tight mb-2 line-clamp-2">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 flex-1 line-clamp-3 mb-6">
                                    {post.description}
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                            {post.profiles?.email.charAt(0)}
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-xs font-bold text-slate-700 truncate">{post.profiles?.email.split('@')[0]}</span>
                                        </div>
                                    </div>
                                    {isCreator ? (
                                        isCompleted ? (
                                            <div className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Fulfilled
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => updatePostStatus(post.id, 'completed')}
                                                className="ml-2 text-[10px] font-bold text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2 py-1 rounded transition-colors whitespace-nowrap uppercase tracking-wider"
                                            >
                                                Mark Done
                                            </button>
                                        )
                                    ) : (
                                        <a href={`mailto:${post.profiles?.email}`} className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 flex items-center justify-center transition-colors">
                                            <MessageSquare className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                                <HypercertClaimSection post={post} currentUser={currentUser} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Expand / View All Button */}
            {hasMore && !isExpanded && (
                <div className="mt-10 flex justify-center">
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="px-10 py-4 rounded-full bg-white border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] hover:border-primary-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Explore Full Board
                    </button>
                </div>
            )}

            {/* Expansion Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setIsExpanded(false)}></div>
                    <div className="bg-[#FAF9F6] w-full max-w-7xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-white/20">
                        {/* Modal Header */}
                        <div className="p-8 md:p-10 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-[#FAF9F6]/80 backdrop-blur-md z-20">
                            <div>
                                <h3 className="text-3xl font-display font-black text-slate-900 tracking-tight">Community Exchange</h3>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mt-1 opacity-60">Full Listing History</p>
                            </div>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        
                        {/* Modal Content - Internal Scroll */}
                        <div className="p-8 md:p-10 overflow-y-auto flex-1 custom-modal-scrollbar">
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredPosts.map(post => {
                                    const isOffer = post.type === 'offer';
                                    const isCreator = currentUser?.id === post.creator_id;
                                    const isCompleted = post.status === 'completed';
                                    
                                    return (
                                        <div 
                                            key={post.id} 
                                            className={`bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col transition-all overflow-hidden ${
                                                isCompleted ? 'opacity-60 grayscale-[0.2] bg-slate-50/50' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                                        isOffer 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                        {post.type}
                                                    </div>
                                                    {isCompleted && (
                                                        <div className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                                                            ✓ Done
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                    {post.floors && (
                                                        <span className="font-black text-slate-500 uppercase tracking-widest text-[8px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                            F{post.floors.floor_number}
                                                        </span>
                                                    )}
                                                    <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-xl font-display font-extrabold text-slate-900 leading-tight mb-4">
                                                {post.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 flex-1 mb-8 leading-relaxed">
                                                {post.description}
                                            </p>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-auto">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                        {post.profiles?.email.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{post.profiles?.email.split('@')[0]}</span>
                                                </div>
                                                {isCreator ? (
                                                    isCompleted ? (
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Fulfilled</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => updatePostStatus(post.id, 'completed')}
                                                            className="text-[10px] font-black text-primary-600 hover:text-primary-800 uppercase tracking-widest"
                                                        >
                                                            Mark Done
                                                        </button>
                                                    )
                                                ) : (
                                                    <a href={`mailto:${post.profiles?.email}`} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 flex items-center justify-center transition-colors">
                                                        <MessageSquare className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <HypercertClaimSection post={post} currentUser={currentUser} />
                                        </div>
                                    );
                                })}
                           </div>
                        </div>
                    </div>
                    <style>{`
                        .custom-modal-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                    `}</style>
                </div>
            )}
        </div>
    );
}
