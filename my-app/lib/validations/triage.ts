import { z } from "zod";

export const triageRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  age: z.number().int().min(0).max(150),
  gender: z.string().min(1, "Gender is required").max(50),
  symptoms: z.array(z.string()).default([]),
  vitals: z
    .object({
      bp: z.string().optional(),
      heartRate: z.number().int().min(0).max(300).optional(),
      temperature: z.number().min(90).max(110).optional(),
      spO2: z.number().int().min(0).max(100).optional(),
    })
    .default({}),
  preExistingConditions: z.array(z.string()).default([]),
});

export type TriageRequestInput = z.infer<typeof triageRequestSchema>;
