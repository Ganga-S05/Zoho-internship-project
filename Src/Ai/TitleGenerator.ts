import * as vscode from "vscode";
import { getApiKey } from "./Gemini";

export async function generateTitleWithGemini(
  userPrompt: string,
  botResponse: string,
): Promise<string> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const config = vscode.workspace.getConfiguration("myextension");
    const configuredModel = config.get<string>("model", "gemini-2.5-flash");

    const apiKey = await getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const cleanPrompt = userPrompt
      .replace(/^Relevant Context:[\s\S]*?User Question:\n/, "")
      .trim();
    const response = await ai.models.generateContent({
      model: configuredModel,
      contents: `Generate a short title for this conversation:\n\nUser Question: ${cleanPrompt}\n\nAI Answer: ${botResponse}`,
      config: {
        systemInstruction: `You are a professional chat title generator.
TASK: Generate a short, professional summary title for the text provided.
RULES:
- 4 to 7 words only
- No quotes, no markdown, no punctuation
- Do not use generic words like "system", "chat", "question", "response"
- Return ONLY the title text.`,
      },
    });

    const title = (response.text || "")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ");

    if (title) {
      return title.slice(0, 50);
    }

    throw new Error("Invalid title length generated");
  } catch (e) {
    console.error("Title generation execution error:", e);
    return userPrompt.trim().split("\n")[0].slice(0, 45);
  }
}
