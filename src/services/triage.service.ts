import type { TriageInput, TriageOutput } from "../llm/schema.js";

export function triageMessage(input: TriageInput): TriageOutput {
  if (process.env.LLM_STUB === "1") {
    return {
      category: "other",
      urgency: "normal",
      confidence: 0.5,
      reason: "Stub response for development.",
    };
  }

  throw new Error("LLM integration is not implemented yet.");
}
