import { env } from "cloudflare:workers";
import { BoardError, changeState, createState, type BoardState, type Doc } from "./board-state";

const db = () => { if (!env.DB) throw new Error("Board storage is unavailable."); return env.DB; };
const checkId = (id: string) => { if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 100) throw new BoardError("Invalid board ID."); };

export async function createBoard(id: string, meta: Doc, items: Doc[]) {
  checkId(id);
  const state = createState(meta, items);
  const result = await db().prepare("INSERT OR IGNORE INTO boards (id,state,revision,updated_at) VALUES (?,?,1,?)").bind(id, JSON.stringify(state), new Date().toISOString()).run();
  if (!result.meta.changes) throw new BoardError("A board with this ID already exists.", 409);
  return readBoard(id);
}

export async function readBoard(id: string) {
  checkId(id);
  let row = await db().prepare("SELECT state,revision FROM boards WHERE id=?").bind(id).first<{state: string; revision: number}>();
  if (!row && id === "workflow-alignment") {
    const state = createState({
      title: "Workflow alignment", eyebrow: "Decision board",
      intro: "The full-page board for our workflow discussion. Your answers are saved across devices. Submit a round, then tell Codex to review it."
    }, [{
      id: "board-on-phone", kind: "call", title: "Is this board usable on your phone?",
      context: "This page reuses the Claude board's layout and controls. Check the text field, the choices, and the Submit bar. Your response here is feedback on the board, not approval of unrelated workflow changes.",
      options: [
        { key: "works", label: "Yes, this works", note: "The page and controls are usable." },
        { key: "adjust", label: "Needs an adjustment", note: "Describe the problem in the comment." }
      ], recommendation: "Use this page for the next discussion once its controls work comfortably."
    }]);
    await db().prepare("INSERT OR IGNORE INTO boards (id,state,revision,updated_at) VALUES (?,?,1,?)").bind(id, JSON.stringify(state), new Date().toISOString()).run();
    row = await db().prepare("SELECT state,revision FROM boards WHERE id=?").bind(id).first<{state: string; revision: number}>();
  }
  if (!row) throw new BoardError("Board not found.", 404);
  return { id, revision: row.revision, ...JSON.parse(row.state) as BoardState };
}

export async function listBoards() {
  const rows = await db().prepare("SELECT id,state,revision,updated_at FROM boards ORDER BY updated_at DESC LIMIT 100").all<{id:string;state:string;revision:number;updated_at:string}>();
  return rows.results.map(row => ({ id: row.id, title: JSON.parse(row.state).docs["board/meta"].title, revision: row.revision, updated_at: row.updated_at }));
}

export async function mutateBoard(id: string, op: Doc) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readBoard(id);
    const { state, result } = changeState(current, op);
    const changed = await db().prepare("UPDATE boards SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").bind(JSON.stringify(state), new Date().toISOString(), id, current.revision).run();
    if (changed.meta.changes) return { ...result, snapshot: { id, revision: current.revision + 1, ...state } };
  }
  throw new BoardError("The board is busy. Try again.", 409);
}
