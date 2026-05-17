from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.research import DocumentSnippet, SourceReference, SourceType

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9&.-]+")
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DocumentRecord:
    symbol: str
    company: str
    title: str
    url: str
    text: str


@dataclass(frozen=True)
class DocumentChunk:
    source_id: str
    symbol: str
    company: str
    title: str
    url: str
    text: str
    vector: Counter[str]


SAMPLE_DOCUMENTS = [
    DocumentRecord(
        symbol="NVDA",
        company="NVIDIA",
        title="NVIDIA FY2025 annual report excerpt",
        url="https://www.sec.gov/Archives/edgar/data/1045810/",
        text=(
            "NVIDIA reported strong data center revenue growth driven by accelerated computing, "
            "AI training, inference demand, networking, and software. Key risks include supply "
            "constraints, export controls, customer concentration among hyperscalers, and intense "
            "competition from AMD, Intel, custom ASICs, and cloud provider silicon."
        ),
    ),
    DocumentRecord(
        symbol="AMD",
        company="Advanced Micro Devices",
        title="AMD investor update excerpt",
        url="https://www.sec.gov/Archives/edgar/data/2488/",
        text=(
            "AMD highlighted growth opportunities in EPYC server CPUs and Instinct accelerators. "
            "Management emphasized AI accelerator adoption, improved gross margin, and product "
            "roadmap execution while noting competitive pressure from NVIDIA and Intel."
        ),
    ),
    DocumentRecord(
        symbol="INTC",
        company="Intel",
        title="Intel annual report excerpt",
        url="https://www.sec.gov/Archives/edgar/data/50863/",
        text=(
            "Intel is investing in process technology, foundry services, data center CPUs, "
            "and AI PC capabilities. Margin pressure, manufacturing execution, and competition "
            "in accelerators remain important risks for investors to monitor."
        ),
    ),
    DocumentRecord(
        symbol="TSLA",
        company="Tesla",
        title="Tesla quarterly update excerpt",
        url="https://www.sec.gov/Archives/edgar/data/1318605/",
        text=(
            "Tesla results are sensitive to vehicle delivery growth, average selling prices, "
            "battery costs, regulatory credits, and factory utilization. Management continues "
            "to invest in autonomy, energy storage, and manufacturing efficiency."
        ),
    ),
    DocumentRecord(
        symbol="JPM",
        company="JPMorgan Chase",
        title="JPMorgan capital position excerpt",
        url="https://www.sec.gov/Archives/edgar/data/19617/",
        text=(
            "JPMorgan maintains a diversified balance sheet with strong liquidity, capital ratios, "
            "and net interest income sensitivity. Credit quality, deposit beta, and regulatory "
            "capital requirements are key watch items."
        ),
    ),
    DocumentRecord(
        symbol="GS",
        company="Goldman Sachs",
        title="Goldman Sachs balance sheet excerpt",
        url="https://www.sec.gov/Archives/edgar/data/886982/",
        text=(
            "Goldman Sachs has meaningful exposure to investment banking, trading, asset "
            "management, and market risk. Capital position analysis should consider CET1 ratios, "
            "liquidity, risk-weighted assets, and earnings cyclicality."
        ),
    ),
    DocumentRecord(
        symbol="MS",
        company="Morgan Stanley",
        title="Morgan Stanley capital position excerpt",
        url="https://www.sec.gov/Archives/edgar/data/895421/",
        text=(
            "Morgan Stanley combines institutional securities with a large wealth management "
            "franchise. The balance sheet profile is influenced by client assets, capital "
            "markets activity, liquidity buffers, and regulatory capital levels."
        ),
    ),
]


def tokenize(text: str) -> list[str]:
    return [match.group(0).lower() for match in TOKEN_RE.finditer(text)]


def vectorize(text: str) -> Counter[str]:
    return Counter(tokenize(text))


def cosine_score(left: Counter[str], right: Counter[str]) -> float:
    if not left or not right:
        return 0

    common = set(left) & set(right)
    numerator = sum(left[token] * right[token] for token in common)
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    if left_norm == 0 or right_norm == 0:
        return 0
    return numerator / (left_norm * right_norm)


def chunk_text(text: str, max_words: int = 42, overlap: int = 8) -> list[str]:
    words = text.split()
    if len(words) <= max_words:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(words):
        chunk = " ".join(words[start : start + max_words])
        chunks.append(chunk)
        start += max_words - overlap
    return chunks


def build_chunks() -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for document in SAMPLE_DOCUMENTS:
        for index, chunk in enumerate(chunk_text(document.text), start=1):
            source_id = f"kb_{document.symbol.lower()}_{index}"
            chunks.append(
                DocumentChunk(
                    source_id=source_id,
                    symbol=document.symbol,
                    company=document.company,
                    title=document.title,
                    url=document.url,
                    text=chunk,
                    vector=vectorize(
                        f"{document.symbol} {document.company} {document.title} {chunk}"
                    ),
                )
            )
    return chunks


DOCUMENT_CHUNKS = build_chunks()
QDRANT_VECTOR_SIZE = 384
_qdrant_ready = False


