"use client";

import { ChevronDown, Maximize2, SendHorizontal, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { ChatbotLottie } from "@/components/chatbot-lottie";
import { ResearchResponse } from "@/lib/api";
import { AGENT_STAGES } from "@/lib/agents";

type AgentActivity = {
  id: string;
  action: string;
  status: "live" | "done";
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isLoading?: boolean;
};

type FloatingAgentLauncherProps = {
  isRunning: boolean;
  result: ResearchResponse | null;
  onOpenResearchWorkspace: (nextQuery?: string) => void;
  onSubmitQuery: (query: string) => Promise<ResearchResponse | null>;
};

export function FloatingAgentLauncher({
  isRunning,
  result,
  onOpenResearchWorkspace,
  onSubmitQuery,
}: FloatingAgentLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [liveStepIndex, setLiveStepIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const miniChatRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I am your AI research assistant. Ask about companies, news, filings, or comparisons directly in this mini chat.",
    },
  ]);
  const activeTools = new Set(result?.plan.tools ?? []);
  const liveAgents = isRunning
    ? AGENT_STAGES
    : result
      ? AGENT_STAGES.filter((stage) => !stage.tool || activeTools.has(stage.tool))
      : AGENT_STAGES;
  const effectiveLiveStepIndex = isRunning ? liveStepIndex : 0;
  const activeLiveAgent = liveAgents[effectiveLiveStepIndex % liveAgents.length] ?? AGENT_STAGES[0];
  const runningActivityFeed = AGENT_STAGES.slice(0, 4).map((_, offset) => {
    const index = effectiveLiveStepIndex - offset;
    const stage =
      AGENT_STAGES[((index % AGENT_STAGES.length) + AGENT_STAGES.length) % AGENT_STAGES.length];

    return {
      id: `live-${stage.shortName}-${effectiveLiveStepIndex}-${offset}`,
      action: stage.shortAction,
      status: offset === 0 ? ("live" as const) : ("done" as const),
    };
  });
  const completedActivityFeed = result
    ? AGENT_STAGES.filter((stage) => !stage.tool || activeTools.has(stage.tool))
        .map((stage) => ({
          id: `done-${stage.shortName}`,
          action: stage.shortAction,
          status: "done" as const,
        }))
        .slice(-4)
        .reverse()
    : [];
  const visibleActivityFeed: AgentActivity[] = isRunning
    ? runningActivityFeed
    : completedActivityFeed;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setLiveStepIndex((current) => current + 1);
    }, 1450);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    const element = miniChatRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 110) {
      scrollMiniChatToBottom("smooth");
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages]);

  function scrollMiniChatToBottom(behavior: ScrollBehavior = "smooth") {
    miniChatRef.current?.scrollTo({
      top: miniChatRef.current.scrollHeight,
      behavior,
    });
    setShowJumpToLatest(false);
  }

  function handleMiniChatScroll() {
    const element = miniChatRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 80);
  }

  function getMessageId(prefix: string) {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
  }

  function getMiniSummary(nextResult: ResearchResponse) {
    const symbols = nextResult.plan.symbols.join(", ");
    const summary = nextResult.executive_summary || nextResult.insights[0]?.body;
    const cleanSummary = summary.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    const trimmedSummary =
      cleanSummary.length > 420 ? `${cleanSummary.slice(0, 420)}...` : cleanSummary;

    return `${symbols ? `${symbols}: ` : ""}${trimmedSummary} Open Research Studio for charts, sources, and save options.`;
  }

  async function handleMiniSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = draft.trim();
    if (!nextQuery || isRunning) {
      return;
    }

    const pendingId = getMessageId("assistant-pending");
    setDraft("");
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: getMessageId("user"), role: "user", text: nextQuery },
      {
        id: pendingId,
        role: "assistant",
        text: "Researching",
        isLoading: true,
      },
    ]);

    const nextResult = await onSubmitQuery(nextQuery);
    if (nextResult) {
      sessionStorage.setItem("klypup.research.lastResult", JSON.stringify(nextResult));
    }

    setMessages((currentMessages) => [
      ...currentMessages.filter((message) => message.id !== pendingId),
      {
        id: getMessageId("assistant-result"),
        role: "assistant",
        text: nextResult
          ? getMiniSummary(nextResult)
          : "Try again",
      },
    ]);
  }

  function TypingLoader() {
    return (
      <span className="typing-loader" aria-label="Loading">
        <span />
        <span />
        <span />
      </span>
    );
  }

  function openResearchWorkspace() {
    onOpenResearchWorkspace(draft.trim() || result?.query);
    setIsOpen(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <aside className="agent-mini-window mb-4 max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-[410px] overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="agent-mini-avatar">
                <ChatbotLottie className="h-16 w-16" />
              </div>
              <div>
                <p className="eyebrow mb-1">Mini research chat</p>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Klypup AI assistant
                </h2>
                {isRunning ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">{activeLiveAgent.shortAction}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-secondary min-h-9 px-3 py-2"
              aria-label="Close agent window"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {visibleActivityFeed.length > 0 ? (
            <div className="agent-action-feed mt-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {isRunning ? "Working now" : "Latest run"}
                </p>
                <span className={isRunning ? "agent-action-state is-live" : "agent-action-state"}>
                  {isRunning ? "Live" : "Complete"}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {visibleActivityFeed.slice(0, 4).map((item, index) => (
                  <div
                    key={item.id}
                    className={
                      isRunning && index === 0
                        ? "agent-action-item is-live"
                        : "agent-action-item"
                    }
                  >
                    <span className="agent-action-dot" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                        {item.action}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {item.status === "live" ? "Working" : "Done"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative mt-3 overflow-hidden rounded-[1.15rem]">
            <div
              ref={miniChatRef}
              onScroll={handleMiniChatScroll}
              className="agent-chat-stream max-h-48"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.isLoading
                      ? "max-w-[88%] self-start px-1 py-1 text-sm font-semibold text-[var(--foreground)]"
                      : message.role === "user"
                        ? "agent-chat-bubble is-user"
                        : "agent-chat-bubble"
                  }
                >
                  {message.isLoading ? (
                    <span className="inline-flex items-center gap-2 font-semibold">
                      {message.text}
                      <TypingLoader />
                    </span>
                  ) : (
                    message.text
                  )}
                </div>
              ))}
            </div>
            {showJumpToLatest ? (
              <button
                type="button"
                onClick={() => scrollMiniChatToBottom()}
                className="chat-jump-button is-mini"
                aria-label="Jump to latest message"
              >
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <form className="agent-chat-form mt-3" onSubmit={handleMiniSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isRunning}
              className="agent-chat-input"
              rows={2}
              placeholder="Example: Summarize Tesla 30-day news sentiment and key risks..."
            />
            <button
              type="submit"
              disabled={isRunning || !draft.trim()}
              className="agent-chat-send"
              aria-label="Send research question"
            >
              <SendHorizontal size={16} aria-hidden="true" />
            </button>
          </form>

          <button type="button" onClick={openResearchWorkspace} className="btn-primary mt-3 w-full">
            <Maximize2 size={16} aria-hidden="true" />
            Open Research Studio
          </button>
        </aside>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={isRunning ? "agent-launcher is-running" : "agent-launcher"}
        aria-expanded={isOpen}
        aria-label="Open AI agents window"
      >
        <span className="agent-launcher-animation">
          <ChatbotLottie className="h-20 w-20" />
        </span>
        {isRunning ? (
          <span className="agent-running-pill" aria-live="polite">
            AI research: {activeLiveAgent.shortAction}
          </span>
        ) : null}
        <span className="agent-launcher-ping" aria-hidden="true" />
      </button>
    </div>
  );
}
