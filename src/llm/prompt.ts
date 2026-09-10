import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const promptPath = resolve(process.cwd(), "prompts/triage-v1.md");

export async function loadTriagePrompt(): Promise<string> {
  return readFile(promptPath, "utf-8");
}
