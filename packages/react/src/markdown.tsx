import { ArrowOutIcon } from "./icons.js";

/**
 * The little of markdown that actually survives the prompt: paragraphs,
 * `- ` lists, `**bold**`, and bare paths turned into buttons. Everything else
 * falls through as plain text rather than arriving on screen as punctuation.
 *
 * Deliberately not a markdown library: this renders model output, so the set
 * of things it can produce has to stay small enough to read in one sitting.
 * No `dangerouslySetInnerHTML` anywhere — text becomes text nodes.
 */

/**
 * A path only becomes a link when its first segment is a real section of the
 * site, so "12/05", "and/or" and "3/4" stay as text. Sections come from the
 * corpus ids, which is what the model cites anyway.
 */
function linkPattern(sections: string[]): RegExp {
  const external = "https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?]";
  if (sections.length === 0) return new RegExp(`(${external})`, "gi");

  const escaped = sections.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(${external}|\\/(?:${escaped})(?:\\/[a-z0-9-]+)*)`, "gi");
}

const BULLET = /^\s*[-*•]\s+/;

export interface RenderOptions {
  /** First path segments that may become links — "work", "docs", "pricing". */
  sections?: string[];
  /** Called when a visitor follows an internal link. Closes the panel. */
  onNavigate?: () => void;
  /** Show the blinking caret at the end of the last block. */
  caret?: boolean;
}

/** `**bold**` inside a run of prose. */
function withBold(text: string, key: string) {
  // One capture group, so every odd index is what sat between the stars.
  return text
    .split(/\*\*([^*]+)\*\*/g)
    .map((part, i) => (i % 2 === 1 ? <strong key={`${key}b${i}`}>{part}</strong> : part));
}

function withLinks(text: string, key: string, options: RenderOptions) {
  const pattern = linkPattern(options.sections ?? []);

  // split() keeps the capture group, so parts alternate text, link, text.
  return text.split(pattern).map((part, i) => {
    if (!part) return null;

    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${key}l${i}`}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          className="ad-link"
        >
          {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          <ArrowOutIcon size={11} />
        </a>
      );
    }

    if (part.startsWith("/")) {
      return (
        <a key={`${key}l${i}`} href={part} className="ad-link" onClick={options.onNavigate}>
          {part}
          <ArrowOutIcon size={11} />
        </a>
      );
    }

    return withBold(part, `${key}l${i}`);
  });
}

export function Answer({ text, ...options }: RenderOptions & { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="ad-answer">
      {blocks.map((block, b) => {
        const last = b === blocks.length - 1;
        const tail = options.caret && last ? <span className="ad-caret" /> : null;
        const lines = block.split("\n").filter((l) => l.trim());

        // A list only when the whole block is one: a single stray dash in a
        // paragraph shouldn't turn the rest of it into bullets.
        if (lines.length > 0 && lines.every((l) => BULLET.test(l))) {
          return (
            <ul key={b}>
              {lines.map((line, i) => (
                <li key={i}>{withLinks(line.replace(BULLET, ""), `${b}-${i}`, options)}</li>
              ))}
              {tail}
            </ul>
          );
        }

        return (
          <p key={b}>
            {withLinks(block, String(b), options)}
            {tail}
          </p>
        );
      })}
    </div>
  );
}
