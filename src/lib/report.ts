import { highlightRiskyText } from "./highlight";
import { STATUS_LABEL, formatDate, type Session } from "./history";

const CATEGORY_TITLE: Record<string, string> = {
  risky: "Risky clauses",
  missing: "Missing borrower protections",
  compliant: "Compliant clauses",
};

const CATEGORY_COLOR: Record<string, string> = {
  risky: "#b3261e",
  missing: "#a06a00",
  compliant: "#166534",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: "Helvetica Neue", Arial, "Noto Sans", sans-serif; color: #1b1b18; line-height: 1.55; font-size: 12pt; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  h2 { font-size: 14pt; margin: 26px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 12pt; margin: 16px 0 4px; }
  .meta { color: #666; font-size: 10pt; margin-bottom: 18px; }
  .quote { font-style: italic; background: #f6f5f2; padding: 8px 10px; border-left: 3px solid #ccc; margin: 6px 0; }
  .label { display: inline-block; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .note { background: #fffaf0; border: 1px solid #f0e2c0; padding: 8px 10px; margin-top: 6px; font-size: 10.5pt; }
  .doc { white-space: pre-wrap; font-size: 10.5pt; background: #fafafa; padding: 12px; border: 1px solid #eee; }
  mark { background: #ffd9d6; color: #b3261e; font-weight: 600; }
  .disclaimer { margin-top: 28px; font-size: 10pt; color: #555; border-top: 1px solid #ddd; padding-top: 10px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 11.5pt; }
</style></head><body>${body}
<div class="disclaimer">This is informational guidance only, not a substitute for professional legal advice.</div>
</body></html>`;
}

export function buildReportHtml(session: Session) {
  const { result } = session;
  const groups = (["risky", "missing", "compliant"] as const).map((category) => ({
    category,
    items: (result.findings ?? []).filter((f) => f.category === category),
  }));

  const findingsHtml = groups
    .filter((g) => g.items.length)
    .map(
      (g) => `<h2 style="color:${CATEGORY_COLOR[g.category]}">${CATEGORY_TITLE[g.category]} (${g.items.length})</h2>` +
        g.items
          .map((f) => {
            const mark = session.marks[f.id];
            return `<div>
  <h3>${escapeHtml(f.title)} <span class="label" style="color:${CATEGORY_COLOR[g.category]}">· ${escapeHtml(f.severity)}</span></h3>
  ${f.clauseNumber || f.pageNumber ? `<p class="label">${[f.clauseNumber, f.pageNumber].filter(Boolean).map((v) => escapeHtml(v as string)).join(" · ")}</p>` : ""}
  <div class="quote">${escapeHtml(f.clause)}</div>
  <p><strong>Why it matters:</strong> ${escapeHtml(f.why)}</p>
  <p><strong>What you can do:</strong> ${escapeHtml(f.suggestion)}</p>
  ${f.reference ? `<p><strong>Reference:</strong> ${escapeHtml(f.reference)}</p>` : ""}
  <p><strong>Status:</strong> ${escapeHtml(STATUS_LABEL[mark?.status ?? "open"])}</p>
  ${mark?.note ? `<div class="note"><strong>Your note:</strong> ${escapeHtml(mark.note)}</div>` : ""}
</div>`;
          })
          .join(""),
    )
    .join("");

  const marked = result.documentText
    ? `<h2>Original document with risky clauses highlighted</h2><div class="doc">${highlightRiskyText(
        result.documentText,
        (result.findings ?? []).filter((f) => f.category === "risky").map((f) => f.clause),
      )
        .map((s) => (s.risky ? `<mark>${escapeHtml(s.text)}</mark>` : escapeHtml(s.text)))
        .join("")}</div>`
    : "";

  const letter = session.letter
    ? `<h2>Negotiation letter draft</h2><pre>${escapeHtml(session.letter)}</pre>`
    : "";

  return shell(
    `HiddenLens report — ${session.fileName}`,
    `<h1>HiddenLens — Findings report</h1>
<div class="meta">${escapeHtml(session.fileName)} · ${escapeHtml(result.documentType || "Document")} · ${escapeHtml(
      formatDate(session.createdAt),
    )} · Language: ${escapeHtml(session.language)}</div>
<h2>Summary</h2>
<p><strong>Risk score:</strong> ${result.riskScore}/100</p>
<p>${escapeHtml(result.summary)}</p>
${findingsHtml}${marked}${letter}`,
  );
}

export function buildLetterHtml(session: Session) {
  return shell(
    `Negotiation letter — ${session.fileName}`,
    `<h1>Negotiation letter</h1>
<div class="meta">${escapeHtml(session.fileName)} · ${escapeHtml(formatDate(session.createdAt))}</div>
<pre>${escapeHtml(session.letter ?? "")}</pre>`,
  );
}

/**
 * Prepare a printable page so the user can save it as a PDF.
 * Uses a hidden iframe, which works reliably in Safari on Mac, iPhone and iPad
 * (where pop-up windows are often blocked, especially in installed app mode).
 */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;";
  document.body.appendChild(frame);

  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 1000);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      openInNewTab(html);
      return;
    }
    win.focus();
    try {
      win.print();
    } catch {
      openInNewTab(html);
    }
    cleanup();
  };

  frame.srcdoc = html;
}

function openInNewTab(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const win = window.open(url, "_blank");
  if (!win) alert("Please allow pop-ups so the report can be prepared.");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadText(fileName: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.target = "_blank";
  // Safari (Mac and iOS) needs the link in the document before it will act on the click.
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}
