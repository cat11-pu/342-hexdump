// hex.js：十六进制与切行
export function hexOf(text) {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    out += text.charCodeAt(index).toString(16).padStart(2, "0");
  }
  return out;
}

export function rowsOf(buffer, width) {
  if (!Number.isInteger(width) || width <= 0) {
    return { rows: [], rest: buffer };
  }
  const rows = [];
  const count = Math.floor(buffer.length / width);
  for (let index = 0; index < count; index += 1) {
    const start = index * width;
    rows.push([start, hexOf(buffer.slice(start, start + width))]);
  }
  return { rows, rest: buffer.slice(count * width) };
}
