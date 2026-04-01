"""
Scoring Engine — Phase 9 (Dynamic Tests)
All scoring is deterministic except where AI hybrid is explicitly noted.
"""

from typing import List, Dict, Any
import logging
from app.services.ai_preprocessing import AIPreprocessing
from app.models.assessment import MemoryListResponse, MemoryStringResponse

logger = logging.getLogger(__name__)

def _normalize_string(val: str) -> str:
    if not val:
        return ""
    return str(val).lower().strip()

def _safe_intersection_count(user_list: List[str], expected_list: List[str]) -> int:
    if not user_list:
        return 0
    norm_user = set(_normalize_string(x) for x in user_list if x)
    norm_expected = set(_normalize_string(x) for x in expected_list if x)
    return len(norm_user.intersection(norm_expected))

# ============================================================
# LEVEL 1 SCORING
# ============================================================

async def score_level_1(ad8_answers: List[int], user_orientation: Dict[str, str], orientation_questions: List[Dict], user_recall: MemoryListResponse, expected_words: List[str]) -> Dict[str, Any]:
    """
    Score Level 1 (SCD).
    - AD8: sum of "yes" answers / 8
    - Orientation: MCQ-based with approximate scoring (adjacent month = 0.5)
    - Recall: AI hybrid with exact fallback
    """
    # 1. AD8
    ad8_sum = sum(1 for a in ad8_answers if a == 1)
    norm_ad8 = max(0.0, min(ad8_sum / 8.0, 1.0))

    # 2. Orientation (MCQ with approximate scoring)
    orientation_score = 0.0
    orientation_max = 0
    for q in orientation_questions:
        qid = q.get("id", "")
        scoring_type = q.get("scoring", "exact")
        user_val = _normalize_string(user_orientation.get(qid, ""))
        
        if scoring_type == "self_report":
            # Location is self-reported — always counts as correct if answered
            if user_val:
                orientation_score += 1.0
            orientation_max += 1
        elif scoring_type == "approximate":
            # Month: exact = 1.0, adjacent = 0.5
            correct_val = _normalize_string(q.get("correct", ""))
            adjacent = [_normalize_string(a) for a in q.get("adjacent", [])]
            if user_val == correct_val:
                orientation_score += 1.0
            elif user_val in adjacent:
                orientation_score += 0.5
            orientation_max += 1
        else:  # exact
            correct_val = _normalize_string(q.get("correct", ""))
            if user_val == correct_val:
                orientation_score += 1.0
            orientation_max += 1
    
    norm_orientation = orientation_score / max(orientation_max, 1)

    # 3. Recall (AI hybrid)
    method = "exact_fallback"
    correct_count = 0
    
    if user_recall.dont_remember:
        correct_count = 0
        method = "no_attempt"
    else:
        try:
            result_map = await AIPreprocessing.evaluate_recall(expected_words, user_recall.response or [])
            correct_count = sum(1 for val in result_map.values() if val is True)
            method = "ai_hybrid"
        except Exception as e:
            logger.error(f"Recall AI fallback: {e}")
            correct_count = _safe_intersection_count(user_recall.response or [], expected_words)

    norm_recall = correct_count / max(len(expected_words), 1)

    level1_score = (norm_ad8 + norm_orientation + norm_recall) / 3.0

    return {
        "normalized_score": round(level1_score, 4),
        "raw_scores": {
            "ad8": ad8_sum,
            "orientation": round(orientation_score, 1),
            "recall": correct_count
        },
        "method": method
    }


# ============================================================
# LEVEL 2 SCORING (5 components, weighted)
# ============================================================

def score_digit_span(expected: str, forward: str, backward: str) -> float:
    """Partial credit position-by-position. Forward 50%, Backward 50%."""
    if not expected or len(expected) == 0:
        return 0.0
    forward_correct = sum(1 for a, b in zip(expected, forward) if a == b)
    forward_score = (forward_correct / len(expected)) * 0.5
    expected_rev = expected[::-1]
    backward_correct = sum(1 for a, b in zip(expected_rev, backward) if a == b)
    backward_score = (backward_correct / len(expected)) * 0.5
    return round(forward_score + backward_score, 4)


