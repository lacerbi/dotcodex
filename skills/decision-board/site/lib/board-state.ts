export type Doc = Record<string, any>;
export type BoardState = { docs: Record<string, Doc>; versions: Record<string, number>; operations: string[] };
export class BoardError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const fail = (message: string, status = 400): never => { throw new BoardError(message, status); };
const validId = (s: unknown) => typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 100;
const obj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const answered = (r: Doc | undefined, round: number) => r?.round === round && (["accept", "option"].includes(r.verdict) || !!r.text?.trim());
const reply = (d: Doc | undefined, round: number) => (d?.thread || []).some((m: Doc) => ["claude", "codex"].includes(m.who) && m.round === round);

export function checkPoint(id: string, d: Doc) {
  if (!validId(id) || id === "general" || !obj(d) || typeof d.title !== "string" || !d.title.trim()) fail("Each point needs a unique ID and a title.");
  if (!["call", "proposal"].includes(d.kind || "proposal")) fail("Unknown point kind.");
  const options = d.options || [];
  if (!Array.isArray(options) || options.some((o: Doc) => !o || typeof o.key !== "string" || !o.key || typeof o.label !== "string")) fail("Invalid options.");
  if (new Set(options.map((o: Doc) => o.key)).size !== options.length || options.filter((o: Doc) => o.recommended).length > 1) fail("Options need unique keys and at most one recommendation.");
}

export function createState(meta: Doc, items: Doc[]): BoardState {
  if (!obj(meta) || typeof meta.title !== "string" || !meta.title.trim() || !Array.isArray(items) || items.length > 200) fail("A board needs a title and at most 200 points.");
  const state: BoardState = { docs: { "board/meta": { ...meta, round: 1 } }, versions: { "board/meta": 1 }, operations: [] };
  for (const [i, raw] of items.entries()) {
    const { id, ...data } = raw;
    checkPoint(id, data);
    if (state.docs["items/" + id]) fail("Duplicate point ID.");
    if (["thread", "decision", "settledRound"].some(k => k in data) || (data.status && data.status !== "open")) fail("New points must start open.");
    state.docs["items/" + id] = { kind: "proposal", order: (i + 1) * 10, ...data, status: "open" };
    state.versions["items/" + id] = 1;
  }
  return state;
}

function put(state: BoardState, path: string, data: Doc) {
  if (JSON.stringify(data).length > 250_000) fail("This point is too large.");
  state.docs[path] = data;
  state.versions[path] = (state.versions[path] || 0) + 1;
}

function ensureRecorded(state: BoardState, round: number, records: any) {
  if (!state.docs["rounds/r" + round]) fail("Submit this round before opening the next.", 409);
  if (!records || typeof records.process_path !== "string" || !records.process_path.trim() || !Array.isArray(records.outcome_paths) || records.outcome_paths.some((p: any) => typeof p !== "string" || !p.trim())) fail("Record the discussion and outcomes before opening the next round.");
  for (const [path, r] of Object.entries(state.docs)) {
    if (!path.startsWith("responses/") || !answered(r, round)) continue;
    const id = path.slice(10);
    const item = state.docs[id === "general" ? "board/general" : "items/" + id];
    const settled = id !== "general" && item?.status === "settled" && item?.settledRound === round;
    if (!settled && !reply(item, round)) fail("An answer still needs a settlement or reply: " + id, 409);
    if (!(item?.thread || []).some((m: Doc) => m.who === "you" && m.round === round)) fail("The user's answer is missing from the discussion: " + id, 409);
  }
}

