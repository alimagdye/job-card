import type { TriageInput, TriageOutput } from "../llm/schema.js";
import { TriageOutputSchema } from "../llm/schema.js";
import { llmClient } from "../llm/client.js";
import { loadTriagePrompt } from "../llm/prompt.js";
import { parseModelJson } from "../llm/parser.js";
import { quarantineTriageFailure } from "../llm/quarantine.js";

const PROMPT_VERSION = "triage-v1";

export async function triageMessage(input: TriageInput): Promise<TriageOutput> {
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

  const response = await llmClient.chat.completions.create({
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
  });

  return response.choices[0].message.content ?? "";
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

export class TriageValidationError extends Error {}
