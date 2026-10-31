import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createState, changeState } from "../lib/board-state.ts";

const source = fs.readFileSync(new URL("../public/board-connection.js", import.meta.url), "utf8");
function harness() {
  let state = createState({ title: "Test" }, [{ id: "first", title: "First" }]);
  let revision = 1, offline = false, timer;
  const snapshot = () => ({ id: "test", revision, ...structuredClone(state) });
  const window = {};
  vm.runInNewContext(source, {
    window, URLSearchParams, location: { search: "?board=test" },
    document: { visibilityState: "visible", addEventListener() {} },
    setInterval(fn) { timer = fn; },
    fetch: async (_url, options) => {
      if (offline) throw new Error("Offline");
      if (!options?.method) return { ok: true, json: async () => snapshot() };
      try {
        const result = changeState(state, JSON.parse(options.body));
        state = result.state; revision++;
        return { ok: true, json: async () => ({ ...result.result, snapshot: snapshot() }) };
      } catch (error) { return { ok: false, status: error.status, json: async () => ({ error: error.message }) }; }
    }
  });
  return {
    window, snapshot, setOffline(v) { offline = v; },
    external(data) { state = changeState(state, { kind: "save", path: "responses/first", data, if_version: state.versions["responses/first"] || 0 }).state; revision++; },
    externalNextRound() { state.docs["board/meta"].round++; state.versions["board/meta"]++; revision++; },
    poll() { timer(); }
  };
}
const answer = text => ({ round: 1, verdict: "discuss", text, state: "draft" });
test("polling a newer answer cannot silently rebase an existing draft", async () => {
  const h = harness(), db = await h.window.claude.use("db");
  await db.doc("board/meta").get();
  h.window.boardConnection.beginEdit("first");
  h.external(answer("Desktop answer"));
  await db.doc("responses/first").get();
  await assert.rejects(db.doc("responses/first").set(answer("Older phone draft")), /another view/);
  assert.equal(h.snapshot().docs["responses/first"].text, "Desktop answer");
});
test("queued edits advance their base only through their own successful writes", async () => {
  const h = harness(), db = await h.window.claude.use("db");
  await db.doc("board/meta").get();
  h.window.boardConnection.beginEdit("first");
  const first = db.doc("responses/first").set(answer("One"));
  h.window.boardConnection.beginEdit("first");
  const second = db.doc("responses/first").set(answer("Two"));
  await Promise.all([first, second]);
  assert.equal(h.snapshot().docs["responses/first"].text, "Two");
});
test("resubscription during an outage never reports cached state as fresh", async () => {
  const h = harness(), db = await h.window.claude.use("db");
  await db.doc("board/meta").get();
  h.setOffline(true);
  let successes = 0, errors = 0;
  db.doc("board/meta").onSnapshot(() => successes++, () => errors++);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(successes, 0); assert.equal(errors, 1);
  h.setOffline(false);
  db.doc("board/meta").onSnapshot(() => successes++, () => errors++);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(successes, 1); assert.equal(errors, 1);
});
test("the generation captured with queued answer data cannot retire a newer edit", async () => {
  const h = harness(), db = await h.window.claude.use("db");
  await db.doc("board/meta").get();
  h.window.boardConnection.beginEdit("first");
  const one = h.window.boardConnection.captureEdit("first");
  h.window.boardConnection.beginEdit("first");
  const two = h.window.boardConnection.captureEdit("first");
  h.window.boardConnection.beginEdit("first");
  const three = h.window.boardConnection.captureEdit("first");
  await db.doc("responses/first").set(answer("One"), one);
  await db.doc("responses/first").set(answer("Two"), two);
  h.external(answer("New desktop answer"));
  await db.doc("responses/first").get();
  await assert.rejects(db.doc("responses/first").set(answer("Older third edit"), three), /another view/);
  assert.equal(h.snapshot().docs["responses/first"].text, "New desktop answer");
});
test("a discarded conflicting draft does not poison a new round", async () => {
  const h = harness(), db = await h.window.claude.use("db");
  await db.doc("board/meta").get();
  h.window.boardConnection.beginEdit("first");
  h.external(answer("Desktop"));
  await db.doc("responses/first").get();
  await assert.rejects(db.doc("responses/first").set(answer("Phone")), /another view/);
  h.externalNextRound();
  await db.doc("board/meta").get();
  h.window.boardConnection.beginEdit("first");
  await db.doc("responses/first").set({ ...answer("New round"), round: 2 }, h.window.boardConnection.captureEdit("first"));
  assert.equal(h.snapshot().docs["responses/first"].text, "New round");
});
