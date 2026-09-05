export type Segment = { text: string; risky: boolean; id?: string };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split the document transcription into segments, marking the parts that match
 * a risky clause so they can be rendered in red.
 */
export function highlightRiskyText(documentText: string, clauses: string[]): Segment[] {
  const ranges: Array<[number, number]> = [];

  for (const raw of clauses) {
    const clause = raw.replace(/^[“"'\s]+|[”"'\s]+$/g, "").trim();
    if (clause.length < 12) continue;
    const words = clause.split(/\s+/).map(escapeRegex);
    const pattern = new RegExp(words.join("[\\s\\n]+"), "i");
    let match = pattern.exec(documentText);
    if (!match) {
      // fall back to the first sentence-ish chunk of the clause
      const short = words.slice(0, Math.max(6, Math.floor(words.length / 2)));
      if (short.length < 4) continue;
      match = new RegExp(short.join("[\\s\\n]+"), "i").exec(documentText);
    }
    if (match) ranges.push([match.index, match.index + match[0].length]);
  }

  if (!ranges.length) return [{ text: documentText, risky: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range] as [number, number]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: documentText.slice(cursor, start), risky: false });
    segments.push({ text: documentText.slice(start, end), risky: true });
    cursor = end;
  }
  if (cursor < documentText.length) segments.push({ text: documentText.slice(cursor), risky: false });
  return segments;
}

/**
 * Same matching as above, but each highlighted segment keeps the id of the
 * finding it belongs to so the UI can scroll straight to it.
 */
export function highlightFindings(
  documentText: string,
  items: Array<{ id: string; clause: string }>,
): Segment[] {
  const ranges: Array<{ start: number; end: number; id: string }> = [];

  for (const item of items) {
    const clause = item.clause.replace(/^[“"'\s]+|[”"'\s]+$/g, "").trim();
    if (clause.length < 12) continue;
    const words = clause.split(/\s+/).map(escapeRegex);
    let match = new RegExp(words.join("[\\s\\n]+"), "i").exec(documentText);
    if (!match) {
      const short = words.slice(0, Math.max(6, Math.floor(words.length / 2)));
      if (short.length < 4) continue;
      match = new RegExp(short.join("[\\s\\n]+"), "i").exec(documentText);
    }
    if (match) ranges.push({ start: match.index, end: match.index + match[0].length, id: item.id });
  }

  if (!ranges.length) return [{ text: documentText, risky: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, id } of merged) {
    if (start > cursor) segments.push({ text: documentText.slice(cursor, start), risky: false });
    segments.push({ text: documentText.slice(start, end), risky: true, id });
    cursor = end;
  }
  if (cursor < documentText.length) segments.push({ text: documentText.slice(cursor), risky: false });
  return segments;
}
