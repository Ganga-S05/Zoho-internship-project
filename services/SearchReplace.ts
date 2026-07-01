import * as fs from "fs";
import * as fspromises from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { fork } from "child_process";

import { resolveWorkspacePath, UserChoice, writeFile } from "./Tools_functions";

async function findBestMatch(
  target: string,
  candidates: string[],
): Promise<{
  bestCandidate: string;
  bestDistance: number;
}> {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, "Distance.js"));

    child.send({
      target,
      candidates,
    });

    child.on("message", (result) => {
      resolve(
        result as {
          bestCandidate: string;
          bestDistance: number;
        },
      );

      child.kill();
    });

    child.on("error", reject);
  });
}

export async function replacefile(
  filePath: string,
  searchtext: string,
  replacetext: string,
): Promise<string> {
  const resolvedPath = resolveWorkspacePath(filePath);

  if (!fs.existsSync(resolvedPath)) {
    return `Error: File not found at path: ${resolvedPath}`;
  }

  const target = searchtext.trim();
  target.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

  if (!target) {
    return "Error: search text is empty";
  }

  const fileContent = await fspromises.readFile(resolvedPath, "utf8");

  if (fileContent.includes(target)) {
    const answer = await vscode.window.showWarningMessage(
      `Replace "${target}" with "${replacetext}" in ${filePath}?`,
      UserChoice.ALLOW,
      UserChoice.CANCEL,
    );

    if (answer !== UserChoice.ALLOW) {
      return "User did not allow the replacement.";
    }

    const escaped = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    const updated = fileContent.replace(new RegExp(escaped, "g"), replacetext);

    return await writeFile(resolvedPath, updated);
  }
  const tokens = fileContent.split(/\s+/);

  const targetWords = target.split(/\s+/);
  const candidates: string[] = [];
  if (targetWords.length === 1) {
    // Single-word search
    for (const token of tokens) {
      candidates.push(token);
    }
  }
  // Slinding window
  else {
    const targetWordCount = targetWords.length;

    for (let i = 0; i + targetWordCount <= tokens.length; i++) {
      const windowText = tokens.slice(i, i + targetWordCount).join(" ");

      if (Math.abs(windowText.length - target.length) > 5) {
        continue;
      }

      candidates.push(windowText);
    }
  }

  if (candidates.length === 0) {
    return `No close match for "${searchtext}".`;
  }
  const result = await findBestMatch(target, candidates);

  const bestCandidate = result.bestCandidate;

  const bestDistance = result.bestDistance;

  const maxLen = Math.max(target.length, bestCandidate.length);

  const similarity =
    maxLen === 0 ? 0 : ((maxLen - bestDistance) / maxLen) * 100;
  if (similarity >= 75) {
    const answer = await vscode.window.showWarningMessage(
      `No exact match. Did you mean "${bestCandidate}"? Replace with "${replacetext}"? (Similarity: ${similarity.toFixed(2)}%)`,
      UserChoice.ALLOW,
      UserChoice.CANCEL,
    );

    if (answer !== UserChoice.ALLOW) {
      return "User declined fuzzy replacement.";
    }

    const escapedCandidate = bestCandidate.replace(
      /[-\/\\^$*+?.()|[\]{}]/g,
      "\\$&",
    );

    const updated = fileContent.replace(
      new RegExp(`\\b${escapedCandidate}\\b`, "g"),
      replacetext,
    );

    return await writeFile(resolvedPath, updated);
  }

  return `No close match for "${searchtext}". Best candidate "${bestCandidate}" at ${similarity.toFixed(2)}%.`;
}
