/**
 * AI client utility with cascading fallback:
 * 1. Gemini (free tier) → 2. OpenAI → 3. Local fallback
 * 
 * Automatically retries with the next provider when one fails (429, network error, etc.)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not set");
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

/**
 * Calls Gemini API for text generation.
 */
async function callGeminiProvider(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
      maxOutputTokens: options?.maxTokens ?? 2000,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userPrompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

/**
 * Calls OpenAI API as fallback.
 */
async function callOpenAIProvider(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI error [${response.status}]: ${errorBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

/**
 * Calls AI with cascading fallback: Gemini → OpenAI → throws error.
 * The caller should catch the error and use local fallback.
 * 
 * Logs which provider was used for transparency.
 */
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  // Try 1: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await callGeminiProvider(systemPrompt, userPrompt, options);
      console.log("[AI] Used: Gemini ✓");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("[AI] Gemini failed:", msg.substring(0, 100));
    }
  }

  // Try 2: OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await callOpenAIProvider(systemPrompt, userPrompt, options);
      console.log("[AI] Used: OpenAI ✓");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("[AI] OpenAI failed:", msg.substring(0, 100));
    }
  }

  // Both failed — throw so the caller uses local fallback
  throw new Error("All AI providers exhausted (Gemini + OpenAI both failed)");
}
