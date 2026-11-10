import React, { useState, useRef, useMemo } from 'react';
import { DataPoint } from '../types/market';

interface IndexChartProps {
  data: DataPoint[];
  previousClose: number;
  isPositive: boolean;
  currency: string;
  timeframe: 'day' | 'week' | 'month';
  height?: number;
  showVolume?: boolean;
}

export const IndexChart: React.FC<IndexChartProps> = ({
  data,
  previousClose,
  isPositive,
  currency,
  timeframe,
  height = 125,
  showVolume = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Colors based on performance vs last closing
  const strokeColor = isPositive ? '#10b981' : '#f43f5e'; // Emerald-500 vs Rose-500
  const fillColorTop = isPositive ? 'rgba(16, 185, 129, 0.32)' : 'rgba(244, 63, 94, 0.32)';
  const fillColorBottom = isPositive ? 'rgba(16, 185, 129, 0.0)' : 'rgba(244, 63, 94, 0.0)';
  const glowFilterId = `glow-${isPositive ? 'green' : 'red'}-${timeframe}`;
  const gradientId = `grad-${isPositive ? 'green' : 'red'}-${timeframe}-${Math.round(previousClose)}`;

  // SVG dimensions
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const padding = { top: 12, bottom: showVolume ? 22 : 10, left: 6, right: 10 };
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;
  const chartWidth = viewBoxWidth - padding.left - padding.right;

  // Calculate scales
  const { minPrice, maxPrice, pointsWithCoords, prevCloseY, maxVolume } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        minPrice: previousClose * 0.99,
        maxPrice: previousClose * 1.01,
        pointsWithCoords: [],
        prevCloseY: viewBoxHeight / 2,
        maxVolume: 1,
      };
    }

    const prices = data.map((d) => d.price);
    const volumes = data.map((d) => d.volume);
    const rawMin = Math.min(...prices, previousClose);
    const rawMax = Math.max(...prices, previousClose);
    const buffer = (rawMax - rawMin) * 0.1 || previousClose * 0.005;

    const min = rawMin - buffer;
    const max = rawMax + buffer;
    const priceRange = max - min || 1;

    const maxVol = Math.max(...volumes, 1);

    const coords = data.map((d, index) => {
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - min) / priceRange) * chartHeight;
      return { ...d, x, y };
    });

    const closeY = padding.top + chartHeight - ((previousClose - min) / priceRange) * chartHeight;

    return {
      minPrice: min,
      maxPrice: max,
      pointsWithCoords: coords,
      prevCloseY: Math.max(padding.top, Math.min(padding.top + chartHeight, closeY)),
      maxVolume: maxVol,
    };
  }, [data, previousClose, chartHeight, chartWidth, padding.left, padding.top, viewBoxHeight, showVolume]);

  // Construct smooth Bezier path
  const { linePath, areaPath } = useMemo(() => {
    if (pointsWithCoords.length === 0) return { linePath: '', areaPath: '' };
    if (pointsWithCoords.length === 1) {
      const p = pointsWithCoords[0];
      return {
        linePath: `M ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${p.y} L ${p.x} ${padding.top + chartHeight} Z`,
      };
    }

    // Catmull-Rom to Cubic Bezier
    let path = `M ${pointsWithCoords[0].x} ${pointsWithCoords[0].y}`;
    for (let i = 0; i < pointsWithCoords.length - 1; i++) {
      const p0 = pointsWithCoords[i === 0 ? 0 : i - 1];
      const p1 = pointsWithCoords[i];
      const p2 = pointsWithCoords[i + 1];
      const p3 = pointsWithCoords[i + 2 < pointsWithCoords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const first = pointsWithCoords[0];
    const last = pointsWithCoords[pointsWithCoords.length - 1];
    const area = `${path} L ${last.x} ${padding.top + chartHeight} L ${first.x} ${padding.top + chartHeight} Z`;

    return { linePath: path, areaPath: area };
  }, [pointsWithCoords, chartHeight, padding.top]);

  // Handle cursor interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || pointsWithCoords.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    const targetIdx = Math.round(ratio * (pointsWithCoords.length - 1));
    setHoverIndex(targetIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? pointsWithCoords[hoverIndex] : null;
  const lastPoint = pointsWithCoords[pointsWithCoords.length - 1];

  const activeDelta = activePoint ? activePoint.price - previousClose : 0;
  const activeDeltaPct = activePoint ? (activeDelta / previousClose) * 100 : 0;
  const isActivePointPositive = activeDelta >= 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full select-none cursor-crosshair group"
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColorTop} />
            <stop offset="70%" stopColor={isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)'} />
            <stop offset="100%" stopColor={fillColorBottom} />
          </linearGradient>

          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Previous Close Reference Baseline (Dashed Line) */}
        <g className="opacity-70 dark:opacity-85">
          <line
            x1={padding.left}
            y1={prevCloseY}
            x2={viewBoxWidth - padding.right}
            y2={prevCloseY}
            stroke="currentColor"
            className="text-neutral-400 dark:text-neutral-500"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
        </g>

        {/* Area under the curve */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            className="transition-colors duration-300"
          />
        )}

        {/* Volume histogram bars (at bottom of chart) */}
        {showVolume &&
          pointsWithCoords.map((pt, idx) => {
            const barWidth = Math.max(2, (chartWidth / pointsWithCoords.length) * 0.7);
            const volHeight = Math.max(3, (pt.volume / maxVolume) * 20);
            const barY = viewBoxHeight - volHeight - 4;
            const barColor =
              idx > 0 && pt.price >= pointsWithCoords[idx - 1].price
                ? 'rgba(16, 185, 129, 0.28)'
                : 'rgba(244, 63, 94, 0.28)';

            return (
              <rect
                key={idx}
                x={pt.x - barWidth / 2}
                y={barY}
                width={barWidth}
                height={volHeight}
                fill={barColor}
                rx="0.5"
              />
            );
          })}

        {/* The smooth SVG curve */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-300"
          />
        )}

        {/* Live animated pulsing dot on the latest price point */}
        {lastPoint && hoverIndex === null && (
          <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
            <circle
              r="6"
              fill={strokeColor}
              opacity="0.3"
              className="animate-ping"
            />
            <circle
              r="3.5"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Interactive Scrubbing Crosshair & Dot */}
        {activePoint && (
          <g>
            {/* Vertical crosshair guide */}
            <line
              x1={activePoint.x}
              y1={padding.top}
              x2={activePoint.x}
              y2={viewBoxHeight - 4}
              stroke="currentColor"
              className="text-neutral-400 dark:text-neutral-500"
              strokeDasharray="2 2"
              strokeWidth="1"
            />

            {/* Horizontal guide to Y axis */}
            <line
              x1={padding.left}
              y1={activePoint.y}
              x2={viewBoxWidth - padding.right}
              y2={activePoint.y}
              stroke="currentColor"
              className="text-neutral-400 dark:text-neutral-500 opacity-40"
              strokeDasharray="2 2"
              strokeWidth="0.8"
            />

            {/* Active cursor anchor dot */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={isActivePointPositive ? '#10b981' : '#f43f5e'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Precision Tooltip */}
      {activePoint && (
        <div
          className="absolute pointer-events-none z-20 px-3 py-1.5 rounded-md bg-neutral-900/95 text-neutral-100 border border-neutral-700/80 shadow-xl backdrop-blur-md transition-all duration-75 text-xs font-mono"
          style={{
            left: `${Math.min(82, Math.max(18, (activePoint.x / viewBoxWidth) * 100))}%`,
            top: `${Math.max(8, (activePoint.y / viewBoxHeight) * 100 - 28)}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="text-neutral-400">{activePoint.timeLabel}</span>
            <span className="text-white font-bold tabular-nums">
              {activePoint.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className={`text-[11px] font-semibold tabular-nums mt-0.5 flex items-center gap-1 ${
              isActivePointPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            <span>{isActivePointPositive ? '▲ +' : '▼ '}</span>
            <span>
              {activeDelta.toFixed(2)} ({activeDeltaPct >= 0 ? '+' : ''}
              {activeDeltaPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* Baseline / Prev Close Tag watermark in corner */}
      <div className="absolute bottom-1 right-2 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
        <span className="inline-block w-2.5 h-[1px] border-b border-dashed border-neutral-400 dark:border-neutral-500" />
        <span>Prev Close: {previousClose.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};
