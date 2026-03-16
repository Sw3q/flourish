import { Navigate, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { CONFIG } from '../config';

export default function AuthLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>('member');
    const [currentFloorId, setCurrentFloorId] = useState<string | null>(null);

    useEffect(() => {
        if (CONFIG.BYPASS_AUTH) {
            setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'demo@flourish.test' } });
            setIsApproved(true);
            setIsAdmin(true);
            setUserRole('super_admin');
            setCurrentFloorId('00000000-0000-0000-0000-000000000000');
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkApproval(session.user.id);
            else setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) checkApproval(session.user.id);
            else {
                setIsApproved(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkApproval = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('is_approved, role, floor_id')
            .eq('id', userId)
            .single();

        const isUserAdmin = data?.role === 'admin' || data?.role === 'super_admin';
        setIsApproved(data?.is_approved || isUserAdmin || false);
        setIsAdmin(isUserAdmin);
        setUserRole(data?.role || 'member');
        setCurrentFloorId(data?.floor_id || null);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // If logged in but not approved, show pending screen (unless they are already on it)
    if (!isApproved && window.location.pathname !== '/pending') {
        return <Navigate to="/pending" replace />;
    }

    // If approved and trying to access pending, redirect to dashboard
    if (isApproved && window.location.pathname === '/pending') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white shadow-sm border-b border-primary-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <Link to="/building" className="flex items-center hover:opacity-80 transition-opacity">
                            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                Frontier Tower Fund
                            </span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/building"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Tower
                            </Link>
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1 bg-primary-50 rounded-lg transition-colors"
                                >
                                    Admin
                                </Link>
                            )}
                            <button
                                onClick={() => supabase.auth.signOut()}
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet context={{ currentFloorId, userRole }} />
            </main>
        </div>
    );
}
