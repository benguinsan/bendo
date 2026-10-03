export const MODEL_API_PROVIDERS = [
  "openrouter",
  "vilao",
  "gpt",
  "gemini",
] as const;

export type ModelApiProvider = (typeof MODEL_API_PROVIDERS)[number];

export type StoredModelApiKey = {
  provider: ModelApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
};

const STORAGE_KEY = "bendo.agent.modelApiKey";

export const MODEL_API_PROVIDER_LABELS: Record<ModelApiProvider, string> = {
  openrouter: "OpenRouter",
  vilao: "Vilao",
  gpt: "GPT",
  gemini: "Gemini",
};

export type ModelApiProviderDefaults = {
  endpoint: string;
  model: string;
};

export const MODEL_API_PROVIDER_DEFAULTS: Record<
  ModelApiProvider,
  ModelApiProviderDefaults
> = {
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
  },
  vilao: {
    endpoint: "https://api.vilao.ai/v1",
    model: "gpt-4o-mini",
  },
  gpt: {
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
};

export type ModelApiProviderInstructions = {
  summary: string;
  steps: readonly string[];
  billingNote: string;
  docsUrl: string;
};

export const MODEL_API_PROVIDER_INSTRUCTIONS: Record<
  ModelApiProvider,
  ModelApiProviderInstructions
> = {
  openrouter: {
    summary:
      "Create an OpenRouter API key in your own account, then paste endpoint, model id, and key below.",
    steps: [
      "Open openrouter.ai and sign in (or create an account).",
      "Go to Keys (openrouter.ai/keys) and create a new API key.",
      "Copy the key, confirm the API base URL and a model id from OpenRouter’s model list.",
      "Paste endpoint, model name, and key into the fields below.",
    ],
    billingNote:
      "This key belongs to you. OpenRouter bills usage to your OpenRouter account — Bendo does not supply or store a shared OpenRouter key.",
    docsUrl: "https://openrouter.ai/keys",
  },
  vilao: {
    summary:
      "Create a Vilao API key from your Vilao dashboard, then paste endpoint, model id, and key below.",
    steps: [
      "Open vilao.ai and sign in to your account.",
      "Open your account or API settings and create a new API key.",
      "Copy the key and note Vilao’s OpenAI-compatible base URL and model id.",
      "Paste endpoint, model name, and key into the fields below.",
    ],
    billingNote:
      "This key belongs to you. Vilao bills model usage to your Vilao account — Bendo does not supply a shared Vilao key.",
    docsUrl: "https://vilao.ai/",
  },
  gpt: {
    summary:
      "Create an OpenAI (GPT) secret key, then paste endpoint, model id, and key below.",
    steps: [
      "Open platform.openai.com and sign in.",
      "Go to API keys (platform.openai.com/api-keys) and create a new secret key.",
      "Copy the key immediately (OpenAI shows it only once).",
      "Use the OpenAI API base URL and a model id such as gpt-4o-mini.",
    ],
    billingNote:
      "This key belongs to you. OpenAI bills GPT usage to your OpenAI account — Bendo does not supply a shared OpenAI key.",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    summary:
      "Create a Google AI Studio (Gemini) API key, then paste endpoint, model id, and key below.",
    steps: [
      "Open Google AI Studio (aistudio.google.com) and sign in with Google.",
      "Open Get API key / API keys and create a new key for your project.",
      "Copy the key and pick a Gemini model id from AI Studio.",
      "Paste the Generative Language API base URL, model name, and key below.",
    ],
    billingNote:
      "This key belongs to you. Google bills Gemini usage to your Google account/project — Bendo does not supply a shared Gemini key.",
    docsUrl: "https://aistudio.google.com/apikey",
  },
};

export function isModelApiProvider(value: string): value is ModelApiProvider {
  return (MODEL_API_PROVIDERS as readonly string[]).includes(value);
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Join base endpoint with a path without duplicating a trailing segment. */
export function joinEndpointPath(endpoint: string, path: string): string {
  const base = endpoint.trim().replace(/\/+$/u, "");
  const suffix = path.replace(/^\/+/u, "");
  if (base.endsWith(`/${suffix}`) || base.endsWith(suffix)) {
    return base;
  }
  return `${base}/${suffix}`;
}

function parseStoredValue(raw: string): StoredModelApiKey | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const { provider, endpoint, apiKey, model } = parsed as {
      provider: unknown;
      endpoint: unknown;
      apiKey: unknown;
      model: unknown;
    };

    if (
      typeof provider !== "string" ||
      !isModelApiProvider(provider) ||
      typeof endpoint !== "string" ||
      typeof apiKey !== "string" ||
      typeof model !== "string"
    ) {
      return null;
    }

    const trimmedEndpoint = endpoint.trim();
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();

    if (
      !trimmedEndpoint ||
      !trimmedKey ||
      !trimmedModel ||
      !isAbsoluteHttpUrl(trimmedEndpoint)
    ) {
      return null;
    }

    return {
      provider,
      endpoint: trimmedEndpoint,
      apiKey: trimmedKey,
      model: trimmedModel,
    };
  } catch {
    return null;
  }
}

/** Read the session-only user model config. Browser-only; returns null on server. */
export function readStoredModelApiKey(): StoredModelApiKey | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseStoredValue(raw);
  } catch {
    return null;
  }
}

/** Persist full model config for this browser tab session only. */
export function writeStoredModelApiKey(value: StoredModelApiKey): void {
  if (typeof window === "undefined") {
    return;
  }

  const endpoint = value.endpoint.trim();
  const apiKey = value.apiKey.trim();
  const model = value.model.trim();

  if (
    !apiKey ||
    !model ||
    !isModelApiProvider(value.provider) ||
    !isAbsoluteHttpUrl(endpoint)
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: value.provider,
        endpoint,
        apiKey,
        model,
      })
    );
  } catch {
    // sessionStorage may be unavailable; fail silently
  }
}

/** Remove the session-only stored config. */
export function clearStoredModelApiKey(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable; fail silently
  }
}

/** Mask for UI status only — never log the raw key. */
export function maskModelApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
