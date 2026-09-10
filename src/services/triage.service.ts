import type { TriageInput } from "../llm/schema.js";
import { llmClient } from "../llm/client.js";
import { loadTriagePrompt } from "../llm/prompt.js";

export async function triageMessage(input: TriageInput): Promise<string> {
  const systemPrompt: string = await loadTriagePrompt();

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
        content: JSON.stringify({
          text: input.text,
        }),
      },
    ],
  });

  return response.choices[0].message.content ?? "";
}
