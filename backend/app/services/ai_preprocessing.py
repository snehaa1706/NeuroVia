import logging
from typing import List, Dict
from app.services.cache_service import CacheService
from app.services.ai_provider import get_provider

logger = logging.getLogger(__name__)

class AIPreprocessing:
    """
    Intercepts raw input. Identifies exact matches (₹0) and cached matches (₹0).
    Only unresolved edge-cases undergo batched AI calls (cost optimized).
    """

    @staticmethod
    def _normalize(words: List[str]) -> List[str]:
        """Deduplicates and sterilizes text securely."""
        if not words: return []
        return list(set(str(w).lower().strip() for w in words if w))

    @staticmethod
    def _chunk_list(data: List[str], chunk_size: int = 5):
        """Yields chunks sized perfectly for batch inference avoiding LLM context loss."""
        for i in range(0, len(data), chunk_size):
            yield data[i:i + chunk_size]

    @staticmethod
    async def evaluate_recall(expected_words: List[str], user_words: List[str]) -> Dict[str, bool]:
        """
        Maps user recall performance securely with cost bounds.
        """
        norm_expected = AIPreprocessing._normalize(expected_words)
        norm_user = AIPreprocessing._normalize(user_words)
        
        final_results = {}
        unresolved_queue = []

        # 1. Exact Match Intercept & Cache Intercept
        for expected in norm_expected:
            matched = False
            for user_str in norm_user:
                # Direct Hit
                if user_str == expected:
                    final_results[user_str] = True
                    matched = True
                    break
                
                # Cache Lookup Hit
                cache_key = f"recall:{expected}:{user_str}"
                cached_val = CacheService.get(cache_key)
                if cached_val is not None:
                    final_results[user_str] = cached_val
                    matched = True
                    logger.info(f"[AI_METRIC] event=cache_hit type=recall word={user_str}")
                    break

            if not matched:
                # Add expected target to queue to ask AI if any unmapped user string means this
                unresolved_queue.append(expected)
        
        # Identify user strings that haven't hit matching yet
        mapped_user = list(final_results.keys())
        unmapped_user = [u for u in norm_user if u not in mapped_user]

        # 2. Batched AI Fallback
        if unresolved_queue and unmapped_user:
            provider = get_provider()
            for chunk_expected in AIPreprocessing._chunk_list(unresolved_queue, 5):
                try:
                    ai_response = await provider.semantic_match_batch(chunk_expected, unmapped_user)
                    result_map = ai_response.get("result", {})
                    confidence = ai_response.get("confidence", "low")
                    
                    # Missing Key Handling: ensure all users unmapped receive False by default
                    for user_s in unmapped_user:
                        is_match = bool(result_map.get(user_s, False))
                        
                        # Only overwrite False if we actually hit a True in this batch chunk
                        if is_match or user_s not in final_results:
                            final_results[user_s] = is_match
                        
                        # Cache Storage if Network passed safely
                        if is_match and confidence != "low":
                            for exp in chunk_expected:
                                cache_key = f"recall:{exp}:{user_s}"
                                CacheService.set(cache_key, True)

                except Exception as e:
                    logger.error(f"Batch semantic evaluation failed: {e}")
                    # Error Handling: On failure, gracefully fail closed
                    for user_s in unmapped_user:
                        if user_s not in final_results:
                            final_results[user_s] = False

        return final_results

    @staticmethod
    async def evaluate_animals(user_words: List[str]) -> Dict[str, bool]:
        """
        Maps verbal fluency safely tracking unknown inputs dynamically to AI.
        """
        norm_user = AIPreprocessing._normalize(user_words)
        final_results = {}
        unresolved_queue = []

        # 1. Cache Intercept Loop
        for user_str in norm_user:
            cache_key = f"animal:{user_str}"
            cached_val = CacheService.get(cache_key)
            if cached_val is not None:
                logger.info(f"[AI_METRIC] event=cache_hit type=animal word={user_str}")
                final_results[user_str] = cached_val
            else:
                unresolved_queue.append(user_str)

        # 2. Batched AI Fallback Wrapper
        if unresolved_queue:
            provider = get_provider()
            for chunk in AIPreprocessing._chunk_list(unresolved_queue, 5):
                try:
                    ai_response = await provider.validate_animals_batch(chunk)
                    result_map = ai_response.get("result", {})
                    confidence = ai_response.get("confidence", "low")
                    
                    # Missing Key Handling: Guarantee all parsed entries resolve
                    for w in chunk:
                        is_valid = bool(result_map.get(w, False))
                        final_results[w] = is_valid
                        
                        # Cache Storage on Reliable Bounds
                        if confidence != "low":
                            CacheService.set(f"animal:{w}", is_valid)
                except Exception as e:
                    logger.error(f"Batch animal evaluation failed: {e}")
                    # Error Handling: Graceful fail-closed
                    for w in chunk:
                        final_results[w] = False

        return final_results

    @staticmethod
    async def evaluate_category_items(category: str, user_words: List[str]) -> Dict[str, bool]:
        """
        Generalized verbal fluency evaluation for any category.
        Uses AI to validate if user-provided words belong to the given category.
        Falls back to evaluate_animals for backward compatibility when category is 'animals'.
        """
        if category == "animals":
            return await AIPreprocessing.evaluate_animals(user_words)

        norm_user = AIPreprocessing._normalize(user_words)
        final_results = {}
        unresolved_queue = []

        # 1. Cache Intercept Loop
        for user_str in norm_user:
            cache_key = f"category:{category}:{user_str}"
            cached_val = CacheService.get(cache_key)
            if cached_val is not None:
                logger.info(f"[AI_METRIC] event=cache_hit type=category:{category} word={user_str}")
                final_results[user_str] = cached_val
            else:
                unresolved_queue.append(user_str)

        # 2. Batched AI Fallback
        if unresolved_queue:
            provider = get_provider()
            for chunk in AIPreprocessing._chunk_list(unresolved_queue, 5):
                try:
                    ai_response = await provider.validate_category_batch(category, chunk)
                    result_map = ai_response.get("result", {})
                    confidence = ai_response.get("confidence", "low")

                    for w in chunk:
                        is_valid = bool(result_map.get(w, False))
                        final_results[w] = is_valid

                        if confidence != "low":
                            CacheService.set(f"category:{category}:{w}", is_valid)
                except Exception as e:
                    logger.error(f"Batch category:{category} evaluation failed: {e}")
                    for w in chunk:
                        final_results[w] = False

        return final_results
