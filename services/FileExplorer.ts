import * as fs from "fs";
import * as path from "path";
import { resolveWorkspacePath } from "./Tools_functions";

async function listFiles(
  folderPath: string,
  maxDepth: number,
): Promise<string> {
  const resolvedPath = resolveWorkspacePath(folderPath);

  if (!fs.existsSync(resolvedPath)) {
    return `error: Folder not found at path: ${resolvedPath}`;
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.isFile()) {
    return path.basename(resolvedPath);
  }

  function scanDir(dir: string, prefix = "", currentDepth = 0): string {
    if (currentDepth >= maxDepth) return "";

    try {
      const items = fs.readdirSync(dir);
      let result = "";

      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === ".chatbot")
          continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          result += `${prefix}${item}/\n`;
          result += scanDir(fullPath, prefix + "  ", currentDepth + 1);
        } else {
          result += `${prefix}${item}\n`;
        }
      }
      return result;
    } catch {
      return "";
    }
  }

  const tree = scanDir(resolvedPath, "", 0);
  return tree || "Empty folder";
}

export { listFiles };
