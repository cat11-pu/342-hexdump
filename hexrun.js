// hexrun.js：按处理预算处理并留账
import { rowsOf } from "./hex.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    empty: spec.empty_error_code || "E_EMPTY",
    byte: spec.byte_error_code || "E_BAD_BYTE",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function checkEvent(event, spec) {
  const ok = event !== null && typeof event === "object"
    && (event.kind === "feed" || event.kind === "dump")
    && (event.kind !== "feed" || typeof event.text === "string");
  if (!ok) fail(codes(spec).event, "bad event");
}

function applyFeed(state, text, spec) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 || code > 126) fail(codes(spec).byte, "bad byte");
  }
  state.buffer += text;
}

function applyDump(state, spec) {
  if (state.buffer.length === 0) fail(codes(spec).empty, "empty buffer");
  const cut = rowsOf(state.buffer, spec.width);
  let base = 0;
  for (const row of state.rows) base += row[1].length / 2;
  for (const row of cut.rows) state.rows.push([base + row[0], row[1]]);
  state.buffer = cut.rest;
}

function applyEvent(state, kind, text, spec) {
  if (kind === "feed") applyFeed(state, text, spec);
  else if (kind === "dump") applyDump(state, spec);
  else fail(codes(spec).event, "bad event");
}

function copyState(source) {
  return {
    rows: source.rows.slice(),
    buffer: source.buffer,
    ledger: source.ledger.map((entry) => [entry[0], entry[1]]),
    applied: source.applied.slice()
  };
}

export function step(spec) {
  const events = spec.events || [];
  for (const event of events) checkEvent(event, spec);
  const state = copyState(spec.state);
  const seen = new Set(state.applied);
  let remaining = spec.budget == null ? 0 : spec.budget;
  let served = 0;
  let judged = 0;
  for (const event of events) {
    if (event.id != null && seen.has(event.id)) continue;
    if (remaining > 0) {
      remaining -= 1;
      applyEvent(state, event.kind, event.text, spec);
      served += 1;
    } else {
      state.ledger.push([event.kind, event.kind === "feed" ? event.text : ""]);
    }
    if (event.id != null) {
      seen.add(event.id);
      state.applied.push(event.id);
    }
    judged += 1;
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const source = spec.state;
  const state = {
    rows: source.rows.slice(),
    buffer: source.buffer,
    ledger: [],
    applied: source.applied.slice()
  };
  let catchup = 0;
  for (const entry of source.ledger) {
    applyEvent(state, entry[0], entry[1], spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
