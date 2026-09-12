import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { analyzeDocument } from "@/lib/analyze.functions";
import { extractDocxText, fileToBase64 } from "@/lib/docx";
import { normalizeImageFile } from "@/lib/scan";
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
  const cameraRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<{ file: File; url: string }[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    setHasCamera(supportsCameraStream());
  }, []);

  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  async function runAnalysis(name: string, mimeType: string, payload: { base64: string } | { text: string }) {
    setError("");
    setSession(null);
    setFileName(name);
    setLoading(true);
    try {
      const data = await analyze({
        data: { fileName: name, mimeType, language, ...payload },
      });
      setSession({
        id: `s-${Date.now()}`,
        createdAt: Date.now(),
        fileName: name,
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

  async function handleFile(input: File | undefined) {
    if (!input) return;
    try {
      setError("");
      const isDocx = /\.docx?$/i.test(input.name);
      const file = isDocx ? input : await normalizeImageFile(input);
      const payload = isDocx
        ? { text: extractDocxText(await file.arrayBuffer()) }
        : { base64: await fileToBase64(file) };
      await runAnalysis(file.name, file.type || "application/octet-stream", payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file. Please try another one.");
      setLoading(false);
    }
  }

  function addScannedPages(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setPages((prev) => [
      ...prev,
      ...Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  }

  function removePage(index: number) {
    setPages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function analyzeScannedPages() {
    if (!pages.length) return;
    setLoading(true);
    try {
      const files = await Promise.all(pages.map((p) => normalizeImageFile(p.file)));
      const base64 = await mergePagesToBase64(files);
      pages.forEach((p) => URL.revokeObjectURL(p.url));
      setPages([]);
      await runAnalysis(`Scanned document (${pages.length} page${pages.length > 1 ? "s" : ""})`, "image/jpeg", {
        base64,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the scanned pages. Please try again.");
      setLoading(false);
    }
  }


  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background pb-28 sm:max-w-2xl sm:shadow-soft">
      <header className="bg-hero px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 text-primary-foreground">
        <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight text-shadow-brand">
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
            accept=".pdf,.doc,.docx,.heic,.heif,application/pdf,image/*"
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
              PDF, Word, JPG, PNG or iPhone HEIC photos. Scanned images are read with OCR.
            </span>
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              addScannedPages(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => (hasCamera ? setCameraOpen(true) : cameraRef.current?.click())}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            <Camera className="size-4" />
            {pages.length ? "Scan another page" : "Scan with camera"}
          </button>

          {pages.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pages.map((p, i) => (
                  <div key={p.url} className="relative shrink-0">
                    <img
                      src={p.url}
                      alt={`Scanned page ${i + 1}`}
                      loading="lazy"
                      className="h-24 w-16 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePage(i)}
                      aria-label={`Remove page ${i + 1}`}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-risk p-0.5 text-risk-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void analyzeScannedPages()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary bg-secondary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Review {pages.length} scanned page{pages.length > 1 ? "s" : ""}
              </button>
            </div>
          )}

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

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(files) =>
            setPages((prev) => [
              ...prev,
              ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
            ])
          }
        />
      )}
    </main>
  );
}
