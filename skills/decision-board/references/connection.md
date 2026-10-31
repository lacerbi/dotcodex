# Private Site connection

Prefer the Site's connected plugin tools. The private Site configuration (see
SKILL.md) records the exact project and plugin IDs. Publication creates the
private plugin; it may already be installed.
When tools are absent, `get_site(include_mcp_connection: true)` gives current
connection details. Follow the Sites skill's connection procedure; do not install
a separate MCP server or change sharing permissions.

For a chat without the newly installed tools, Sites supports private service
access. Read the Sites skill's `references/identity-and-secrets.md`. Call `get_site`
for the exact project; confirm owner-private access. If it supplies
`siwc_bypass_bearer_token`, keep it in session memory and use it only for this Site.

`scripts/site-request.mjs` supplies this fallback without writing credentials:

1. Launch `node <skill>/scripts/site-request.mjs [--out RESULT.json]` with
   `exec_command(tty: true)`. The optional output file contains only the operation's
   data, ready for `bridge.py snapshot`; no credential is written.
2. Wait for `Ready for private board request on stdin (input is hidden).`
3. Send one newline-terminated JSON object through `write_stdin`:
   `{token, tool, arguments}`. `token` comes directly from the retained `get_site`
   response; never interpolate it into a command or print it.
4. Wait for exit. The helper prints the tool's result and fails on HTTP or tool
   errors. It refuses redirects so the credential cannot travel to another origin.

Allowed `tool` values are the four decision-board operations. Arguments match the
connected tools. The helper sends only to the URL in the private Site
configuration and uses `OAI-Sites-Authorization`, consumed by the hosting platform.
It calls `/api/agent`, which dispatches the same operations as `/mcp`. The hosted
MCP gateway requires its own plugin authentication and rejects service credentials.

Network sandbox approval may be needed for this official service-access route.
Do not bypass an approval rejection. If neither plugin nor supported service
access works, explain the connection blocker while preserving the hosted board;
do not silently replace the user's board with chat questions.
