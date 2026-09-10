import { appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { TriageInput } from "./schema.js";

const quarantinePath = resolve(process.cwd(), "logs/quarantine.jsonl");

export async function quarantineTriageFailure(
  input: TriageInput,
  rawOutput: string,
  error: string,
  promptVersion: string,
): Promise<void> {
  const entry = {
    timestamp: new Date().toISOString(),
    input,
    raw_output: rawOutput,
    error,
    prompt_version: promptVersion,
  };

  await appendFile(quarantinePath, `${JSON.stringify(entry)}\n`, "utf-8");
}
