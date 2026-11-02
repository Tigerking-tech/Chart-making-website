'use client';
import { useEffect, useRef } from 'react';

/** 把引擎返回的 SVG 字符串安全地渲染进容器（图表本身是自包含矢量，无需外部资源）。 */
export function ChartView({ svg, error, svgRef }: { svg?: string; error?: string; svgRef?: React.Ref<HTMLDivElement> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && svg) ref.current.innerHTML = svg;
  }, [svg]);
  if (error) return <div className="err">⚠ {error}</div>;
  return <div ref={(node) => { (ref as any).current = node; if (typeof svgRef === 'function') svgRef(node); else if (svgRef && typeof svgRef === 'object') (svgRef as any).current = node; }} style={{ width: '100%' }} />;
}
