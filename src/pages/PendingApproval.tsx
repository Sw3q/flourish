import { Clock, LogOut, RefreshCcw, Loader2 } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            {/* Playful background blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md relative z-10 glass rounded-3xl p-8 text-center shadow-xl border-t border-white/80">
                <div className="w-20 h-20 bg-accent-100 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <Clock className="w-10 h-10 text-accent-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Pending Approval</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Your account has been created, but you need to be approved by an administrator before you can participate in the Flourish Fund governance. Check back later!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={handleSignOut}
                        className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out for now
                    </button>

                    <button
                        onClick={checkStatus}
                        disabled={checking}
                        className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                        Check Status
                    </button>
                </div>
            </div>
        </div>
    );
}
