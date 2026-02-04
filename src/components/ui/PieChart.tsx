"use client";
import React, { useMemo } from 'react';

// Simplified Pie Chart for minimal dependency
export interface ChartData {
    name: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: ChartData[];
    size?: number;
    donut?: boolean;
}

export default function PieChart({ data, size = 200, donut = true }: PieChartProps) {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    // Increase viewBox to accommodate labels without clipping
    const padding = 100; // Significantly increased for long labels
    const viewSize = size + padding * 2;
    const centerOffset = padding;

    // Calculate paths
    let cumulativeValue = 0;
    const center = size / 2 + centerOffset; // Adjusted center
    const radius = size / 2;
    const innerRadius = donut ? radius * 0.45 : 0; // Slightly thicker donut (0.45 vs 0.5)

    // --- 1. Calculate Geometry & Initial Positions ---
    const chartData = data.map((item) => {
        const startRaw = cumulativeValue / total;
        const endRaw = (cumulativeValue + item.value) / total;
        cumulativeValue += item.value;

        // Angles
        const startAngle = (startRaw * Math.PI * 2) - Math.PI / 2;
        const endAngle = (endRaw * Math.PI * 2) - Math.PI / 2;
        const midAngle = (startAngle + endAngle) / 2;

        // Path
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);

        const x3 = center + innerRadius * Math.cos(endAngle);
        const y3 = center + innerRadius * Math.sin(endAngle);
        const x4 = center + innerRadius * Math.cos(startAngle);
        const y4 = center + innerRadius * Math.sin(startAngle);

        const largeArcFlag = item.value / total > 0.5 ? 1 : 0;

        const path = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            innerRadius > 0 ? `L ${x3} ${y3}` : `L ${center} ${center}`,
            innerRadius > 0 ? `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}` : '',
            'Z'
        ].join(' ');

        // Label Anchors
        const rimX = center + radius * Math.cos(midAngle);
        const rimY = center + radius * Math.sin(midAngle);

        const elbowRadius = radius + 30;
        const elbowX = center + elbowRadius * Math.cos(midAngle);
        const elbowY = center + elbowRadius * Math.sin(midAngle);

        const isRightSide = Math.cos(midAngle) >= 0;

        return {
            item,
            path,
            rimX,
            rimY,
            elbowX,
            elbowY,
            isRightSide,
            color: item.color,
            percent: ((item.value / total) * 100).toFixed(1)
        };
    });

    // --- 2. Collision Detection & Adjustment ---
    // Make copies to sort without mutating order yet
    const rightLabels = chartData.filter(d => d.isRightSide).sort((a, b) => a.elbowY - b.elbowY);
    const leftLabels = chartData.filter(d => !d.isRightSide).sort((a, b) => a.elbowY - b.elbowY);

    const adjustLabels = (items: typeof chartData) => {
        let prevY = -Infinity;
        const spacing = 24; // Min vertical distance between labels

        // 1st Pass: Push down
        items.forEach(d => {
            if (d.elbowY < prevY + spacing) {
                d.elbowY = prevY + spacing;
            }
            prevY = d.elbowY;
        });
    };

    adjustLabels(rightLabels);
    adjustLabels(leftLabels);

    // --- 3. Render ---
    const sections = chartData.map((d, i) => {
        // Recalculate Label End based on adjusted ElbowY
        const textExtension = 40;
        const labelX = d.isRightSide ? d.elbowX + textExtension : d.elbowX - textExtension;
        const labelY = d.elbowY;

        const textAnchor = d.isRightSide ? 'start' : 'end';
        const textX = d.isRightSide ? d.elbowX + 5 : d.elbowX - 5;

        return (
            <g key={i}>
                <path d={d.path} fill={d.color} stroke="#0f172a" strokeWidth="2" />

                {/* Connector: Rim -> Adjusted Elbow -> Horizontal Label */}
                <polyline
                    points={`${d.rimX},${d.rimY} ${d.elbowX},${d.elbowY} ${labelX},${labelY}`}
                    fill="none"
                    stroke={d.color}
                    strokeWidth="2"
                />

                {/* Texts */}
                <text x={textX} y={labelY} dy="-0.4em" textAnchor={textAnchor} fontSize="10" fill="#e2e8f0" fontWeight="bold">
                    {d.item.name.toUpperCase()}
                </text>
                <text x={textX} y={labelY} dy="0.9em" textAnchor={textAnchor} fontSize="10" fill="#94a3b8" fontWeight="medium">
                    {d.percent}%
                </text>
            </g>
        );
    });

    if (total === 0) return (
        <div style={{ width: size, height: size }} className="rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            No Data
        </div>
    );

    return (
        <svg width={viewSize} height={viewSize} viewBox={`0 0 ${viewSize} ${viewSize}`}>
            {sections}
        </svg>
    );
}