export function changeState(original: BoardState, op: Doc, now = Date.now()): { state: BoardState; result: Doc } {
  if (!obj(op)) fail("Invalid request.");
  const state: BoardState = { docs: structuredClone(original.docs), versions: { ...original.versions }, operations: [...original.operations] };
  const round = state.docs["board/meta"].round;
  if (op.kind === "lease") {
    if (typeof op.holder !== "string" || !op.holder || op.holder.length > 150) fail("Invalid submission holder.");
    const lease = state.docs["locks/submit"];
    if (lease && lease.until > now && lease.holder !== op.holder) return { state, result: { acquired: false } };
    const until = now + Math.min(60000, Math.max(1000, Number(op.ttlMs) || 60000));
    put(state, "locks/submit", { holder: op.holder, until });
    return { state, result: { acquired: true, expiresAt: until } };
  }
  if (op.kind === "save") {
    const path = op.path;
    if (typeof path !== "string" || !/^responses\/[a-z0-9-]+$/.test(path)) fail("Only answers can be saved here.");
    if (state.docs["rounds/r" + round]) fail("This round has already been submitted.", 409);
    const lease = state.docs["locks/submit"];
    if (lease && lease.until > now && lease.holder !== op.holder) fail("Another tab is submitting this board.", 409);
    const r = op.data;
    if (!obj(r) || r.round !== round || !["", "accept", "option", "discuss"].includes(r.verdict) || typeof r.text !== "string" || r.text.length > 20000 || !["draft", "submitted"].includes(r.state)) fail("Invalid or stale answer.", 409);
    const id = path.slice(10), item = state.docs["items/" + id];
    if (id !== "general" && (!item || item.status === "settled")) fail("This point is no longer open.", 409);
    if (id === "general" && !["", "discuss"].includes(r.verdict)) fail("General comments cannot accept a point.");
    if (r.verdict === "option" && !(item?.options || []).some((o: Doc) => o.key === r.option)) fail("This option is no longer available.", 409);
    if (r.verdict === "accept" && item?.options?.length) fail("Choose a specific option.", 409);
    if ((state.versions[path] || 0) !== op.if_version && !same(state.docs[path], r)) fail("This answer changed in another view. Your draft is still here; copy it before reloading.", 409);
    put(state, path, r);
    return { state, result: { saved: true } };
  }
  if (op.kind === "submit") {
    if (op.round !== round) fail("This round changed. Reload the board.", 409);
    if (state.docs["rounds/r" + round]) return { state, result: { submitted: true } };
    const lease = state.docs["locks/submit"];
    if (!lease || lease.until <= now || lease.holder !== op.holder) fail("The submission lease expired. Submit again.", 409);
    const open = Object.entries(state.docs).filter(([p, d]) => p.startsWith("items/") && d.status !== "settled");
    const count = open.filter(([p]) => answered(state.docs["responses/" + p.slice(6)], round)).length;
    const general = answered(state.docs["responses/general"], round);
    if (!count && !general) fail("Answer a point or add a comment first.");
    if (op.data?.answered !== count || op.data?.open !== open.length - count || !!op.data?.general !== !!general) fail("Answers changed during submission. Review them and submit again.", 409);
    put(state, "rounds/r" + round, { round, submittedAt: new Date(now).toISOString(), answered: count, open: open.length - count, general: !!general });
    return { state, result: { submitted: true } };
  }
  if (op.kind !== "batch" || !Array.isArray(op.writes) || op.writes.length > 50) fail("Invalid board update.");
  if (typeof op.operation_id !== "string" || !op.operation_id || op.operation_id.length > 150) fail("A board update needs an operation ID.");
  if (state.operations.includes(op.operation_id)) return { state, result: { applied: true, duplicate: true } };
  const touched = new Set<string>();
  for (const w of op.writes) {
    if (!obj(w) || !["items", "board"].includes(w.collection) || typeof w.doc_id !== "string" || !validId(w.doc_id) || !obj(w.data)) fail("Invalid update document.");
    if (w.collection === "board" && !["meta", "general"].includes(w.doc_id)) fail("Unknown board document.");
    const path = w.collection + "/" + w.doc_id;
    if (touched.has(path)) fail("A batch cannot write the same document twice.");
    touched.add(path);
    const previous = state.docs[path];
    if (previous ? w.if_version !== state.versions[path] : (w.if_version !== undefined && w.if_version !== 0)) fail("The board changed since it was read: " + path, 409);
    if (w.collection === "items") {
      checkPoint(w.doc_id, w.data);
      if (!previous && (w.data.status === "settled" || w.data.thread?.length)) fail("New points must start open.");
      if (w.data.status === "settled" && (previous?.status !== "settled" || previous?.decision !== w.data.decision || previous?.settledRound !== w.data.settledRound)) {
        const response = state.docs["responses/" + w.doc_id];
        if (!state.docs["rounds/r" + round] || !response || response.round !== round || !["accept", "option"].includes(response.verdict) || w.data.settledRound !== round || typeof w.data.decision !== "string" || !w.data.decision.trim()) fail("Settling a point requires the user's submitted acceptance.");
      }
    }
    if (path === "board/meta" && w.data.round !== round) {
      if (w.data.round !== round + 1) fail("Rounds advance one at a time.");
      ensureRecorded(state, round, op.records);
      put(state, "records/r" + round, { ...op.records, recordedAt: new Date(now).toISOString() });
    }
    put(state, path, w.data);
  }
  state.operations = [...state.operations, op.operation_id].slice(-200);
  if (JSON.stringify(state).length > 2_000_000) fail("Board is too large; start another discussion.");
  return { state, result: { applied: true } };
}
