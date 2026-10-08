"use client";

import { ZapIcon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  isAllowedModelEndpoint,
  isModelApiProvider,
  maskModelApiKey,
  MODEL_API_PROVIDER_DEFAULTS,
  MODEL_API_PROVIDER_INSTRUCTIONS,
  MODEL_API_PROVIDER_LABELS,
  MODEL_API_PROVIDERS,
  readStoredModelApiKey,
  writeStoredModelApiKey,
  type ModelApiProvider,
} from "@/lib/agent/model-api-key";
import { applyModelConfigViaApi } from "@/lib/agent/model-config-api-client";
import { testModelConnectionViaApi } from "@/lib/agent/model-connection-api-client";
import { cn } from "@/lib/utils";

type ModelApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const selectClassName = cn(
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
);

type FormErrors = {
  endpoint?: string;
  apiKey?: string;
  model?: string;
};

function readInitialFormState(): {
  provider: ModelApiProvider;
  endpoint: string;
  model: string;
  savedMask: string | null;
  savedApiKey: string | null;
} {
  const stored = readStoredModelApiKey();
  if (!stored) {
    const defaults = MODEL_API_PROVIDER_DEFAULTS.openrouter;
    return {
      provider: "openrouter",
      endpoint: defaults.endpoint,
      model: defaults.model,
      savedMask: null,
      savedApiKey: null,
    };
  }
  return {
    provider: stored.provider,
    endpoint: stored.endpoint,
    model: stored.model,
    savedMask: maskModelApiKey(stored.apiKey),
    savedApiKey: stored.apiKey,
  };
}

