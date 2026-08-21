"use client";

import {
  defaultAppearance,
  themeToCssVars,
  type Appearance,
  type WidgetConfig,
} from "@askdock/core";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowOutIcon,
  ArrowUpIcon,
  ChevronIcon,
  CloseIcon,
  SparkIcon,
  StopIcon,
} from "./icons.js";
import { Answer } from "./markdown.js";
import { injectStyles } from "./styles.js";
import { useAskdock } from "./useAskdock.js";

export interface AskdockProps extends Partial<WidgetConfig> {
  /** Where the widget posts. Must be a route running `@askdock/server`. */
  endpoint?: string;
  /** Paths the assistant may turn into links — usually your top-level sections. */
  sections?: string[];
  /** Controlled open state. Leave it out and the widget manages its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FALLBACK = {
  endpoint: "/api/askdock",
  name: "Assistant",
  launcherLabel: "Ask anything",
  placeholder: "Ask a question…",
  hotkey: "k" as const,
  maxLength: 600,
};

/**
 * The whole widget: a launcher, and the surface it opens.
 *
 * `launcher` and `surface` are independent — a pill at the bottom of the page
 * can open a side panel, a corner bubble can open a popup. Both default to the
 * combination this started as: a pill, opening a popup in its place.
 */
export function Askdock({
  open: controlledOpen,
  onOpenChange,
  sections,
  ...config
}: AskdockProps) {
  const settings = { ...FALLBACK, ...config };
  const appearance: Appearance = { ...defaultAppearance, ...config.appearance };

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const [draft, setDraft] = useState("");
  const [prefersDark, setPrefersDark] = useState(appearance.colorScheme === "dark");

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const { messages, streaming, error, ask, stop } = useAskdock({
    endpoint: settings.endpoint,
  });

  // Styles go in before first paint, so the widget never flashes unstyled.
  useLayoutEffect(() => injectStyles(), []);

  useEffect(() => {
    if (appearance.colorScheme !== "auto") {
      setPrefersDark(appearance.colorScheme === "dark");
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [appearance.colorScheme]);

  const close = useCallback(() => {
    stop();
    setOpen(false);
  }, [setOpen, stop]);

  useEffect(() => {
    const hotkey = settings.hotkey;

    function onKey(e: KeyboardEvent) {
      if (hotkey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === hotkey) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open, setOpen, settings.hotkey]);

  // Focus the field once the surface has taken the launcher's place.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Follow the answer as it streams in.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const style = useMemo(
    () => themeToCssVars(appearance, prefersDark) as React.CSSProperties,
    [appearance, prefersDark]
  );

  const submit = (question: string) => {
    setDraft("");
    void ask(question);
  };

  const inline = appearance.surface === "inline";
  const showLauncher = !inline && !open && appearance.launcher !== "none";

  return (
    <div
      className="ad-root"
      style={style}
      data-corner={appearance.corner}
      data-side={appearance.side}
      data-surface={appearance.surface}
      data-launcher={appearance.launcher}
      data-open={open || inline}
    >
      {showLauncher &&
        (appearance.launcher === "bubble" ? (
          <button
            type="button"
            className="ad-bubble"
            onClick={() => setOpen(true)}
            aria-label={settings.launcherLabel}
          >
            <SparkIcon size={20} />
          </button>
        ) : (
          <button type="button" className="ad-pill" onClick={() => setOpen(true)}>
            <SparkIcon size={15} />
            <span className="ad-pill-label">{settings.launcherLabel}</span>
            {settings.hotkey && <kbd className="ad-kbd">⌘{String(settings.hotkey).toUpperCase()}</kbd>}
          </button>
        ))}

      {(open || inline) && (
        <div className="ad-surface" role="dialog" aria-label={settings.name}>
          <header className="ad-head">
            <span className="ad-avatar">
              <SparkIcon size={13} />
            </span>
            <span className="ad-head-text">
              <strong>{settings.name}</strong>
              {settings.tagline && <span>{settings.tagline}</span>}
            </span>
            {!inline && (
              <button type="button" className="ad-close" onClick={close} aria-label="Close">
                <CloseIcon />
              </button>
            )}
          </header>

          <div className="ad-log" ref={logRef}>
            {messages.length === 0 ? (
              <>
                {settings.intro && (
                  <p className="ad-intro">
                    <SparkIcon size={13} />
                    <span>{settings.intro}</span>
                  </p>
                )}
                {settings.starters && settings.starters.length > 0 && (
                  <>
                    <p className="ad-try">Try asking</p>
                    <div className="ad-starters">
                      {settings.starters.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          className="ad-starter"
                          onClick={() => submit(starter)}
                        >
                          {starter}
                          <ChevronIcon />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              messages.map((message, i) =>
                message.role === "user" ? (
                  <p key={i} className="ad-from-user">
                    {message.text}
                  </p>
                ) : (
                  <div key={i} className="ad-from-ai">
                    <SparkIcon size={13} />
                    <div>
                      {message.text ? (
                        <Answer
                          text={message.text}
                          sections={sections}
                          onNavigate={inline ? undefined : close}
                          caret={streaming && i === messages.length - 1}
                        />
                      ) : (
                        <p className="ad-thinking">Reading the site…</p>
                      )}

                      {message.sources && message.sources.length > 0 && (
                        <div className="ad-sources">
                          <p className="ad-sources-label">Sources</p>
                          {message.sources.map((source) => (
                            <a
                              key={source.id}
                              href={source.url}
                              className="ad-source"
                              onClick={inline ? undefined : close}
                            >
                              <span>{source.title}</span>
                              {source.kind && <span className="ad-source-kind">{source.kind}</span>}
                              <ArrowOutIcon />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )
            )}

            {error && <p className="ad-error">{error}</p>}

            {streaming && (
              <button type="button" className="ad-stop" onClick={stop}>
                <StopIcon /> Stop
              </button>
            )}
          </div>

          <form
            className="ad-field"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim() && !streaming) submit(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={messages.length ? "Ask a follow-up…" : settings.placeholder}
              aria-label={settings.placeholder}
              maxLength={settings.maxLength}
              disabled={streaming}
            />
            <button
              type="submit"
              className="ad-send"
              data-on={Boolean(draft.trim())}
              disabled={!draft.trim() || streaming}
              aria-label="Send"
            >
              <ArrowUpIcon size={13} />
            </button>
          </form>

          {settings.disclaimer && <p className="ad-disclaimer">{settings.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
