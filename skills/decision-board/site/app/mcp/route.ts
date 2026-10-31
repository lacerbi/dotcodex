import { createBoard, listBoards, mutateBoard, readBoard } from "../../lib/board-store";
export const dynamic = "force-dynamic";
const tools = [
  { name: "list_decision_boards", description: "List the owner's private decision boards.", inputSchema: { type: "object", properties: {} } },
  { name: "read_decision_board", description: "Read a complete board snapshot, document versions and submitted rounds before reviewing or updating it.", inputSchema: { type: "object", properties: { board_id: { type: "string" } }, required: ["board_id"] } },
  { name: "create_decision_board", description: "Create a board with open points. Use the decision-board skill's point schema.", inputSchema: { type: "object", properties: { board_id: { type: "string" }, meta: { type: "object" }, items: { type: "array", items: { type: "object" } } }, required: ["board_id", "meta", "items"] } },
  { name: "update_decision_board", description: "Apply a validated, version-checked board.py batch. Inline each file's JSON as data, preserving collection, doc_id and if_version. Reuse operation_id for retries. Before advancing board/meta to the next round, record the discussion and outcomes in the project and pass records with process_path and outcome_paths. Never settle a point without the user's submitted acceptance.", inputSchema: { type: "object", properties: { board_id: { type: "string" }, operation_id: { type: "string" }, writes: { type: "array", items: { type: "object" } }, records: { type: "object", properties: { process_path: { type: "string" }, outcome_paths: { type: "array", items: { type: "string" } } } } }, required: ["board_id", "operation_id", "writes"] } }
];
export async function POST(request: Request) {
  let input: any;
  try { const text = await request.text(); if (text.length > 1_000_000) throw new Error("Request too large."); input = JSON.parse(text); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid request." } }, { status: 400 }); }
  const output = (result: any) => Response.json({ jsonrpc: "2.0", id: input.id ?? null, result });
  if (input.method === "server/discover") return output({ supportedVersions: ["2026-07-28"], capabilities: { tools: {} } });
  if (input.method === "initialize") return output({ protocolVersion: input.params?.protocolVersion || "2026-07-28", capabilities: { tools: {} }, serverInfo: { name: "decision-board", version: "1.0.0" } });
  if (input.method === "notifications/initialized") return new Response(null, { status: 204 });
  if (input.method === "tools/list") return output({ tools });
  if (input.method !== "tools/call") return Response.json({ jsonrpc: "2.0", id: input.id ?? null, error: { code: -32601, message: "Method not found." } });
  try {
    const a = input.params?.arguments || {};
    let result;
    switch (input.params?.name) {
      case "list_decision_boards": result = await listBoards(); break;
      case "read_decision_board": result = await readBoard(a.board_id); break;
      case "create_decision_board": result = await createBoard(a.board_id, a.meta, a.items); break;
      case "update_decision_board": result = await mutateBoard(a.board_id, { ...a, kind: "batch" }); break;
      default: throw new Error("Unknown tool.");
    }
    return output({ content: [{ type: "text", text: JSON.stringify(result) }] });
  } catch (e) { return output({ isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "Board operation failed." }] }); }
}
