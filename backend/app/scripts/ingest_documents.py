from __future__ import annotations

import json

from app.services.research.knowledge_base import DOCUMENT_CHUNKS, SAMPLE_DOCUMENTS


def main() -> None:
    index_preview = [
        {
            "source_id": chunk.source_id,
            "symbol": chunk.symbol,
            "title": chunk.title,
            "tokens": sum(chunk.vector.values()),
            "top_terms": [term for term, _count in chunk.vector.most_common(8)],
        }
        for chunk in DOCUMENT_CHUNKS
    ]
    print(
        json.dumps(
            {
                "documents": len(SAMPLE_DOCUMENTS),
                "chunks": len(DOCUMENT_CHUNKS),
                "embedding": "local term-frequency vector",
                "index": index_preview,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
