from __future__ import annotations

import asyncio
import csv
import io
import logging
import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from hashlib import sha1
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.research import (
    CompanyMetric,
    DocumentSnippet,
    NewsItem,
    PricePoint,
    SourceReference,
    SourceType,
)
from app.services.research.cache import get_json, set_json
from app.services.research.knowledge_base import search_documents

logger = logging.getLogger(__name__)

SYMBOL_ALIASES = {
    "nvidia": "NVDA",
    "nvda": "NVDA",
    "amd": "AMD",
    "advanced micro devices": "AMD",
    "intel": "INTC",
    "intc": "INTC",
    "tesla": "TSLA",
    "tsla": "TSLA",
    "jpmorgan": "JPM",
    "jp morgan": "JPM",
    "jpm": "JPM",
    "goldman": "GS",
    "goldman sachs": "GS",
    "gs": "GS",
    "morgan stanley": "MS",
    "ms": "MS",
    "apple": "AAPL",
    "aapl": "AAPL",
    "microsoft": "MSFT",
    "msft": "MSFT",
    "amazon": "AMZN",
    "amzn": "AMZN",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "googl": "GOOGL",
    "meta": "META",
    "facebook": "META",
}

COMPANY_PROFILES = {
    "NVDA": {
        "name": "NVIDIA",
        "fallback_price": 913.56,
        "market_cap": "$2.25T",
        "pe_ratio": 71.4,
        "revenue": "$60.9B",
        "eps": 11.93,
    },
    "AMD": {
        "name": "Advanced Micro Devices",
        "fallback_price": 165.22,
        "market_cap": "$267B",
        "pe_ratio": 48.9,
        "revenue": "$22.7B",
        "eps": 2.65,
    },
    "INTC": {
        "name": "Intel",
        "fallback_price": 34.12,
        "market_cap": "$146B",
        "pe_ratio": 31.6,
        "revenue": "$54.2B",
        "eps": 0.4,
    },
    "TSLA": {
        "name": "Tesla",
        "fallback_price": 178.01,
        "market_cap": "$567B",
        "pe_ratio": 46.2,
        "revenue": "$96.8B",
        "eps": 4.31,
    },
    "JPM": {
        "name": "JPMorgan Chase",
        "fallback_price": 198.33,
        "market_cap": "$570B",
        "pe_ratio": 12.1,
        "revenue": "$162.4B",
        "eps": 16.23,
    },
    "GS": {
        "name": "Goldman Sachs",
        "fallback_price": 438.78,
        "market_cap": "$142B",
        "pe_ratio": 15.3,
        "revenue": "$46.3B",
        "eps": 22.87,
    },
    "MS": {
        "name": "Morgan Stanley",
        "fallback_price": 94.85,
        "market_cap": "$154B",
        "pe_ratio": 16.8,
        "revenue": "$54.1B",
        "eps": 5.18,
    },
    "AAPL": {
        "name": "Apple",
        "fallback_price": 190.18,
        "market_cap": "$2.9T",
        "pe_ratio": 29.7,
        "revenue": "$383.3B",
        "eps": 6.13,
    },
    "MSFT": {
        "name": "Microsoft",
        "fallback_price": 423.08,
        "market_cap": "$3.1T",
        "pe_ratio": 36.4,
        "revenue": "$245.1B",
        "eps": 11.8,
    },
    "AMZN": {
        "name": "Amazon",
        "fallback_price": 184.7,
        "market_cap": "$1.9T",
        "pe_ratio": 50.1,
        "revenue": "$574.8B",
        "eps": 2.9,
    },
    "GOOGL": {
        "name": "Alphabet",
        "fallback_price": 176.55,
        "market_cap": "$2.2T",
        "pe_ratio": 27.1,
        "revenue": "$307.4B",
        "eps": 5.8,
    },
    "META": {
        "name": "Meta Platforms",
        "fallback_price": 493.5,
        "market_cap": "$1.25T",
        "pe_ratio": 25.2,
        "revenue": "$134.9B",
        "eps": 14.87,
    },
}

