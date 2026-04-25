import {
  GoogleGenerativeAI,
  type GenerateContentResult,
} from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { getFirestore } from "@/lib/firestore/client";
import { Timestamp } from "@google-cloud/firestore";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

export function getModel(type: "pro" | "flash" = "pro") {
  const modelName =
    type === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
  return getClient().getGenerativeModel({ model: modelName });
}

export async function generateText(
  prompt: string,
  options: {
    type?: "pro" | "flash";
    contextType: string;
    contextId: string;
  }
): Promise<string> {
  const model = getModel(options.type ?? "flash");
  const result: GenerateContentResult =
    await model.generateContent(prompt);
  const text = result.response.text();

  const usage = result.response.usageMetadata;
  if (usage) {
    await logGeneration({
      contextType: options.contextType,
      contextId: options.contextId,
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
    }).catch((e) =>
      logger.warn({ err: e }, "Failed to log generation cost")
    );
  }

  return text;
}

async function logGeneration({
  contextType,
  contextId,
  inputTokens,
  outputTokens,
}: {
  contextType: string;
  contextId: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const costUsd = inputTokens * 0.000001 + outputTokens * 0.000002;
  const db = getFirestore();
  await db.collection("generationLogs").add({
    contextType,
    contextId,
    inputTokens,
    outputTokens,
    costUsd,
    createdAt: Timestamp.now(),
  });
}
