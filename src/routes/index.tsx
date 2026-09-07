import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, ScanSearch, UploadCloud } from "lucide-react";
import { analyzeDocument } from "@/lib/analyze.functions";
import { extractDocxText, fileToBase64 } from "@/lib/docx";
import { DISCLAIMER, LANGUAGES } from "@/lib/languages";
import { saveSession, type Session } from "@/lib/history";
import { FindingsView } from "@/components/FindingsView";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HiddenLens — Spot Risky Legal Clauses in Seconds" },
      {
        name: "description",
        content:
          "Upload a loan agreement or contract and instantly see risky clauses highlighted in red, missing borrower protections and compliance gaps, with PDF reports and negotiation letters.",
      },
      { property: "og:title", content: "HiddenLens" },
      {
        property: "og:description",
        content:
          "Find hidden risky clauses, missing protections and RBI compliance gaps in your documents — in your language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const analyze = useServerFn(analyzeDocument);
  const [language, setLanguage] = useState("English");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSession(null);
    setFileName(file.name);
    setLoading(true);
    try {
      const isDocx = /\.docx?$/i.test(file.name);
      const payload = isDocx
        ? { text: extractDocxText(await file.arrayBuffer()) }
        : { base64: await fileToBase64(file) };
      const data = await analyze({
        data: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          language,
          ...payload,
        },
      });
      setSession({
        id: `s-${Date.now()}`,
        createdAt: Date.now(),
        fileName: file.name,
        language,
        result: data,
        marks: {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="bg-hero px-5 pt-10 pb-8 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase opacity-80">
          <ScanSearch className="size-4" />
          Legal document assistant
        </div>
        <h1 className="font-display mt-4 text-5xl leading-[1.05] font-bold tracking-tight text-shadow-brand">
          HiddenLens
        </h1>
        <p className="mt-3 text-lg leading-relaxed font-semibold opacity-95">
          Find the clauses hidden in your document
        </p>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          Hello, and welcome. I&apos;m your friendly document companion. Share a loan agreement or
          contract and I&apos;ll point out risky clauses, missing borrower protections and
          compliance gaps — in simple words.
        </p>

        <label className="mt-5 block text-xs font-medium opacity-85" htmlFor="lang">
          Preferred language
        </label>
        <select
          id="lang"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground backdrop-blur outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l} className="text-foreground">
              {l}
            </option>
          ))}
        </select>
      </header>

      <section className="-mt-5 px-5">
        <div className="shadow-soft rounded-3xl border border-border bg-card p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/50 px-4 py-8 text-center transition-colors hover:bg-secondary disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <UploadCloud className="size-8 text-primary" />
            )}
            <span className="text-sm font-semibold text-foreground">
              {loading ? "Reading your document…" : "Upload your document"}
            </span>
            <span className="text-xs text-muted-foreground">
              PDF, Word, JPG, PNG or a photo of the pages. Scanned images are read with OCR.
            </span>
          </button>

          {fileName && !loading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" /> {fileName}
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-risk-soft px-3 py-2 text-xs text-risk">{error}</p>
          )}
        </div>
      </section>

      {session && (
        <section className="mt-6">
          <FindingsView session={session} onChange={setSession} />
          <div className="px-5">
            <button
              onClick={() => {
                setSession(null);
                setFileName("");
                inputRef.current?.click();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium"
            >
              <RefreshCw className="size-4" /> Review another document
            </button>
          </div>
        </section>
      )}

      <footer className="mt-8 px-5">
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
          {DISCLAIMER}
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
