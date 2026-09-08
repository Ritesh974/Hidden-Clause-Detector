import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CLAUSE_KNOWLEDGE, COMPLIANCE_REFERENCE, RISKY_CLAUSE_PLAYBOOK } from "@/lib/clause-knowledge";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";
// Lighter, faster model for short interactive replies (chat, explanations, letters).
const FAST_MODEL = "google/gemini-3.1-flash-lite";

const AnalyzeInput = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  base64: z.string().optional(),
  text: z.string().optional(),
  language: z.string().default("English"),
});

const ExplainInput = z.object({
  clause: z.string(),
  category: z.string(),
  language: z.string().default("English"),
  depth: z.enum(["simple", "legal"]).default("simple"),
});

type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

async function callGateway(body: Record<string, unknown>) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured. Missing API key.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    // Priority serving tier => lower latency on every call.
    body: JSON.stringify({ service_tier: "priority", ...body }),
  });


  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429)
      throw new Error("Too many requests right now. Please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits are exhausted. Please add credits to continue.");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}

export type Finding = {
  id: string;
  category: "risky" | "missing" | "compliant";
  title: string;
  clause: string;
  why: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
  reference?: string;
  clauseNumber?: string;
  pageNumber?: string;
};

export type AnalysisResult = {
  greeting: string;
  documentType: string;
  summary: string;
  riskScore: number;
  documentText?: string;
  findings: Finding[];
};

const SYSTEM = `You are a polite, warm and trustworthy legal document assistant specialising in loan, credit and financial agreements (Indian RBI/BASEL context plus general consumer law).
You have been trained on how real loan agreements, sanction letters, MITC/KFS annexures, gold-loan and BNPL contracts, leases and vendor contracts are actually drafted. Use the playbook below as your detection checklist — match the real drafting language, not generic "legal sounding" text.

${CLAUSE_KNOWLEDGE}

You analyse an uploaded document and identify:
1. Risky clauses, using the risky-clause families above.
2. Missing borrower protections, using the protection checklist above (report a protection as missing only after checking the whole document, including schedules and annexures).
3. Compliance gaps against the frameworks above, and compliant clauses worth confirming.
Explain everything in plain language a non-lawyer understands, and add an optional deeper legal reference where relevant.
Never claim to give legal advice.
Return ONLY valid JSON, no markdown fences, matching:
{"greeting":string,"documentType":string,"summary":string,"riskScore":number(0-100, higher = riskier),"documentText":string,"findings":[{"id":string,"category":"risky"|"missing"|"compliant","title":string,"clause":string,"why":string,"severity":"high"|"medium"|"low","suggestion":string,"reference":string,"clauseNumber":string,"pageNumber":string}]}
Give 6-14 findings covering all three categories when the document supports it. "clause" quotes or paraphrases the actual document text (for missing protections say what is absent).
"clauseNumber" MUST be the exact clause/section/paragraph number as printed in the document (e.g. "Clause 7.2", "Section 4(b)", "Schedule II, item 3"). "pageNumber" MUST be the page of the document where that clause appears (e.g. "Page 3"). Use "" for both only when the document genuinely has no numbering or the item is a missing protection that appears nowhere; never invent numbers. When transcribing into "documentText", keep the printed clause numbers and insert a line "--- Page N ---" at the start of each page so pages can be located.
Include the real figures (rate, fee amount, %, notice days, lock-in period) from the document in "title" or "why" whenever they exist.
Base "riskScore" on how many high-severity money/asset/remedy risks are present, not on the document's length or tone.
"documentText" MUST contain a faithful plain-text transcription of the document (read images with OCR), keeping the original wording and paragraph breaks, so risky sentences can be located in it. Keep the exact clause wording inside "clause" identical to the wording used in "documentText" whenever the clause exists in the document.
Write ALL user-facing text in the requested language, except "documentText" which stays in the document's original language.`;


export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const blocks: Block[] = [
      {
        type: "text",
        text: `Analyse this document named "${data.fileName}". Respond entirely in ${data.language}. If the file is a scanned image or photo, read the text from the image (OCR) first.`,
      },
    ];

    if (data.text) {
      blocks.push({ type: "text", text: `Document text:\n\n${data.text.slice(0, 120000)}` });
    } else if (data.base64) {
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
      if (data.mimeType.startsWith("image/")) {
        blocks.push({ type: "image_url", image_url: { url: dataUrl } });
      } else {
        blocks.push({
          type: "file",
          file: { filename: data.fileName, file_data: dataUrl },
        });
      }
    } else {
      throw new Error("No document content was provided.");
    }

    const content = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: blocks },
      ],
      response_format: { type: "json_object" },
    });

    const result = parseJson<AnalysisResult>(content);
    result.findings = (result.findings ?? []).map((f, i) => ({ ...f, id: f.id || `f-${i}` }));
    return result;
  });

