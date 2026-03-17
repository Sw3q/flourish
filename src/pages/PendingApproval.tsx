import { Clock, RefreshCcw, Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setChecking(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('is_approved, role').eq('id', user.id).single();
            const isAdmin = data?.role === 'admin' || data?.role === 'super_admin';
            if (data?.is_approved || isAdmin) {
                navigate('/');
            }
        }
        setChecking(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FCFAF7] font-sans selection:bg-primary-100 selection:text-primary-900 grain">
            <div className="w-full max-w-2xl relative z-10 flex flex-col md:flex-row bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-2xl">
                {/* Visual Sidebar */}
                <div className="md:w-1/3 bg-slate-900 p-10 flex flex-col justify-between text-white relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/40 to-transparent opacity-50"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-12 border border-white/10 animate-pulse">
                            <Clock className="w-6 h-6 text-primary-400" />
                        </div>
                        <h2 className="text-3xl font-display font-black leading-none mb-4">Hold <br /> Tight.</h2>
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Frontier OS v1.0</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="md:w-2/3 p-10 md:p-16 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-6 h-[2px] bg-primary-600"></div>
                        <span className="text-primary-600 font-bold tracking-[0.3em] uppercase text-[9px]">Identity Verification</span>
                    </div>

                    <h1 className="text-4xl font-display font-extrabold text-slate-900 mb-6 tracking-tight leading-none">
                        Awaiting <br /> <span className="text-slate-400">Authorization.</span>
                    </h1>
                    
                    <p className="text-slate-500 font-medium leading-relaxed mb-12">
                        Your presence has been recorded. An administrator must verify your identity before access to the Frontier Verticality is granted.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            className="w-full sm:w-grow flex items-center justify-center px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-primary-600 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                        >
                            {checking ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-3" />}
                            Sync Status
                        </button>
                        
                        <button
                            onClick={handleSignOut}
                            className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>

                    <div className="mt-12 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security: Pending Admin Review</span>
                    </div>
                </div>
            </div>

            <style>{`
                .grain {
                    position: relative;
                }
                .grain::before {
                    content: "";
                    position: fixed;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.03;
                    pointer-events: none;
                    z-index: 50;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}</style>
        </div>
    );
}
