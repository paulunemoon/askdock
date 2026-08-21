"use client";

import { createEventParser, type AskEvent, type Citation } from "@askdock/core";
import { useCallback, useRef, useState } from "react";

export interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Citation[];
}

export interface UseAskdockOptions {
  endpoint: string;
  /** Turns sent back as context. The server trims again; this saves bandwidth. */
  maxHistory?: number;
  /** Merged into the POST — a session id, a locale, a tenant. */
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * The widget without the widget: state, streaming, cancellation. Use it when
 * you want the conversation somewhere the shipped UI can't go — inside your
 * own layout, a command palette, a docs sidebar.
 */
export function useAskdock({ endpoint, maxHistory = 12, body, headers }: UseAskdockOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setError("");
  }, [stop]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || abortRef.current) return;

      setError("");
      // Two at once: the question, and the empty turn the answer streams into.
      setMessages((prev) => [
        ...prev,
        { role: "user", text: q },
        { role: "assistant", text: "" },
      ]);
      setStreaming(true);

      const history = messages
        .slice(-maxHistory)
        .map(({ role, text }) => ({ role, text }));

      const controller = new AbortController();
      abortRef.current = controller;

      /** Rewrite the trailing assistant turn as the answer arrives. */
      const patch = (fn: (m: Message) => Message) =>
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)));

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ question: q, history, ...body }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "The assistant is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parse = createEventParser();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const event of parse(decoder.decode(value, { stream: true }))) {
            applyEvent(event, patch, setError);
          }
        }
      } catch (err) {
        const error = err as Error;
        if (error.name === "AbortError") return;
        /**
         * A rejected fetch means the request never landed — the server is
         * down, the endpoint is wrong, or something between the two dropped
         * it. The browser's own wording for that is "Failed to fetch", which
         * tells a visitor nothing and sends a developer looking in the wrong
         * place.
         */
        setError(
          error instanceof TypeError
            ? "Couldn't reach the assistant. It may be offline — try again in a moment."
            : error.message
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
        // A question that produced nothing shouldn't leave an empty bubble.
        setMessages((prev) =>
          prev.filter(
            (m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.text)
          )
        );
      }
    },
    [body, endpoint, headers, maxHistory, messages]
  );

  return { messages, streaming, error, ask, stop, reset };
}

function applyEvent(
  event: AskEvent,
  patch: (fn: (m: Message) => Message) => void,
  setError: (value: string) => void
) {
  switch (event.type) {
    case "text":
      patch((m) => ({ ...m, text: m.text + event.value }));
      break;
    case "sources":
      patch((m) => ({ ...m, sources: event.value }));
      break;
    case "error":
      setError(event.value);
      break;
    case "done":
      break;
  }
}
