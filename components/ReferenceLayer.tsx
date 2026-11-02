'use client';
import React, { useLayoutEffect, useRef, useState } from 'react';
import type { ChartReference, PlotMeta } from '@/lib/charts';

interface Props {
  chartRef: React.RefObject<HTMLDivElement | null>;
  plot?: PlotMeta;
  references: ChartReference[];
  onChange: (refs: ChartReference[]) => void;
}

// 参考线/带的可拖动叠加层（兼容鼠标 + 触摸）。
// 几何位置由引擎返回的 plot 元数据推导，与 SVG 内烘焙的参考线像素级一致；
// 通过 Pointer Events + SVG 原生缩放，把手随容器缩放，拖动时把屏幕坐标换算为数据值。
export default function ReferenceLayer({ chartRef, plot, references, onChange }: Props) {
  const [vb, setVb] = useState<{ W: number; H: number } | null>(null);
  const dragRef = useRef<{ id: string; which: 'value' | 'value2' } | null>(null);
  const rafRef = useRef<number | null>(null);

  // 读取底层 SVG 的 viewBox，使叠加层坐标与图表完全一致。
  useLayoutEffect(() => {
    const root = chartRef.current;
    const el = root ? (root.querySelector('svg') as SVGSVGElement | null) : null;
    if (!el) return;
    const v = el.getAttribute('viewBox');
    if (v) {
      const parts = v.trim().split(/[ ,]+/).map(Number);
      if (parts.length === 4) setVb({ W: parts[2], H: parts[3] });
    }
  }, [chartRef, plot, references]);

  if (!plot || !vb) return null;

  const getSvg = () => chartRef.current?.querySelector('svg') as SVGSVGElement | null;

  const toOriginal = (clientX: number, clientY: number) => {
    const el = getSvg()!;
    const rect = el.getBoundingClientRect();
    const ox = ((clientX - rect.left) / rect.width) * vb.W;
    const oy = ((clientY - rect.top) / rect.height) * vb.H;
    return { ox, oy };
  };

  const yToValue = (oy: number) =>
    Math.min(plot.yMax, Math.max(plot.yMin, plot.yMax - ((oy - plot.y) / plot.h) * (plot.yMax - plot.yMin)));
  const xToValue = (ox: number) =>
    Math.min(plot.xMax, Math.max(plot.xMin, plot.xMin + ((ox - plot.x) / plot.w) * (plot.xMax - plot.xMin)));

  const handleDrag = (id: string, which: 'value' | 'value2') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, which };
  };

  const handleMove = (id: string, which: 'value' | 'value2') => (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== id || dragRef.current.which !== which) return;
    const { ox, oy } = toOriginal(e.clientX, e.clientY);
    const next = references.map((r) => {
      if (r.id !== id) return r;
      const nv = r.axis === 'x' ? xToValue(ox) : yToValue(oy);
      if (which === 'value2') return { ...r, value2: nv };
      return { ...r, value: nv };
    });
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => onChange(next));
  };

  const handleUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try { (e.currentTarget as SVGGElement).releasePointerCapture(e.pointerId); } catch {}
      dragRef.current = null;
    }
  };

  const handles: JSX.Element[] = [];
  references.forEach((r) => {
    if (r.show === false) return;
    const color = r.color || '#F5803E';
    if (r.axis === 'y') {
      const oy = plot.y + ((plot.yMax - r.value) / (plot.yMax - plot.yMin || 1)) * plot.h;
      const gx = plot.x + plot.w;
      handles.push(
        <g key={r.id}
           onPointerDown={handleDrag(r.id, 'value')}
           onPointerMove={handleMove(r.id, 'value')}
           onPointerUp={handleUp}>
          <circle cx={gx} cy={oy} r={13} fill="transparent" style={{ cursor: 'ns-resize', touchAction: 'none', pointerEvents: 'auto' }} />
          <circle cx={gx} cy={oy} r={6} fill="#fff" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
          {r.label && <text x={gx - 10} y={oy - 10} fill={color} fontSize={11} fontWeight={700} textAnchor="end" style={{ pointerEvents: 'none' }}>{r.label}</text>}
        </g>
      );
      if (r.value2 != null) {
        const oy2 = plot.y + ((plot.yMax - r.value2) / (plot.yMax - plot.yMin || 1)) * plot.h;
        handles.push(
          <g key={r.id + 'b'}
             onPointerDown={handleDrag(r.id, 'value2')}
             onPointerMove={handleMove(r.id, 'value2')}
             onPointerUp={handleUp}>
            <circle cx={gx} cy={oy2} r={13} fill="transparent" style={{ cursor: 'ns-resize', touchAction: 'none', pointerEvents: 'auto' }} />
            <circle cx={gx} cy={oy2} r={6} fill="#fff" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
          </g>
        );
      }
    } else if (r.axis === 'x' && plot.xType !== 'category') {
      const ox = plot.x + ((r.value - plot.xMin) / (plot.xMax - plot.xMin || 1)) * plot.w;
      const gy = plot.y;
      handles.push(
        <g key={r.id}
           onPointerDown={handleDrag(r.id, 'value')}
           onPointerMove={handleMove(r.id, 'value')}
           onPointerUp={handleUp}>
          <circle cx={ox} cy={gy} r={13} fill="transparent" style={{ cursor: 'ew-resize', touchAction: 'none', pointerEvents: 'auto' }} />
          <circle cx={ox} cy={gy} r={6} fill="#fff" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
          {r.label && <text x={ox + 10} y={gy + 14} fill={color} fontSize={11} fontWeight={700} textAnchor="start" style={{ pointerEvents: 'none' }}>{r.label}</text>}
        </g>
      );
    }
  });

  return (
    <svg viewBox={`0 0 ${vb.W} ${vb.H}`} width="100%" height="auto"
         style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
         aria-hidden>
      {handles}
    </svg>
  );
}
