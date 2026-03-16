import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight, HeartHandshake } from 'lucide-react';
import { CONFIG } from '../config';
import { useFloors } from '../hooks/useFloors';

export default function Login() {
    const navigate = useNavigate();

    useEffect(() => {
        if (CONFIG.BYPASS_AUTH) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [floorId, setFloorId] = useState('');
    const [loading, setLoading] = useState(false);
    const floors = useFloors();

    useEffect(() => {
        if (!isLogin && floors.length > 0 && !floorId) {
            setFloorId(floors[0].id);
        }
    }, [isLogin, floors, floorId]);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Fix: navigate to the protected layout area where AuthLayout will verify their approval status
                navigate('/', { replace: true });
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/pending`,
                        data: {
                            floor_id: floorId
                        }
                    },
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            }
        } catch (err: any) {
            if (err.message.toLowerCase().includes('rate limit')) {
                setError('Registration limit reached for this hour. Please try again later or contact an admin to be manually added.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary-50 to-accent-200">
            {/* Playful background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-primary-500 to-accent-400 rounded-2xl mx-auto flex items-center justify-center transform rotate-3 shadow-lg mb-6">
                            <HeartHandshake className="w-8 h-8 text-white transform -rotate-3" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            Flourish Fund
                        </h1>
                        <p className="text-sm text-slate-500 mt-2">
                            Grassroots governance for our communal pot.
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none bg-white/50"
                                placeholder="you@frontier.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none bg-white/50"
                                placeholder="••••••••"
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">
                                    Base Community Floor
                                </label>
                                <select
                                    value={floorId}
                                    onChange={(e) => setFloorId(e.target.value)}
                                    className="w-full bg-white/50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 pr-8 shadow-sm transition-all focus:ring-2 focus:ring-opacity-20 outline-none"
                                >
                                    {floors.map(floor => (
                                        <option key={floor.id} value={floor.id}>{floor.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-danger-400/10 text-danger-400 text-sm rounded-xl border border-danger-400/20">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-success-400/10 text-success-400 border-success-400/20 text-sm rounded-xl border">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 px-4 font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center group shadow-lg shadow-slate-900/20"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign in' : 'Create account'}
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                        >
                            {isLogin
                                ? 'Need an account? Sign up'
                                : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
