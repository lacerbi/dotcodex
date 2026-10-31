import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The Site configuration is private and lives outside the skill (see SKILL.md).
const configPath = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "decision-board", "site.json");
const allowed = new Set(["list_decision_boards", "read_decision_board", "create_decision_board", "update_decision_board"]);
try {
  const invalid = () => new Error("Invalid private Site configuration at " + configPath + ".");
  let site, endpoint;
  try { site = JSON.parse(readFileSync(configPath, "utf8")); }
  catch (error) { throw error.code === "ENOENT" ? new Error("No private Site configuration at " + configPath + ".") : invalid(); }
  try { endpoint = new URL("/api/agent", site.url); } catch { throw invalid(); }
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--out")) throw new Error("Usage: site-request.mjs [--out RESULT.json]");
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".chatgpt.site")) throw new Error("Invalid private Site configuration.");
  if (!process.stdin.isTTY) throw new Error("Use an interactive tool session to deliver the credential through hidden stdin.");
  process.stdin.setRawMode(true);
  process.stderr.write("Ready for private board request on stdin (input is hidden).\n");
  const raw = await new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.removeListener("data", receive);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      error ? reject(error) : resolve(value);
    };
    const receive = chunk => {
      value += chunk;
      if (value.includes("\u0003")) finish(new Error("Request cancelled."));
      else if (value.length > 1_100_000) finish(new Error("Request too large."));
      else if (value.includes("\n") || value.includes("\r")) finish();
    };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", receive);
    process.stdin.resume();
  });
  const input = JSON.parse(raw);
  if (typeof input.token !== "string" || !input.token || /[\r\n\0]/.test(input.token) || !allowed.has(input.tool)) throw new Error("Invalid private board request.");
  const response = await fetch(endpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", "OAI-Sites-Authorization": "Bearer " + input.token },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: input.tool, arguments: input.arguments || {} } })
  });
  if (!response.ok) throw new Error("Private board returned HTTP " + response.status + ": " + (await response.text()).split(input.token).join("[redacted]").slice(0, 1000));
  const reply = await response.json();
  if (reply.error || reply.result?.isError) {
    process.stderr.write(JSON.stringify(reply.error || reply.result) + "\n");
    process.exitCode = 1;
  } else if (args.length) {
    const data = JSON.parse(reply.result.content.find(item => item.type === "text").text);
    writeFileSync(args[1], JSON.stringify(data, null, 2) + "\n", "utf8");
    process.stdout.write("Saved board result.\n");
  } else process.stdout.write(JSON.stringify(reply.result) + "\n");
} catch (error) {
  if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  process.stderr.write((error instanceof SyntaxError ? "Invalid request JSON." : error.message) + "\n");
  process.exitCode = 1;
}
