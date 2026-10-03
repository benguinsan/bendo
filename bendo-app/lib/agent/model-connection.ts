import "server-only";
import {
  isAllowedModelEndpoint,
  joinEndpointPath,
  type ModelApiProvider,
} from "@/lib/agent/model-api-key";

export const MODEL_CHAT_PING_TIMEOUT_MS = 15_000;
export const MODEL_LIST_TIMEOUT_MS = 5000;

export type ModelConnectionInput = {
  provider: ModelApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
};

export type ModelConnectionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

const ERROR_INVALID_KEY = "API key không hợp lệ";
const ERROR_NO_CREDIT = "Tài khoản hết credit";
const ERROR_MODEL_MISSING = "Model không tồn tại";
const ERROR_RATE_LIMIT = "Đang bị giới hạn tốc độ, thử lại sau";
const ERROR_PROVIDER = "Provider đang lỗi, thử lại sau";
const ERROR_UNREACHABLE = "Không kết nối được tới endpoint";
const ERROR_REJECTED = "Yêu cầu bị từ chối bởi provider";
const ERROR_ENDPOINT_NOT_ALLOWED = "Endpoint không được phép";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function mapStatusToError(status: number): ModelConnectionResult | null {
  if (status === 401) {
    return { ok: false, error: ERROR_INVALID_KEY, code: "INVALID_API_KEY" };
  }
  if (status === 402) {
    return { ok: false, error: ERROR_NO_CREDIT, code: "NO_CREDIT" };
  }
  if (status === 404) {
    return { ok: false, error: ERROR_MODEL_MISSING, code: "MODEL_NOT_FOUND" };
  }
  if (status === 429) {
    return { ok: false, error: ERROR_RATE_LIMIT, code: "RATE_LIMITED" };
  }
  if (status >= 500 && status <= 599) {
    return { ok: false, error: ERROR_PROVIDER, code: "PROVIDER_ERROR" };
  }
  if (status >= 400 && status <= 499) {
    return { ok: false, error: ERROR_REJECTED, code: "PROVIDER_REJECTED" };
  }
  return null;
}

function bodySuggestsMissingModel(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return (
    lower.includes("model_not_found") ||
    lower.includes("model not found") ||
    lower.includes("does not exist") ||
    lower.includes("invalid model") ||
    lower.includes("no such model")
  );
}

async function readBodyText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseJsonObject(bodyText: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** OpenAI-compatible chat/completions success shape. */
function isOpenAiChatCompletionBody(bodyText: string): boolean {
  const parsed = parseJsonObject(bodyText);
  return parsed !== null && Array.isArray(parsed.choices);
}

/** Gemini generateContent success shape. */
function isGeminiGenerateContentBody(bodyText: string): boolean {
  const parsed = parseJsonObject(bodyText);
  return parsed !== null && Array.isArray(parsed.candidates);
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function assertAllowedProbeUrl(
  provider: ModelApiProvider,
  url: string
): ModelConnectionResult | null {
  if (!isAllowedModelEndpoint(provider, url)) {
    return {
      ok: false,
      error: ERROR_ENDPOINT_NOT_ALLOWED,
      code: "ENDPOINT_NOT_ALLOWED",
    };
  }
  return null;
}

function openAiCompatibleHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function listContainsModel(input: {
  provider: ModelApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
}): Promise<"yes" | "no" | "skip" | ModelConnectionResult> {
  const url = joinEndpointPath(input.endpoint, "models");
  const hostError = assertAllowedProbeUrl(input.provider, url);
  if (hostError) {
    return hostError;
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: openAiCompatibleHeaders(input.apiKey),
      },
      MODEL_LIST_TIMEOUT_MS
    );

    if (isRedirectStatus(response.status)) {
      return {
        ok: false,
        error: ERROR_ENDPOINT_NOT_ALLOWED,
        code: "ENDPOINT_NOT_ALLOWED",
      };
    }

    if (response.status === 401) {
      return { ok: false, error: ERROR_INVALID_KEY, code: "INVALID_API_KEY" };
    }
    if (response.status === 402) {
      return { ok: false, error: ERROR_NO_CREDIT, code: "NO_CREDIT" };
    }
    if (response.status === 429) {
      return { ok: false, error: ERROR_RATE_LIMIT, code: "RATE_LIMITED" };
    }
    if (response.status >= 500) {
      return { ok: false, error: ERROR_PROVIDER, code: "PROVIDER_ERROR" };
    }
    if (!response.ok) {
      return "skip";
    }

    const payload: unknown = await response.json().catch(() => null);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("data" in payload) ||
      !Array.isArray((payload as { data: unknown }).data)
    ) {
      return "skip";
    }

    const ids = (payload as { data: unknown[] }).data
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          typeof (item as { id: unknown }).id === "string"
        ) {
          return (item as { id: string }).id;
        }
        return null;
      })
      .filter((id): id is string => id !== null);

    return ids.includes(input.model) ? "yes" : "no";
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, error: ERROR_UNREACHABLE, code: "UNREACHABLE" };
    }
    return "skip";
  }
}

