"""Sanitization utilities for AI input data.

Trims strings, truncates long text, caps array sizes,
and removes null values before sending data to the AI layer.
"""

MAX_TEXT_LENGTH = 500
MAX_ARRAY_SIZE = 10


def sanitize_text(value: str | None, max_length: int = MAX_TEXT_LENGTH) -> str:
    """Trim and truncate a text field."""
    if not value:
        return ""
    cleaned = value.strip()
    if len(cleaned) > max_length:
        return cleaned[:max_length] + "..."
    return cleaned


def sanitize_list(items: list | None, max_size: int = MAX_ARRAY_SIZE) -> list:
    """Cap list size and remove None entries."""
    if not items:
        return []
    filtered = [item for item in items if item is not None]
    return filtered[:max_size]


def sanitize_ai_input(data: dict) -> dict:
    """Sanitize a full data dict before passing to the AI layer.

    Rules:
      - Strings are trimmed and truncated to MAX_TEXT_LENGTH
      - Lists are capped to MAX_ARRAY_SIZE with nulls removed
      - None values are dropped entirely
      - Numbers and booleans pass through unchanged
    """
    sanitized = {}
    for key, value in data.items():
        if value is None:
            continue
        if isinstance(value, str):
            sanitized[key] = sanitize_text(value)
        elif isinstance(value, list):
            sanitized[key] = sanitize_list(value)
        else:
            sanitized[key] = value
    return sanitized
