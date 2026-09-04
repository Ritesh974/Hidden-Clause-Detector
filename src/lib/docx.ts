import { unzipSync, strFromU8 } from "fflate";

/** Extract plain text from a .docx file in the browser. */
export function extractDocxText(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("Could not read this Word file.");
  const xml = strFromU8(doc);
  return xml
    .replace(/<w:p[ >]/g, "\n<w:p ")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}
