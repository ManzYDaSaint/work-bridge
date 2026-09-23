"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Bot, Sparkles, TestTube2, Loader2, ArrowRight } from "lucide-react";

type Domain = { id: string; name: string };

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body?.error === "string" ? body.error : fallback;
}

export default function QualificationTesterSandbox({ domains }: { domains: Domain[] }) {
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ domainName?: string; rawText?: string } | null>(null);

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error("Type a qualification string to test");
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await apiFetch("/api/admin/qualifications/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawQualification: testInput }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setTestResult({ domainName: data.domainName, rawText: testInput });
      toast.success(`Classification complete`);
    } else {
      toast.error(await readError(res, "Test classification failed"));
    }

    setTesting(false);
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-4 dark:border-purple-900/60 dark:bg-purple-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-purple-900 dark:text-purple-300">
          <TestTube2 size={18} className="text-purple-600 dark:text-purple-400" />
          <span>Qualification Classifier Sandbox</span>
        </div>
        <span className="text-xs text-purple-600 dark:text-purple-400">Powered by Gemini 3.1 Flash Lite</span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="e.g. Higher National Diploma in Software Engineering & Cloud..."
          className="flex-1 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-slate-950 dark:text-white"
          onKeyDown={(e) => e.key === "Enter" && void handleTest()}
        />
        <button
          onClick={handleTest}
          disabled={testing || !testInput.trim()}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-purple-600 px-4 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Test Classification
        </button>
      </div>

      {testResult && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-purple-200 bg-white p-2.5 text-xs text-slate-800 dark:border-purple-900 dark:bg-slate-900 dark:text-slate-200">
          <span className="font-semibold text-slate-500">"{testResult.rawText}"</span>
          <ArrowRight size={14} className="text-purple-500" />
          <span className="rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            {testResult.domainName || "Unknown / Unclassified"}
          </span>
        </div>
      )}
    </div>
  );
}
