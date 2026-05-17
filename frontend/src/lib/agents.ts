import { BrainCircuit, FileSearch, LineChart, Newspaper, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ResearchTool } from "@/lib/api";

export type AgentStage = {
  name: string;
  shortName: string;
  role: string;
  liveAction: string;
  shortAction: string;
  tool?: ResearchTool;
  accent: string;
  Icon: LucideIcon;
};

export const AGENT_STAGES: AgentStage[] = [
  {
    name: "Planner Agent",
    shortName: "Planner",
    role: "Understands intent and chooses tools",
    liveAction: "Reading query intent",
    shortAction: "Reading intent",
    accent: "from-[#0f766e] to-[#14b8a6]",
    Icon: BrainCircuit,
  },
  {
    name: "Market Data Agent",
    shortName: "Market",
    role: "Fetches prices, volume, metrics",
    liveAction: "Pulling live market data",
    shortAction: "Fetching market",
    tool: "market_data",
    accent: "from-[#1d4ed8] to-[#38bdf8]",
    Icon: LineChart,
  },
  {
    name: "News Sentiment Agent",
    shortName: "News",
    role: "Reads headlines and classifies tone",
    liveAction: "Scanning recent headlines",
    shortAction: "Scanning news",
    tool: "news_sentiment",
    accent: "from-[#b45309] to-[#f59e0b]",
    Icon: Newspaper,
  },
  {
    name: "Document RAG Agent",
    shortName: "RAG",
    role: "Searches filings and research snippets",
    liveAction: "Searching document evidence",
    shortAction: "Searching docs",
    tool: "document_kb",
    accent: "from-[#7c3aed] to-[#c084fc]",
    Icon: FileSearch,
  },
  {
    name: "OpenAI Synthesis Agent",
    shortName: "Synthesis",
    role: "Creates sourced structured analysis",
    liveAction: "Synthesizing sourced answer",
    shortAction: "Synthesizing",
    tool: "llm_synthesis",
    accent: "from-[#0f172a] to-[#475569]",
    Icon: Sparkles,
  },
];
