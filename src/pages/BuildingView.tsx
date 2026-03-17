import { useNavigate } from 'react-router-dom';
import { useTowerStats } from '../hooks/useTowerStats';
import { Loader2, TrendingUp, Users, BadgeDollarSign, ArrowUpRight, Building2, Layers } from 'lucide-react';

export default function BuildingView() {
    const navigate = useNavigate();
    const { floors, totalBalance, totalActiveProposals, totalMembers, loading } = useTowerStats();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FCFAF7]">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-500/10 blur-[100px] rounded-full animate-pulse"></div>
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600 relative z-10" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCFAF7] text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900 grain">
            <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-24 relative z-10">
                
                {/* Editorial Header */}
                <header className="mb-24 flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-slate-200 pb-12">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-[2px] bg-primary-600"></div>
                            <span className="text-primary-600 font-bold tracking-[0.2em] uppercase text-xs">The Frontier OS</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tight leading-[0.9] text-slate-900 mb-8">
                            Frontier <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-900">Verticality.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-xl">
                            A living directory of communal impact across sixteen floors of human flourishing.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 text-right items-start lg:items-end">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-bold border border-slate-200">
                            <Layers className="w-4 h-4 text-primary-600" />
                            16 ACTIVE FLOORS
                        </div>
                        <p className="text-slate-400 text-sm font-medium">EST. 2026 • FRONTIER TOWER</p>
                    </div>
                </header>

                {/* Asymmetrical Global Stats */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-32">
                    <div className="md:col-span-7 group relative bg-white border border-slate-200 p-10 rounded-[2rem] overflow-hidden transition-all duration-700 hover:border-primary-200 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
                        <div className="absolute top-0 right-0 p-8 text-primary-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <BadgeDollarSign className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-12" />
                        </div>
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest mb-6">Aggregate Treasury</span>
                            <div className="text-6xl md:text-7xl font-display font-extrabold tracking-tighter text-slate-900 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                <span className="text-2xl align-top text-slate-300 ml-1">.{(totalBalance % 1).toFixed(2).split('.')[1]}</span>
                            </div>
                            <p className="text-slate-500 font-medium max-w-sm">Total liquid assets managed by the Frontier Foundation across all operational floors.</p>
                        </div>
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-6">
                        <div className="flex-1 bg-primary-600 p-8 rounded-[2rem] text-white flex flex-col justify-between group overflow-hidden relative hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float"></div>
                            <div className="relative z-10 flex justify-between items-start">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Active Proposals</span>
                                <TrendingUp className="w-5 h-5 opacity-50 group-hover:rotate-12 transition-transform" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-6xl font-display font-extrabold mb-2">{totalActiveProposals}</div>
                                <div className="text-sm font-bold opacity-60">LIVE GOVERNANCE EVENTS</div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white border border-slate-200 p-8 rounded-[2rem] flex flex-col justify-between hover:border-slate-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Residents</span>
                                <Users className="w-5 h-5 text-slate-300 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <div className="text-6xl font-display font-extrabold text-slate-900 mb-2">{totalMembers}</div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Verified Floor Members</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floor Directory Section */}
                <div className="space-y-12 mb-24">
                    <div className="flex items-baseline justify-between border-b border-slate-200 pb-6">
                        <h2 className="text-4xl font-display font-extrabold tracking-tight">The Directory</h2>
                        <span className="text-sm font-bold text-slate-400">{floors.length} ENTRIES FOUND</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {floors.map((stat, i) => (
                            <button
                                key={stat.floor.id}
                                onClick={() => navigate(`/floor/${stat.floor.id}`)}
                                className="group flex flex-col text-left transition-all duration-500 h-full animate-slide-up"
                                style={{ animationDelay: `${0.4 + (i * 0.05)}s` }}
                            >
                                <div className="relative flex-1 bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:border-primary-100">
                                    {/* Abstract Number Background */}
                                    <div className="absolute -top-4 -right-4 text-9xl font-display font-black text-slate-50 opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110 pointer-events-none">
                                        {stat.floor.floor_number}
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all duration-500">
                                                {stat.floor.floor_number.toString().padStart(2, '0')}
                                            </div>
                                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                                        </div>
                                        <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-2 group-hover:text-primary-700 transition-colors line-clamp-2 leading-tight">
                                            {stat.floor.name}
                                        </h3>
                                        <div className="w-8 h-[2px] bg-slate-100 group-hover:w-16 group-hover:bg-primary-600 transition-all duration-500 mb-8"></div>
                                    </div>

                                    <div className="relative z-10 space-y-4 pt-6 border-t border-slate-50">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Balance</span>
                                            <span className="text-lg font-display font-extrabold text-slate-900">${stat.balance.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Proposals</span>
                                            <span className={`text-sm font-bold ${stat.activeProposals > 0 ? 'text-primary-600' : 'text-slate-300'}`}>
                                                {stat.activeProposals} ACTIVE
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer / Contact Section */}
                <footer className="mt-48 pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 pb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">Frontier Foundation</span>
                    </div>
                    <div className="flex gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-primary-600 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-primary-600 transition-colors">Security</a>
                        <a href="#" className="hover:text-primary-600 transition-colors">Impact</a>
                    </div>
                </footer>
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
