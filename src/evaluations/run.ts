import { readFile } from "node:fs/promises";

type EvalCase = {
  id: number;
  input: string;
  expected: {
    category: string;
    urgency: string;
  };
};

type TriageResponse = {
  category: string;
  urgency: string;
  confidence: number;
  reason: string;
};

const cases: EvalCase[] = JSON.parse(
  await readFile(new URL("./cases.json", import.meta.url), "utf-8"),
);

let matched = 0;
const failures: Array<{
  id: number;
  input: string;
  expected: EvalCase["expected"];
  actual: TriageResponse | null;
}> = [];

for (const testCase of cases) {
  const response = await fetch("http://localhost:3000/api/v1/triage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: testCase.input,
    }),
  });

  let actual: TriageResponse | null = null;

  try {
    actual = await response.json();
  } catch {
    actual = null;
  }

  const isMatch =
    response.ok &&
    actual !== null &&
    actual.category === testCase.expected.category &&
    actual.urgency === testCase.expected.urgency;

  if (isMatch) {
    matched++;
    console.log(`✓ Case ${testCase.id}`);
  } else {
    console.log(`✗ Case ${testCase.id}`);

    failures.push({
      id: testCase.id,
      input: testCase.input,
      expected: testCase.expected,
      actual,
    });
  }
}

const percentage = (matched / cases.length) * 100;

console.log("\nEvaluation result");
console.log("=================");
console.log(`Matched: ${matched}/${cases.length}`);
console.log(`Score: ${percentage.toFixed(0)}%`);

if (failures.length > 0) {
  console.log("\nFailed cases:");

  for (const failure of failures) {
    console.log(JSON.stringify(failure, null, 2));
  }
}