def local_search_documents(
    query: str,
    symbols: list[str],
    limit: int = 6,
) -> tuple[list[DocumentSnippet], list[SourceReference]]:
    query_vector = vectorize(query)
    requested_symbols = set(symbols)
    scored: list[tuple[float, DocumentChunk]] = []

    for chunk in DOCUMENT_CHUNKS:
        symbol_boost = 0.18 if chunk.symbol in requested_symbols else 0
        score = cosine_score(query_vector, chunk.vector) + symbol_boost
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    snippets: list[DocumentSnippet] = []
    sources: list[SourceReference] = []
    seen_sources: set[str] = set()

    for score, chunk in scored[:limit]:
        snippets.append(
            DocumentSnippet(
                symbol=chunk.symbol,
                company=chunk.company,
                title=chunk.title,
                excerpt=chunk.text,
                score=round(score, 3),
                source_id=chunk.source_id,
            )
        )
        if chunk.source_id not in seen_sources:
            seen_sources.add(chunk.source_id)
            sources.append(
                SourceReference(
                    id=chunk.source_id,
                    title=chunk.title,
                    type=SourceType.KNOWLEDGE_BASE,
                    url=chunk.url,
                    provider="Local RAG index",
                )
            )

    return snippets, sources


def qdrant_is_configured() -> bool:
    return bool(settings.qdrant_url and settings.qdrant_api_key)


def deterministic_embedding(text: str, size: int = QDRANT_VECTOR_SIZE) -> list[float]:
    vector = [0.0] * size
    for token in tokenize(text):
        digest = hashlib.sha1(token.encode("utf-8")).hexdigest()
        index = int(digest[:8], 16) % size
        sign = 1 if int(digest[8:10], 16) % 2 == 0 else -1
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [round(value / norm, 8) for value in vector]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    await asyncio.sleep(0)
    return [deterministic_embedding(text) for text in texts]


def qdrant_headers() -> dict[str, str]:
    return {
        "api-key": str(settings.qdrant_api_key),
        "Content-Type": "application/json",
    }


def stable_point_id(value: str) -> int:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)


async def ensure_qdrant_collection(client: httpx.AsyncClient) -> None:
    global _qdrant_ready
    if _qdrant_ready:
        return

    collection_url = f"{settings.qdrant_url}/collections/{settings.qdrant_collection}"
    response = await client.get(collection_url, headers=qdrant_headers())
    if response.status_code == 404:
        create_response = await client.put(
            collection_url,
            headers=qdrant_headers(),
            json={"vectors": {"size": QDRANT_VECTOR_SIZE, "distance": "Cosine"}},
        )
        create_response.raise_for_status()
    else:
        response.raise_for_status()

    texts = [
        f"{chunk.symbol} {chunk.company} {chunk.title}. {chunk.text}"
        for chunk in DOCUMENT_CHUNKS
    ]
    embeddings = await embed_texts(texts)
    if len(embeddings) != len(DOCUMENT_CHUNKS):
        raise RuntimeError("Could not embed all document chunks for Qdrant.")

    points = []
    for chunk, vector in zip(DOCUMENT_CHUNKS, embeddings, strict=False):
        points.append(
            {
                "id": stable_point_id(chunk.source_id),
                "vector": vector,
                "payload": {
                    "source_id": chunk.source_id,
                    "symbol": chunk.symbol,
                    "company": chunk.company,
                    "title": chunk.title,
                    "url": chunk.url,
                    "text": chunk.text,
                },
            }
        )

    upsert_response = await client.put(
        f"{collection_url}/points?wait=true",
        headers=qdrant_headers(),
        json={"points": points},
    )
    upsert_response.raise_for_status()
    _qdrant_ready = True


async def qdrant_search_documents(
    query: str,
    symbols: list[str],
    limit: int,
) -> tuple[list[DocumentSnippet], list[SourceReference]] | None:
    if not qdrant_is_configured():
        return None

    try:
        query_embedding = (await embed_texts([query]))[0]
        async with httpx.AsyncClient(timeout=httpx.Timeout(9, connect=3)) as client:
            await ensure_qdrant_collection(client)
            payload: dict[str, Any] = {
                "vector": query_embedding,
                "limit": max(limit * 4, limit),
                "with_payload": True,
            }

            response = await client.post(
                f"{settings.qdrant_url}/collections/"
                f"{settings.qdrant_collection}/points/search",
                headers=qdrant_headers(),
                json=payload,
            )
            response.raise_for_status()
    except (IndexError, RuntimeError, httpx.HTTPError) as exc:
        logger.info("Qdrant search unavailable, using local RAG fallback: %s", exc)
        return None

    results = response.json().get("result", [])
    snippets: list[DocumentSnippet] = []
    sources: list[SourceReference] = []
    seen_sources: set[str] = set()
    requested_symbols = set(symbols)
    for item in results:
        payload = item.get("payload") or {}
        symbol = str(payload.get("symbol") or "")
        if requested_symbols and symbol not in requested_symbols:
            continue
        source_id = str(payload.get("source_id") or f"qdrant_{len(snippets) + 1}")
        snippets.append(
            DocumentSnippet(
                symbol=symbol,
                company=str(payload.get("company") or ""),
                title=str(payload.get("title") or "Qdrant document match"),
                excerpt=str(payload.get("text") or ""),
                score=round(float(item.get("score") or 0), 3),
                source_id=source_id,
            )
        )
        if source_id not in seen_sources:
            seen_sources.add(source_id)
            sources.append(
                SourceReference(
                    id=source_id,
                    title=str(payload.get("title") or "Qdrant document match"),
                    type=SourceType.KNOWLEDGE_BASE,
                    url=payload.get("url"),
                    provider="Qdrant vector database with deterministic document vectors",
                )
            )

        if len(snippets) >= limit:
            break

    return snippets, sources


async def search_documents(
    query: str,
    symbols: list[str],
    limit: int = 6,
) -> tuple[list[DocumentSnippet], list[SourceReference]]:
    qdrant_result = await qdrant_search_documents(query, symbols, limit)
    if qdrant_result and qdrant_result[0]:
        return qdrant_result

    await asyncio.sleep(0)
    return local_search_documents(query=query, symbols=symbols, limit=limit)
