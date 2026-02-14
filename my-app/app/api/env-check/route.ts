import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET } from "@/lib/r2";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * GET /api/env-check
 * Reports which env vars are set and runs safe connectivity tests.
 * Never returns secret values.
 */
export async function GET() {
  const result: {
    keys: Record<string, { set: boolean; note?: string }>;
    tests: Record<string, { ok: boolean; error?: string }>;
  } = {
    keys: {},
    tests: {},
  };

  // --- Database ---
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  result.keys["DATABASE_URL"] = { set: !!dbUrl?.trim() };
  result.keys["DIRECT_URL"] = { set: !!directUrl?.trim() };

  try {
    await prisma.$connect();
    result.tests["database"] = { ok: true };
  } catch (e) {
    result.tests["database"] = {
      ok: false,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }

  // --- R2 ---
  result.keys["R2_ACCOUNT_ID"] = { set: !!process.env.R2_ACCOUNT_ID?.trim() };
  result.keys["R2_ACCESS_KEY_ID"] = { set: !!process.env.R2_ACCESS_KEY_ID?.trim() };
  result.keys["R2_SECRET_ACCESS_KEY"] = { set: !!process.env.R2_SECRET_ACCESS_KEY?.trim() };
  result.keys["R2_BUCKET_NAME"] = { set: !!process.env.R2_BUCKET_NAME?.trim() };
  result.keys["R2_PUBLIC_URL"] = { set: !!process.env.R2_PUBLIC_URL?.trim(), note: "optional" };

  if (R2_BUCKET) {
    try {
      await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
      result.tests["r2"] = { ok: true };
    } catch (e) {
      result.tests["r2"] = {
        ok: false,
        error: e instanceof Error ? e.message : "R2 check failed",
      };
    }
  } else {
    result.tests["r2"] = { ok: false, error: "R2_BUCKET_NAME not set" };
  }

  // --- AI keys (no live call to avoid cost) ---
  result.keys["GROQ_API_KEY_1"] = { set: !!process.env.GROQ_API_KEY_1?.trim() };
  result.keys["GROQ_API_KEY_2"] = { set: !!process.env.GROQ_API_KEY_2?.trim() };
  result.keys["OPENROUTER_API_KEY_1"] = { set: !!process.env.OPENROUTER_API_KEY_1?.trim() };
  result.keys["OPENROUTER_API_KEY_2"] = { set: !!process.env.OPENROUTER_API_KEY_2?.trim() };

  // --- Google Vision ---
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const visionKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  result.keys["GOOGLE_APPLICATION_CREDENTIALS"] = { set: !!credPath };
  result.keys["GOOGLE_VISION_API_KEY"] = { set: !!visionKey, note: "optional if using service account" };

  if (credPath) {
    const cwd = process.cwd();
    let resolved = credPath.startsWith("/") ? credPath : resolve(cwd, credPath);
    if (!existsSync(resolved) && credPath.includes("my-app/")) {
      const fallback = resolve(cwd, credPath.replace(/^my-app\/?/, ""));
      if (existsSync(fallback)) resolved = fallback;
    }
    const fileExists = existsSync(resolved);
    result.tests["google_credentials_file"] = {
      ok: fileExists,
      error: fileExists ? undefined : `File not found: ${resolved}`,
    };
  } else if (visionKey) {
    result.tests["google_credentials_file"] = { ok: true, error: undefined };
  } else {
    result.tests["google_credentials_file"] = { ok: false, error: "No Vision credentials configured" };
  }

  const allKeysSet = Object.values(result.keys).every((k) => k.set || k.note === "optional");
  const allTestsOk = Object.values(result.tests).every((t) => t.ok);

  return NextResponse.json({
    summary: {
      allEnvKeysSet: allKeysSet,
      allTestsPassed: allTestsOk,
    },
    note: "AI keys: use GROQ_API_KEY_1, GROQ_API_KEY_2, OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2 in .env (at least one for triage).",
    ...result,
  });
}
