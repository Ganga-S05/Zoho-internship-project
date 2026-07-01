import { addMemory } from "../rag/vectorStore";

const MEMORY_PATTERNS: RegExp[] = [
  /^remember(?:\s+that)?\s+(.+)$/i,
  /^note(?:\s+that)?\s+(.+)$/i,
  /\bmy\s+\w+\s+is\s+.+/i,
  /\bi\s+(?:like|love|prefer|hate|use)\s+.+/i,
];

export async function maybeStoreMemory(text: string) {
  for (const re of MEMORY_PATTERNS) {
    if (re.test(text)) {
      await addMemory(text);
      return;
    }
  }
}
