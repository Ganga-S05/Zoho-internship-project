import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import * as fspromise from "fs/promises";

export enum UserChoice {
  YES = "Yes",
  NO = "No",
  ALLOW = "Allow",
  CANCEL = "Cancel",
}

function resolveWorkspacePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    let rootPath = workspaceFolders[0].uri.fsPath;
    if (rootPath.endsWith("chatbot-backend")) {
      rootPath = path.join(rootPath, "..", "demo-extension");
    } else if (!rootPath.endsWith("demo-extension")) {
      const explicitDemoPath = path.join(rootPath, "demo-extension");

      if (fs.existsSync(explicitDemoPath)) {
        rootPath = explicitDemoPath;
      }
    }

    return path.join(rootPath, filePath);
  }
  return filePath;
}
async function readFile(filePath: string): Promise<string> {
  try {
    const resolvedPath = resolveWorkspacePath(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return `Error: File not found at path: ${filePath}`;
    }
    const readfileresult = await fspromise.readFile(resolvedPath, "utf8");
    return readfileresult;
  } catch (error: any) {
    return `Error: Could not read file: ${error.message}`;
  }
}

async function writeFile(filePath: string, content: string): Promise<string> {
  const answer = await vscode.window.showWarningMessage(
    `Allow AI to update:\n${filePath}?`,
    UserChoice.ALLOW,
    UserChoice.CANCEL,
  );

  if (answer !== UserChoice.ALLOW) {
    return "User cancelled write.";
  }

  const resolvedPath = resolveWorkspacePath(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  await fspromise.writeFile(resolvedPath, content, "utf8");

  return `Updated ${filePath}`;
}

async function deletefile(filepath: string): Promise<string> {
  const answer = await vscode.window.showWarningMessage(
    `Allow AI to delete file:\n${filepath}?`,
    UserChoice.ALLOW,
    UserChoice.CANCEL,
  );

  if (answer !== UserChoice.ALLOW) {
    return "User cancelled delete.";
  }

  const resolvedPath = resolveWorkspacePath(filepath);

  if (!fs.existsSync(resolvedPath)) {
    return "File does not exist.";
  }

  try {
    await fspromise.unlink(resolvedPath);
    return `Deleted file: ${resolvedPath}`;
  } catch (err: any) {
    return `Failed to delete file: ${err.message}`;
  }
}

async function appendFile(filePath: string, content: string): Promise<string> {
  const answer = await vscode.window.showWarningMessage(
    `Allow AI to append content to:\n${filePath}?`,
    UserChoice.ALLOW,
    UserChoice.CANCEL,
  );

  if (answer !== UserChoice.ALLOW) {
    return "User cancelled append.";
  }

  const resolvedPath = resolveWorkspacePath(filePath);
  await fspromise.appendFile(resolvedPath, "\n" + content, "utf8");

  return `Appended content to ${filePath}`;
}

async function renamefile(
  filepath: string,
  filepath1: string,
): Promise<string> {
  const answer = await vscode.window.showWarningMessage(
    `Allow AI to RENAME FILE:\n${filepath}?`,
    UserChoice.ALLOW,
    UserChoice.CANCEL,
  );

  if (answer === UserChoice.CANCEL) {
    return "User not Allow to Rename the file";
  }

  const resolvedPath = resolveWorkspacePath(filepath);

  if (!fs.existsSync(resolvedPath)) {
    return "Error: file not found";
  }

  const resolvedPathNew = resolveWorkspacePath(filepath1);

  await fspromise.rename(resolvedPath, resolvedPathNew);

  return "The file was renamed Successfully";
}

/*
async function listFiles(folderPath: string): Promise<string> {
  const resolvedPath = resolveWorkspacePath(folderPath);

  if (!fs.existsSync(resolvedPath)) {
    return `Error: Folder not found at path: ${resolvedPath}`;
  }

  const stats = fs.statSync(resolvedPath);

  if (stats.isFile()) {
    return path.basename(resolvedPath); // return only the file name
  }

  let result = "";
  const folders: string[] = [resolvedPath];    // Bfs 

  while (folders.length > 0) {
    const currentDir = folders.shift()!; // for eg folder=["A","B","c"]  currentdir="A" and folders=["B","C"]

    const items = fs.readdirSync(currentDir);  // inside the folder => the collect all files and subfolder for eg src/index.ts/one.js

    for (const item of items) {
      const fullPath = path.join(currentDir, item);  // eg src/app.ts
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        result += `${item}/\n`; // utils
        folders.push(fullPath);//src/utils
      } else {
        result += `${item}\n`; // one.js
      }
    }
  }

  return result || "Empty folder";
} */

export {
  readFile,
  writeFile,
  deletefile,
  renamefile,
  appendFile,
  resolveWorkspacePath,
};
