import type { Request, Response } from "express";
import { TriageInputSchema } from "../llm/schema.js";
import { triageMessage } from "../services/triage.service.js";

export function triageController(req: Request, res: Response) {
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

  const output = triageMessage(result.data);

  return res.status(200).json(output);
}
