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
  for (const [id, deg] of inDeg.entries()) if (deg === 0) q.push(id);

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

export function buildOutputsMapFromNodes(nodes) {
  const m = new Map();
  for (const n of nodes) {
    if (n?.data?.output && typeof n.data.output === "object") {
      m.set(n.id, n.data.output);
    }
  }
  return m;
}

export function gatherIncomingVars(nodeId, edges, outputsByNodeId) {
  const incoming = edges.filter((e) => e.target === nodeId);
  const merged = {};
  for (const e of incoming) {
    const srcOut = outputsByNodeId.get(e.source);
    if (srcOut && typeof srcOut === "object") Object.assign(merged, srcOut);
  }
  return merged;
}

export function previewOf(obj, max = 360) {
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

// 아티팩트(업로드/URL/텍스트/파일명 등) 모아보기
export function collectArtifactsFromNodes(nodes) {
  const items = [];
  for (const n of nodes) {
    const t = n?.data?.type;
    const cfg = n?.data?.config || {};
    const out = n?.data?.output || null;

    if (t === "asset") {
      // assetKey 기준으로 저장
      const key = (cfg.assetKey || "").trim() || n.id;
      const title = cfg.title || "Asset";
      const source = cfg.source || "upload";
      if (cfg.url) items.push({ nodeId: n.id, key, title, kind: "url", value: cfg.url, source });
      if (cfg.text) items.push({ nodeId: n.id, key, title, kind: "text", value: cfg.text, source });
      if (cfg.fileName) items.push({ nodeId: n.id, key, title, kind: "file", value: cfg.fileName, source });
      continue;
    }

    if (t === "generate") {
      const key = (cfg.outputKey || "").trim() || "result";
      const title = cfg.todo ? cfg.todo.split("\n")[0].slice(0, 60) : "Generate";
      if (cfg.manualUrl) items.push({ nodeId: n.id, key, title, kind: "url", value: cfg.manualUrl, source: "manual" });
      if (cfg.manualFileName) items.push({ nodeId: n.id, key, title, kind: "file", value: cfg.manualFileName, source: "manual" });
      // manualText는 너무 길 수 있어, 아티팩트는 요약만
      if (cfg.manualText && cfg.manualText.trim()) items.push({ nodeId: n.id, key, title, kind: "text", value: cfg.manualText.trim().slice(0, 200), source: "manual" });
    }

    // output 자체에서도 url/file 키가 있으면 수집(옵션)
    if (out && typeof out === "object") {
      for (const [k, v] of Object.entries(out)) {
        if (typeof v !== "string") continue;
        if (k.endsWith("_url")) items.push({ nodeId: n.id, key: k, title: "Output", kind: "url", value: v, source: "output" });
        if (k.endsWith("_file")) items.push({ nodeId: n.id, key: k, title: "Output", kind: "file", value: v, source: "output" });
      }
    }
  }
  return items;
}
