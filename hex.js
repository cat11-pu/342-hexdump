// hex.js：字符转两位小写十六进制；缓冲按定宽切成整行
export function hexOf(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += text.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return out;
}

export function rowsOf(buffer, width) {
  const rows = [];
  const lineCount = Math.floor(buffer.length / width);
  for (let i = 0; i < lineCount; i++) {
    const start = i * width;
    rows.push([start, hexOf(buffer.slice(start, start + width))]);
  }
  return { rows: rows, rest: buffer.slice(lineCount * width) };
}