def score_visual_recognition(selected: List[str], targets: List[str], distractors: List[str]) -> float:
    """
    Recognition memory scoring with false alarm penalty.
    score = (correct_hits - 0.5 * false_alarms) / total_targets, clamped [0, 1]
    """
    if not targets:
        return 0.0
    selected_set = set(s.lower().strip() for s in selected if s)
    target_set = set(t.lower().strip() for t in targets)
    distractor_set = set(d.lower().strip() for d in distractors)
    
    correct_hits = len(selected_set & target_set)
    false_alarms = len(selected_set & distractor_set)
    
    raw_score = (correct_hits - 0.5 * false_alarms) / len(targets)
    return round(max(0.0, min(1.0, raw_score)), 4)


def score_pattern(selected: str, correct: str) -> float:
    """Binary pattern scoring. 1.0 if correct, 0.0 otherwise."""
    if not selected or not correct:
        return 0.0
    return 1.0 if selected.strip().upper() == correct.strip().upper() else 0.0


async def score_level_2(
    animals_list: List[str],
    fluency_category: str,
    expected_sequence: str, digit_forward: MemoryStringResponse, digit_backward: MemoryStringResponse,
    visual_selected: List[str], vr_targets: List[str], vr_distractors: List[str],
    pattern_answer: str, expected_pattern: str,
    delayed_recall: MemoryListResponse, level1_words: List[str]
) -> Dict[str, Any]:
    """
    Level 2 (MCI) — 5 components with clinical weights:
    - Digit Span:          0.25 (working memory)
    - Delayed Recall:      0.25 (memory decline indicator)
    - Verbal Fluency:      0.20 (language + executive function)
    - Visual Recognition:  0.15 (recognition memory)
    - Pattern Recognition: 0.15 (reasoning)
    """
    # 1. Verbal Fluency (AI hybrid — category-aware)
    method_fluency = "exact_fallback"
    try:
        result_map = await AIPreprocessing.evaluate_category_items(fluency_category, animals_list)
        fluency_count = sum(1 for val in result_map.values() if val is True)
        method_fluency = "ai_hybrid"
    except Exception as e:
        logger.error(f"Fluency AI fallback: {e}")
        unique_items = set(_normalize_string(a) for a in animals_list if a)
        fluency_count = len(unique_items)
    norm_fluency = 1.0 if fluency_count >= 14 else fluency_count / 14.0

    # 2. Digit Span (deterministic)
    f_resp = "" if digit_forward.dont_remember else (digit_forward.response or "")
    b_resp = "" if digit_backward.dont_remember else (digit_backward.response or "")
    digit_score = score_digit_span(expected_sequence, f_resp, b_resp)

    # 3. Visual Recognition (deterministic)
    vr_score = score_visual_recognition(visual_selected, vr_targets, vr_distractors)

    # 4. Visual Pattern (deterministic)
    pattern_score = score_pattern(pattern_answer, expected_pattern)

    # 5. Delayed Recall (AI hybrid)
    method_recall = "exact_fallback"
    recall_count = 0
    if delayed_recall.dont_remember:
        recall_count = 0
        method_recall = "no_attempt"
    else:
        try:
            recall_map = await AIPreprocessing.evaluate_recall(level1_words, delayed_recall.response or [])
            recall_count = sum(1 for val in recall_map.values() if val is True)
            method_recall = "ai_hybrid"
        except Exception as e:
            logger.error(f"Delayed Recall AI fallback: {e}")
            recall_count = _safe_intersection_count(delayed_recall.response or [], level1_words)
    norm_recall = recall_count / max(len(level1_words), 1)

    # Weighted Composite
    level2_score = (
        0.25 * digit_score +
        0.25 * norm_recall +
        0.20 * norm_fluency +
        0.15 * vr_score +
        0.15 * pattern_score
    )

    return {
        "normalized_score": round(level2_score, 4),
        "raw_scores": {
            "fluency_count": fluency_count,
            "digit_span": digit_score,
            "visual_recognition": vr_score,
            "pattern_recognition": pattern_score,
            "delayed_recall_count": recall_count
        },
        "method_breakdown": {
            "fluency": method_fluency,
            "digit_span": "deterministic",
            "visual_recognition": "deterministic",
            "pattern_recognition": "deterministic",
            "delayed_recall": method_recall
        }
    }


