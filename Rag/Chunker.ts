export interface Chunk {
  text: string;
  source: string;
  index: number;
}

export function chunkText(
  text: string,
  source: string,
  size = 500,
  overlap = 100,
): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim(); // clean up whitespace and newlines
  const chunks: Chunk[] = []; // list
  if (!clean) return chunks;

  let i = 0;
  let idx = 0;
  const step = Math.max(1, size - overlap);
  while (i < clean.length) {
    chunks.push({
      text: clean.slice(i, i + size),
      source,
      index: idx++,
    });
    i += step; // 400->800->1200
  }

  return chunks;
}