function ModelApiKeyForm({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const providerId = useId();
  const endpointId = useId();
  const keyId = useId();
  const modelId = useId();

  const [provider, setProvider] = useState<ModelApiProvider>(
    () => readInitialFormState().provider
  );
  const [endpoint, setEndpoint] = useState(
    () => readInitialFormState().endpoint
  );
  const [model, setModel] = useState(() => readInitialFormState().model);
  const [apiKey, setApiKey] = useState("");
  const [savedMask, setSavedMask] = useState<string | null>(
    () => readInitialFormState().savedMask
  );
  const [savedApiKey, setSavedApiKey] = useState<string | null>(
    () => readInitialFormState().savedApiKey
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<
    { kind: "success" } | { kind: "error"; message: string } | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const instructions = MODEL_API_PROVIDER_INSTRUCTIONS[provider];

  function resolveApiKeyForAction(): string | null {
    const typed = apiKey.trim();
    if (typed) {
      return typed;
    }
    return savedApiKey?.trim() || null;
  }

  function validateFields(requireKeyInInput: boolean): FormErrors {
    const next: FormErrors = {};
    const trimmedEndpoint = endpoint.trim();
    const trimmedModel = model.trim();
    const resolvedKey = resolveApiKeyForAction();

    if (!trimmedEndpoint) {
      next.endpoint = "API endpoint is required.";
    } else if (!isAllowedModelEndpoint(provider, trimmedEndpoint)) {
      next.endpoint = "Endpoint không được phép.";
    }

    if (!trimmedModel) {
      next.model = "Model name is required.";
    }

    if (requireKeyInInput) {
      if (!apiKey.trim() && !savedApiKey) {
        next.apiKey = "API key is required.";
      }
    } else if (!resolvedKey) {
      next.apiKey = "API key is required.";
    }

    return next;
  }

  function handleProviderChange(next: ModelApiProvider) {
    setProvider(next);
    const defaults = MODEL_API_PROVIDER_DEFAULTS[next];
    const stored = readStoredModelApiKey();

    // Always clear the typed key when switching providers so a key is never
    // sent to a different provider host.
    setApiKey("");
    setErrors({});
    setTestStatus(null);
    setSaveError(null);

    if (stored?.provider === next) {
      setEndpoint(stored.endpoint);
      setModel(stored.model);
      setSavedMask(maskModelApiKey(stored.apiKey));
      setSavedApiKey(stored.apiKey);
      return;
    }

    setEndpoint(defaults.endpoint);
    setModel(defaults.model);
    setSavedMask(null);
    setSavedApiKey(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFields(true);
    if (nextErrors.endpoint || nextErrors.model || nextErrors.apiKey) {
      setErrors(nextErrors);
      setSaveError(null);
      return;
    }

    const keyToSave = apiKey.trim() || savedApiKey?.trim();
    if (!keyToSave) {
      setErrors({ apiKey: "API key is required." });
      return;
    }

    const payload = {
      provider,
      endpoint: endpoint.trim(),
      apiKey: keyToSave,
      model: model.trim(),
    };

    setSaving(true);
    setErrors({});
    setSaveError(null);
    setTestStatus(null);

    // Interim client cache for this browser session (durable userData later).
    writeStoredModelApiKey(payload);

    const applyResult = await applyModelConfigViaApi(payload);
    setSaving(false);

    if (!applyResult.ok) {
      setSaveError(applyResult.error);
      return;
    }

    setSavedMask(maskModelApiKey(keyToSave));
    setSavedApiKey(keyToSave);
    setApiKey("");
    onOpenChange(false);
  }

  async function handleTestConnection() {
    const nextErrors = validateFields(false);
    if (nextErrors.endpoint || nextErrors.model || nextErrors.apiKey) {
      setErrors(nextErrors);
      setTestStatus(null);
      return;
    }

    const keyToTest = resolveApiKeyForAction();
    if (!keyToTest) {
      setErrors({ apiKey: "API key is required." });
      return;
    }

    setTesting(true);
    setErrors({});
    setTestStatus(null);

    const result = await testModelConnectionViaApi({
      provider,
      endpoint: endpoint.trim(),
      apiKey: keyToTest,
      model: model.trim(),
    });

    setTesting(false);

    if (result.ok) {
      setTestStatus({ kind: "success" });
      return;
    }

    setTestStatus({ kind: "error", message: result.error });
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="bg-card rounded-card flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-6 overflow-y-auto p-6 sm:max-w-lg sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <DialogTitle className="font-sans text-base font-medium">
            Model configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Add your own provider endpoint, model, and API key for Agent chat.
            Save applies the config to the local Agent; values also stay in this
            browser session until durable local persist ships.
          </DialogDescription>
        </div>
        <DialogClose
          render={<Button type="button" variant="link" className="underline" />}
        >
          Close
        </DialogClose>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-border flex flex-col gap-6 rounded-lg border p-4 sm:p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={providerId}>Provider</FieldLabel>
              <select
                id={providerId}
                name="provider"
                value={provider}
                className={selectClassName}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isModelApiProvider(next)) {
                    handleProviderChange(next);
                  }
                }}
              >
                {MODEL_API_PROVIDERS.map((value) => (
                  <option key={value} value={value}>
                    {MODEL_API_PROVIDER_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="bg-muted/40 flex flex-col gap-3 rounded-lg p-3">
              <p className="text-foreground text-sm font-medium">
                How to get a {MODEL_API_PROVIDER_LABELS[provider]} key
              </p>
              <p className="text-muted-foreground text-sm">
                {instructions.summary}
              </p>
              <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
                {instructions.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="text-muted-foreground text-sm">
                {instructions.billingNote}
              </p>
              <a
                href={instructions.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm underline underline-offset-4"
              >
                Open {MODEL_API_PROVIDER_LABELS[provider]} key page
              </a>
            </div>

            <Field data-invalid={errors.endpoint ? true : undefined}>
              <FieldLabel htmlFor={endpointId}>API endpoint</FieldLabel>
              <Input
                id={endpointId}
                name="endpoint"
                type="url"
                autoComplete="off"
                spellCheck={false}
                value={endpoint}
                placeholder="https://..."
                aria-invalid={Boolean(errors.endpoint)}
                className="h-10"
                onChange={(event) => {
                  setEndpoint(event.target.value);
                  setTestStatus(null);
                  if (errors.endpoint) {
                    setErrors((current) => ({
                      ...current,
                      endpoint: undefined,
                    }));
                  }
                }}
              />
              <FieldError>{errors.endpoint}</FieldError>
            </Field>

            <Field data-invalid={errors.model ? true : undefined}>
              <FieldLabel htmlFor={modelId}>Model name</FieldLabel>
              <Input
                id={modelId}
                name="model"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={model}
                placeholder="Model id"
                aria-invalid={Boolean(errors.model)}
                className="h-10"
                onChange={(event) => {
                  setModel(event.target.value);
                  setTestStatus(null);
                  if (errors.model) {
                    setErrors((current) => ({ ...current, model: undefined }));
                  }
                }}
              />
              <FieldError>{errors.model}</FieldError>
            </Field>

            <Field data-invalid={errors.apiKey ? true : undefined}>
              <FieldLabel htmlFor={keyId}>API key</FieldLabel>
              <Input
                id={keyId}
                name="apiKey"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                placeholder={
                  savedMask
                    ? `Saved: ${savedMask} — enter a new key to replace`
                    : "Paste your API key"
                }
                aria-invalid={Boolean(errors.apiKey)}
                className="h-10"
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setTestStatus(null);
                  if (errors.apiKey) {
                    setErrors((current) => ({ ...current, apiKey: undefined }));
                  }
                }}
              />
              {savedMask && !apiKey ? (
                <FieldDescription>
                  A key is set for this session ({savedMask}). Enter a new key
                  to replace it.
                </FieldDescription>
              ) : null}
              <FieldError>{errors.apiKey}</FieldError>
            </Field>
          </FieldGroup>

          {testStatus?.kind === "success" ? (
            <output className="block text-sm text-emerald-700">
              Kết nối thành công
            </output>
          ) : null}
          {testStatus?.kind === "error" ? (
            <p className="text-destructive text-sm" role="alert">
              {testStatus.message}
            </p>
          ) : null}
          {saveError ? (
            <p className="text-destructive text-sm" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              className="min-w-24 px-8"
              disabled={saving || testing}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="min-w-24 px-8"
              disabled={testing || saving}
              onClick={() => {
                void handleTestConnection();
              }}
            >
              <ZapIcon data-icon="inline-start" />
              {testing ? "Testing…" : "Test connection"}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

export function ModelApiKeyDialog({
  open,
  onOpenChange,
}: ModelApiKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ModelApiKeyForm onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}
