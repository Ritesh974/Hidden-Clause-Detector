import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileDown,
  Highlighter,
  Languages,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  draftNegotiationLetter,
  explainClause,
  translateAnalysis,
  type Finding,
} from "@/lib/analyze.functions";
import { highlightRiskyText } from "@/lib/highlight";
import { LANGUAGES } from "@/lib/languages";
import { STATUS_LABEL, type Mark, type MarkStatus, type Session } from "@/lib/history";
import { buildLetterHtml, buildReportHtml, downloadText, printHtml } from "@/lib/report";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export const CATEGORY_META = {
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

const STATUS_STYLE: Record<MarkStatus, string> = {
  open: "border-border text-muted-foreground",
  negotiating: "border-warn/50 bg-warn-soft text-warn-foreground",
  resolved: "border-safe/40 bg-safe-soft text-safe",
};

type Props = {
  session: Session;
  onChange: (session: Session) => void;
};

export function FindingsView({ session, onChange }: Props) {
  const translate = useServerFn(translateAnalysis);
  const draftLetter = useServerFn(draftNegotiationLetter);

  const [filter, setFilter] = useState<"all" | Finding["category"]>("all");
  const [translating, setTranslating] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterBusy, setLetterBusy] = useState(false);
  const [tone, setTone] = useState<"polite" | "firm">("polite");
  const [notice, setNotice] = useState("");

  const result = session.result;
  const findings = result.findings ?? [];
  const shown = filter === "all" ? findings : findings.filter((f) => f.category === filter);
  const counts = {
    risky: findings.filter((f) => f.category === "risky").length,
    missing: findings.filter((f) => f.category === "missing").length,
    compliant: findings.filter((f) => f.category === "compliant").length,
  };

  const segments = useMemo(
    () =>
      result.documentText
        ? highlightRiskyText(
            result.documentText,
            findings.filter((f) => f.category === "risky").map((f) => f.clause),
          )
        : [],
    [result.documentText, findings],
  );

  async function changeLanguage(language: string) {
    if (language === session.language) return;
    setTranslating(true);
    setNotice("");
    try {
      const translated = await translate({ data: { result, language } });
      onChange({ ...session, language, result: translated });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not switch language. Please try again.");
    } finally {
      setTranslating(false);
    }
  }

  async function makeLetter() {
    setLetterBusy(true);
    setLetterOpen(true);
    setNotice("");
    try {
      const negotiable = findings.filter((f) => f.category !== "compliant");
      const res = await draftLetter({
        data: {
          documentType: result.documentType || "loan agreement",
          language: session.language,
          tone,
          findings: (negotiable.length ? negotiable : findings).map((f) => ({
            title: f.title,
            clause: f.clause,
            suggestion: f.suggestion,
            category: f.category,
            severity: f.severity,
          })),
        },
      });
      onChange({ ...session, letter: res.letter });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not draft the letter. Please try again.");
    } finally {
      setLetterBusy(false);
    }
  }

  function setMark(id: string, mark: Mark) {
    onChange({ ...session, marks: { ...session.marks, [id]: mark } });
  }

  return (
    <div className="px-5">
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

        <label className="mt-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Languages className="size-3.5" /> Read these findings in another language
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <select
            value={session.language}
            disabled={translating}
            onChange={(e) => void changeLanguage(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:opacity-60"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {translating && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          No need to upload again — I&apos;ll re-explain everything in your chosen language.
        </p>
      </div>

      {notice && (
        <p className="mt-3 rounded-xl bg-risk-soft px-3 py-2 text-xs text-risk">{notice}</p>
      )}

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
          <FindingCard
            key={f.id}
            finding={f}
            language={session.language}
            mark={session.marks[f.id] ?? { status: "open", note: "" }}
            onMark={(m) => setMark(f.id, m)}
          />
        ))}
      </div>

      {result.documentText && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <button
            onClick={() => setShowDoc((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Highlighter className="size-4 text-risk" /> Original document with risky clauses in
              red
            </span>
            <ChevronDown className={cn("size-4 transition-transform", showDoc && "rotate-180")} />
          </button>
          {showDoc && (
            <div className="mt-3 max-h-96 overflow-auto rounded-2xl bg-secondary/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {segments.map((s, i) =>
                s.risky ? (
                  <mark key={i} className="rounded bg-risk-soft px-0.5 font-semibold text-risk">
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Would you like a PDF of all findings?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          I can prepare a tidy report with headings for every risky clause, missing protection and
          compliant clause — including your notes and the highlighted document.
        </p>
        <button
          onClick={() => printHtml(buildReportHtml(session))}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          <FileDown className="size-4" /> Yes, download the PDF report
        </button>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">
          Would you like me to draft a negotiation letter for you?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          A ready-to-edit letter you can send to your lender asking for fairer terms.
        </p>
        <div className="mt-3 flex gap-2">
          {(["polite", "firm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                tone === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {t === "polite" ? "Polite tone" : "Firm tone"}
            </button>
          ))}
        </div>
        <button
          onClick={() => void makeLetter()}
          disabled={letterBusy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-60"
        >
          {letterBusy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {session.letter ? "Re-draft the letter" : "Yes, draft my negotiation letter"}
        </button>

        {letterOpen && session.letter && (
          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground">
              Edit the letter freely before sending
            </label>
            <textarea
              value={session.letter}
              onChange={(e) => onChange({ ...session, letter: e.target.value })}
              rows={14}
              className="mt-1.5 w-full rounded-2xl border border-border bg-background p-3 text-xs leading-relaxed outline-none"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => printHtml(buildLetterHtml(session))}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <FileDown className="size-3.5" /> Download PDF
              </button>
              <button
                onClick={() =>
                  downloadText(
                    `negotiation-letter-${session.fileName.replace(/\.[^.]+$/, "")}.txt`,
                    session.letter ?? "",
                  )
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2.5 text-xs font-semibold"
              >
                <Download className="size-3.5" /> Editable file
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-3xl border border-accent bg-accent/40 p-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-accent-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          Please have a qualified lawyer validate anything important before you sign. I can help you
          prepare the questions to ask them.
        </p>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  language,
  mark,
  onMark,
}: {
  finding: Finding;
  language: string;
  mark: Mark;
  onMark: (mark: Mark) => void;
}) {
  const explain = useServerFn(explainClause);
  const meta = CATEGORY_META[finding.category] ?? CATEGORY_META.risky;
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);
  const [depth, setDepth] = useState<"simple" | "legal">("simple");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const cacheKey = `${language}:${depth}`;

  async function load(next: "simple" | "legal") {
    setDepth(next);
    const key = `${language}:${next}`;
    if (texts[key]) return;
    setBusy(true);
    try {
      const res = await explain({
        data: { clause: finding.clause, category: finding.category, language, depth: next },
      });
      setTexts((t) => ({ ...t, [key]: res.explanation }));
    } catch {
      setTexts((t) => ({ ...t, [key]: "Sorry, I couldn't load that explanation. Please retry." }));
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
              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              meta.chip,
            )}
          >
            {meta.label} · {finding.severity}
          </span>
          <span className="mt-2 block text-sm font-semibold text-foreground">{finding.title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground italic">
            “{finding.clause}”
          </span>
          {mark.status !== "open" && (
            <span
              className={cn(
                "mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                STATUS_STYLE[mark.status],
              )}
            >
              {STATUS_LABEL[mark.status]}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
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
            {busy && !texts[cacheKey] ? (
              <span className="flex items-center gap-2 text-xs">
                <Loader2 className="size-3.5 animate-spin" /> Preparing the explanation…
              </span>
            ) : (
              texts[cacheKey]
            )}
          </div>

          {finding.reference && (
            <p className="mt-3 text-xs text-muted-foreground">Reference: {finding.reference}</p>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Track this clause</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["open", "negotiating", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onMark({ ...mark, status: s })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium",
                    mark.status === s
                      ? STATUS_STYLE[s]
                      : "border-border text-muted-foreground opacity-70",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <textarea
              value={mark.note}
              onChange={(e) => onMark({ ...mark, note: e.target.value })}
              placeholder="Add a personal note about this clause…"
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none"
            />
          </div>
        </div>
      )}
    </article>
  );
}
