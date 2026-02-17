// 초기 MVP: "자동 실행"이 아니라
// 1) DAG 검증/위상정렬(실행 순서 생성)
// 2) 프롬프트 템플릿 렌더링(변수 치환)
// 3) 노드 컨텍스트(업스트림 결과) 병합
// 을 제공하는 유틸

export function renderTemplate(template, vars) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars?.[k];
    if (v === undefined || v === null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

export function topoSort(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDeg = new Map();
  const out = new Map();

  for (const n of nodes) {
    inDeg.set(n.id, 0);
    out.set(n.id, []);
  }

  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    out.get(e.source).push(e.target);
  }

  const q = [];
  for (const [id, deg] of inDeg.entries()) {
    if (deg === 0) q.push(id);
  }

  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    for (const nxt of out.get(id) || []) {
      inDeg.set(nxt, inDeg.get(nxt) - 1);
      if (inDeg.get(nxt) === 0) q.push(nxt);
    }
  }

  if (order.length !== nodes.length) {
    throw new Error("그래프에 사이클이 있거나 연결이 비정상입니다(DAG가 아님).");
  }

  return order;
}

export function gatherIncomingVars(nodeId, edges, outputsByNodeId) {
  const incoming = edges.filter((e) => e.target === nodeId);
  const merged = {};
  for (const e of incoming) {
    const srcOut = outputsByNodeId.get(e.source);
    if (srcOut && typeof srcOut === "object") {
      Object.assign(merged, srcOut);
    }
  }
  return merged;
}

export function buildOutputsMapFromNodes(nodes) {
  const m = new Map();
  for (const n of nodes) {
    if (n?.data?.output && typeof n.data.output === "object") {
      m.set(n.id, n.data.output);
    }
  }
  return m;
}

export function previewOf(obj, max = 320) {
  let s = "";
  try {
    s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  } catch {
    s = String(obj);
  }
  if (s.length > max) return s.slice(0, max) + " ...";
  return s;
}

export function nowHHMMSS() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
