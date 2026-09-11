import type { TriageInput, TriageOutput } from "../llm/schema.js";
import { TriageOutputSchema } from "../llm/schema.js";
import { llmClient } from "../llm/client.js";
import { loadTriagePrompt } from "../llm/prompt.js";
import { parseModelJson } from "../llm/parser.js";
import { quarantineTriageFailure } from "../llm/quarantine.js";
import { withRetry } from "../llm/retry.js";
import { logLlmCall } from "../llm/logger.js";

const PROMPT_VERSION = "triage-v1";

export async function triageMessage(input: TriageInput): Promise<TriageOutput> {
  if (process.env.LLM_ENABLED === "false") {
    return {
      category: "other",
      urgency: "normal",
      confidence: 0,
      reason: "AI triage is currently disabled.",
    };
  }

  const systemPrompt = await loadTriagePrompt();

  const firstResponse = await callModel(systemPrompt, input.text);

  try {
    return validateModelOutput(firstResponse);
  } catch (firstError) {
    const validationError = getErrorMessage(firstError);

    const repairedResponse = await callModel(
      systemPrompt,
      input.text,
      firstResponse,
      validationError,
    );

    try {
      return validateModelOutput(repairedResponse);
    } catch (secondError) {
      await quarantineTriageFailure(
        input,
        repairedResponse,
        getErrorMessage(secondError),
        PROMPT_VERSION,
      );

      throw new TriageValidationError(
        "The model returned an invalid response after one repair attempt.",
      );
    }
  }
}

async function callModel(
  systemPrompt: string,
  text: string,
  brokenOutput?: string,
  validationError?: string,
): Promise<string> {
  let userContent = JSON.stringify({
    text,
  });

  if (brokenOutput !== undefined && validationError !== undefined) {
    userContent += `

Previous model output:
${JSON.stringify(brokenOutput)}

Validation error:
${JSON.stringify(validationError)}

Your previous answer was rejected for this reason. Return only corrected JSON matching the schema.`;
  }

  const startedAt = Date.now();

  try {
    const response = await withRetry(() =>
      llmClient.chat.completions.create({
        model: process.env.LLM_MODEL!,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    );

    await logLlmCall({
      timestamp: new Date().toISOString(),
      prompt_version: PROMPT_VERSION,
      model: process.env.LLM_MODEL!,
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      duration_ms: Date.now() - startedAt,
      repair: brokenOutput !== undefined,
    });

    return response.choices[0].message.content ?? "";
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new TriageTimeoutError("The AI provider took too long to respond.");
    }

    throw error;
  }
}

function validateModelOutput(rawOutput: string): TriageOutput {
  const parsed = parseModelJson(rawOutput);

  const result = TriageOutputSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      result.error.issues
        .map(
          (issue) => `${issue.path.join(".") || "response"}: ${issue.message}`,
        )
        .join("; "),
    );
  }

  return result.data;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "APIConnectionTimeoutError" ||
    error.name === "TimeoutError" ||
    error.message.toLowerCase().includes("timeout")
  );
}

export class TriageValidationError extends Error {}
export class TriageTimeoutError extends Error {}
