import * as vscode from "vscode";

import { getWebview } from "./UI";
import { startNewChat, switchChat, getHistory, forkCurrentChat } from "./Ai/ChatManager";
import { getBotResponse } from "./Ai/AiService";
import {
  ChatSession,
  deleteSession,
  loadSessions,
  renameSession,
} from "./history/ChatHistoryProvider";

import { indexDocument } from "./rag/indexer";
import { clearStore, addMemory, listSources } from "./rag/vectorStore";

class ChatTreeItem extends vscode.TreeItem {
  constructor(public readonly session: ChatSession) {  // java chat
    super(session.title || "Untitled", vscode.TreeItemCollapsibleState.None);  // super() calls the parent class constructor.

    this.id = session.chatId;
    this.contextValue = "chatSession";

    this.description = session.updatedAt
      ? new Date(session.updatedAt).toLocaleTimeString([], {  // 11:30 AM
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    this.command = {
      command: "myextension.openChat",
      title: "Open Chat",
      arguments: [session.chatId],
    };
  }
}

class RecentChatsProvider implements vscode.TreeDataProvider<ChatTreeItem> {
  private _emitter = new vscode.EventEmitter<void>();  // Whenever chats change refreshes the sidebar.
  readonly onDidChangeTreeData = this._emitter.event;

  refresh() {
    this._emitter.fire();
  }

  getTreeItem(element: ChatTreeItem) {
    return element;
  }

  getChildren(): ChatTreeItem[] {
    return loadSessions().map((s) => new ChatTreeItem(s));
  }
}

let currentPanel: vscode.WebviewPanel | undefined;

function ensurePanel(
  context: vscode.ExtensionContext,
  provider: RecentChatsProvider,
): vscode.WebviewPanel {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return currentPanel;
  }

  const panel = vscode.window.createWebviewPanel(
    "chatbot",
    "Chatbot",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = getWebview();

  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  panel.webview.onDidReceiveMessage(async (msg) => {
    try {
      if (msg.type === "user") {
        let userPrompt = msg.text;

        // Safe PDF import
        let pdfParse: any;
        try {
          pdfParse = require("pdf-parse"); // require is the default function
        } catch {
          pdfParse = null;
        }

        if (msg.file?.base64) {
          const buffer = Buffer.from(msg.file.base64, "base64");
          let text = "";

          const name = msg.file.name.toLowerCase();

          if (name.endsWith(".txt") || name.endsWith(".md")) {
            text = buffer.toString("utf-8");
          } else if (name.endsWith(".pdf") && pdfParse) {
            const parsed = await pdfParse(buffer);
            text = parsed.text || "";
          } else {
            text = buffer.toString("utf-8");
          }

          if (text.trim()) {
            await addMemory(text);
            userPrompt += `\n\n[File context loaded]`;
          }
        }

        // 1. Tell the webview UI to prepare an empty streaming bubble block
        panel.webview.postMessage({ type: "startBotResponse" });

        //  Streaming   the split the gemini response into chunck
        const [response, didRename] = await getBotResponse(
          userPrompt,
          (chunkText) => {
            panel.webview.postMessage({
              type: "botChunk",
              text: chunkText,   // chunk 1 Java is a programming language.  chunk 2  It is platform independent.
            });
          },
        );

        // 3. Final fallback synchronization to confirm stream termination
        panel.webview.postMessage({
          type: "bot",
          text: response,
        });

        if (didRename) {
          provider.refresh();
        }
      }

      if (msg.type === "newChat") {
        startNewChat();
        panel.webview.postMessage({ type: "chatCleared" });
        provider.refresh();
      }
// FORK 
    if (msg.type === "forkChat") {
  panel.webview.postMessage({ type: "chatCleared" });

  panel.webview.postMessage({
    type: "loadHistory",
    history: forkCurrentChat(),
  });

  provider.refresh();
}
    } catch (err: any) {
      vscode.window.showErrorMessage("Chat error: " + err.message);
    }
  });

  currentPanel = panel;
  return panel;
}

export function activate(context: vscode.ExtensionContext) {
  try {
    console.log("Chatbot extension activated");

    vscode.window.showInformationMessage("Chatbot Extension Loaded ✅");

    const provider = new RecentChatsProvider();

    vscode.window.registerTreeDataProvider("myextension.recentChats", provider);

    context.subscriptions.push(
      vscode.commands.registerCommand("myextension.getSavedKey", async () => {
        return await context.secrets.get("gemini_api_key");
      }),

      vscode.commands.registerCommand("myextension.openPanel", () => {
        const panel = ensurePanel(context, provider);

        setTimeout(() => {
          panel.webview.postMessage({
            type: "loadHistory",
            history: getHistory(),
          });
        }, 300);
      }),

      vscode.commands.registerCommand("myextension.openChat", (id: string) => {
        const panel = ensurePanel(context, provider);
        const history = switchChat(id);

        panel.webview.postMessage({ type: "chatCleared" });

        setTimeout(() => {
          panel.webview.postMessage({
            type: "loadHistory",
            history,
          });
        }, 200);
      }),

      vscode.commands.registerCommand("myextension.newChat", () => {
        startNewChat();
        ensurePanel(context, provider);

        if (currentPanel) {
          currentPanel.webview.postMessage({ type: "chatCleared" });
        }

        provider.refresh();
      }),

      vscode.commands.registerCommand("myextension.refreshChats", () => {
        provider.refresh();
      }),

      vscode.commands.registerCommand(
        "myextension.deleteChat",
        async (node) => {
          const ok = await vscode.window.showWarningMessage(
            "Delete chat?",
            "Delete",
            "Cancel",
          );

          if (ok === "Delete") {
            deleteSession(node?.id);
            provider.refresh();
          }
        },
      ),

      vscode.commands.registerCommand(
        "myextension.renameChat",
        async (node) => {
          const name = await vscode.window.showInputBox({
            prompt: "Rename chat",
          });

          if (name) {
            renameSession(node?.id, name);
            provider.refresh();
          }
        },
      ),

      vscode.commands.registerCommand("myextension.indexDocument", async () => {
        const files = await vscode.window.showOpenDialog({
          canSelectMany: true,
          filters: { docs: ["pdf", "txt", "md"] },
        });

        if (!files) return;

        for (const f of files) {
          await indexDocument(f.fsPath);
        }

        vscode.window.showInformationMessage("Indexed successfully");
      }),

      vscode.commands.registerCommand("myextension.listSources", async () => {
        const sources = await listSources();
        vscode.window.showInformationMessage(sources.join(", "));
      }),

      vscode.commands.registerCommand("myextension.clearMemory", () => {
        clearStore();
        vscode.window.showInformationMessage("Memory cleared");
      }),

      vscode.commands.registerCommand("myextension.setApiKey", async () => {
        const key = await vscode.window.showInputBox({
          password: true,
          prompt: "Enter your Gemini API Key",
        });

        if (key) {
          await context.secrets.store("gemini_api_key", key);
          vscode.window.showInformationMessage("API Key saved securely!");
        }
      }),
    );
  } catch (err: any) {
    vscode.window.showErrorMessage("Extension failed: " + err.message);
    console.error(err);
  }
}

export function deactivate() {}
