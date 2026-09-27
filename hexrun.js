// hexrun.js：按共用处理预算消费事件，没处理的连账压入下一轮；收尾清账
import { rowsOf } from "./hex.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cloneState(state) {
  const src = state || {};
  return {
    rows: (src.rows || []).map(function (row) { return [row[0], row[1]]; }),
    buffer: typeof src.buffer === "string" ? src.buffer : "",
    ledger: (src.ledger || []).map(function (item) {
      const copy = [item[0], item[1]];
      Object.defineProperty(copy, "id", {
        value: item.id, enumerable: false, configurable: true, writable: true
      });
      return copy;
    }),
    applied: (src.applied || []).slice()
  };
}

function validateEvent(event) {
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    throw fail("E_BAD_EVENT", "事件必须是对象");
  }
  if (event.kind === "feed") {
    if (typeof event.text !== "string") {
      throw fail("E_BAD_EVENT", "feed 事件必须带字符串 text");
    }
  } else if (event.kind === "dump") {
    // dump 不带数据，合法
  } else {
    throw fail("E_BAD_EVENT", "未知事件类型：" + String(event.kind));
  }
}

function toLedgerItem(kind, text, id) {
  const item = [kind, kind === "feed" ? text : ""];
  Object.defineProperty(item, "id", {
    value: id, enumerable: false, configurable: true, writable: true
  });
  return item;
}

function applyItem(state, kind, text, width) {
  if (kind === "feed") {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 32 || code > 126) {
        throw fail("E_BAD_BYTE", "存在不可打印字符");
      }
    }
    state.buffer += text;
  } else {
    if (state.buffer.length === 0) {
      throw fail("E_EMPTY", "缓冲为空，无法转储");
    }
    const cut = rowsOf(state.buffer, width);
    const base = state.rows.length * width;
    cut.rows.forEach(function (row) {
      state.rows.push([base + row[0], row[1]]);
    });
    state.buffer = cut.rest;
  }
}

function runQueue(state, events, budget, width, unlimited) {
  const queue = [];
  state.ledger.forEach(function (item) {
    queue.push({ id: item.id, kind: item[0], text: item[1] });
  });
  const queuedIds = {};
  queue.forEach(function (entry) { queuedIds[entry.id] = true; });
  (events || []).forEach(function (event) {
    if (state.applied.indexOf(event.id) !== -1 || queuedIds[event.id]) return;
    queue.push({ id: event.id, kind: event.kind, text: event.text || "" });
    queuedIds[event.id] = true;
  });

  let served = 0;
  let index = 0;
  while (index < queue.length) {
    if (!unlimited && served >= budget) break;
    const entry = queue[index];
    applyItem(state, entry.kind, entry.text, width);
    state.applied.push(entry.id);
    served += 1;
    index += 1;
  }

  const remaining = queue.slice(index);
  state.ledger = remaining.map(function (entry) {
    return toLedgerItem(entry.kind, entry.text, entry.id);
  });
  return { served: served, bound: queue.length };
}

export function step(spec) {
  const events = spec.events || [];
  events.forEach(validateEvent);
  const state = cloneState(spec.state);
  const result = runQueue(state, events, spec.budget, spec.width, false);
  return {
    state: state,
    served: result.served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: result.served,
    judged_bound: result.bound
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  const result = runQueue(state, [], 0, spec.width, true);
  return { state: state, catchup: result.served };
}
