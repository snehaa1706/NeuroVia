from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class CacheService:
    """
    In-memory singleton caching semantic/animal validations to slash AI API costs.
    """
    _cache: Dict[str, Dict[str, Any]] = {}
    
    @staticmethod
    def _normalize_key(key: str) -> str:
        return str(key).lower().strip()

    @staticmethod
    def is_expired(key: str) -> bool:
        norm_key = CacheService._normalize_key(key)
        if norm_key not in CacheService._cache:
            return True
        record = CacheService._cache[norm_key]
        return datetime.utcnow() > record.get("expiry", datetime.min)

    @staticmethod
    def set(key: str, value: Any, ttl_hours: int = 24) -> None:
        norm_key = CacheService._normalize_key(key)
        expiry = datetime.utcnow() + timedelta(hours=ttl_hours)
        CacheService._cache[norm_key] = {"value": value, "expiry": expiry}

    @staticmethod
    def get(key: str) -> Optional[Any]:
        norm_key = CacheService._normalize_key(key)
        if CacheService.is_expired(norm_key):
            # Clean up lazily
            if norm_key in CacheService._cache:
                del CacheService._cache[norm_key]
            return None
        return CacheService._cache[norm_key]["value"]
