import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

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

async function callGateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured. Missing API key.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
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
You analyse an uploaded document and identify:
1. Risky clauses (hidden fees, unilateral rate/termination rights, penal charges, one-sided indemnity, heavy legal jargon).
2. Missing borrower protections (dispute resolution/grievance redressal, cooling-off, prepayment rights, data privacy, consumer rights, notice periods).
3. Compliance gaps (RBI Fair Practices Code, KFS disclosure, BASEL alignment, missing disclosures) and compliant clauses worth confirming.
Explain everything in plain language a non-lawyer understands, and add an optional deeper legal reference where relevant.
Never claim to give legal advice.
Return ONLY valid JSON, no markdown fences, matching:
{"greeting":string,"documentType":string,"summary":string,"riskScore":number(0-100, higher = riskier),"documentText":string,"findings":[{"id":string,"category":"risky"|"missing"|"compliant","title":string,"clause":string,"why":string,"severity":"high"|"medium"|"low","suggestion":string,"reference":string}]}
Give 6-14 findings covering all three categories when the document supports it. "clause" quotes or paraphrases the actual document text (for missing protections say what is absent).
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
        ? "Explain in very simple everyday words, as if to someone with no legal background. Max 120 words. Use a short everyday example."
        : "Give a deeper legal explanation for a professional: cite relevant Indian regulations (RBI Fair Practices Code, KFS/RBI circulars, Consumer Protection Act, Contract Act) or BASEL norms where relevant. Max 180 words.";

    const content = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a polite legal document assistant. Never give legal advice; give informational guidance only. Reply in plain prose, no markdown headings.",
        },
        {
          role: "user",
          content: `Category: ${data.category}\nClause: "${data.clause}"\n\n${style}\nRespond entirely in ${data.language}.`,
        },
      ],
    });

    return { explanation: content.trim() };
  });
