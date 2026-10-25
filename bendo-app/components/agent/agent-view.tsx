"use client";

import { useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/agent/chat-composer";
import { ChatHeader } from "@/components/agent/chat-header";
import { ChatMessageList } from "@/components/agent/chat-message-list";
import { ModelApiKeyDialog } from "@/components/agent/model-api-key-dialog";
import {
  fetchAgentBridgeStatus,
  type AgentBridgeStatusClientResult,
} from "@/lib/agent/agent-status-client";
import {
  createDoroWelcomeMessage,
  createUserTextMessage,
} from "@/lib/agent/chat";
import { sendChatTurnViaApi } from "@/lib/agent/chat-api-client";
import {
  mapChatErrorForUser,
  readinessBlockReason,
} from "@/lib/agent/chat-user-errors";
import { doroSoftReplyForChatFailure } from "@/lib/agent/doro-model-soft-replies";
import {
  hasStoredModelApiKey,
  writeStoredModelApiKey,
} from "@/lib/agent/model-api-key";
import { loadDesktopModelConfig } from "@/lib/agent/model-config-desktop";
import type { ChatMessage } from "@/lib/agent/types";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type AgentViewProps = {
  profile: DashboardProfile;
};

type BridgeState = {
  bridgeConfigured: boolean;
  bridgeReachable: boolean | null;
};

async function resolveModelConfigured(): Promise<boolean> {
  if (hasStoredModelApiKey()) {
    return true;
  }
  const desktop = await loadDesktopModelConfig();
  if (desktop) {
    writeStoredModelApiKey(desktop);
    return true;
  }
  return false;
}

export function AgentView({ profile }: AgentViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createDoroWelcomeMessage(),
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [modelConfigured, setModelConfigured] = useState(false);
  const [bridge, setBridge] = useState<BridgeState>({
    bridgeConfigured: false,
    bridgeReachable: null,
  });
  /** Status HTTP/client failure — distinct from confirmed bridgeReachable: false. */
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const turnAbortRef = useRef<AbortController | null>(null);
  const statusAbortRef = useRef<AbortController | null>(null);
  const readinessGenRef = useRef(0);

  function applyStatusResult(
    configured: boolean,
    bridgeResult: AgentBridgeStatusClientResult
  ) {
    setModelConfigured(configured);
    if (!bridgeResult.ok) {
      // Request/auth/parse failure — do not pretend the bridge was probed offline.
      setStatusCheckError(bridgeResult.error);
      setChecking(false);
      return;
    }
    setStatusCheckError(null);
    setBridge(bridgeResult.status);
    setChecking(false);
  }

  async function runReadinessCheck(options?: { markChecking?: boolean }) {
    if (options?.markChecking) {
      setChecking(true);
      setStatusCheckError(null);
    }
    readinessGenRef.current += 1;
    const gen = readinessGenRef.current;
    statusAbortRef.current?.abort();
    const controller = new AbortController();
    statusAbortRef.current = controller;

    const [configured, bridgeResult] = await Promise.all([
      resolveModelConfigured(),
      fetchAgentBridgeStatus(controller.signal),
    ]);

    if (gen !== readinessGenRef.current || controller.signal.aborted) {
      return;
    }

    applyStatusResult(configured, bridgeResult);
  }

  const runReadinessCheckRef = useRef(runReadinessCheck);

  useEffect(() => {
    runReadinessCheckRef.current = runReadinessCheck;
  });

  // Pattern A: initial check + refresh when the tab becomes visible again.
  useEffect(() => {
    void (async () => {
      readinessGenRef.current += 1;
      const gen = readinessGenRef.current;
      const controller = new AbortController();
      statusAbortRef.current = controller;

      const [configured, bridgeResult] = await Promise.all([
        resolveModelConfigured(),
        fetchAgentBridgeStatus(controller.signal),
      ]);

      if (gen !== readinessGenRef.current || controller.signal.aborted) {
        return;
      }

      setModelConfigured(configured);
      if (!bridgeResult.ok) {
        setStatusCheckError(bridgeResult.error);
        setChecking(false);
        return;
      }
      setStatusCheckError(null);
      setBridge(bridgeResult.status);
      setChecking(false);
    })();

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }
      void runReadinessCheckRef.current({ markChecking: true });
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      readinessGenRef.current += 1;
      turnAbortRef.current?.abort();
      statusAbortRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const errorContext = {
    bridgeConfigured: bridge.bridgeConfigured,
    bridgeReachable: bridge.bridgeReachable,
    modelConfigured,
    statusCheckError,
  };

  const blockReason = checking
    ? "Checking Agent…"
    : readinessBlockReason(errorContext);

  const composerBlocked = pending || Boolean(blockReason);

  async function handleSend(body: string) {
    if (pending || blockReason) {
      return;
    }

    const userMessage = createUserTextMessage(body);
    setMessages((current) => [...current, userMessage]);
    setPending(true);
    setError(null);

    turnAbortRef.current?.abort();
    const controller = new AbortController();
    turnAbortRef.current = controller;

    const result = await sendChatTurnViaApi({
      message: body,
      sessionId,
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      setPending(false);
      return;
    }

    if (!result.ok) {
      const softBody = doroSoftReplyForChatFailure({
        error: result.error,
        code: result.code,
      });
      if (softBody) {
        // Provider/model issues → Doro bubble (same idea as harness soft replies).
        const softReply: ChatMessage = {
          id: `msg-doro-soft-${crypto.randomUUID()}`,
          role: "agent",
          kind: "text",
          createdAt: new Date().toISOString(),
          body: softBody,
        };
        setMessages((current) => [...current, softReply]);
        setError(null);
        setPending(false);
        return;
      }

      setError(
        mapChatErrorForUser(
          { error: result.error, code: result.code },
          errorContext
        )
      );
      setPending(false);
      void runReadinessCheck({ markChecking: true });
      return;
    }

    // Soft missing-model (and other harness soft) replies stay as Doro bubbles.
    setSessionId(result.sessionId);
    setMessages((current) => [...current, result.reply]);
    setPending(false);
  }

  return (
    <div className="flex h-[calc(100svh-100px)] min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="bg-card shadow-panel rounded-card border-border/40 flex min-h-0 flex-1 flex-col border px-4 py-4 sm:px-6 sm:py-5">
        <ChatHeader
          bridgeConfigured={bridge.bridgeConfigured}
          bridgeReachable={bridge.bridgeReachable}
          modelConfigured={modelConfigured}
          statusCheckError={statusCheckError}
          checking={checking}
          onOpenModelConfig={() => setApiKeyOpen(true)}
          onCheckAgain={() => {
            void runReadinessCheck({ markChecking: true });
          }}
        />
        <ChatMessageList messages={messages} profile={profile} />
        {pending ? (
          <p className="text-muted-foreground px-1 pt-1 text-xs">
            Doro is typing…
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive px-1 pt-1 text-xs" role="alert">
            {error}
          </p>
        ) : null}
        <ChatComposer
          onSend={handleSend}
          disabled={composerBlocked}
          blockedHint={pending ? null : blockReason}
        />
      </div>
      <ModelApiKeyDialog
        open={apiKeyOpen}
        onOpenChange={setApiKeyOpen}
        onSaved={() => {
          setModelConfigured(true);
          void runReadinessCheck({ markChecking: true });
        }}
      />
    </div>
  );
}
