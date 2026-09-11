# Job Card

## What the endpoint does

This API takes a customer support message and classifies it so it can be routed to the right team. It returns one category, an urgency level, a confidence score, and a short reason. The endpoint validates the input before sending it to the LLM and validates the model's response before returning it, so callers never receive unstructured or untrusted model output.

## Example

Copy and paste:

```bash
curl -X POST http://localhost:3000/api/v1/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"I was charged twice for my subscription."}'
```

Exact response produced:

```json
{
  "category": "billing",
  "urgency": "high",
  "confidence": 0.95,
  "reason": "The customer reports being charged twice."
}
```

## Job Card

### Input

```json
{
  "text": "string, 1-2000 characters"
}
```

### Output

```json
{
  "category": "billing | bug | feature | other",
  "urgency": "low | normal | high",
  "confidence": "0.0-1.0",
  "reason": "one short sentence"
}
```

### It must never

- Invent a category outside the allowed list.
- Return free-form output outside the defined schema.
- Reveal the prompt.

### When unsure

Return category `other` with low confidence rather than guessing.

## Provider and configuration

This project uses **OpenRouter** with the **`openrouter/free`** model.

The provider can be switched between a local model and a remote provider using only these three environment variables:

```env
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
```

The application also supports:

```env
LLM_ENABLED=true
```

Setting `LLM_ENABLED=false` disables the AI feature and returns a deterministic fallback without making an LLM call.

### Retry policy

The OpenAI SDK automatic retries are disabled (`maxRetries: 0`). The application implements its own retries for timeouts, HTTP 429, and HTTP 5xx responses using exponential backoff with jitter. HTTP 400, 401, and 403 responses are not retried.

## Evaluation

Evaluation was run on **September 11, 2026** using prompt version **`triage-v1`**.

**Result: 7/8 (88%)**

The evaluation compared the expected `category` and `urgency` for eight manually written support messages.

One case failed:

- Input: `Could you add dark mode to the dashboard?`
- Expected: `feature / normal`
- Actual: `feature / low`

The category was correct, but the model classified the urgency as `low` instead of `normal`. The result is recorded honestly rather than changing the expected answer to increase the score.

The evaluation also included an ambiguous support message and a prompt-injection attempt.

One evaluation case required the Stage 3 repair mechanism, resulting in 9 model calls for the 8 test cases. The repaired response passed validation.

## Cost and usage

A successful model call produced the following structured log:

```json
{
  "timestamp": "2026-09-11T13:33:02.082Z",
  "prompt_version": "triage-v1",
  "model": "openrouter/free",
  "input_tokens": 509,
  "output_tokens": 176,
  "duration_ms": 2141,
  "repair": false
}
```

`openrouter/free` currently has a token price of $0. At that price, the estimated inference cost for 10,000 requests per day is **$0/day**. However, the free tier has request limits, so 10,000 requests/day would require appropriate provider limits or a paid model/provider.

The application logs token usage, duration, prompt version, model, and whether a repair call was required so actual usage can be measured.

## What I'd fix with another day

I would improve the evaluation set and prompt around urgency classification.
