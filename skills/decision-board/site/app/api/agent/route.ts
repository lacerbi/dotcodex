import { POST as dispatch } from "../../mcp/route";

export const dynamic = "force-dynamic";

// The owner-private Sites boundary authenticates both signed-in browsers and
// service requests. MCP clients use /mcp; service access uses this JSON endpoint.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "This request must come from the board." }, { status: 403 });
  }
  const response = await dispatch(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
