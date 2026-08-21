import type { Citation } from "./corpus.js";

/**
 * What travels between the route and the widget: NDJSON, one JSON object per
 * line. Not the AI SDK's own UI-message protocol — this one is small enough
 * that the 4 kB `<script>` embed can parse it with `JSON.parse`, and it never
 * carries a corpus page, only text the visitor is allowed to see.
 */
export type AskEvent =
  | { type: "text"; value: string }
  | { type: "sources"; value: Citation[] }
  | { type: "error"; value: string }
  | { type: "done" };

export const NDJSON_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

export function encodeEvent(event: AskEvent): string {
  return JSON.stringify(event) + "\n";
}

/** Feed it chunks, get back whole events. Handles lines split across chunks. */
export function createEventParser(): (chunk: string) => AskEvent[] {
  let buffer = "";

  return (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    const events: AskEvent[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as AskEvent);
      } catch {
        // A malformed line is a bug on our side, not something to show a visitor.
      }
    }
    return events;
  };
}
