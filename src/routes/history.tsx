import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileDown, FileText, Scale, Trash2 } from "lucide-react";
import {
  deleteSession,
  formatDate,
  loadSessions,
  saveSession,
  STATUS_LABEL,
  type Session,
} from "@/lib/history";
import { buildReportHtml, printHtml } from "@/lib/report";
import { FindingsView } from "@/components/FindingsView";
import { BottomNav } from "@/components/BottomNav";
import { DISCLAIMER } from "@/lib/languages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History & Comparisons — HiddenLens" },
      {
        name: "description",
        content:
          "Reopen past document reviews, compare two agreements side by side, and download the PDF reports you saved earlier.",
      },
      { property: "og:title", content: "History & Comparisons — HiddenLens" },
      {
        property: "og:description",
        content: "Reopen past reviews and compare two agreements side by side at any time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function counts(session: Session) {
  const f = session.result.findings ?? [];
  return {
    risky: f.filter((x) => x.category === "risky").length,
    missing: f.filter((x) => x.category === "missing").length,
    compliant: f.filter((x) => x.category === "compliant").length,
  };
}

function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState<Session | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  function update(session: Session) {
    saveSession(session);
    setOpen(session);
    setSessions(loadSessions());
  }

  function remove(id: string) {
    deleteSession(id);
    setSessions(loadSessions());
    setCompare((c) => c.filter((x) => x !== id));
  }

  function toggleCompare(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  }

  if (open) {
    return (
      <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background pb-28 sm:max-w-2xl">
        <header className="bg-hero px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-8 text-primary-foreground">
          <button
            onClick={() => setOpen(null)}
            className="flex items-center gap-2 text-xs font-medium opacity-85"
          >
            <ArrowLeft className="size-4" /> Back to history
          </button>
          <h1 className="mt-3 text-2xl leading-tight font-semibold">{open.fileName}</h1>
          <p className="mt-1 text-xs opacity-85">{formatDate(open.createdAt)}</p>
        </header>
        <div className="mt-6">
          <FindingsView session={open} onChange={update} />
        </div>
        <BottomNav />
      </main>
    );
  }

  const pair = compare
    .map((id) => sessions.find((s) => s.id === id))
    .filter((s): s is Session => Boolean(s));

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background pb-28 sm:max-w-2xl">
      <header className="bg-hero px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase opacity-80">
          <Scale className="size-4" /> Saved reviews
        </div>
        <h1 className="font-display mt-4 text-4xl leading-[1.05] font-bold tracking-tight text-shadow-brand">
          HiddenLens
        </h1>
        <p className="mt-2 text-lg font-semibold opacity-95">Your review history</p>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          Every document you reviewed stays here on this device. Pick any two to reopen a
          side-by-side comparison later.
        </p>
      </header>

      <section className="mt-6 px-5">
        {sessions.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No reviews yet. Upload a document on the Scan tab and it will appear here.
          </p>
        )}

        <div className="space-y-3">
          {sessions.map((s) => {
            const c = counts(s);
            const selected = compare.includes(s.id);
            return (
              <article key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{s.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.createdAt)} · {s.language}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      <span className="rounded-full bg-risk-soft px-2 py-0.5 text-risk">
                        {c.risky} risky
                      </span>
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-warn-foreground">
                        {c.missing} missing
                      </span>
                      <span className="rounded-full bg-safe-soft px-2 py-0.5 text-safe">
                        {c.compliant} compliant
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                        risk {s.result.riskScore}/100
                      </span>
                    </div>
                  </div>
                  <button onClick={() => remove(s.id)} aria-label="Delete review">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setOpen(s)}
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Reopen
                  </button>
                  <button
                    onClick={() => printHtml(buildReportHtml(s))}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
                  >
                    <FileDown className="size-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => toggleCompare(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      selected
                        ? "border-primary bg-secondary text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {selected ? "Selected to compare" : "Compare"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {pair.length === 2 && (
          <button
            onClick={() => setComparing(true)}
            className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            Open side-by-side comparison
          </button>
        )}
      </section>

      {comparing && pair.length === 2 && (
        <CompareSheet a={pair[0]!} b={pair[1]!} onClose={() => setComparing(false)} />
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

function CompareSheet({ a, b, onClose }: { a: Session; b: Session; onClose: () => void }) {
  const rows = [
    { label: "Document", value: (s: Session) => s.fileName },
    { label: "Reviewed", value: (s: Session) => formatDate(s.createdAt) },
    { label: "Type", value: (s: Session) => s.result.documentType },
    { label: "Risk score", value: (s: Session) => `${s.result.riskScore}/100` },
    { label: "Risky clauses", value: (s: Session) => String(counts(s).risky) },
    { label: "Missing protections", value: (s: Session) => String(counts(s).missing) },
    { label: "Compliant clauses", value: (s: Session) => String(counts(s).compliant) },
    {
      label: "Resolved",
      value: (s: Session) =>
        String(Object.values(s.marks).filter((m) => m.status === "resolved").length),
    },
    {
      label: "Still negotiating",
      value: (s: Session) =>
        String(Object.values(s.marks).filter((m) => m.status === "negotiating").length),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background/98 backdrop-blur">
      <div className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-2xl">
        <button onClick={onClose} className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeft className="size-4" /> Close comparison
        </button>
        <h2 className="mt-3 text-xl font-semibold">Side-by-side comparison</h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={cn("grid grid-cols-[86px_1fr_1fr] gap-2 px-3 py-2.5 text-xs", i % 2 && "bg-secondary/40")}
            >
              <span className="font-medium text-muted-foreground">{row.label}</span>
              <span className="break-words">{row.value(a)}</span>
              <span className="break-words">{row.value(b)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[a, b].map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-semibold">{s.fileName}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {s.result.summary}
              </p>
              <ul className="mt-3 space-y-1.5">
                {(s.result.findings ?? [])
                  .filter((f) => f.category === "risky")
                  .slice(0, 6)
                  .map((f) => (
                    <li key={f.id} className="text-[11px] leading-snug text-risk">
                      • {f.title}
                      <span className="block text-[10px] text-muted-foreground">
                        {STATUS_LABEL[s.marks[f.id]?.status ?? "open"]}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
