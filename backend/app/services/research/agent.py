from __future__ import annotations

import asyncio
import json
import re
from time import perf_counter
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.research import (
    CompanyMetric,
    DocumentSnippet,
    Insight,
    NewsItem,
    ResearchPlan,
    ResearchResponse,
    ResearchTool,
    SourceReference,
    SourceType,
)
from app.services.research.tools import (
    extract_symbols,
    get_document_context,
    get_market_data,
    get_news_sentiment,
)

MARKET_KEYWORDS = {
    "stock",
    "price",
    "performance",
    "quarter",
    "market cap",
    "volume",
    "pe",
    "p/e",
    "eps",
    "revenue",
    "compare",
    "balance sheet",
}
NEWS_KEYWORDS = {"news", "sentiment", "headline", "headlines", "last 30", "risk", "threat"}
MARKET_ONLY_PHRASES = {
    "only stock",
    "only price",
    "only market",
    "only latest stock",
    "stock price only",
    "do not analyze news",
    "do not include news",
}
NEWS_ONLY_PHRASES = {
    "only news",
    "only recent news",
    "only the recent news",
    "do not analyze stock",
    "do not include stock",
    "do not analyze stock price",
}
DOCUMENT_KEYWORDS = {
    "filing",
    "earnings",
    "annual report",
    "10-k",
    "10-q",
    "fundamental",
    "balance sheet",
    "capital",
    "risk assessment",
}
ALLOWED_TOOLS = {
    ResearchTool.MARKET_DATA,
    ResearchTool.NEWS_SENTIMENT,
    ResearchTool.DOCUMENT_KB,
}


def dedupe_sources(sources: list[SourceReference]) -> list[SourceReference]:
    seen: set[str] = set()
    deduped: list[SourceReference] = []
    for source in sources:
        if source.id in seen:
            continue
        seen.add(source.id)
        deduped.append(source)
    return deduped


def keyword_hit(query: str, keywords: set[str]) -> bool:
    normalized = query.lower()
    return any(keyword in normalized for keyword in keywords)


def phrase_hit(query: str, phrases: set[str]) -> bool:
    normalized = query.lower()
    return any(phrase in normalized for phrase in phrases)


def apply_explicit_tool_constraints(query: str, plan: ResearchPlan) -> ResearchPlan:
    tools = [tool for tool in plan.tools if tool != ResearchTool.LLM_SYNTHESIS]
    normalized = query.lower()

    if phrase_hit(normalized, NEWS_ONLY_PHRASES):
        tools = [tool for tool in tools if tool != ResearchTool.MARKET_DATA]

    if phrase_hit(normalized, MARKET_ONLY_PHRASES):
        tools = [
            tool
            for tool in tools
            if tool not in {ResearchTool.NEWS_SENTIMENT, ResearchTool.DOCUMENT_KB}
        ]

    if "do not use filings" in normalized or "do not include filings" in normalized:
        tools = [tool for tool in tools if tool != ResearchTool.DOCUMENT_KB]

    if not tools:
        tools = [
            ResearchTool.NEWS_SENTIMENT
            if phrase_hit(normalized, NEWS_ONLY_PHRASES)
            else ResearchTool.MARKET_DATA
        ]

    if settings.openai_api_key:
        tools.append(ResearchTool.LLM_SYNTHESIS)

    constrained_tools = list(dict.fromkeys(tools))
    if constrained_tools == plan.tools:
        return plan

    return ResearchPlan(
        symbols=plan.symbols,
        tools=constrained_tools,
        rationale=(
            f"{plan.rationale} Explicit user constraints were applied so unnecessary tools are "
            "not called."
        ),
    )


def deterministic_plan(query: str) -> ResearchPlan:
    symbols = extract_symbols(query)
    tools: list[ResearchTool] = []

    if keyword_hit(query, MARKET_KEYWORDS) or len(symbols) > 1:
        tools.append(ResearchTool.MARKET_DATA)
    if keyword_hit(query, NEWS_KEYWORDS):
        tools.append(ResearchTool.NEWS_SENTIMENT)
    if keyword_hit(query, DOCUMENT_KEYWORDS):
        tools.append(ResearchTool.DOCUMENT_KB)

    if not tools:
        tools = [ResearchTool.MARKET_DATA, ResearchTool.NEWS_SENTIMENT]

    if settings.openai_api_key:
        tools.append(ResearchTool.LLM_SYNTHESIS)

    return apply_explicit_tool_constraints(query, ResearchPlan(
        symbols=symbols,
        tools=tools,
        rationale=(
            "Planner selected tools from the request intent, company mentions, "
            "and required evidence types. Only relevant data tools are called."
        ),
    ))


