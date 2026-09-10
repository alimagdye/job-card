export function parseModelJson(rawOutput: string): unknown {
  let cleaned = rawOutput.trim();

  // Remove markdown code fences.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Find the first JSON object.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || start >= end) {
    throw new Error("Model response does not contain a JSON object");
  }

  const jsonText = cleaned.slice(start, end + 1);

  return JSON.parse(jsonText);
}