async function probeOpenAiCompatible(
  input: ModelConnectionInput
): Promise<ModelConnectionResult> {
  const url = joinEndpointPath(input.endpoint, "chat/completions");
  const hostError = assertAllowedProbeUrl(input.provider, url);
  if (hostError) {
    return hostError;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: openAiCompatibleHeaders(input.apiKey),
        body: JSON.stringify({
          model: input.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      },
      MODEL_CHAT_PING_TIMEOUT_MS
    );
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, error: ERROR_UNREACHABLE, code: "UNREACHABLE" };
    }
    return { ok: false, error: ERROR_UNREACHABLE, code: "UNREACHABLE" };
  }

  if (isRedirectStatus(response.status)) {
    return {
      ok: false,
      error: ERROR_ENDPOINT_NOT_ALLOWED,
      code: "ENDPOINT_NOT_ALLOWED",
    };
  }

  const bodyText = await readBodyText(response);

  if (response.ok) {
    if (isOpenAiChatCompletionBody(bodyText)) {
      return { ok: true };
    }
    return { ok: false, error: ERROR_REJECTED, code: "PROVIDER_REJECTED" };
  }

  const mapped = mapStatusToError(response.status);

  if (response.status === 404 || bodySuggestsMissingModel(bodyText)) {
    const listed = await listContainsModel({
      provider: input.provider,
      endpoint: input.endpoint,
      apiKey: input.apiKey,
      model: input.model,
    });
    if (typeof listed === "object") {
      return listed;
    }
    if (listed === "no") {
      return { ok: false, error: ERROR_MODEL_MISSING, code: "MODEL_NOT_FOUND" };
    }
    if (response.status === 404 || bodySuggestsMissingModel(bodyText)) {
      return { ok: false, error: ERROR_MODEL_MISSING, code: "MODEL_NOT_FOUND" };
    }
  }

  if (mapped) {
    return mapped;
  }

  return { ok: false, error: ERROR_REJECTED, code: "PROVIDER_REJECTED" };
}

function geminiGenerateUrl(endpoint: string, model: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/u, "");
  if (trimmed.includes(":generateContent")) {
    return trimmed;
  }
  if (trimmed.includes(`/models/${model}`)) {
    return trimmed.endsWith(":generateContent")
      ? trimmed
      : `${trimmed}:generateContent`;
  }
  return joinEndpointPath(trimmed, `models/${model}:generateContent`);
}

async function probeGemini(
  input: ModelConnectionInput
): Promise<ModelConnectionResult> {
  const url = geminiGenerateUrl(input.endpoint, input.model);
  const hostError = assertAllowedProbeUrl(input.provider, url);
  if (hostError) {
    return hostError;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": input.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      },
      MODEL_CHAT_PING_TIMEOUT_MS
    );
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, error: ERROR_UNREACHABLE, code: "UNREACHABLE" };
    }
    return { ok: false, error: ERROR_UNREACHABLE, code: "UNREACHABLE" };
  }

  if (isRedirectStatus(response.status)) {
    return {
      ok: false,
      error: ERROR_ENDPOINT_NOT_ALLOWED,
      code: "ENDPOINT_NOT_ALLOWED",
    };
  }

  const bodyText = await readBodyText(response);

  if (response.ok) {
    if (isGeminiGenerateContentBody(bodyText)) {
      return { ok: true };
    }
    return { ok: false, error: ERROR_REJECTED, code: "PROVIDER_REJECTED" };
  }

  if (response.status === 404 || bodySuggestsMissingModel(bodyText)) {
    return { ok: false, error: ERROR_MODEL_MISSING, code: "MODEL_NOT_FOUND" };
  }

  const mapped = mapStatusToError(response.status);
  if (mapped) {
    return mapped;
  }

  return { ok: false, error: ERROR_REJECTED, code: "PROVIDER_REJECTED" };
}

/** Minimal connectivity probe using the user-owned provider credentials. */
export function probeModelConnection(
  input: ModelConnectionInput
): Promise<ModelConnectionResult> {
  const endpoint = input.endpoint.trim();
  const apiKey = input.apiKey.trim();
  const model = input.model.trim();

  if (!endpoint || !apiKey || !model) {
    return Promise.resolve({
      ok: false,
      error: "Provider, endpoint, API key, and model are required.",
      code: "VALIDATION",
    });
  }

  if (!isAllowedModelEndpoint(input.provider, endpoint)) {
    return Promise.resolve({
      ok: false,
      error: ERROR_ENDPOINT_NOT_ALLOWED,
      code: "ENDPOINT_NOT_ALLOWED",
    });
  }

  if (input.provider === "gemini") {
    return probeGemini({ ...input, endpoint, apiKey, model });
  }

  return probeOpenAiCompatible({ ...input, endpoint, apiKey, model });
}
