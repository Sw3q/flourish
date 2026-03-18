import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Building2, 
    LogOut, 
    ChevronRight, 
    Search,
    User,
    Settings,
    Layers,
    PanelLeftClose,
    PanelLeftOpen,
    ArrowLeftRight
} from 'lucide-react';
import { useFloors } from '../hooks/useFloors';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { cn } from '../lib/utils'; // Assuming a cn utility exists or I'll use template literals

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const navigate = useNavigate();
    const { floorId } = useParams();
    const floors = useFloors();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFloors = floors.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.floor_number.toString().includes(searchQuery)
    );

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <aside className={cn(
            "h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-500 ease-in-out overflow-hidden shadow-2xl",
            isOpen ? "w-80" : "w-20"
        )}>
            {/* Brand Header */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between min-w-[320px]">
                <Link to="/building" className={cn(
                    "flex items-center gap-3 group transition-opacity duration-300",
                    !isOpen && "opacity-0 pointer-events-none"
                )}>
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900 leading-tight">
                            Frontier <span className="text-primary-600">Fund</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vertical OS</p>
                    </div>
                </Link>
                <button 
                    onClick={onToggle}
                    className={cn(
                        "p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all duration-300",
                        !isOpen && "fixed left-5 top-5 bg-white border border-slate-100 shadow-lg"
                    )}
                >
                    {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
                {/* Primary Actions */}
                <div className="space-y-1">
                    <button
                        onClick={() => navigate('/building')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                            !floorId ? 'bg-primary-50 text-primary-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                            !isOpen && "justify-center px-0"
                        )}
                        title="Tower Overview"
                    >
                        <LayoutDashboard className={cn(
                            "w-5 h-5 flex-shrink-0",
                            !floorId ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'
                        )} />
                        {isOpen && <span className="font-bold text-sm whitespace-nowrap">Tower Overview</span>}
                        {isOpen && !floorId && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => navigate('/admin')}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 group",
                            !isOpen && "justify-center px-0"
                        )}
                        title="Administration"
                    >
                        <Settings className="w-5 h-5 flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
                        {isOpen && <span className="font-bold text-sm whitespace-nowrap">Administration</span>}
                    </button>
                </div>

                {/* Floor Directory */}
                <div className={cn("transition-opacity duration-300", !isOpen && "opacity-0 pointer-events-none h-0")}>
                    <div className="px-4 mb-4 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Floors Directory</h3>
                        <Layers className="w-3 h-3 text-slate-300" />
                    </div>
                    
                    {/* Floor Search */}
                    <div className="px-2 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search floors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        {filteredFloors.map((floor) => (
                            <button
                                key={floor.id}
                                onClick={() => navigate(`/floor/${floor.id}`)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group",
                                    floorId === floor.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                )}
                            >
                                <span className={cn(
                                    "text-[10px] font-black w-6 text-center flex-shrink-0",
                                    floorId === floor.id ? 'text-primary-400' : 'text-slate-300'
                                )}>
                                    {floor.floor_number.toString().padStart(2, '0')}
                                </span>
                                <span className="font-bold text-xs truncate">{floor.name}</span>
                                {floorId === floor.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 ml-auto animate-pulse flex-shrink-0"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Collapsed Floor Indicators */}
                {!isOpen && (
                    <div className="space-y-4 flex flex-col items-center pt-4">
                        <div className="w-8 h-[1px] bg-slate-100"></div>
                        <ArrowLeftRight className="w-4 h-4 text-slate-300" />
                        <div className="space-y-2">
                            {floors.slice(0, 5).map(f => (
                                <div key={f.id} className={cn(
                                    "w-2 h-2 rounded-full",
                                    floorId === f.id ? "bg-primary-500" : "bg-slate-100"
                                )}></div>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Profile Section */}
            <div className="p-4 border-t border-slate-50">
                <div className={cn(
                    "p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100 mb-2 transition-all duration-300",
                    !isOpen && "p-2 bg-transparent border-none"
                )}>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <User className="w-5 h-5 text-slate-400" />
                    </div>
                    {isOpen && (
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate">Resident Profile</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">Approved Member</div>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all duration-300 group",
                        !isOpen && "justify-center px-0"
                    )}
                    title="Terminate Session"
                >
                    <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-600 flex-shrink-0" />
                    {isOpen && <span className="font-bold text-xs whitespace-nowrap">Terminate Session</span>}
                </button>
            </div>
        </aside>
    );
}