def extract_json_object(value: str) -> dict[str, Any] | None:
    match = re.search(r"\{.*\}", value, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def response_output_text(payload: dict[str, Any]) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]

    chunks: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "\n".join(chunks)


async def call_openai(prompt: str, max_output_tokens: int = 700) -> str | None:
    if not settings.openai_api_key:
        return None

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.openai_model,
        "input": prompt,
        "max_output_tokens": max_output_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8, connect=3)) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    return response_output_text(response.json()).strip() or None


async def llm_refine_plan(query: str, fallback: ResearchPlan) -> ResearchPlan:
    if not settings.openai_api_key:
        return fallback

    prompt = (
        "You are the planner for an investment research dashboard. Return only compact JSON with "
        "keys symbols, tools, rationale. Allowed tools: market_data, news_sentiment, document_kb. "
        "Select only tools needed by the user query. Query: "
        f"{query}"
    )
    text = await call_openai(prompt, max_output_tokens=300)
    if not text:
        return fallback

    parsed = extract_json_object(text)
    if not parsed:
        return fallback

    raw_symbols = [
        str(symbol)
        for symbol in parsed.get("symbols", fallback.symbols)
        if isinstance(symbol, str)
    ][:6]
    symbols = extract_symbols(" ".join(raw_symbols)) if raw_symbols else fallback.symbols
    tools = [
        ResearchTool(tool)
        for tool in parsed.get("tools", [])
        if isinstance(tool, str) and tool in {allowed.value for allowed in ALLOWED_TOOLS}
    ]
    if not tools:
        tools = [tool for tool in fallback.tools if tool in ALLOWED_TOOLS]

    if settings.openai_api_key:
        tools.append(ResearchTool.LLM_SYNTHESIS)

    return apply_explicit_tool_constraints(query, ResearchPlan(
        symbols=symbols,
        tools=list(dict.fromkeys(tools)),
        rationale=str(parsed.get("rationale") or fallback.rationale),
    ))


def sentiment_rollup(news: list[NewsItem]) -> str:
    if not news:
        return "No recent news was requested or available."
    counts = {sentiment: 0 for sentiment in ["positive", "neutral", "negative"]}
    for item in news:
        counts[item.sentiment] = counts.get(item.sentiment, 0) + 1
    dominant = max(counts, key=counts.get)
    return (
        f"News tone is mostly {dominant}: {counts['positive']} positive, "
        f"{counts['neutral']} neutral, {counts['negative']} negative headline(s)."
    )


def build_deterministic_insights(
    plan: ResearchPlan,
    companies: list[CompanyMetric],
    news: list[NewsItem],
    documents: list[DocumentSnippet],
) -> list[Insight]:
    insights: list[Insight] = []
    if companies:
        if len(companies) == 1:
            company = companies[0]
            insight_title = "Latest quote move"
            insight_body = (
                f"{company.symbol} is trading at {company.price:.2f} with a latest quote move of "
                f"{company.change_percent:+.2f}% and volume of {company.volume:,}."
            )
        else:
            strongest = max(companies, key=lambda item: item.change_percent)
            weakest = min(companies, key=lambda item: item.change_percent)
            insight_title = "Relative quote move"
            insight_body = (
                f"{strongest.symbol} shows the strongest latest quote move at "
                f"{strongest.change_percent:+.2f}%, while {weakest.symbol} is the softest at "
                f"{weakest.change_percent:+.2f}%."
            )

        insights.append(
            Insight(
                section="Market Snapshot",
                title=insight_title,
                body=insight_body,
                confidence=0.78,
                source_ids=[company.source_id for company in companies],
            )
        )

    if news:
        insights.append(
            Insight(
                section="News Sentiment",
                title="Recent coverage tone",
                body=sentiment_rollup(news),
                confidence=0.72,
                source_ids=[item.source_id for item in news[:6]],
            )
        )

    if documents:
        insights.append(
            Insight(
                section="RAG Evidence",
                title="Document-backed fundamentals",
                body=(
                    "Retrieved filings and analyst-style excerpts emphasize growth drivers, "
                    "competitive pressure, margin quality, and capital position risks."
                ),
                confidence=0.75,
                source_ids=[document.source_id for document in documents[:4]],
            )
        )

    if not insights:
        insights.append(
            Insight(
                section="Research Plan",
                title="Next best step",
                body=f"The query was mapped to {', '.join(tool.value for tool in plan.tools)}.",
                confidence=0.65,
                source_ids=[],
            )
        )

    return insights


