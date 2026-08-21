import {
  ask,
  encodeEvent,
  memoryRateLimit,
  NDJSON_CONTENT_TYPE,
  type EngineConfig,
  type RateLimit,
  type Turn,
} from "@askdock/core";

/**
 * The server half. This file only ever runs on your server, which is the
 * point: the provider key is read from the environment here and never reaches
 * the browser. The widget knows one thing about your setup — the URL it posts
 * to.
 *
 *   // app/api/askdock/route.ts
 *   import { createAskdockHandler } from "@askdock/server";
 *   import corpus from "../../../.askdock/corpus.json";
 *
 *   const handler = createAskdockHandler({
 *     model: { model: "google/gemini-flash-latest" }, // key from env
 *     corpus,
 *     persona: { name: "Acme AI", fallbackHref: "/contact" },
 *   });
 *
 *   export const POST = handler;
 *   export const maxDuration = 60;
 */

export interface HandlerConfig extends EngineConfig {
  /** `false` turns it off — do that only behind your own limiter. */
  rateLimit?: RateLimit | false;
  /**
   * Origins allowed to call this endpoint cross-site. Leave it unset for a
   * same-origin widget, which is the normal case and needs no CORS at all.
   * `"*"` opens the endpoint — and your API bill — to any page on the web.
   */
  allowedOrigins?: string[] | "*";
  /** Last word on who may ask. Return false to reject before a token is spent. */
  authorize?: (req: Request) => boolean | Promise<boolean>;
}

function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function corsHeaders(req: Request, allowed: HandlerConfig["allowedOrigins"]): HeadersInit {
  if (!allowed) return {};
  const origin = req.headers.get("origin");
  if (!origin) return {};

  const ok = allowed === "*" || allowed.includes(origin);
  if (!ok) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function createAskdockHandler(config: HandlerConfig) {
  const limiter =
    config.rateLimit === false ? null : (config.rateLimit ?? memoryRateLimit());

  return async function handler(req: Request): Promise<Response> {
    const cors = corsHeaders(req, config.allowedOrigins);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return json({ error: "Use POST." }, 405, cors);
    }

    if (config.authorize && !(await config.authorize(req))) {
      return json({ error: "Not allowed." }, 403, cors);
    }

    if (limiter && !(await limiter.check(clientKey(req)))) {
      return json({ error: "That's a lot of questions at once — give it a minute." }, 429, cors);
    }

    const body = (await req.json().catch(() => ({}))) as {
      question?: unknown;
      history?: unknown;
    };
    const question = String(body.question ?? "").trim();
    if (!question) return json({ error: "Ask me something." }, 400, cors);

    const history = Array.isArray(body.history) ? (body.history as Turn[]) : [];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of ask(config, { question, history, signal: req.signal })) {
            controller.enqueue(encoder.encode(encodeEvent(event)));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": NDJSON_CONTENT_TYPE,
        "Cache-Control": "no-store",
        // Nginx and friends buffer by default, which kills the streaming.
        "X-Accel-Buffering": "no",
      },
    });
  };
}

function json(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export type { EngineConfig, RateLimit } from "@askdock/core";
export { memoryRateLimit } from "@askdock/core";
