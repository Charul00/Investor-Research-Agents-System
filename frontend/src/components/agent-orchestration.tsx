"use client";

import { ChatbotLottie } from "@/components/chatbot-lottie";
import { ResearchResponse } from "@/lib/api";
import { AGENT_STAGES } from "@/lib/agents";

type AgentOrchestrationProps = {
  isRunning: boolean;
  result: ResearchResponse | null;
};

export function AgentOrchestration({ isRunning, result }: AgentOrchestrationProps) {
  const activeTools = new Set(result?.plan.tools ?? []);

  return (
    <section className="agent-stage mt-5 rounded-[1.8rem] border border-[var(--border)] p-4 sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">5-agent AI workflow</p>
          <h3 className="text-2xl font-semibold text-[var(--foreground)]">
            Specialist agents collaborate before anything hits the screen
          </h3>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Option A is not a chatbot wrapper. It uses a planner, tool agents, RAG evidence, and
            OpenAI synthesis to produce structured, source-attributed UI.
          </p>
        </div>
        <div className="agent-orb-wrap" aria-hidden="true">
          <div className={isRunning ? "agent-orb is-running" : "agent-orb"}>
            <ChatbotLottie className="relative z-10 h-28 w-28" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {AGENT_STAGES.map(({ name, role, tool, accent, Icon }, index) => {
          const isActive = isRunning || Boolean(result && (!tool || activeTools.has(tool)));
          return (
            <article
              key={name}
              className={isActive ? "agent-card agent-card-active" : "agent-card"}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-[1.2rem] bg-white shadow-lg">
                <ChatbotLottie className="absolute inset-[-0.55rem] h-20 w-20" />
                <span
                  className={`absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br ${accent}`}
                >
                  <Icon size={14} aria-hidden="true" className="text-white" />
                </span>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-[var(--foreground)]">{name}</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{role}</p>
              </div>
              <span
                className={
                  isActive
                    ? "mt-4 inline-flex rounded-full bg-[#e8f2ee] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]"
                    : "mt-4 inline-flex rounded-full bg-[#f5f7fb] px-3 py-1 text-xs font-semibold text-[var(--muted)]"
                }
              >
                {isActive ? (isRunning ? "Running" : "Used") : "Standby"}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
