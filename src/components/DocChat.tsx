import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { askDocument } from "@/lib/analyze.functions";
import type { ChatMessage, Session } from "@/lib/history";
import { cn } from "@/lib/utils";

type Props = {
  session: Session;
  onChange: (session: Session) => void;
};

export function DocChat({ session, onChange }: Props) {
  const ask = useServerFn(askDocument);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const chat: ChatMessage[] = session.chat ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length, busy]);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setError("");
    setInput("");
    const withUser: ChatMessage[] = [...chat, { role: "user", content: question }];
    onChange({ ...session, chat: withUser });
    setBusy(true);
    try {
      const res = await ask({
        data: {
          question,
          language: session.language,
          documentText: session.result.documentText ?? "",
          findings: (session.result.findings ?? []).map((f) => ({
            title: f.title,
            clause: f.clause,
            why: f.why,
            suggestion: f.suggestion,
            category: f.category,
            clauseNumber: f.clauseNumber ?? "",
            pageNumber: f.pageNumber ?? "",
          })),
          history: withUser.slice(-8),
        },
      });
      onChange({
        ...session,
        chat: [...withUser, { role: "assistant", content: res.answer }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sorry, I couldn't answer just now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="size-4 text-primary" /> Ask me about your document
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        I answer only from the document you uploaded — in {session.language}.
      </p>

      <div className="mt-3 max-h-80 space-y-2 overflow-auto">
        {chat.length === 0 && !busy && (
          <p className="rounded-2xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            For example: “What is the interest rate?”, “Can they change my EMI?”, “What happens if I
            pay late?”
          </p>
        )}
        {chat.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-secondary/60 text-foreground",
            )}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Reading your document…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 rounded-xl bg-risk-soft px-3 py-2 text-xs text-risk">{error}</p>}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Type your question about this document…"
          className="flex-1 rounded-2xl border border-border bg-background p-2.5 text-xs outline-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="rounded-2xl bg-primary px-3.5 py-3 text-primary-foreground disabled:opacity-50"
          aria-label="Send question"
        >
          <Send className="size-4" />
        </button>
      </div>
    </section>
  );
}
