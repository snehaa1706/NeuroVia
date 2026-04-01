"""
Anti-Repetition Engine — Phase 10
Tracks per-user test history across sessions to prevent content reuse.
Queries completed assessment metadata to build exclusion lists.
Uses LRU eviction when pools are close to exhaustion.
"""

import logging
from typing import Dict, Any, List, Optional
from app.database import supabase_admin

logger = logging.getLogger(__name__)

# How many past sessions to scan for anti-repetition
MAX_HISTORY_SCAN = 5

# If exclusion set exceeds this fraction of the pool, use LRU eviction
LRU_THRESHOLD = 0.7


class AntiRepetitionEngine:
    """
    Central anti-repetition tracker.
    Works by aggregating 'used' metadata from past assessments.
    """

    @staticmethod
    def get_user_history(user_id: str, max_sessions: int = MAX_HISTORY_SCAN) -> Dict[str, Any]:
        """
        Fetch aggregated usage history from a user's past completed assessments.
        Returns structured history of all items used recently.
        """
        try:
            res = (
                supabase_admin.table("assessments")
                .select("metadata")
                .eq("user_id", user_id)
                .eq("status", "completed")
                .order("started_at", desc=True)
                .limit(max_sessions)
                .execute()
            )
            
            history = {
                "recall_words": [],
                "visual_objects": [],
                "pattern_types": [],
                "fluency_categories": [],
                "digit_sequences": [],
            }
            
            for row in (res.data or []):
                metadata = row.get("metadata") or {}
                used = metadata.get("used", {})
                
                # Recall words
                words = used.get("recall_words", [])
                if words:
                    history["recall_words"].extend(words)
                
                # Visual objects
                objects = used.get("visual_objects", [])
                if objects:
                    history["visual_objects"].extend(objects)
                
                # Pattern types
                ptype = used.get("pattern_type")
                if ptype:
                    history["pattern_types"].append(ptype)
                
                # Fluency categories
                fcat = used.get("fluency_category")
                if fcat:
                    history["fluency_categories"].append(fcat)
                
                # Digit sequences
                digit_data = metadata.get("digit_span", {})
                seq = digit_data.get("expected")
                if seq:
                    history["digit_sequences"].append(seq)
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to fetch user history: {e}")
            return {
                "recall_words": [],
                "visual_objects": [],
                "pattern_types": [],
                "fluency_categories": [],
                "digit_sequences": [],
            }

    @staticmethod
    def get_exclusion_lists(user_id: str, pool_sizes: Optional[Dict[str, int]] = None) -> Dict[str, List[str]]:
        """
        Build exclusion lists for the next assessment.
        Applies LRU eviction if exclusion would exhaust pool.
        
        Args:
            user_id: The user's ID
            pool_sizes: Optional dict mapping pool name to total size (for LRU threshold calc)
        
        Returns:
            Dict with exclusion lists per test type.
        """
        history = AntiRepetitionEngine.get_user_history(user_id)
        
        defaults = {
            "recall_words": 200,
            "visual_objects": 60,
        }
        if pool_sizes:
            defaults.update(pool_sizes)
        
        exclusions = {}
        
        # Recall words — exclude if not exhausting pool
        recall_used = list(set(history.get("recall_words", [])))
        if len(recall_used) > defaults["recall_words"] * LRU_THRESHOLD:
            # LRU eviction: keep only the most recent half
            recall_used = recall_used[:len(recall_used) // 2]
            logger.info(f"LRU eviction for recall words: reduced to {len(recall_used)}")
        exclusions["recall_words"] = recall_used
        
        # Visual objects
        visual_used = list(set(history.get("visual_objects", [])))
        if len(visual_used) > defaults["visual_objects"] * LRU_THRESHOLD:
            visual_used = visual_used[:len(visual_used) // 2]
            logger.info(f"LRU eviction for visual objects: reduced to {len(visual_used)}")
        exclusions["visual_objects"] = visual_used
        
        # Pattern types — just the last 2
        pattern_types = history.get("pattern_types", [])
        exclusions["pattern_types"] = pattern_types[:2] if len(pattern_types) >= 2 else pattern_types
        
        # Fluency categories — last 2
        fluency_cats = history.get("fluency_categories", [])
        exclusions["fluency_categories"] = fluency_cats[:2] if len(fluency_cats) >= 2 else fluency_cats
        
        # Digit sequences — last 3
        digit_seqs = history.get("digit_sequences", [])
        exclusions["digit_sequences"] = digit_seqs[:3] if len(digit_seqs) >= 3 else digit_seqs
        
        return exclusions

    @staticmethod
    def record_session_usage(assessment_id: str, user_id: str, usage: Dict[str, Any]) -> None:
        """
        Update the assessment metadata with usage tracking data.
        Called after all test content for a level has been generated.
        Merges new usage into existing 'used' key.
        """
        try:
            res = (
                supabase_admin.table("assessments")
                .select("metadata")
                .eq("id", assessment_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            if not res.data:
                logger.error(f"Cannot record usage: assessment {assessment_id} not found")
                return
            
            metadata = res.data[0].get("metadata") or {}
            existing_used = metadata.get("used", {})
            
            # Merge: append lists, overwrite scalars
            for key, value in usage.items():
                if isinstance(value, list):
                    existing = existing_used.get(key, [])
                    merged = list(set(existing + value))
                    existing_used[key] = merged
                else:
                    existing_used[key] = value
            
            metadata["used"] = existing_used
            
            supabase_admin.table("assessments").update(
                {"metadata": metadata}
            ).eq("id", assessment_id).eq("user_id", user_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to record session usage: {e}")
