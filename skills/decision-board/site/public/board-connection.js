(() => {
  "use strict";
  const board = new URLSearchParams(location.search).get("board") || "workflow-alignment";
  const endpoint = "/api/board?board=" + encodeURIComponent(board);
  const listeners = new Set();
  const drafts = new Map();
  let snapshot = null, inflight = null, holder = "", tail = Promise.resolve();

  const documentSnapshot = (path) => ({
    id: path.split("/").at(-1), exists: !!snapshot.docs[path],
    data: () => snapshot.docs[path],
    metadata: { fromCache: false, hasPendingWrites: false }
  });
  function view(ref) {
    if (ref.path) return documentSnapshot(ref.path);
    const docs = Object.keys(snapshot.docs).filter(p => p.startsWith(ref.collection + "/")).map(documentSnapshot);
    if (ref.order) docs.sort((a, b) => (a.data()[ref.order] || 0) - (b.data()[ref.order] || 0));
    return { docs, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function receive(next) {
    if (snapshot && next.revision < snapshot.revision) return;
    if (snapshot) {
      const before = snapshot.docs["board/meta"].round;
      const after = next.docs["board/meta"].round;
      if (before !== after || (!snapshot.docs["rounds/r" + before] && next.docs["rounds/r" + after])) drafts.clear();
    }
    snapshot = next;
    for (const listener of listeners) {
      const result = view(listener.ref);
      const signature = JSON.stringify(listener.ref.path ? result.data() : result.docs.map(d => [d.id, d.data()]));
      if (listener.signature !== signature) {
        listener.signature = signature;
        listener.next(result);
      }
    }
  }
  async function request(options) {
    const response = await fetch(endpoint, { credentials: "same-origin", cache: "no-store", ...options });
    let body;
    try { body = await response.json(); } catch { throw new Error("Please reload the page and sign in to reach the board."); }
    if (!response.ok) throw Object.assign(new Error(body.error || "Could not save the board."), { code: response.status === 409 ? "conflict" : "request_failed" });
    return body;
  }
  function refresh() {
    if (!inflight) inflight = request().then(receive).finally(() => { inflight = null; });
    return inflight;
  }
  function post(operation, afterSave) {
    const pending = tail.then(async () => {
      const body = typeof operation === "function" ? operation() : operation;
      const response = await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (afterSave) afterSave(response);
      receive(response.snapshot);
      return response;
    });
    tail = pending.catch(() => {});
    return pending;
  }
  function subscribe(ref, next, error) {
    const listener = { ref, next, error, signature: Symbol("initial") };
    listeners.add(listener);
    refresh().catch(e => { listeners.delete(listener); error(e); });
    return () => listeners.delete(listener);
  }
  function doc(path) {
    return {
      async get() { await refresh(); return documentSnapshot(path); },
      onSnapshot(next, error) { return subscribe({ path }, next, error); },
      set(data, editToken) {
        const draft = editToken ? editToken.draft : drafts.get(path);
        const generation = editToken ? editToken.generation : draft?.generation;
        return post(() => {
          if (path.startsWith("rounds/")) return { kind: "submit", round: data.round, data, holder };
          return { kind: "save", path, data, holder, if_version: draft ? draft.base : (snapshot.versions[path] || 0) };
        }, response => {
          if (draft && drafts.get(path) === draft) {
            if (draft.generation === generation) drafts.delete(path);
            else draft.base = response.snapshot.versions[path];
          }
        });
      },
      async acquire(options) {
        holder = options.holder;
        return post({ kind: "lease", holder, ttlMs: options.ttlMs });
      }
    };
  }
  function collection(name, order) {
    return {
      orderBy(field) { return collection(name, field); },
      onSnapshot(next, error) { return subscribe({ collection: name, order }, next, error); }
    };
  }
  setInterval(() => {
    if (document.visibilityState === "hidden" || !listeners.size) return;
    refresh().catch(error => {
      const pending = [...listeners];
      for (const listener of pending) { listeners.delete(listener); listener.error(error); }
    });
  }, 2500);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh().catch(() => {});
  });
  window.claude = {
    async use(capability) {
      if (capability === "db") return { doc, collection };
      if (capability === "comments") return { canSendToCodex: async () => "unavailable" };
      return null;
    }
  };
  window.boardConnection = {
    captureEdit(id) {
      const draft = drafts.get("responses/" + id);
      return draft ? { draft, generation: draft.generation } : null;
    },
    beginEdit(id) {
      const path = "responses/" + id;
      const draft = drafts.get(path);
      if (draft) draft.generation++;
      else drafts.set(path, { base: snapshot?.versions[path] || 0, generation: 1 });
    }
  };
})();
