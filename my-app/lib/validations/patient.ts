import { z } from "zod";

export const riskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  age: z.number().int().min(0).max(150),
  gender: z.string().min(1, "Gender is required").max(50),
  symptoms: z.array(z.string()).default([]),
  bloodPressure: z.string().optional(),
  heartRate: z.number().int().min(0).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  preExistingConditions: z.array(z.string()).default([]),
  riskScore: z.number().min(0).max(1).optional(),
  riskLevel: riskLevelEnum,
  recommendedDepartment: z.string().min(1, "Department is required"),
  explanation: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
