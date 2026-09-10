import { z } from "zod";

export const TriageInputSchema = z.object({
  text: z
    .string()
    .min(1, "text is required")
    .max(2000, "text must not exceed 2000 characters"),
});

export const TriageOutputSchema = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export type TriageInput = z.infer<typeof TriageInputSchema>;
export type TriageOutput = z.infer<typeof TriageOutputSchema>;
