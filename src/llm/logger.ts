import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";

const logPath = resolve(process.cwd(), "logs/llm-calls.jsonl");

export type LlmCallLog = {
  timestamp: string;
  prompt_version: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  repair: boolean;
};

export async function logLlmCall(entry: LlmCallLog): Promise<void> {
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf-8");
}
