import type { Request, Response } from "express";
import { TriageInputSchema } from "../llm/schema.js";
import {
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
    if (error instanceof TriageValidationError) {
      return res.status(422).json({
        error: error.message,
      });
    }

    console.error("Triage error:", error);

    return res.status(500).json({
      error: "Failed to process triage request",
    });
  }
}
