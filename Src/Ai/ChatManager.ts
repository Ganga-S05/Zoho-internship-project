import {
  ChatMessage,
  createSession,
  loadChat,
  renameSession,
  saveChat,
  loadSessions,
} from "../history/ChatHistoryProvider";

let activeChatId: string | null = null;
let conversationHistory: ChatMessage[] = [];

export function ensureActiveChat(): string {
  if (activeChatId) return activeChatId;
  const sessions = loadSessions();
  if (sessions.length > 0) {
    activeChatId = sessions[0].chatId;
    conversationHistory = loadChat(activeChatId);
  } else {
    const s = createSession();
    activeChatId = s.chatId;
    conversationHistory = [];
  }
  return activeChatId!;
}

export function startNewChat(): string {
  const s = createSession(); 
  activeChatId = s.chatId;
  conversationHistory = [];
  saveChat(activeChatId, conversationHistory);
  return activeChatId;
}

export function forkCurrentChat(): ChatMessage[] {
  // 1. Double check we have a session to clone
  ensureActiveChat();
  
  // 2. Find the current session title so we can build a new one
  const sessions = loadSessions();
  const currentSession = sessions.find(s => s.chatId === activeChatId);
  const oldTitle = currentSession?.title || "Untitled";
  const newTitle = `${oldTitle} (Fork)`;

  // 3. Create an empty session context using your workspace mechanics
  const newSession = createSession();
  activeChatId = newSession.chatId;
  
  // 4. Update the newly established session identity's title
  renameSession(activeChatId, newTitle);

  // 5. Build deep copy mutations of existing items to maintain original structural array contexts
  conversationHistory = conversationHistory.map(msg => ({
    role: msg.role,
    parts: msg.parts ? msg.parts.map(p => ({ text: p.text })) : []
  }));
  saveChat(activeChatId, conversationHistory);
  
  return conversationHistory;
}

export function switchChat(chatId: string): ChatMessage[] {
  activeChatId = chatId;
  conversationHistory = loadChat(chatId);
  return conversationHistory;
}

export function getActiveChatId(): string | null {
  return activeChatId;
}

export function getHistory(): ChatMessage[] {
  ensureActiveChat();
  return conversationHistory;
}

export function clearHistory() {
  conversationHistory = [];
  if (activeChatId) {
    saveChat(activeChatId, []);
  }
}

export { conversationHistory };