def build_fallback_summary(
    query: str,
    companies: list[CompanyMetric],
    news: list[NewsItem],
    documents: list[DocumentSnippet],
) -> str:
    company_part = (
        f"Covered {', '.join(company.symbol for company in companies)}"
        if companies
        else "No market data was requested"
    )
    evidence_parts = []
    if news:
        evidence_parts.append(sentiment_rollup(news))
    if documents:
        evidence_parts.append(f"RAG found {len(documents)} document snippet(s) for fundamentals.")
    evidence_text = " ".join(evidence_parts) or "The selected tools returned structured evidence."
    return f"{company_part}. {evidence_text} Query focus: {query}"


def clean_ui_summary(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = value.replace("**", "")
    cleaned = re.sub(r"(?m)^\s*[-*•]\s*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or None


async def llm_summary(
    query: str,
    companies: list[CompanyMetric],
    news: list[NewsItem],
    documents: list[DocumentSnippet],
) -> str | None:
    compact_context = {
        "query": query,
        "companies": [company.model_dump(mode="json") for company in companies[:5]],
        "news": [item.model_dump(mode="json") for item in news[:8]],
        "documents": [document.model_dump(mode="json") for document in documents[:6]],
    }
    prompt = (
        "You are an investment research analyst inside a product UI. Write a concise executive "
        "summary in plain, user-friendly English. Use exactly 4 short sentences in one paragraph. "
        "Do not use markdown, bold text, asterisks, bullet points, numbered lists, tables, or "
        "section labels. Mention only claims supported by the JSON evidence. Do not invent data. "
        "Evidence JSON: "
        f"{json.dumps(compact_context, ensure_ascii=False)}"
    )
    return clean_ui_summary(await call_openai(prompt, max_output_tokens=550))


async def run_research(query: str) -> ResearchResponse:
    started_at = perf_counter()
    initial_plan = deterministic_plan(query)
    plan = await llm_refine_plan(query, initial_plan)
    symbols = plan.symbols[:6]

    tasks: dict[str, Any] = {}
    if ResearchTool.MARKET_DATA in plan.tools:
        tasks["market"] = get_market_data(symbols)
    if ResearchTool.NEWS_SENTIMENT in plan.tools:
        tasks["news"] = get_news_sentiment(symbols)
    if ResearchTool.DOCUMENT_KB in plan.tools:
        tasks["documents"] = get_document_context(query, symbols)

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    resolved = dict(zip(tasks.keys(), results, strict=False))

    companies: list[CompanyMetric] = []
    news: list[NewsItem] = []
    documents: list[DocumentSnippet] = []
    sources: list[SourceReference] = []

    market_result = resolved.get("market")
    if isinstance(market_result, tuple):
        companies, market_sources = market_result
        sources.extend(market_sources)

    news_result = resolved.get("news")
    if isinstance(news_result, tuple):
        news, news_sources = news_result
        sources.extend(news_sources)

    document_result = resolved.get("documents")
    if isinstance(document_result, tuple):
        documents, document_sources = document_result
        sources.extend(document_sources)

    insights = build_deterministic_insights(plan, companies, news, documents)
    summary = None
    if ResearchTool.LLM_SYNTHESIS in plan.tools:
        summary = await llm_summary(query, companies, news, documents)
        if summary:
            sources.append(
                SourceReference(
                    id="ai_synthesis_openai",
                    title=f"OpenAI synthesis using {settings.openai_model}",
                    type=SourceType.AI_SYNTHESIS,
                    provider="OpenAI Responses API",
                )
            )

    latency_ms = round((perf_counter() - started_at) * 1000)
    return ResearchResponse(
        query=query,
        latency_ms=latency_ms,
        plan=plan,
        executive_summary=summary or build_fallback_summary(query, companies, news, documents),
        companies=companies,
        news=news,
        documents=documents,
        insights=insights,
        sources=dedupe_sources(sources),
    )