# ============================================================
# LEVEL 3 SCORING (Stroop Test)
# ============================================================

def score_stroop(trials: list, responses: list) -> Dict[str, Any]:
    """
    Score Stroop Test responses.
    
    Args:
        trials: List of trial dicts with 'color' (correct answer) and 'congruent' keys
        responses: List of response dicts with 'answer', 'reaction_time_ms', 'timed_out' keys
    
    Returns:
        Dict with normalized score (0-1), accuracy metrics, and reaction time stats.
    """
    if not trials or not responses:
        return {
            "normalized_score": 0.0,
            "total_correct": 0,
            "accuracy": 0.0,
            "avg_reaction_time_ms": 0,
            "incongruent_accuracy": 0.0,
            "congruent_accuracy": 0.0
        }
    
    total_correct = 0
    congruent_correct = 0
    congruent_total = 0
    incongruent_correct = 0
    incongruent_total = 0
    reaction_times = []
    
    for i, trial in enumerate(trials):
        if i >= len(responses):
            break
        resp = responses[i]
        
        is_correct = (resp.get("answer", "").upper() == trial.get("color", "").upper()) and not resp.get("timed_out", False)
        
        if is_correct:
            total_correct += 1
        
        if trial.get("congruent"):
            congruent_total += 1
            if is_correct:
                congruent_correct += 1
        else:
            incongruent_total += 1
            if is_correct:
                incongruent_correct += 1
        
        rt = resp.get("reaction_time_ms", 0)
        if rt > 0 and not resp.get("timed_out", False):
            reaction_times.append(rt)
    
    total_trials = len(trials)
    accuracy = total_correct / max(total_trials, 1)
    incongruent_acc = incongruent_correct / max(incongruent_total, 1)
    congruent_acc = congruent_correct / max(congruent_total, 1)
    avg_rt = sum(reaction_times) / max(len(reaction_times), 1)
    
    # Normalized score: 70% accuracy + 30% speed bonus
    # Speed bonus: faster reaction = higher score (capped at 3000ms baseline)
    speed_factor = max(0.0, min(1.0, (3000 - avg_rt) / 3000)) if avg_rt > 0 else 0.0
    normalized_score = (0.7 * accuracy) + (0.3 * speed_factor)
    
    return {
        "normalized_score": round(max(0.0, min(1.0, normalized_score)), 4),
        "total_correct": total_correct,
        "accuracy": round(accuracy * 100, 1),
        "avg_reaction_time_ms": round(avg_rt),
        "incongruent_accuracy": round(incongruent_acc * 100, 1),
        "congruent_accuracy": round(congruent_acc * 100, 1)
    }


# ============================================================
# FINAL COMPOSITE
# ============================================================

def calculate_level3_composite(clock_score: float, stroop_score: float) -> float:
    """L3 = 60% Clock Drawing + 40% Stroop Test"""
    return round(max(0.0, min(1.0, (0.6 * clock_score) + (0.4 * stroop_score))), 4)


def calculate_final_composite(l1: float, l2: float, l3: float) -> float:
    final = (0.2 * l1) + (0.4 * l2) + (0.4 * l3)
    return max(0.0, min(final, 1.0))