SEC_CIKS = {
    "NVDA": "0001045810",
    "AMD": "0000002488",
    "INTC": "0000050863",
    "TSLA": "0001318605",
    "JPM": "0000019617",
    "GS": "0000886982",
    "MS": "0000895421",
    "AAPL": "0000320193",
    "MSFT": "0000789019",
    "AMZN": "0001018724",
    "GOOGL": "0001652044",
    "META": "0001326801",
}

POSITIVE_WORDS = {
    "beat",
    "beats",
    "growth",
    "rally",
    "upgrade",
    "strong",
    "record",
    "profit",
    "surge",
    "upside",
    "raises",
}
NEGATIVE_WORDS = {
    "miss",
    "falls",
    "drop",
    "downgrade",
    "risk",
    "probe",
    "weak",
    "warning",
    "cut",
    "lawsuit",
    "decline",
}
NON_TICKER_TERMS = {
    "AI",
    "API",
    "CEO",
    "CFO",
    "EPS",
    "ETF",
    "GDP",
    "IPO",
    "LLM",
    "PCE",
    "SEC",
    "USA",
    "USD",
}


def extract_symbols(query: str) -> list[str]:
    normalized = query.lower()
    symbols: list[str] = []

    aliases = sorted(SYMBOL_ALIASES.items(), key=lambda item: len(item[0]), reverse=True)
    for alias, symbol in aliases:
        pattern = rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])"
        if re.search(pattern, normalized) and symbol not in symbols:
            symbols.append(symbol)

    uppercase_symbols = re.findall(r"\b[A-Z]{2,5}\b", query)
    for symbol in uppercase_symbols:
        if symbol not in NON_TICKER_TERMS and symbol not in symbols:
            symbols.append(symbol)

    return symbols or ["NVDA"]


def company_name(symbol: str) -> str:
    return str(COMPANY_PROFILES.get(symbol, {}).get("name", symbol))


def classify_sentiment(text: str) -> str:
    tokens = set(re.findall(r"[a-z]+", text.lower()))
    positive_hits = len(tokens & POSITIVE_WORDS)
    negative_hits = len(tokens & NEGATIVE_WORDS)
    if positive_hits > negative_hits:
        return "positive"
    if negative_hits > positive_hits:
        return "negative"
    return "neutral"


def stable_percent(symbol: str) -> float:
    digest = sha1(symbol.encode("utf-8")).hexdigest()
    raw_value = int(digest[:4], 16) % 900
    return round((raw_value - 450) / 100, 2)


def parse_market_float(value: str | None) -> float | None:
    if value in {None, "", "N/D"}:
        return None
    try:
        return float(str(value).replace(",", "").replace("%", ""))
    except ValueError:
        return None


def parse_market_int(value: str | int | float | None) -> int:
    parsed = parse_market_float(str(value)) if value is not None else None
    return int(parsed or 0)


def quote_change_percent(row: dict[str, Any] | None) -> float | None:
    if not row:
        return None

    explicit_change = parse_market_float(row.get("change_percent"))
    if explicit_change is not None:
        return explicit_change

    open_price = parse_market_float(row.get("open"))
    close_price = parse_market_float(row.get("price"))
    if open_price is None or close_price is None or open_price == 0:
        return None

    return round(((close_price - open_price) / open_price) * 100, 2)


def provider_change_percent(quote: dict[str, Any] | None, symbol: str) -> float:
    if not quote:
        return stable_percent(symbol)

    change_percent = quote_change_percent(quote)
    return change_percent if change_percent is not None else stable_percent(symbol)


def format_large_usd(value: str | int | float | None) -> str | None:
    amount = parse_market_float(str(value)) if value is not None else None
    if amount is None:
        return None
    abs_amount = abs(amount)
    if abs_amount >= 1_000_000_000_000:
        return f"${amount / 1_000_000_000_000:.2f}T"
    if abs_amount >= 1_000_000_000:
        return f"${amount / 1_000_000_000:.2f}B"
    if abs_amount >= 1_000_000:
        return f"${amount / 1_000_000:.2f}M"
    return f"${amount:,.0f}"


