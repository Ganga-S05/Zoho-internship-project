

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export interface ChatMessage {
  role: "user" | "model" | "tool";
  parts: any[];
}

export interface ChatSession {
  chatId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SESSIONS_FILE = "chat_sessions.json";

function getStorageDir(): string {
  const root =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
    process.env.HOME ||
    process.env.USERPROFILE ||
    process.cwd();
  const dir = path.join(root, ".chatbot");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sessionsPath(): string {
  return path.join(getStorageDir(), SESSIONS_FILE);
}

function chatPath(chatId: string): string {
  return path.join(getStorageDir(), `chat_${chatId}.json`);
}

export function loadSessions(): ChatSession[] {   // Stores the list of chats.
  try {
    const f = sessionsPath();
    if (!fs.existsSync(f)) return [];
    const list: ChatSession[] = JSON.parse(fs.readFileSync(f, "utf8"));   // string format la return agum
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),         // .getTime() miliseconds ex 1782+...
    );
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  try {
    fs.writeFileSync(sessionsPath(), JSON.stringify(sessions, null, 2), "utf8");  // ts object cannot write the file in text s we convert into json string
  } catch (e) {
    console.error("saveSessions failed", e);
  }
}

export function createSession(): ChatSession {
  const session: ChatSession = {
    chatId: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: "New Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sessions = loadSessions(); 
  sessions.unshift(session);    // unshift() adds an item at the beginning of the array.
  saveSessions(sessions);
  saveChat(session.chatId, []);
  return session;
}

export function deleteSession(chatId: string) {
  const sessions = loadSessions().filter((s) => s.chatId !== chatId);
  saveSessions(sessions);
  try {
    const f = chatPath(chatId);
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
    }
  } catch (e) {
    console.error("deleteSession file failed", e);
  }
}

export function renameSession(chatId: string, title: string) {
  const sessions = loadSessions();
  const s = sessions.find((x) => x.chatId === chatId);   //  When JavaScript starts checking the array, it automatically gives each object to the callback function.
  if (!s) return;
  s.title = title.slice(0, 60);
  s.updatedAt = new Date().toISOString();
  saveSessions(sessions);
}

export function touchSession(chatId: string) {
  const sessions = loadSessions();
  const s = sessions.find((x) => x.chatId === chatId);
  if (!s) return;
  s.updatedAt = new Date().toISOString();
  saveSessions(sessions);
}

export function loadChat(chatId: string): ChatMessage[] {    // Loads the messages of one particular chat.
  try {
    const f = chatPath(chatId);
    if (!fs.existsSync(f)) return [];
    return JSON.parse(fs.readFileSync(f, "utf8"));  // convert the key to string 
  } catch {
    return [];
  }
}

export function saveChat(chatId: string, history: ChatMessage[]) {
  try {
    fs.writeFileSync(
      chatPath(chatId),
      JSON.stringify(history, null, 2),
      "utf8",
    );
    touchSession(chatId);
  } catch (e) {
    console.error("saveChat failed", e);
  }
}
