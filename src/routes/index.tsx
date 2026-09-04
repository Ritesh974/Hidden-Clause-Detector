import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  analyzeDocument,
  explainClause,
  type AnalysisResult,
  type Finding,
} from "@/lib/analyze.functions";
import { extractDocxText, fileToBase64 } from "@/lib/docx";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClauseGuard — AI Legal Clause Extractor for Loan Documents" },
      {
        name: "description",
        content:
          "Upload a loan agreement or contract and instantly see risky clauses, missing borrower protections and compliance gaps explained in plain language.",
      },
      { property: "og:title", content: "ClauseGuard — AI Legal Clause Extractor" },
      {
        property: "og:description",
        content:
          "Spot risky clauses, missing borrower protections and RBI compliance gaps in seconds — in your language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LANGUAGES = [
  "English",
  "Hinglish",
  "हिन्दी (Hindi)",
  "বাংলা (Bengali)",
  "தமிழ் (Tamil)",
  "తెలుగు (Telugu)",
  "मराठी (Marathi)",
  "ગુજરાતી (Gujarati)",
  "ಕನ್ನಡ (Kannada)",
  "മലയാളം (Malayalam)",
  "ଓଡ଼ିଆ (Odia)",
  "অসমীয়া (Assamese)",
  "बड़ो (Bodo)",
  "कोंकणी (Konkani)",
  "Khasi",
  "Punjabi",
  "Urdu",
  "Français",
  "Español",
  "Русский",
  "العربية",
  "中文 (Mandarin)",
  "日本語 (Japanese)",
  "Deutsch",
  "Tiếng Việt",
];

const CATEGORY_META = {
  risky: {
    label: "Risky clause",
    icon: ShieldAlert,
    chip: "bg-risk-soft text-risk border-risk/25",
    bar: "bg-risk",
  },
  missing: {
    label: "Missing protection",
    icon: AlertTriangle,
    chip: "bg-warn-soft text-warn-foreground border-warn/40",
    bar: "bg-warn",
  },
  compliant: {
    label: "Looks compliant",
    icon: CheckCircle2,
    chip: "bg-safe-soft text-safe border-safe/25",
    bar: "bg-safe",
  },
} as const;

const DISCLAIMER =
  "This is informational guidance only, not a substitute for professional legal advice.";

function Index() {
  const analyze = useServerFn(analyzeDocument);
  const [language, setLanguage] = useState("English");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<"all" | Finding["category"]>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult(null);
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
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const findings = result?.findings ?? [];
  const shown = filter === "all" ? findings : findings.filter((f) => f.category === filter);
  const counts = {
    risky: findings.filter((f) => f.category === "risky").length,
    missing: findings.filter((f) => f.category === "missing").length,
    compliant: findings.filter((f) => f.category === "compliant").length,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
      <header className="bg-hero px-5 pb-8 pt-10 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] opacity-80">
          <Scale className="size-4" />
          ClauseGuard
        </div>
        <h1 className="mt-3 text-3xl leading-tight font-semibold">
          Understand your legal document in seconds
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-90">
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
          className="mt-1.5 w-full rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none backdrop-blur"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l} className="text-foreground">
              {l}
            </option>
          ))}
        </select>
      </header>

      <section className="-mt-5 px-5">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
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

      {result && (
        <section className="mt-6 px-5">
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm leading-relaxed text-foreground">{result.greeting}</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">{result.documentType}</p>
                <p className="text-sm font-semibold">Risk score</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-bold",
                  result.riskScore >= 66
                    ? "bg-risk-soft text-risk"
                    : result.riskScore >= 33
                      ? "bg-warn-soft text-warn-foreground"
                      : "bg-safe-soft text-safe",
                )}
              >
                {result.riskScore}/100
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", "risky", "missing", "compliant"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {key === "all"
                  ? `All (${findings.length})`
                  : `${CATEGORY_META[key].label} (${counts[key]})`}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {shown.map((f) => (
              <FindingCard key={f.id} finding={f} language={language} />
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-accent bg-accent/40 p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-accent-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              Please have a qualified lawyer validate anything important before you sign. I can help
              you prepare the questions to ask them.
            </p>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFileName("");
              inputRef.current?.click();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium"
          >
            <RefreshCw className="size-4" /> Review another document
          </button>
        </section>
      )}

      <footer className="mt-8 px-5">
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
          {DISCLAIMER}
        </p>
      </footer>
    </main>
  );
}

function FindingCard({ finding, language }: { finding: Finding; language: string }) {
  const explain = useServerFn(explainClause);
  const meta = CATEGORY_META[finding.category] ?? CATEGORY_META.risky;
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);
  const [depth, setDepth] = useState<"simple" | "legal">("simple");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load(next: "simple" | "legal") {
    setDepth(next);
    if (texts[next]) return;
    setBusy(true);
    try {
      const res = await explain({
        data: { clause: finding.clause, category: finding.category, language, depth: next },
      });
      setTexts((t) => ({ ...t, [next]: res.explanation }));
    } catch {
      setTexts((t) => ({ ...t, [next]: "Sorry, I couldn't load that explanation. Please retry." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn("h-1 w-full", meta.bar)} />
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load(depth);
        }}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          <span
            className={cn(
              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              meta.chip,
            )}
          >
            {meta.label} · {finding.severity}
          </span>
          <span className="mt-2 block text-sm font-semibold text-foreground">{finding.title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground italic">
            “{finding.clause}”
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          <p className="text-sm leading-relaxed text-foreground">{finding.why}</p>
          <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-secondary-foreground">
            What you can do: {finding.suggestion}
          </p>

          <div className="mt-4 flex gap-2">
            {(["simple", "legal"] as const).map((d) => (
              <button
                key={d}
                onClick={() => void load(d)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  depth === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {d === "simple" ? "Explain simply" : "Legal detail"}
              </button>
            ))}
          </div>

          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {busy && !texts[depth] ? (
              <span className="flex items-center gap-2 text-xs">
                <Loader2 className="size-3.5 animate-spin" /> Preparing the explanation…
              </span>
            ) : (
              texts[depth]
            )}
          </div>

          {finding.reference && (
            <p className="mt-3 text-xs text-muted-foreground">Reference: {finding.reference}</p>
          )}
        </div>
      )}
    </article>
  );
}
