import { test } from "node:test";
import assert from "node:assert/strict";
import { createState, changeState } from "../lib/board-state.ts";

const seed = (n = 2) => createState({ title: "Test" }, Array.from({ length: n }, (_, i) => ({ id: "point-" + (i + 1), title: "Point " + (i + 1) })));
const save = (state, id, verdict = "accept", text = "", extra = {}) => changeState(state, { kind: "save", path: "responses/" + id, data: { round: 1, verdict, text, state: "draft" }, if_version: state.versions["responses/" + id] || 0, ...extra }, 1000).state;
function submitted(verdict = "accept") {
  let s = save(seed(), "point-1", verdict, verdict === "discuss" ? "A question" : "");
  s = changeState(s, { kind: "lease", holder: "one", ttlMs: 60000 }, 1000).state;
  return changeState(s, { kind: "submit", round: 1, holder: "one", data: { answered: 1, open: 1, general: false } }, 1001).state;
}
const batch = (s, id, writes, records) => changeState(s, { kind: "batch", operation_id: id, writes, records }, 1100);
const write = (s, collection, doc_id, data) => ({ collection, doc_id, if_version: s.versions[collection + "/" + doc_id] || 0, data });

test("20 cards keep separate answers and partial submission", () => {
  let s = save(seed(20), "point-17", "discuss", "Read this comment");
  s = changeState(s, { kind: "lease", holder: "phone" }, 1000).state;
  s = changeState(s, { kind: "submit", round: 1, holder: "phone", data: { answered: 1, open: 19, general: false } }, 1001).state;
  assert.equal(s.docs["rounds/r1"].open, 19);
  assert.equal(s.docs["responses/point-17"].text, "Read this comment");
  assert.equal(s.docs["items/point-17"].status, "open");
});
test("stale saves, submitted edits and competing tabs are rejected", () => {
  const s = save(seed(), "point-1");
  assert.throws(() => save(s, "point-1", "discuss", "New", { if_version: 0 }), /another view/);
  const locked = changeState(s, { kind: "lease", holder: "one" }, 1000).state;
  assert.equal(changeState(locked, { kind: "lease", holder: "two" }, 1001).result.acquired, false);
  assert.throws(() => save(locked, "point-2", "accept", "", { holder: "two" }), /Another tab/);
  assert.throws(() => save(submitted(), "point-2"), /already been submitted/);
});
test("a failed or changed submission stays open", () => {
  let s = save(seed(), "point-1");
  s = changeState(s, { kind: "lease", holder: "one" }, 1000).state;
  assert.throws(() => changeState(s, { kind: "submit", round: 1, holder: "one", data: { answered: 2, open: 0 } }, 1001), /Answers changed/);
  assert.equal(s.docs["rounds/r1"], undefined);
  assert.throws(() => changeState(s, { kind: "submit", round: 1, holder: "one", data: { answered: 1, open: 1 } }, 99000), /lease expired/);
});
test("settlement requires submitted acceptance", () => {
  for (const s of [seed(), submitted("discuss")]) {
    assert.throws(() => batch(s, "bad", [write(s, "items", "point-1", { ...s.docs["items/point-1"], status: "settled", settledRound: 1, decision: "Yes" })]), /submitted acceptance/);
  }
});
test("versioned replies, records and next round preserve unanswered points", () => {
  let s = submitted();
  const point = { ...s.docs["items/point-1"], status: "settled", settledRound: 1, decision: "Accepted", thread: [{ who: "you", round: 1, verdict: "Accepted", text: "" }] };
  s = batch(s, "reply", [write(s, "items", "point-1", point)]).state;
  const next = write(s, "board", "meta", { ...s.docs["board/meta"], round: 2 });
  assert.throws(() => batch(s, "advance", [next]), /Record the discussion/);
  const result = batch(s, "advance", [next], { process_path: "discussion.md", outcome_paths: ["PLAN.md"] });
  assert.equal(result.state.docs["board/meta"].round, 2);
  assert.equal(result.state.docs["items/point-2"].status, "open");
  assert.equal(batch(result.state, "advance", [next]).result.duplicate, true);
});
test("received answers require a disposition and user history", () => {
  const s = submitted("discuss");
  const next = write(s, "board", "meta", { ...s.docs["board/meta"], round: 2 });
  assert.throws(() => batch(s, "advance", [next], { process_path: "discussion.md", outcome_paths: [] }), /settlement or reply/);
});
test("metadata from storage never contaminates persisted state", () => {
  const result = changeState({ ...seed(), id: "test", revision: 12 }, { kind: "lease", holder: "test" }, 1000);
  assert.equal(result.state.revision, undefined);
  assert.equal(result.state.id, undefined);
});
test("general comments are submitted and need a reply", () => {
  let s = save(seed(), "general", "discuss", "General question");
  s = changeState(s, { kind: "lease", holder: "one" }, 1000).state;
  s = changeState(s, { kind: "submit", round: 1, holder: "one", data: { answered: 0, open: 2, general: true } }, 1001).state;
  assert.throws(() => batch(s, "advance", [write(s, "board", "meta", { title: "Test", round: 2 })], { process_path: "discussion.md", outcome_paths: [] }), /general/);
});