export const explainClause = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExplainInput.parse(d))
  .handler(async ({ data }) => {
    const style =
      data.depth === "simple"
        ? "Explain in very simple everyday words, as if to someone with no legal background. Max 120 words. Say concretely what it could cost or take away from the borrower, with a short everyday example using realistic numbers."
        : "Give a deeper legal explanation for a professional: cite relevant Indian regulations (RBI Fair Practices Code, KFS/penal-charges/floating-rate-reset circulars, Digital Lending Guidelines, Consumer Protection Act 2019 unfair contract terms, Indian Contract Act ss.16/23/74, SARFAESI, DPDP Act 2023) or BASEL norms where relevant. Max 180 words.";

    const content = await callGateway({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a polite legal document assistant with deep familiarity with how real loan and credit agreements are drafted. Never give legal advice; give informational guidance only. Reply in plain prose, no markdown headings.

${RISKY_CLAUSE_PLAYBOOK}

${COMPLIANCE_REFERENCE}`,
        },

        {
          role: "user",
          content: `Category: ${data.category}\nClause: "${data.clause}"\n\n${style}\nRespond entirely in ${data.language}.`,
        },
      ],
    });

    return { explanation: content.trim() };
  });

const TranslateInput = z.object({
  result: z.any(),
  language: z.string(),
});

export const translateAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranslateInput.parse(d))
  .handler(async ({ data }) => {
    const source = data.result as AnalysisResult;
    const payload = {
      greeting: source.greeting,
      documentType: source.documentType,
      summary: source.summary,
      riskScore: source.riskScore,
      findings: (source.findings ?? []).map((f) => ({
        id: f.id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        clause: f.clause,
        why: f.why,
        suggestion: f.suggestion,
        reference: f.reference ?? "",
        clauseNumber: f.clauseNumber ?? "",
        pageNumber: f.pageNumber ?? "",
      })),
    };

    const content = await callGateway({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You translate a legal-analysis JSON object into another language.
Return ONLY valid JSON with the exact same shape and the same "id", "category", "severity", "riskScore", "clauseNumber" and "pageNumber" values (keep clause and page references unchanged apart from translating the words "Clause"/"Page").
Translate greeting, documentType, summary, title, clause, why, suggestion and reference into the requested language, keeping the meaning and the polite tone.`,
        },
        {
          role: "user",
          content: `Translate everything into ${data.language}.\n\n${JSON.stringify(payload)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const translated = parseJson<AnalysisResult>(content);
    if (source.documentText) {
      translated.documentText = source.documentText;
    }
    translated.findings = (translated.findings ?? []).map((f, i) => ({
      ...f,
      id: f.id || source.findings?.[i]?.id || `f-${i}`,
    }));
    return translated;
  });

const AskInput = z.object({
  question: z.string().min(1),
  language: z.string().default("English"),
  documentText: z.string().default(""),
  findings: z
    .array(
      z.object({
        title: z.string(),
        clause: z.string(),
        why: z.string(),
        suggestion: z.string(),
        category: z.string(),
        clauseNumber: z.string().default(""),
        pageNumber: z.string().default(""),
      }),
    )
    .default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const findingsText = data.findings
      .map(
        (f) =>
          `- [${f.category}] ${f.title}${f.clauseNumber ? ` (${f.clauseNumber}${f.pageNumber ? `, ${f.pageNumber}` : ""})` : ""}\n  Clause: "${f.clause}"\n  Why it matters: ${f.why}\n  Suggested change: ${f.suggestion}`,
      )
      .join("\n");

    const context = `DOCUMENT TEXT:\n${data.documentText.slice(0, 40000) || "(no transcription available)"}\n\nANALYSIS FINDINGS:\n${findingsText || "(none)"}`;

    const content = await callGateway({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a warm, polite assistant who answers questions ONLY about the single document provided below.

STRICT RULES:
1. Answer strictly from the DOCUMENT TEXT and ANALYSIS FINDINGS. Never use outside knowledge, general legal facts, news, or assumptions.
2. If the answer is not contained in the document, reply politely in one or two sentences that the question is outside the context of the uploaded document and that the document does not cover that topic, and invite them to ask something about the document. Do not answer it anyway.
3. Greetings, thanks and questions about how to use the findings may be answered warmly and briefly.
4. Speak like a helpful human: short sentences, simple everyday words, no legal jargon unless you explain it. No markdown headings; a couple of short bullet lines are fine. Keep answers under 140 words.
5. Quote the clause number and page from the document when helpful.
6. Never give legal advice; suggest checking with a lawyer for final validation when the topic is serious.
Respond entirely in ${data.language}.

${context}`,
        },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: data.question },
      ],
    });

    return { answer: content.trim() };
  });

const LetterInput = z.object({
  documentType: z.string(),
  language: z.string().default("English"),
  tone: z.enum(["polite", "firm"]).default("polite"),
  findings: z.array(
    z.object({
      title: z.string(),
      clause: z.string(),
      suggestion: z.string(),
      category: z.string(),
      severity: z.string(),
    }),
  ),
});

export const draftNegotiationLetter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LetterInput.parse(d))
  .handler(async ({ data }) => {
    const bullets = data.findings
      .map((f) => `- [${f.category}/${f.severity}] ${f.title}\n  Clause: "${f.clause}"\n  Desired change: ${f.suggestion}`)
      .join("\n");

    const content = await callGateway({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You draft negotiation letters a borrower can send to a lender about a ${data.documentType || "loan agreement"}.
Write a complete, ready-to-edit letter in plain text: date placeholder, recipient block, subject line, a courteous opening, one numbered request per issue (quote the clause, explain the concern briefly, state the requested amendment), a closing paragraph inviting discussion, and a signature block with [Your Name] placeholders.
Tone: ${data.tone === "firm" ? "firm but respectful and professional" : "warm, polite and cooperative"}.
Never claim to give legal advice and do not add markdown formatting.`,
        },
        {
          role: "user",
          content: `Write the letter entirely in ${data.language}. Issues to negotiate:\n\n${bullets}`,
        },
      ],
    });

    return { letter: content.trim() };
  });
