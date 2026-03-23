import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { CONFIG } from '../config';
import Sidebar from './Sidebar';
import { cn } from '../lib/utils';

export default function AuthLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>('member');
    const [currentFloorId, setCurrentFloorId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (CONFIG.BYPASS_AUTH) {
            setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'demo@frontiertower.test' } });
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
        <div className="min-h-screen bg-[#FCFAF7] flex selection:bg-primary-100 selection:text-primary-900">
            <Sidebar 
                isOpen={isSidebarOpen} 
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
                userEmail={session?.user?.email}
            />
            
            <main className={cn(
                "flex-1 min-h-screen relative transition-all duration-500 ease-in-out",
                isSidebarOpen ? "w-[calc(100vw-320px)]" : "w-[calc(100vw-80px)]"
            )}>
                <div className="w-full h-full px-6 md:px-12 py-8">
                    <Outlet context={{ currentFloorId, userRole, isAdmin }} />
                </div>
            </main>

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
                    opacity: 0.1;
                    pointer-events: none;
                    z-index: 50;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}</style>
        </div>
    );
}
