import { useMemo } from 'react';

interface FloorTreasuryChartProps {
    data: { name: string; balance: number }[];
}

export function FloorTreasuryChart({ data }: FloorTreasuryChartProps) {
    const maxBalance = Math.max(...data.map(d => d.balance), 1);
    const chartHeight = 200;
    const barWidth = 40;
    const gap = 20;

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <svg 
                width={data.length * (barWidth + gap)} 
                height={chartHeight + 40} 
                className="overflow-visible"
            >
                {data.map((d, i) => {
                    const normalizedHeight = (d.balance / maxBalance) * chartHeight;
                    const x = i * (barWidth + gap);
                    return (
                        <g key={d.name} className="group cursor-help transition-all duration-500">
                            <rect
                                x={x}
                                y={chartHeight - normalizedHeight}
                                width={barWidth}
                                height={normalizedHeight}
                                fill="currentColor"
                                className="text-primary-600/10 group-hover:text-primary-600 transition-colors duration-500 rounded-t-xl"
                                rx="4"
                            />
                            <rect
                                x={x}
                                y={chartHeight - normalizedHeight}
                                width={barWidth}
                                height={4}
                                fill="currentColor"
                                className="text-primary-600 rounded-full"
                            />
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight + 20}
                                textAnchor="middle"
                                className="text-[9px] font-black fill-slate-400 group-hover:fill-slate-900 transition-colors uppercase tracking-widest"
                            >
                                {d.name.split(' ')[0]}
                            </text>
                            <title>{d.name}: ${d.balance.toLocaleString()}</title>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

interface ActivityTrendChartProps {
    data: number[];
}

export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
    const max = Math.max(...data, 1);
    const height = 150;
    const width = 400;
    const points = useMemo(() => {
        const step = width / (data.length - 1);
        return data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
    }, [data, max, width, height]);

    const areaPoints = `${points} ${width},${height} 0,${height}`;

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--primary-600-rgb, 37, 99, 235))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="rgb(var(--primary-600-rgb, 37, 99, 235))" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M ${areaPoints}`}
                    fill="url(#areaGradient)"
                    className="transition-all duration-1000"
                />
                <polyline
                    fill="none"
                    stroke="rgb(var(--primary-600-rgb, 37, 99, 235))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className="transition-all duration-1000"
                />
                {data.map((v, i) => {
                    const step = width / (data.length - 1);
                    return (
                        <circle
                            key={i}
                            cx={i * step}
                            cy={height - (v / max) * height}
                            r="4"
                            className="fill-white stroke-primary-600 stroke-2 hover:r-6 transition-all duration-300 cursor-pointer"
                        >
                            <title>Activity Level: {v}</title>
                        </circle>
                    );
                })}
            </svg>
        </div>
    );
}
