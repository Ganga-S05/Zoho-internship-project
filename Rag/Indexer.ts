import * as fs from "fs";
import * as path from "path";
import { chunkText } from "./chunker";
import { getTable } from "./vectorStore";
import { embed } from "./embeddings";

async function extractText(filePath: string): Promise<string> {
  // java.pdf, java.txt, java.md
  const ext = path.extname(filePath).toLowerCase(); // .txt, .md, .pdf
  if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filePath, "utf8");
  }
  if (ext === ".pdf") {
    try {
      const pdfParse = require("pdf-parse"); // Eppo text file na direct ta read panna mudiyum because they contain only text but pdf can have fonts, pdf metadata ,images so we need the pdf-parse library to convert the pdf text into normal text
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer); // data.text la namakku pdf file la irukkura text ah kedaikkum
      return data.text || "";
    } catch (err: any) {
      throw new Error(`Failed to parse PDF file: ${err.message}`);
    }
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

export async function indexDocument(filePath: string): Promise<number> {
  const text = await extractText(filePath);

  const chunks = chunkText(text, path.basename(filePath), 500, 100);

  const rows = [];

  let index = 0;

  for (const chunk of chunks) {
    const vector = await embed(chunk.text);

    rows.push({
      id: `${index}`,
      text: chunk.text,
      source: filePath,
      vector: vector,
    });

    index++;
  }

  const table = await getTable();
  await table.add(rows);

  return rows.length;
}
