"use client";

import { useState } from "react";

export default function TestVisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    extractedText?: string;
    length?: number;
    error?: string;
    message?: string;
    hint?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/test-vision", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Google Vision API — Handwriting Test</h1>
        <p className="text-slate-400">
          Upload an image with <strong>handwritten</strong> or printed text. Vision will return extracted text (DOCUMENT_TEXT_DETECTION).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Image (JPEG, PNG, GIF, WebP — max 5MB)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1 file:text-indigo-300"
            />
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Extracting…" : "Extract text"}
          </button>
        </form>

        {result && (
          <div
            className={`rounded-xl border p-4 ${
              result.success
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            {result.success ? (
              <>
                <p className="mb-2 font-medium text-emerald-300">{result.message ?? "OK"}</p>
                <p className="text-slate-400 text-sm">Length: {result.length ?? 0} chars</p>
                {result.extractedText && (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-900/50 p-3 text-sm text-slate-200">
                    {result.extractedText}
                  </pre>
                )}
              </>
            ) : (
              <>
                <p className="font-medium text-amber-300">Error</p>
                <p className="mt-1 text-sm text-slate-300">{result.error}</p>
                {result.hint && (
                  <p className="mt-2 text-slate-500 text-xs">{result.hint}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
