'use client';
import { useEffect, useRef } from 'react';

/** 把引擎返回的 SVG 字符串安全地渲染进容器（图表本身是自包含矢量，无需外部资源）。 */
export function ChartView({ svg, error }: { svg?: string; error?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && svg) ref.current.innerHTML = svg;
  }, [svg]);
  if (error) return <div className="err">⚠ {error}</div>;
  return <div ref={ref} style={{ width: '100%' }} />;
}
