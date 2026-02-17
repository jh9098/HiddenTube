// 간단한 워크플로우 러너(프론트에서 실행 시뮬레이션)
// - DAG(사이클 없는 그래프) 가정
// - topological sort (Kahn)
// - 노드 타입별 실행 로직

function now() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

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
    throw new Error("그래프에 사이클이 있거나, 연결이 비정상입니다(DAG가 아님).");
  }

  return order;
}

function gatherInputs(nodeId, edges, outputsByNode) {
  const incoming = edges.filter((e) => e.target === nodeId);
  const merged = {};
  for (const e of incoming) {
    const srcOut = outputsByNode.get(e.source);
    if (srcOut && typeof srcOut === "object") {
      Object.assign(merged, srcOut);
    }
  }
  return merged;
}

function previewOf(obj, max = 260) {
  let s = "";
  try {
    s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  } catch {
    s = String(obj);
  }
  if (s.length > max) return s.slice(0, max) + " ...";
  return s;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runNode(node, inputVars) {
  const { type, config } = node.data;

  // 살짝 딜레이를 줘서 "실행되는 느낌"을 만듦(프론트 MVP)
  await sleep(250);

  if (type === "input") {
    const key = (config?.key || "").trim() || "topic";
    const value = config?.value ?? "";
    return { [key]: value };
  }

  if (type === "generate") {
    const prompt = renderTemplate(config?.promptTemplate, inputVars);
    // 실제 Gemini 호출 대신 "모의 결과" 생성
    const fakeText =
      `【MOCK LLM OUTPUT】\n` +
      `model=${config?.model || "mock"} temp=${config?.temperature}\n\n` +
      `--- prompt ---\n${prompt}\n\n` +
      `--- result ---\n` +
      `훅: 지금 {{topic}}에서 사람들이 가장 많이 놓치는 1가지를 20초에 끝냅니다.\n` +
      `포인트1: 핵심만 1문장으로 정의\n` +
      `포인트2: 바로 써먹는 체크리스트 3개\n` +
      `포인트3: 오늘 당장 할 10분 액션\n`;
    return { text: fakeText, prompt };
  }

  if (type === "output") {
    const format = config?.format || "text";
    if (format === "json") return { final: inputVars };
    // text
    const best =
      inputVars?.text ??
      inputVars?.final ??
      JSON.stringify(inputVars, null, 2);
    return { final: String(best) };
  }

  throw new Error(`알 수 없는 노드 타입: ${type}`);
}

export async function runWorkflow({
  nodes,
  edges,
  onStepStatus,
  onLog,
  signal,
}) {
  const order = topoSort(nodes, edges);
  const outputsByNode = new Map();

  for (const nodeId of order) {
    if (signal?.aborted) {
      onLog?.(`[${now()}] RUN aborted`);
      throw new Error("실행이 중단되었습니다.");
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    onStepStatus?.(nodeId, { status: "running", lastError: "" });
    onLog?.(`[${now()}] RUN ${node.data.label} (${nodeId})`);

    try {
      const inputVars = gatherInputs(nodeId, edges, outputsByNode);
      const out = await runNode(node, inputVars);
      outputsByNode.set(nodeId, out);

      onStepStatus?.(nodeId, {
        status: "success",
        output: out,
        outputPreview: previewOf(out),
      });
      onLog?.(`[${now()}] OK  ${node.data.label}`);
    } catch (e) {
      const msg = e?.message || String(e);
      onStepStatus?.(nodeId, { status: "error", lastError: msg });
      onLog?.(`[${now()}] ERR ${node.data.label} -> ${msg}`);
      throw e;
    }
  }

  // 최종 output 노드가 있으면 그 결과를 찾아 반환
  const outputNodes = nodes.filter((n) => n.data.type === "output");
  if (outputNodes.length) {
    const last = outputNodes[outputNodes.length - 1];
    return outputsByNode.get(last.id) || null;
  }
  return null;
}
