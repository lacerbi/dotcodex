import { BoardError } from "../../../lib/board-state";
import { mutateBoard, readBoard } from "../../../lib/board-store";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function error(e: unknown) { return json({ error: e instanceof BoardError ? e.message : "Board storage could not be reached. Please retry." }, e instanceof BoardError ? e.status : 500); }
export async function GET(request: Request) {
  try { return json(await readBoard(new URL(request.url).searchParams.get("board") || "workflow-alignment")); } catch (e) { return error(e); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "This request must come from the board." }, 403);
    const body = await request.text();
    if (body.length > 1_000_000) return json({ error: "Request too large." }, 413);
    const input = JSON.parse(body);
    return json(await mutateBoard(new URL(request.url).searchParams.get("board") || "workflow-alignment", input));
  } catch (e) { return error(e instanceof SyntaxError ? new BoardError("Invalid JSON.") : e); }
}
