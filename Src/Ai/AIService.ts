import * as vscode from "vscode";
import {
  readFile,
  writeFile,
  deletefile,
  appendFile,
  renamefile,
} from "../Tools/Tools_functions";
import { listFiles } from "../fileExplorer";
import { tools } from "../Tools/Tools";
import { replacefile } from "../Search-Replace-Function";
import { getApiKey } from "./Gemini";
import {
  renameSession,
  saveChat,
  loadSessions,
} from "../history/ChatHistoryProvider";
import { searchSimilar } from "../rag/vectorStore";
import { generateTitleWithGemini } from "./TitleGenerator";
import { maybeStoreMemory } from "./MemoryManager";
import { ensureActiveChat } from "./ChatManager";
import { conversationHistory } from "./ChatManager";

export async function getBotResponse(
  text: string,
  onChunkReceived: (chunkText: string) => void,
): Promise<[string, boolean]> {
  try {
    const chatId = ensureActiveChat();

    // Check if this chat session needs an AI generated title
    const sessions = loadSessions();
    const currentSession = sessions.find((s) => s.chatId === chatId);
    const isInitialUnnammedChat =
      !currentSession || currentSession.title === "New Chat";

    await maybeStoreMemory(text);

    // Save the user prompt to historical logs
    conversationHistory.push({
      role: "user",
      parts: [{ text }],
    });
    saveChat(chatId, conversationHistory);

    // Process agent loop blocks with streaming callback functionality
    const finalBotResponse = await runToolLoop(onChunkReceived);
    let didRename = false;

    // Trigger AI title updates after the first assistant response resolves
    if (isInitialUnnammedChat && finalBotResponse) {
      try {
        const aiTitle = await generateTitleWithGemini(text, finalBotResponse);
        if (aiTitle && aiTitle.trim()) {
          renameSession(chatId, aiTitle.trim());
          didRename = true;
        }
      } catch (titleError) {
        console.error("Background title processing failed:", titleError);
      }
    }

    return [finalBotResponse, didRename];
  } catch (error: any) {
    return ["Error encountered: " + (error.message || error), false];
  }
}

export async function runToolLoop(
  onChunkReceived: (chunkText: string) => void,
): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const config = vscode.workspace.getConfiguration("myextension");
  const configuredModel = config.get<string>("model", "gemini-2.5-flash");

  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const chatId = ensureActiveChat();

  // Copy the conversation history deep payload structural items
  const historyForModel = JSON.parse(JSON.stringify(conversationHistory));

  for (const msg of historyForModel) {
    if (msg.role === "user") {
      const question = msg.parts[0].text;
      const context = await searchSimilar(question);

      if (context) {
        msg.parts[0].text = context + "User Question:\n" + question;
      }
    }
  }

  const contentsPayload = [];
  for (const msg of historyForModel) {
    contentsPayload.push({
      role: msg.role,
      parts: msg.parts,
    });
  }

  // Use generateContentStream instead of generateContent for streaming support
  const responseStream = await ai.models.generateContentStream({
    model: configuredModel,
    config: {
      systemInstruction: `You are a helpful and intelligent AI Assistant.
- Answer general knowledge questions, conversational text, and coding requests accurately.
- Use tools ONLY when the user explicitly asks to read, write, modify, delete, or list files in their workspace.
- Always reply in clean markdown styling with short direct explanations, code blocks if needed, or optional bullet points.
- Never mention internal tool names in your final written text response.
- If "Relevant Context" from indexed documents is provided above a question, give priority to that context to answer accurately.`,
      tools: tools as any,
    },
    contents: contentsPayload as any,
  });

  let fullTextResponse = "";
  let functionCalls: any[] = [];
  let modelContentParts: any[] = [];

  // Iterate over incoming chunks asynchronously
  for await (const chunk of responseStream) {
    // Accumulate structural text content
    if (chunk.text) {
      fullTextResponse += chunk.text;
      // Emit the text chunk dynamically back to the UI interface layer
      onChunkReceived(chunk.text);
    }

    // Accumulate pieces of function calls if any exist in the frame stream
    if (chunk.functionCalls) {
      functionCalls.push(...chunk.functionCalls);
    }

    // Capture complete candidate content segments for internal logs history compilation
    if (chunk.candidates?.[0]?.content?.parts) {
      modelContentParts.push(...chunk.candidates[0].content.parts);
    }
  }

  // Commit the complete gathered model response output payload to historical storage structures
  if (modelContentParts.length > 0) {
    conversationHistory.push({
      role: "model",
      parts: modelContentParts,
    });
    saveChat(chatId, conversationHistory);
  }

  // If no functional tool call hooks were discovered, yield text streaming sequence assets
  if (functionCalls.length === 0) {
    return fullTextResponse || "No response generated.";
  }

  // Process multi-turn orchestration tool validation loop pipelines sequentially
  for (const call of functionCalls) {
    const args = (call.args || {}) as Record<string, any>;
    let toolResult = "";
    try {
      switch (call.name) {
        case "read_file":
          toolResult = await readFile(args.path);
          break;
        case "replace_text":
          toolResult = await replacefile(
            args.path,
            args.searchText,
            args.replaceText,
          );
          break;
        case "rename_file":
          toolResult = await renamefile(args.Oldpath, args.Newpath);
          break;
        case "Delete_file":
          toolResult = await deletefile(args.path);
          break;
        case "write_file":
          toolResult = await writeFile(args.path, args.content);
          break;
        case "append_file":
          toolResult = await appendFile(args.path, args.content);
          break;
        case "get_current_time":
          toolResult = new Date().toLocaleString();
          break;
        case "list_files":
          toolResult = await listFiles(
            args.path,
            args.number || args.maxDepth || 3,
          );
          break;
        default:
          toolResult = `Error: Tool ${call.name} could not be resolved.`;
      }
    } catch (err: any) {
      toolResult = `Error executing tool ${call.name}: ${err.message || err}`;
    }

    conversationHistory.push({
      role: "tool",
      parts: [
        {
          functionResponse: {
            name: call.name,
            response: { result: toolResult },
          },
        },
      ],
    });
  }

  saveChat(chatId, conversationHistory);

  // Recurse or fallback clean message outputs following successful validation tools mutation
  return fullTextResponse || "Tools executed successfully.";
}
