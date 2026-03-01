"""Tolkien-specific named entity recognition using dictionary matching."""

import json
import re
from pathlib import Path

from config import ENTITIES_DIR

# Module-level caches
_character_patterns: list[tuple[re.Pattern, str]] | None = None
_location_patterns: list[tuple[re.Pattern, str]] | None = None


def _load_entity_patterns(
    filepath: Path,
) -> list[tuple[re.Pattern, str]]:
    """Load entity data and build regex patterns, sorted longest-first."""
    with open(filepath) as f:
        data = json.load(f)

    patterns = []
    for _key, entity in data.items():
        canonical = entity["canonical_name"]
        all_names = [canonical] + entity.get("aliases", [])

        for name in all_names:
            if len(name) < 3:
                continue
            # Escape regex special chars, use word boundaries
            escaped = re.escape(name)
            pattern = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
            patterns.append((pattern, canonical))

    # Sort by pattern length descending (longest match first)
    patterns.sort(key=lambda x: len(x[0].pattern), reverse=True)
    return patterns


def _get_character_patterns() -> list[tuple[re.Pattern, str]]:
    global _character_patterns
    if _character_patterns is None:
        _character_patterns = _load_entity_patterns(
            ENTITIES_DIR / "characters.json"
        )
    return _character_patterns


def _get_location_patterns() -> list[tuple[re.Pattern, str]]:
    global _location_patterns
    if _location_patterns is None:
        _location_patterns = _load_entity_patterns(
            ENTITIES_DIR / "locations.json"
        )
    return _location_patterns


def detect_entities(text: str) -> dict[str, list[str]]:
    """Detect Tolkien characters and locations in text.

    Returns dict with 'characters' and 'locations' keys,
    each containing a deduplicated list of canonical names.
    """
    characters = set()
    locations = set()

    for pattern, canonical in _get_character_patterns():
        if pattern.search(text):
            characters.add(canonical)

    for pattern, canonical in _get_location_patterns():
        if pattern.search(text):
            locations.add(canonical)

    return {
        "characters": sorted(characters),
        "locations": sorted(locations),
    }
