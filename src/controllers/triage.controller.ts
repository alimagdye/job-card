import type { Request, Response } from "express";
import { TriageInputSchema } from "../llm/schema.js";
import {
  TriageTimeoutError,
  TriageValidationError,
  triageMessage,
} from "../services/triage.service.js";

export async function triageController(req: Request, res: Response) {
  const result = TriageInputSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const output = await triageMessage(result.data);

    return res.status(200).json(output);
  } catch (error) {
    if (error instanceof TriageTimeoutError) {
      return res.status(504).json({
        error: error.message,
      });
    }

    if (error instanceof TriageValidationError) {
      return res.status(422).json({
        error: error.message,
      });
    }

    console.error("Triage error:", error);

    console.error("Triage error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      const status = error.status;

      if (status === 401) {
        return res.status(401).json({
          error: "LLM authentication failed. Check LLM_API_KEY.",
        });
      }

      if (status === 403) {
        return res.status(403).json({
          error: "LLM provider rejected the request.",
        });
      }

      if (status === 429) {
        return res.status(503).json({
          error: "LLM provider rate limit exceeded.",
        });
      }
    }

    return res.status(500).json({
      error: "Failed to process triage request",
    });
  }
}
