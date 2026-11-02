// ===========================================================================
// diagramParser.js — 把"类 Mermaid"文本 DSL 解析为节点 + 连线。
// 节点:  id: 显示名 (副标签) [kind]
//         id = 显示名 (副标签) [kind]      （= 与 : 等价）
// 连线:  A --> B            普通（muted 箭头）
//        A ..> B            虚线（可选/被动/返回）
//        A ==> B            强调（accent 箭头）
//        A --> B | 标签 |   带边标签
// 空行与 # / // 开头为注释。未定义却出现在连线里的 id 会自动建节点（标签=id）。
// kind 同时映射 角色(role) 与 形状(shape)：
//   角色: focal/backend/store/external/input/optional/security
//   形状: decision(菱形) start/end(圆) db(圆柱) circle/diamond/stadium/round/box
// ===========================================================================

// kind → {role, shape}
function kindToRoleShape(kind) {
  const k = (kind || '').toLowerCase();
  const roleShapes = {
    focal: { role: 'focal', shape: 'box' },
    backend: { role: 'backend', shape: 'box' },
    api: { role: 'backend', shape: 'box' },
    store: { role: 'store', shape: 'box' },
    db: { role: 'store', shape: 'cylinder' },
    external: { role: 'external', shape: 'box' },
    input: { role: 'input', shape: 'box' },
    optional: { role: 'optional', shape: 'box' },
    security: { role: 'security', shape: 'box' },
    decision: { role: 'node', shape: 'diamond' },
    start: { role: 'focal', shape: 'circle' },
    end: { role: 'node', shape: 'circle' },
    circle: { role: 'node', shape: 'circle' },
    diamond: { role: 'node', shape: 'diamond' },
    stadium: { role: 'node', shape: 'stadium' },
    round: { role: 'node', shape: 'round' },
  };
  return roleShapes[k] || { role: 'node', shape: 'box' };
}

export function parseDiagram(text) {
  const nodes = [];
  const nodeMap = new Map();
  const edges = [];
  const lines = String(text || '').split(/\r?\n/);

  const ensure = (id, label) => {
    if (!nodeMap.has(id)) {
      const n = { id, label: label != null ? label : id, sub: '', role: 'node', shape: 'box' };
      nodeMap.set(id, n);
      nodes.push(n);
    }
    return nodeMap.get(id);
  };

  const edgeRe = /^(?<src>.+?)\s*(?<arr>-->|->|..>|==>)\s*(?:\|\s*(?<lbl>[^|]*?)\s*\|)?\s*(?<dst>.+?)\s*$/;

  for (const raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const em = line.match(edgeRe);
    if (em) {
      const src = em.groups.src.trim();
      const dst = em.groups.dst.trim();
      const arr = em.groups.arr;
      const lbl = (em.groups.lbl || '').trim();
      ensure(src);
      ensure(dst);
      edges.push({
        from: src,
        to: dst,
        label: lbl,
        dashed: arr === '..>',
        accent: arr === '==>',
      });
      continue;
    }

    // 节点定义：首个 : 或 = 分隔
    const ci = line.search(/[:=]/);
    if (ci > 0) {
      const id = line.slice(0, ci).trim();
      let rest = line.slice(ci + 1).trim();
      let sub = '';
      let kind = '';
      const subM = rest.match(/\(([^)]*)\)/);
      if (subM) { sub = subM[1].trim(); rest = rest.replace(subM[0], ' '); }
      const kindM = rest.match(/\[([^\]]*)\]/);
      if (kindM) { kind = kindM[1].trim(); rest = rest.replace(kindM[0], ' '); }
      const label = rest.trim() || id;
      const n = ensure(id, label);
      if (sub) n.sub = sub;
      if (kind) { const rs = kindToRoleShape(kind); n.role = rs.role; n.shape = rs.shape; }
      continue;
    }

    // 裸 id 行：作为节点（标签=id）
    ensure(line);
  }

  return { nodes, edges };
}

/** 把解析结果转成"邻接表"与"入度"，供分层布局使用。 */
export function graphMeta(nodes, edges) {
  const ids = nodes.map((n) => n.id);
  const indeg = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(ids.map((id) => [id, []]));
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    adj.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }
  return { ids, indeg, adj };
}
