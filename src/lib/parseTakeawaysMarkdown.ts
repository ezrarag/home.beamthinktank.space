import type { MeetingTakeaway } from "@/types/meeting";

const HEADING = /^#{1,6}\s+(.+?)\s*#*$/;

function cleanBody(lines: string[]) {
  return lines
    .join("\n")
    .trim()
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

/** Parse NotebookLM-style Markdown headings into publishable takeaway cards. */
export function parseTakeawaysMarkdown(markdown: string): MeetingTakeaway[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const parsed: MeetingTakeaway[] = [];
  let heading = "";
  let body: string[] = [];

  const flush = () => {
    const nextBody = cleanBody(body);
    if (heading && nextBody) parsed.push({ heading, body: nextBody });
    body = [];
  };

  for (const line of normalized.split("\n")) {
    const match = line.trim().match(HEADING);
    if (match) {
      flush();
      heading = match[1]!.trim();
      continue;
    }
    if (heading) body.push(line);
  }
  flush();

  // NotebookLM sometimes returns bold labels instead of Markdown headings.
  if (parsed.length === 0) {
    const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    for (const block of blocks) {
      const lines = block.split("\n");
      const match = lines[0]?.match(/^\*\*(.+?)\*\*:?\s*$/);
      const nextBody = cleanBody(lines.slice(1));
      if (match && nextBody) parsed.push({ heading: match[1]!.trim(), body: nextBody });
    }
  }

  return parsed;
}