def clean_alpha_value(value: str | None) -> str | None:
    if not value or value in {"None", "-", "N/A"}:
        return None
    return value


def fallback_history(symbol: str, latest_price: float) -> list[PricePoint]:
    seed = int(sha1(symbol.encode("utf-8")).hexdigest()[:6], 16)
    points: list[PricePoint] = []
    today = datetime.now(UTC).date()
    for index in range(8):
        drift = ((seed >> index) % 9 - 4) / 100
        day_price = latest_price * (1 + drift + (index - 4) * 0.006)
        points.append(
            PricePoint(
                date=str(today - timedelta(days=7 - index)),
                close=round(day_price, 2),
                source_id=f"market_{symbol.lower()}",
            )
        )
    return points


async def fetch_twelve_quote(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    if not settings.twelve_data_api_key:
        return None

    response = await client.get(
        "https://api.twelvedata.com/quote",
        params={"symbol": symbol, "apikey": settings.twelve_data_api_key},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") == "error" or payload.get("code"):
        logger.info("Twelve Data quote unavailable for %s: %s", symbol, payload.get("message"))
        return None

    price = parse_market_float(payload.get("close"))
    if price is None:
        return None

    return {
        "price": price,
        "open": parse_market_float(payload.get("open")),
        "change_percent": parse_market_float(payload.get("percent_change")),
        "volume": parse_market_int(payload.get("volume")),
        "provider": "Twelve Data quote API",
        "url": f"https://twelvedata.com/stocks/{symbol}",
    }


async def fetch_alpha_quote(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    if not settings.alpha_vantage_api_key:
        return None

    response = await client.get(
        "https://www.alphavantage.co/query",
        params={
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": settings.alpha_vantage_api_key,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("Note") or payload.get("Information") or payload.get("Error Message"):
        logger.info("Alpha Vantage quote unavailable for %s: %s", symbol, payload)
        return None

    quote = payload.get("Global Quote") or {}
    price = parse_market_float(quote.get("05. price"))
    if price is None:
        return None

    return {
        "price": price,
        "open": parse_market_float(quote.get("02. open")),
        "change_percent": parse_market_float(quote.get("10. change percent")),
        "volume": parse_market_int(quote.get("06. volume")),
        "provider": "Alpha Vantage Global Quote API",
        "url": "https://www.alphavantage.co/documentation/",
    }


async def fetch_stooq_quote(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    url = f"https://stooq.com/q/l/?s={symbol.lower()}.us&f=sd2t2ohlcv&h&e=csv"
    response = await client.get(url)
    response.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(response.text)))
    if not rows:
        return None
    row = rows[0]
    if row.get("Close") in {None, "", "N/D"}:
        return None
    close = parse_market_float(row.get("Close"))
    if close is None:
        return None
    normalized = {
        "price": close,
        "open": parse_market_float(row.get("Open")),
        "change_percent": None,
        "volume": parse_market_int(row.get("Volume")),
        "provider": "Stooq quote API",
        "url": f"https://stooq.com/q/?s={symbol.lower()}.us",
    }
    normalized["change_percent"] = quote_change_percent(normalized)
    return normalized


async def fetch_best_quote(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    quote_tasks = []
    if settings.twelve_data_api_key:
        quote_tasks.append(fetch_twelve_quote(client, symbol))
    if settings.alpha_vantage_api_key:
        quote_tasks.append(fetch_alpha_quote(client, symbol))
    quote_tasks.append(fetch_stooq_quote(client, symbol))

    results = await asyncio.gather(*quote_tasks, return_exceptions=True)
    for result in results:
        if isinstance(result, dict):
            return result
    return None


async def fetch_twelve_history(client: httpx.AsyncClient, symbol: str) -> list[PricePoint]:
    if not settings.twelve_data_api_key:
        return []

    response = await client.get(
        "https://api.twelvedata.com/time_series",
        params={
            "symbol": symbol,
            "interval": "1day",
            "outputsize": 8,
            "apikey": settings.twelve_data_api_key,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") == "error" or not isinstance(payload.get("values"), list):
        logger.info("Twelve Data history unavailable for %s: %s", symbol, payload.get("message"))
        return []

    points: list[PricePoint] = []
    source_id = f"market_{symbol.lower()}"
    for item in reversed(payload["values"][:8]):
        close = parse_market_float(item.get("close"))
        if close is None:
            continue
        points.append(
            PricePoint(
                date=str(item.get("datetime")),
                close=round(close, 2),
                source_id=source_id,
            )
        )
    return points


async def fetch_alpha_history(client: httpx.AsyncClient, symbol: str) -> list[PricePoint]:
    if not settings.alpha_vantage_api_key:
        return []

    response = await client.get(
        "https://www.alphavantage.co/query",
        params={
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": "compact",
            "apikey": settings.alpha_vantage_api_key,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("Note") or payload.get("Information") or payload.get("Error Message"):
        logger.info("Alpha Vantage history unavailable for %s: %s", symbol, payload)
        return []

    time_series = payload.get("Time Series (Daily)") or {}
    source_id = f"market_{symbol.lower()}"
    points: list[PricePoint] = []
    for date_value in sorted(time_series.keys())[-8:]:
        close = parse_market_float(time_series[date_value].get("4. close"))
        if close is None:
            continue
        points.append(PricePoint(date=date_value, close=round(close, 2), source_id=source_id))
    return points


async def fetch_yahoo_history(client: httpx.AsyncClient, symbol: str) -> list[PricePoint]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1mo&interval=1d"
    response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
    response.raise_for_status()
    payload = response.json()
    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not isinstance(result, dict):
        return []

    timestamps = result.get("timestamp") or []
    quotes = result.get("indicators", {}).get("quote") or []
    if not timestamps or not quotes or not isinstance(quotes[0], dict):
        return []

    closes = quotes[0].get("close") or []
    points: list[PricePoint] = []
    source_id = f"market_{symbol.lower()}"
    for timestamp, close in zip(timestamps, closes, strict=False):
        if close is None:
            continue
        points.append(
            PricePoint(
                date=str(datetime.fromtimestamp(int(timestamp), UTC).date()),
                close=round(float(close), 2),
                source_id=source_id,
            )
        )

    return points[-8:]


async def fetch_best_history(client: httpx.AsyncClient, symbol: str) -> list[PricePoint]:
    history_tasks = []
    if settings.twelve_data_api_key:
        history_tasks.append(fetch_twelve_history(client, symbol))
    if settings.alpha_vantage_api_key:
        history_tasks.append(fetch_alpha_history(client, symbol))
    history_tasks.append(fetch_yahoo_history(client, symbol))

    results = await asyncio.gather(*history_tasks, return_exceptions=True)
    for result in results:
        if isinstance(result, list) and result:
            return result
    return []


async def fetch_alpha_overview(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    if not settings.alpha_vantage_api_key:
        return None

    response = await client.get(
        "https://www.alphavantage.co/query",
        params={
            "function": "OVERVIEW",
            "symbol": symbol,
            "apikey": settings.alpha_vantage_api_key,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if (
        not payload
        or payload.get("Note")
        or payload.get("Information")
        or payload.get("Error Message")
    ):
        logger.info("Alpha Vantage overview unavailable for %s: %s", symbol, payload)
        return None

    return {
        "market_cap": format_large_usd(payload.get("MarketCapitalization")),
        "pe_ratio": parse_market_float(clean_alpha_value(payload.get("PERatio"))),
        "revenue": format_large_usd(payload.get("RevenueTTM")),
        "eps": parse_market_float(clean_alpha_value(payload.get("EPS"))),
        "provider": "Alpha Vantage Company Overview API",
    }


def build_market_metric(
    symbol: str,
    quote: dict[str, Any] | None,
    history: list[PricePoint],
    fundamentals: dict[str, Any] | None,
) -> tuple[CompanyMetric, SourceReference]:
    profile = COMPANY_PROFILES.get(symbol, {})
    source_id = f"market_{symbol.lower()}"
    fallback_price = float(profile.get("fallback_price", 100))
    close = parse_market_float(str(quote.get("price"))) if quote else None
    latest_price = close or fallback_price
    volume = parse_market_int(quote.get("volume")) if quote else 0
    provider_parts = [
        str(quote.get("provider")) if quote else "Cached fundamentals fallback",
        str(fundamentals.get("provider")) if fundamentals else "curated fundamentals fallback",
    ]

    metric = CompanyMetric(
        symbol=symbol,
        company_name=company_name(symbol),
        price=round(latest_price, 2),
        change_percent=provider_change_percent(quote, symbol),
        volume=volume,
        market_cap=str(
            (fundamentals or {}).get("market_cap") or profile.get("market_cap", "N/A")
        ),
        pe_ratio=(fundamentals or {}).get("pe_ratio") or profile.get("pe_ratio"),
        revenue=(fundamentals or {}).get("revenue") or profile.get("revenue"),
        eps=(fundamentals or {}).get("eps") or profile.get("eps"),
        source_id=source_id,
        historical_prices=history or fallback_history(symbol, latest_price),
    )
    source = SourceReference(
        id=source_id,
        title=f"{symbol} latest market quote",
        type=SourceType.MARKET_API,
        url=quote.get("url") if quote else f"https://stooq.com/q/?s={symbol.lower()}.us",
        published_at=datetime.now(UTC),
        provider=", ".join(dict.fromkeys(provider_parts)),
    )
    return metric, source


async def get_market_data(symbols: list[str]) -> tuple[list[CompanyMetric], list[SourceReference]]:
    cache_key = f"market:v3:{','.join(symbols)}"
    cached = await get_json(cache_key)
    if isinstance(cached, dict):
        try:
            return (
                [CompanyMetric.model_validate(item) for item in cached.get("metrics", [])],
                [SourceReference.model_validate(item) for item in cached.get("sources", [])],
            )
        except ValueError:
            pass

    metrics: list[CompanyMetric] = []
    sources: list[SourceReference] = []
    timeout = httpx.Timeout(5, connect=2)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        quote_tasks = [fetch_best_quote(client, symbol) for symbol in symbols]
        history_tasks = [fetch_best_history(client, symbol) for symbol in symbols]
        fundamentals_tasks = [fetch_alpha_overview(client, symbol) for symbol in symbols]
        quote_results, history_results, fundamentals_results = await asyncio.gather(
            asyncio.gather(*quote_tasks, return_exceptions=True),
            asyncio.gather(*history_tasks, return_exceptions=True),
            asyncio.gather(*fundamentals_tasks, return_exceptions=True),
        )

    for symbol, quote_result, history_result, fundamentals_result in zip(
        symbols,
        quote_results,
        history_results,
        fundamentals_results,
        strict=False,
    ):
        quote = quote_result if isinstance(quote_result, dict) else None
        history = history_result if isinstance(history_result, list) else []
        fundamentals = fundamentals_result if isinstance(fundamentals_result, dict) else None
        metric, source = build_market_metric(symbol, quote, history, fundamentals)
        metrics.append(metric)
        sources.append(source)

    await set_json(
        cache_key,
        {
            "metrics": [metric.model_dump(mode="json") for metric in metrics],
            "sources": [source.model_dump(mode="json") for source in sources],
        },
        settings.market_cache_ttl_seconds,
    )
    return metrics, sources


def parse_rss_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return datetime.now(UTC)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


async def fetch_yahoo_news(client: httpx.AsyncClient, symbol: str) -> list[dict[str, Any]]:
    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}&region=US&lang=en-US"
    response = await client.get(url)
    response.raise_for_status()
    root = ET.fromstring(response.text)
    items: list[dict[str, Any]] = []
    for item in root.findall("./channel/item")[:4]:
        items.append(
            {
                "title": item.findtext("title") or f"{symbol} market update",
                "summary": item.findtext("description") or "Market news summary unavailable.",
                "url": item.findtext("link"),
                "published_at": parse_rss_datetime(item.findtext("pubDate")),
            }
        )
    return items


def fallback_news(symbol: str) -> list[dict[str, Any]]:
    profile_name = company_name(symbol)
    now = datetime.now(UTC)
    templates = [
        (
            f"{profile_name} investors watch demand trends and margin signals",
            "Analysts are tracking revenue durability, margin trajectory, "
            "and management commentary.",
        ),
        (
            f"{profile_name} faces competitive and macro risk debate",
            "Recent coverage is balanced as investors weigh growth opportunities "
            "against execution risk.",
        ),
    ]
    return [
        {
            "title": title,
            "summary": summary,
            "url": f"https://finance.yahoo.com/quote/{symbol}",
            "published_at": now - timedelta(days=index + 1),
        }
        for index, (title, summary) in enumerate(templates)
    ]


async def get_news_sentiment(symbols: list[str]) -> tuple[list[NewsItem], list[SourceReference]]:
    cache_key = f"news:v2:{','.join(symbols)}"
    cached = await get_json(cache_key)
    if isinstance(cached, dict):
        try:
            return (
                [NewsItem.model_validate(item) for item in cached.get("news", [])],
                [SourceReference.model_validate(item) for item in cached.get("sources", [])],
            )
        except ValueError:
            pass

    news_items: list[NewsItem] = []
    sources: list[SourceReference] = []
    timeout = httpx.Timeout(4, connect=2)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        news_tasks = [fetch_yahoo_news(client, symbol) for symbol in symbols]
        news_results = await asyncio.gather(*news_tasks, return_exceptions=True)

    for symbol, result in zip(symbols, news_results, strict=False):
        raw_items = result if isinstance(result, list) and result else fallback_news(symbol)
        for index, item in enumerate(raw_items[:4], start=1):
            source_id = f"news_{symbol.lower()}_{index}"
            combined_text = f"{item['title']} {item['summary']}"
            published_at = item["published_at"]
            news_items.append(
                NewsItem(
                    symbol=symbol,
                    title=item["title"],
                    summary=item["summary"],
                    url=item.get("url"),
                    published_at=published_at,
                    sentiment=classify_sentiment(combined_text),
                    source_id=source_id,
                )
            )
            sources.append(
                SourceReference(
                    id=source_id,
                    title=item["title"],
                    type=SourceType.NEWS_ARTICLE,
                    url=item.get("url"),
                    published_at=published_at,
                    provider="Yahoo Finance RSS with local fallback",
                )
            )

    await set_json(
        cache_key,
        {
            "news": [item.model_dump(mode="json") for item in news_items],
            "sources": [source.model_dump(mode="json") for source in sources],
        },
        settings.news_cache_ttl_seconds,
    )
    return news_items, sources


def sec_is_configured() -> bool:
    return bool(settings.sec_user_agent)


def latest_sec_fact(
    company_facts: dict[str, Any],
    tag: str,
    unit: str = "USD",
) -> dict[str, Any] | None:
    values = (
        company_facts.get("facts", {})
        .get("us-gaap", {})
        .get(tag, {})
        .get("units", {})
        .get(unit, [])
    )
    if not isinstance(values, list):
        return None

    candidates = [
        item
        for item in values
        if item.get("val") is not None and item.get("form") in {"10-K", "10-Q", "20-F"}
    ]
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda item: (str(item.get("filed") or ""), str(item.get("end") or "")),
        reverse=True,
    )[0]


def format_sec_value(value: Any, unit: str) -> str:
    parsed = parse_market_float(str(value)) if value is not None else None
    if parsed is None:
        return str(value)
    if unit == "USD":
        return format_large_usd(parsed) or str(value)
    if unit == "USD/shares":
        return f"${parsed:.2f} per diluted share"
    return f"{parsed:,.2f} {unit}"


async def fetch_sec_company_facts(
    client: httpx.AsyncClient,
    symbol: str,
) -> tuple[list[DocumentSnippet], list[SourceReference]]:
    if not sec_is_configured() or symbol not in SEC_CIKS:
        return [], []

    cik = SEC_CIKS[symbol]
    source_id = f"sec_{symbol.lower()}_companyfacts"
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    try:
        response = await client.get(
            url,
            headers={
                "User-Agent": str(settings.sec_user_agent),
                "Accept-Encoding": "gzip, deflate",
                "Host": "data.sec.gov",
            },
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.info("SEC company facts unavailable for %s: %s", symbol, exc)
        return [], []

    fact_specs = [
        ("Revenue", "Revenues", "USD"),
        ("Sales revenue", "SalesRevenueNet", "USD"),
        ("Net income", "NetIncomeLoss", "USD"),
        ("Assets", "Assets", "USD"),
        ("Liabilities", "Liabilities", "USD"),
        ("Stockholders equity", "StockholdersEquity", "USD"),
        ("Diluted EPS", "EarningsPerShareDiluted", "USD/shares"),
    ]
    snippets: list[DocumentSnippet] = []
    source = SourceReference(
        id=source_id,
        title=f"{symbol} SEC company facts",
        type=SourceType.KNOWLEDGE_BASE,
        url=url,
        provider="SEC EDGAR companyfacts API",
    )

    company = str(payload.get("entityName") or company_name(symbol))
    seen_tags: set[str] = set()
    for label, tag, unit in fact_specs:
        if tag in seen_tags:
            continue
        fact = latest_sec_fact(payload, tag, unit)
        if not fact:
            continue
        seen_tags.add(tag)
        filed = fact.get("filed") or "latest filing"
        period = fact.get("fp") or fact.get("fy") or "recent period"
        ending = fact.get("end") or "the reported period"
        value = format_sec_value(fact.get("val"), unit)
        snippet_id = f"{source_id}_{tag.lower()}"
        snippets.append(
            DocumentSnippet(
                symbol=symbol,
                company=company,
                title=f"{company} {label} from SEC filings",
                excerpt=(
                    f"{label} was reported as {value} for {period}, ending {ending}, "
                    f"filed on {filed} in form {fact.get('form') or 'SEC filing'}."
                ),
                score=0.91,
                source_id=snippet_id,
            )
        )

    return snippets[:5], [source] if snippets else []


async def get_sec_document_context(
    symbols: list[str],
) -> tuple[list[DocumentSnippet], list[SourceReference]]:
    if not sec_is_configured():
        return [], []

    timeout = httpx.Timeout(5, connect=2)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        results = await asyncio.gather(
            *[fetch_sec_company_facts(client, symbol) for symbol in symbols],
            return_exceptions=True,
        )

    snippets: list[DocumentSnippet] = []
    sources: list[SourceReference] = []
    for result in results:
        if not isinstance(result, tuple):
            continue
        result_snippets, result_sources = result
        snippets.extend(result_snippets)
        sources.extend(result_sources)
    return snippets, sources


def dedupe_document_sources(sources: list[SourceReference]) -> list[SourceReference]:
    seen: set[str] = set()
    deduped: list[SourceReference] = []
    for source in sources:
        if source.id in seen:
            continue
        seen.add(source.id)
        deduped.append(source)
    return deduped


async def get_document_context(
    query: str,
    symbols: list[str],
) -> tuple[list[DocumentSnippet], list[SourceReference]]:
    cache_source = f"{query}|{','.join(symbols)}"
    cache_key = f"documents:v4:{sha1(cache_source.encode('utf-8')).hexdigest()}"
    cached = await get_json(cache_key)
    if isinstance(cached, dict):
        try:
            return (
                [DocumentSnippet.model_validate(item) for item in cached.get("documents", [])],
                [SourceReference.model_validate(item) for item in cached.get("sources", [])],
            )
        except ValueError:
            pass

    rag_task = search_documents(query=query, symbols=symbols)
    sec_task = get_sec_document_context(symbols)
    rag_result, sec_result = await asyncio.gather(rag_task, sec_task)

    documents = [*sec_result[0], *rag_result[0]]
    sources = dedupe_document_sources([*sec_result[1], *rag_result[1]])
    await set_json(
        cache_key,
        {
            "documents": [document.model_dump(mode="json") for document in documents],
            "sources": [source.model_dump(mode="json") for source in sources],
        },
        settings.document_cache_ttl_seconds,
    )
    return documents[:10], sources
