"""Format citations for API responses."""


def format_citations(sources: list[dict]) -> list[dict]:
    """Format source list for the API response.

    Strips the full text and returns only display-friendly fields.
    """
    return [
        {
            "index": s["index"],
            "book": s["book"],
            "chapter": s["chapter"],
            "excerpt": s["excerpt"],
            "relevance_score": s["relevance_score"],
        }
        for s in sources
    ]
