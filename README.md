# Job Card

The LLM provider can be switched between a local model and a remote provider using only `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`, so the provider is never hard-coded in the application.

## Testing

### Valid request

```bash
curl -X POST http://localhost:3000/api/v1/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"I was charged twice for my subscription."}'
```

### Invalid request

```bash
curl -X POST http://localhost:3000/api/v1/triage \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Stage 1 checkpoint

We want to prove:

```text
LLM_STUB=1
       ↓
POST /api/v1/triage
       ↓
200
       ↓
valid TriageOutput

and:

invalid input
       ↓
400
       ↓
field name + error
```

## Stage 2 observations

The model generally followed the requested JSON structure across the three test
inputs. The classification and urgency were reasonable for the examples tested.
The model occasionally added formatting around the JSON, which will need to be
handled by the output parsing and validation stage.

### Retry policy

The OpenAI SDK automatic retries are disabled (`maxRetries: 0`); the application implements its own retries for timeouts, HTTP 429, and HTTP 5xx responses with exponential backoff and jitter.
