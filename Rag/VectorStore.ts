import * as vscode from "vscode";
import * as lancedb from "@lancedb/lancedb";
import { embed } from "./embeddings";
import { Chunk } from "./chunker";

const TABLE_NAME = "chunks";

// 1. Get the database folder path safely (Fixed the syntax error from before)
const rootFolder =
  vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
const dbFolder = `${rootFolder}/.chatbot/lancedb`;

// 2. Open the LanceDB connection
const dbPromise = lancedb.connect(dbFolder);

// Helper function to get the data table (creates it if missing)
export async function getTable(): Promise<lancedb.Table> {
  const db = await dbPromise;
  const tables = await db.tableNames();

  if (tables.includes(TABLE_NAME)) {
    return await db.openTable(TABLE_NAME);
  }

  const setupRow = [
    { id: "init", text: "", source: "init", vector: new Array(256).fill(0) },
  ];
  return await db.createTable(TABLE_NAME, setupRow);
}

export async function addMemory(text: string): Promise<void> {
  const table = await getTable();
  await table.add([
    {
      id: `memory-${Date.now()}`,
      text: text,
      source: "memory",
      vector: await embed(text),
    },
  ]);
}

export async function searchSimilar(query: string): Promise<string> {
  const table = await getTable();
  const vector = await embed(query);
  const results = await table.search(vector).limit(5).toArray();
  let context = "Relevant Context:\n";
  for (const row of results) {
    context += `[Source: ${row.source}]\n${row.text}\n\n`;
  }
  return context;
}

export async function clearStore() {
  const db = await dbPromise;
  const tables = await db.tableNames();
  if (tables.includes(TABLE_NAME)) {
    await db.dropTable(TABLE_NAME);
  }
}
export async function listSources(): Promise<string[]> {
  const table = await getTable();
  const rows = await table.query().select(["source"]).toArray();
  return [...new Set(rows.map((row: any) => row.source))];
}
