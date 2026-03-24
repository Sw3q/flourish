import { useMemo, useState } from 'react';

interface FloorTreasuryChartProps {
    data: { name: string; balance: number }[];
}

export function FloorTreasuryChart({ data }: FloorTreasuryChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const totalBalance = useMemo(() => data.reduce((acc, d) => acc + d.balance, 0), [data]);

    // SVG Dimensions
    const size = 260; // Reduced from 320 for compactness
    const center = size / 2;
    const radius = 110; // Slightly reduced
    const thickness = 35; // Slightly reduced
    const innerRadius = radius - thickness;

    // Calculate segments
    let startAngle = -Math.PI / 2; // Start from top
    const segments = data.map((d, i) => {
        const percentage = d.balance / (totalBalance || 1);
        const angle = percentage * 2 * Math.PI;

        // Arc coordinates
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(startAngle + angle);
        const y2 = center + radius * Math.sin(startAngle + angle);

        const xi1 = center + innerRadius * Math.cos(startAngle);
        const yi1 = center + innerRadius * Math.sin(startAngle);
        const xi2 = center + innerRadius * Math.cos(startAngle + angle);
        const yi2 = center + innerRadius * Math.sin(startAngle + angle);

        const largeArcFlag = angle > Math.PI ? 1 : 0;

        const path = `
            M ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            L ${xi2} ${yi2}
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${xi1} ${yi1}
            Z
        `;

        const currentStartAngle = startAngle;
        startAngle += angle;

        return { ...d, path, index: i, startAngle: currentStartAngle, angle };
    });

    const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
        <div className="w-full flex flex-col items-center justify-center py-4">
            <div className="relative group/donut">
                <svg
                    width={size}
                    height={size}
                    className="overflow-visible drop-shadow-2xl"
                >
                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius - thickness / 2}
                        fill="none"
                        stroke="rgba(var(--primary-600-rgb, 37, 99, 235), 0.03)"
                        strokeWidth={thickness}
                    />

                    {segments.map((s, i) => (
                        <path
                            key={s.name}
                            d={s.path}
                            className={`
                                cursor-pointer transition-all duration-300
                                ${hoveredIndex === i ? 'opacity-100 scale-105' : 'opacity-70 grayscale-[0.5]'}
                                group-hover/donut:hover:opacity-100 group-hover/donut:hover:grayscale-0
                            `}
                            style={{
                                fill: `hsl(262, 70%, ${Math.max(30, 80 - i * 5)}%)`,
                                transformOrigin: 'center'
                            }}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <title>{s.name}: ${s.balance.toLocaleString()}</title>
                        </path>
                    ))}

                    {/* Central Label */}
                    <foreignObject
                        x={center - innerRadius + 10}
                        y={center - innerRadius + 10}
                        width={innerRadius * 2 - 20}
                        height={innerRadius * 2 - 20}
                    >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            {activeItem ? (
                                <>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                        {activeItem.name}
                                    </span>
                                    <span className="text-xl font-display font-extrabold text-slate-900 tracking-tighter">
                                        ${activeItem.balance.toLocaleString()}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                        Global Total
                                    </span>
                                    <span className="text-2xl font-display font-extrabold text-primary-600 tracking-tighter">
                                        ${totalBalance.toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                                        Hover for Details
                                    </span>
                                </>
                            )}
                        </div>
                    </foreignObject>
                </svg>
            </div>

            {/* Simple Dropdown for selection (replacing complex legend) */}
            <div className="mt-4 mb-2 w-full max-w-xs px-4">
                <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                    value={hoveredIndex ?? ''}
                    onChange={(e) => setHoveredIndex(e.target.value === '' ? null : Number(e.target.value))}
                >
                    <option value="">View Tower Total</option>
                    {data.map((d, i) => (
                        <option key={d.name} value={i}>
                            {d.name.replace(/:$/, '')} — ${d.balance.toLocaleString()}
                        </option>
                    ))}
                </select>
            </div>
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
