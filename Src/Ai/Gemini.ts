import * as vscode from "vscode";

export async function getApiKey(): Promise<string> {
  let apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    const secrets = await vscode.commands.executeCommand(
      "myextension.getSavedKey",
    );
    if (secrets) apiKey = secrets as string;
  }
  if (!apiKey) {
    apiKey = "Enter Your Api key";
  }
  return apiKey;
}
