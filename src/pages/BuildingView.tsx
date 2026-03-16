import { useNavigate } from 'react-router-dom';
import { useFloors } from '../hooks/useFloors';
import buildingImage from '../assets/building.png';
import { Loader2 } from 'lucide-react';

// For the 16 floors of Frontier Tower
// We'll map them relative to the building image.
// Since the image is a perspective view of a tower, we'll use approximate percentages.
const TOTAL_FLOORS = 16;

export default function BuildingView() {
    const navigate = useNavigate();
    const floors = useFloors();
    const loading = floors.length === 0;

    // Helper to get floor object by floor number (1-16)
    const getFloorByNumber = (num: number) => {
        return floors.find(f => f.floor_number === num) || {
            id: `placeholder-${num}`,
            name: `Floor ${num} (Empty)`,
            floor_number: num
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Frontier Tower
                    </h1>
                    <p className="text-slate-500">
                        Select a floor to view its communal fund and governance.
                    </p>
                </header>

                <div className="flex justify-center">
                    {/* Interactive Building Column */}
                    <div className="relative w-full max-w-xl aspect-[1/1.8] rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white/20 group bg-white">
                        <img
                            src={buildingImage}
                            alt="Frontier Tower"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Interactive Floor Overlays */}
                        {/* We use an absolute container for the overlays */}
                        <div className="absolute inset-0 flex flex-col-reverse justify-end pb-[15%] pt-[5%] px-[10%]">
                            {Array.from({ length: TOTAL_FLOORS }).map((_, i) => {
                                const floorNum = i + 1;
                                const floor = getFloorByNumber(floorNum);

                                return (
                                    <button
                                        key={floorNum}
                                        onClick={() => navigate(`/floor/${floor.id}`)}
                                        className="w-full h-[5%] mb-[1.5%] relative group/floor flex items-center justify-center"
                                    >
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-primary-500/0 group-hover/floor:bg-primary-500/40 border border-primary-400/0 group-hover/floor:border-primary-400/60 rounded-sm transition-all duration-200 transform group-hover/floor:scale-x-105 group-hover/floor:z-20"></div>

                                        {/* Floor Label on Hover */}
                                        <div className="absolute left-full ml-4 whitespace-nowrap opacity-0 group-hover/floor:opacity-100 transition-opacity pointer-events-none z-30">
                                            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-xl border border-slate-700 flex items-center">
                                                <span className="w-5 h-5 bg-primary-500 rounded-md flex items-center justify-center text-[10px] mr-2">
                                                    {floorNum}
                                                </span>
                                                {floor.name}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
}
