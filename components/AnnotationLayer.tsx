'use client';
import { useRef } from 'react';
import { ChartView } from './ChartView';
import { Annotation } from '@/lib/annotations';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const clamp = (v: number) => Math.max(2, Math.min(98, v));

/** 预览 + 标注层：点击预览任意位置放置标注；拖动序号圆点移动标注（支持触摸）；下方列表内联编辑/删除。 */
export function AnnotationLayer({
  svg, annotations, onChange,
  addLabel, hintLabel, textLabel, delLabel, placeholder,
  svgRef, overlay,
}: {
  svg: string;
  annotations: Annotation[];
  onChange: (list: Annotation[]) => void;
  addLabel: string;
  hintLabel: string;
  textLabel: string;
  delLabel: string;
  placeholder?: string;
  svgRef?: React.Ref<HTMLDivElement>;
  overlay?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef(annotations);
  listRef.current = annotations;
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  function pct(e: React.PointerEvent | React.MouseEvent) {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function place(e: React.MouseEvent) {
    // 拖拽手柄产生的 click 已被 stopPropagation 拦下；这里只处理空白处点击。
    if (dragRef.current) { dragRef.current = null; return; }
    const el = ref.current;
    if (!el) return;
    const { x, y } = pct(e);
    onChange([...listRef.current, { id: uid(), text: textLabel, x, y }]);
  }

  // ---- 拖动已有标注（Pointer Events：鼠标 / 触摸 / 触控笔统一） ----
  function chipDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, moved: false };
  }
  function chipMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !ref.current) return;
    const { x, y } = pct(e);
    const cur = listRef.current.find((a) => a.id === d.id);
    if (cur && Math.abs(cur.x - x) + Math.abs(cur.y - y) > 0.5) d.moved = true;
    const next = listRef.current.map((a) => (a.id === d.id ? { ...a, x, y } : a));
    listRef.current = next; // 立即同步，避免高频 move 时读到旧值
    onChange(next);
  }
  function chipUp(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragRef.current = null;
  }

  function update(id: string, text: string) {
    onChange(annotations.map((a) => (a.id === id ? { ...a, text } : a)));
  }
  function remove(id: string) {
    onChange(annotations.filter((a) => a.id !== id));
  }
  function addCenter() {
    onChange([...annotations, { id: uid(), text: textLabel, x: 50, y: 50 }]);
  }

  return (
    <div>
      <div ref={ref} className="anno-preview" onClick={place} title={hintLabel}>
        <ChartView svg={svg} svgRef={svgRef} />
        {/* 拖动手柄：叠在烘焙进 SVG 的红点上，按住即可移动标注 */}
        {annotations.map((a, i) => (
          <span
            key={a.id}
            className="anno-chip"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
            onPointerDown={(e) => chipDown(e, a.id)}
            onPointerMove={chipMove}
            onPointerUp={chipUp}
            onPointerCancel={chipUp}
            onClick={(e) => e.stopPropagation()}
            title={hintLabel}
          >{i + 1}</span>
        ))}
        {overlay}
      </div>
      <div className="anno-bar no-print">
        <button className="btn btn-ghost" type="button" onClick={addCenter}>＋ {addLabel}</button>
        <span className="mini">{annotations.length} · {hintLabel}</span>
      </div>
      {annotations.length > 0 && (
        <div className="anno-list no-print">
          {annotations.map((a, i) => (
            <div className="anno-item" key={a.id}>
              <span className="anno-idx">{i + 1}</span>
              <input value={a.text} placeholder={placeholder || textLabel}
                onChange={(e) => update(a.id, e.target.value)} />
              <button className="mini-btn del" type="button" title={delLabel} onClick={() => remove(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
