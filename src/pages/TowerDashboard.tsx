import { useTowerStats } from '../hooks/useTowerStats';
import { Loader2, TrendingUp, Users, BadgeDollarSign, Building2, Activity } from 'lucide-react';
import { FloorTreasuryChart, ActivityTrendChart } from '../components/Visualizations';

export default function TowerDashboard() {
    const {
        floors,
        totalBalance,
        totalMembers,
        activityTrend,
        governanceIntensity,
        loading
    } = useTowerStats();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-500/10 blur-[100px] rounded-full animate-pulse"></div>
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600 relative z-10" />
                </div>
            </div>
        );
    }

    const chartData = floors.map(f => ({ name: f.floor.name, balance: f.balance }));

    return (
        <div className="w-full h-full space-y-12 animate-in fade-in duration-700">
            {/* Expanded Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-[2px] bg-primary-600"></div>
                        <span className="text-primary-600 font-black tracking-[0.2em] uppercase text-[10px]">Tower Status Overview</span>
                    </div>
                </div>
            </header>

            {/* Dashboard Layout: Stats & Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">

                {/* Primary Balance Metric - Expanded */}
                <div className="xl:col-span-8 bg-white border border-slate-200 p-10 rounded-[3rem] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.08)] transition-all duration-700">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <span className="inline-block px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Aggregate Treasury Assets</span>
                            <div className="text-7xl md:text-9xl font-display font-extrabold tracking-tighter text-slate-900 leading-none">
                                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                <span className="text-3xl align-top text-slate-200 ml-2">.{(totalBalance % 1).toFixed(2).split('.')[1]}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-primary-50 rounded-[2rem] shadow-sm transform hover:rotate-6 transition-transform">
                            <BadgeDollarSign className="w-12 h-12 text-primary-600" />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4">
                            <span>Global Treasury Distribution per Floor</span>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                                    Liquid Funds
                                </span>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <FloorTreasuryChart data={chartData} />
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics Column */}
                <div className="xl:col-span-4 flex flex-col gap-10">
                    {/* Governance Activity Card */}
                    <div className="flex-1 bg-primary-100 border border-primary-200 p-10 rounded-[3rem] text-primary-900 overflow-hidden relative group hover:shadow-2xl transition-all duration-500">
                        <div className="absolute top-0 right-0 p-10 text-primary-900/5 opacity-50 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                            <Activity className="w-64 h-64 translate-x-20 -translate-y-20" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">Governance Intensity</span>
                                    <TrendingUp className="w-5 h-5 text-primary-600" />
                                </div>
                                <div className="text-8xl font-display font-extrabold tracking-tighter leading-none">{governanceIntensity}</div>
                                <p className="text-sm font-bold text-primary-500 mt-4 uppercase tracking-[0.1em]">Verified Active Missions</p>
                            </div>
                            <div className="mt-auto">
                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-6">Temporal Activity Trend (30D)</p>
                                <div className="h-32">
                                    <ActivityTrendChart data={activityTrend} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resonance Level (Members) */}
                    <div className="bg-white border border-slate-200 p-10 rounded-[3rem] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tower Residency</span>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-6xl font-display font-extrabold text-slate-900 tracking-tighter mb-4">{totalMembers}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Verified Frontier Citizens</div>
                    </div>
                </div>
            </div>

            {/* Empty space replaced by more detailed tower info or simply using more viewport */}
            <div className="pt-24 opacity-20 hover:opacity-100 transition-opacity duration-1000">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-200 pt-12">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Architecture</h4>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                            Modular governance hierarchy utilizing sixteenth-floor distributed ledgers.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Consensus</h4>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                            Conviction-based voting with a 40% quorum requirement for automated execution.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Last Update</h4>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                            Synced {new Date().toLocaleTimeString()} • Horizontal scaling active
                        </p>
                    </div>
                </div>
            </div>

            {/* Version Footer */}
            <footer className="pt-24 pb-12 flex justify-between items-center border-t border-slate-100">
                <div className="flex items-center gap-3 grayscale opacity-30">
                    <Building2 className="w-4 h-4" />
                    <span className="font-display font-black text-xs tracking-widest uppercase">Frontier Vertical OS</span>
                </div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Verticality • Stability • Flourishing</p>
            </footer>
        </div>
    );
}
