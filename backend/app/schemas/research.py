from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ResearchTool(StrEnum):
    MARKET_DATA = "market_data"
    NEWS_SENTIMENT = "news_sentiment"
    DOCUMENT_KB = "document_kb"
    LLM_SYNTHESIS = "llm_synthesis"


class SourceType(StrEnum):
    MARKET_API = "market_api"
    NEWS_ARTICLE = "news_article"
    KNOWLEDGE_BASE = "knowledge_base"
    AI_SYNTHESIS = "ai_synthesis"


class ResearchQueryRequest(BaseModel):
    query: str = Field(min_length=5, max_length=2000)


class SourceReference(BaseModel):
    id: str
    title: str
    type: SourceType
    url: str | None = None
    published_at: datetime | None = None
    provider: str


class ResearchPlan(BaseModel):
    symbols: list[str] = Field(default_factory=list)
    tools: list[ResearchTool] = Field(default_factory=list)
    rationale: str


class PricePoint(BaseModel):
    date: str
    close: float
    source_id: str


class CompanyMetric(BaseModel):
    symbol: str
    company_name: str
    price: float
    change_percent: float
    volume: int
    market_cap: str
    pe_ratio: float | None
    revenue: str | None
    eps: float | None
    source_id: str
    historical_prices: list[PricePoint] = Field(default_factory=list)


class NewsItem(BaseModel):
    symbol: str
    title: str
    summary: str
    url: str | None = None
    published_at: datetime
    sentiment: str
    source_id: str


class DocumentSnippet(BaseModel):
    symbol: str
    company: str
    title: str
    excerpt: str
    score: float
    source_id: str


class Insight(BaseModel):
    section: str
    title: str
    body: str
    confidence: float = Field(ge=0, le=1)
    source_ids: list[str] = Field(default_factory=list)


class ResearchResponse(BaseModel):
    query: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    latency_ms: int
    plan: ResearchPlan
    executive_summary: str
    companies: list[CompanyMetric] = Field(default_factory=list)
    news: list[NewsItem] = Field(default_factory=list)
    documents: list[DocumentSnippet] = Field(default_factory=list)
    insights: list[Insight] = Field(default_factory=list)
    sources: list[SourceReference] = Field(default_factory=list)
