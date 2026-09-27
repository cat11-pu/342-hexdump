import assert from "node:assert";
import { hexOf, rowsOf } from "../hex.js";
import { step, close } from "../hexrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, width: 4,
  state: { rows: [], buffer: "", ledger: [], applied: [] },
  events: [{ id: 1, kind: "feed", text: "ab" }],
  empty_error_code: "E_EMPTY", byte_error_code: "E_BAD_BYTE",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("hexOf returns text", () => {
  assert.strictEqual(typeof hexOf("A"), "string");
});

check("rowsOf returns rows and rest", () => {
  const got = rowsOf("abcd", 4);
  assert.ok(Array.isArray(got.rows) && typeof got.rest === "string");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
