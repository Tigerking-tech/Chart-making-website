'use client';
import { useRef } from 'react';
import { ChartView } from './ChartView';
import { Annotation } from '@/lib/annotations';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** 预览 + 标注层：点击预览任意位置放置标注；下方列表内联编辑/删除。 */
export function AnnotationLayer({
  svg, annotations, onChange,
  addLabel, hintLabel, textLabel, delLabel, placeholder,
}: {
  svg: string;
  annotations: Annotation[];
  onChange: (list: Annotation[]) => void;
  addLabel: string;
  hintLabel: string;
  textLabel: string;
  delLabel: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function place(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const a: Annotation = {
      id: uid(),
      text: textLabel,
      x: Math.max(2, Math.min(98, x)),
      y: Math.max(2, Math.min(98, y)),
    };
    onChange([...annotations, a]);
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
        <ChartView svg={svg} />
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
