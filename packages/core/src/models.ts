import type { LanguageModel } from "ai";

/**
 * Any model, any key, one string.
 *
 * `"google/gemini-flash-latest"`, `"anthropic/claude-sonnet-4-5"`,
 * `"openai/gpt-5"` — the prefix picks the provider package, the rest is
 * whatever that provider calls its model. Nothing here is a hardcoded list of
 * model names: providers ship new ones weekly and an allowlist would only go
 * stale in someone else's repo.
 *
 * The provider packages are optional peer dependencies, so a site that only
 * ever calls Gemini installs `@ai-sdk/google` and nothing else. They are
 * imported lazily for the same reason.
 *
 * The key is read on the server and stays there — see `@askdock/server`.
 */

export type ProviderId = "google" | "anthropic" | "openai" | "gateway" | "openai-compatible";

export interface ModelSpec {
  /**
   * `"provider/model"`, a bare model id when `provider` is set, or an
   * already-built AI SDK model when you want a provider this file has never
   * heard of.
   */
  model: string | LanguageModel;
  provider?: ProviderId;
  /** The visitor never sees this. It is read from the server environment. */
  apiKey?: string;
  /** For self-hosted or proxied endpoints (Ollama, LiteLLM, OpenRouter…). */
  baseURL?: string;
  headers?: Record<string, string>;
}

export function parseModel(spec: ModelSpec & { model: string }): {
  provider: ProviderId;
  model: string;
} {
  if (spec.provider) return { provider: spec.provider, model: spec.model };

  const slash = spec.model.indexOf("/");
  if (slash === -1) {
    throw new Error(
      `Model "${spec.model}" has no provider. Write it as "provider/model" — e.g. "google/gemini-flash-latest" — or set \`provider\`.`
    );
  }

  const provider = spec.model.slice(0, slash) as ProviderId;
  return { provider, model: spec.model.slice(slash + 1) };
}

/** Env var each provider reads when the config leaves `apiKey` empty. */
export const API_KEY_ENV: Record<Exclude<ProviderId, "gateway">, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  "openai-compatible": "OPENAI_API_KEY",
};

async function load(name: string, provider: string): Promise<Record<string, unknown>> {
  try {
    // The specifier is a variable so that installing one provider does not
    // drag the other two in. The ignore comments keep bundlers from trying to
    // resolve it at build time — this file only ever runs on your server.
    return (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ name
    )) as Record<string, unknown>;
  } catch {
    throw new Error(
      `The "${provider}" provider needs ${name}. Install it: npm i ${name}`
    );
  }
}

export async function resolveModel(spec: ModelSpec): Promise<LanguageModel> {
  // Already a model instance: someone brought their own provider package.
  if (typeof spec.model !== "string") return spec.model;

  const { provider, model } = parseModel(spec as ModelSpec & { model: string });
  const settings = { apiKey: spec.apiKey, baseURL: spec.baseURL, headers: spec.headers };

  switch (provider) {
    case "google": {
      const { createGoogle } = await load("@ai-sdk/google", provider);
      return (createGoogle as CallableFunction)(settings)(model) as LanguageModel;
    }
    case "anthropic": {
      const { createAnthropic } = await load("@ai-sdk/anthropic", provider);
      return (createAnthropic as CallableFunction)(settings)(model) as LanguageModel;
    }
    case "openai": {
      const { createOpenAI } = await load("@ai-sdk/openai", provider);
      return (createOpenAI as CallableFunction)(settings)(model) as LanguageModel;
    }
    case "openai-compatible": {
      if (!spec.baseURL) throw new Error('provider "openai-compatible" needs a baseURL.');
      const { createOpenAI } = await load("@ai-sdk/openai", provider);
      return (createOpenAI as CallableFunction)(settings)(model) as LanguageModel;
    }
    /**
     * Vercel AI Gateway: the `ai` package resolves a bare "provider/model"
     * string itself, against AI_GATEWAY_API_KEY (or OIDC on Vercel). One key,
     * every provider, with failover — the least-configuration option when the
     * site already deploys there.
     */
    case "gateway":
      return (spec.model as string).includes("/") ? (spec.model as string) : `${provider}/${model}`;
    default:
      throw new Error(
        `Unknown provider "${provider}". Use google, anthropic, openai, openai-compatible or gateway.`
      );
  }
}
