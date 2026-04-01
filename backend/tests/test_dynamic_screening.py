"""
Unit Tests for Dynamic Cognitive Screening System — Phase 10
Tests: test_generator, anti_repetition patterns, scoring with multi-category fluency.
Run: python -m pytest backend/tests/test_dynamic_screening.py -v
"""

import sys
import os
import random
import asyncio
from collections import Counter

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.test_generator import (
    generate_recall_words,
    generate_orientation_questions,
    generate_digit_span,
    generate_visual_recognition,
    generate_visual_pattern,
    generate_fluency_category,
    generate_stroop_trials,
    RECALL_WORD_POOL,
    VISUAL_OBJECTS,
    PATTERN_TYPES,
    FLUENCY_CATEGORIES,
    PATTERN_SYMBOLS,
)
from app.services.scoring import (
    score_digit_span,
    score_visual_recognition,
    score_pattern,
    score_stroop,
    score_level_1,
    score_level_2,
)


# ============================================================
# TEST: Word Pool Size
# ============================================================

class TestPoolSizes:
    def test_recall_word_pool_large(self):
        """Pool must be 200+ words."""
        assert len(RECALL_WORD_POOL) >= 200, f"Pool has only {len(RECALL_WORD_POOL)} words"

    def test_recall_word_pool_unique(self):
        """No duplicate words in pool."""
        assert len(RECALL_WORD_POOL) == len(set(RECALL_WORD_POOL)), "Duplicate words found"

    def test_visual_objects_large(self):
        """Must have 60+ objects."""
        assert len(VISUAL_OBJECTS) >= 60, f"Only {len(VISUAL_OBJECTS)} visual objects"

    def test_visual_object_ids_unique(self):
        """All visual object IDs must be unique."""
        ids = [obj["id"] for obj in VISUAL_OBJECTS]
        assert len(ids) == len(set(ids)), "Duplicate visual object IDs found"

    def test_pattern_symbols_expanded(self):
        """Must have 20+ pattern symbols."""
        assert len(PATTERN_SYMBOLS) >= 20, f"Only {len(PATTERN_SYMBOLS)} symbols"

    def test_pattern_types_expanded(self):
        """Must have 6 pattern types."""
        assert len(PATTERN_TYPES) == 6
        expected = {"alternating", "repeating", "growing", "ascending", "mirror", "skip"}
        assert set(PATTERN_TYPES) == expected


# ============================================================
# TEST: Recall Word Generation
# ============================================================

class TestRecallGeneration:
    def test_generates_correct_count(self):
        words = generate_recall_words(count=3)
        assert len(words) == 3

    def test_generates_variable_count(self):
        for count in [3, 4, 5]:
            words = generate_recall_words(count=count)
            assert len(words) == count

    def test_no_duplicates_in_single_draw(self):
        words = generate_recall_words(count=5)
        assert len(words) == len(set(words))

    def test_excludes_words(self):
        exclude = ["apple", "river", "chair"]
        words = generate_recall_words(count=5, exclude=exclude)
        for w in words:
            assert w not in exclude

    def test_high_uniqueness_across_draws(self):
        """100 draws should produce many unique word sets."""
        all_sets = set()
        for _ in range(100):
            words = tuple(sorted(generate_recall_words(count=3)))
            all_sets.add(words)
        assert len(all_sets) >= 50, f"Only {len(all_sets)} unique sets in 100 draws"

    def test_words_from_pool(self):
        words = generate_recall_words(count=5)
        for w in words:
            assert w in RECALL_WORD_POOL

    def test_exclusion_larger_than_available(self):
        """When exclusion list is massive, should still work."""
        huge_exclude = RECALL_WORD_POOL[:190]
        words = generate_recall_words(count=3, exclude=huge_exclude)
        assert len(words) == 3


# ============================================================
# TEST: Orientation Generation
# ============================================================

class TestOrientationGeneration:
    def test_generates_four_questions_by_default(self):
        questions = generate_orientation_questions()
        assert len(questions) == 4

    def test_always_includes_year_and_month(self):
        """Year and month are mandatory for clinical validity."""
        questions = generate_orientation_questions()
        ids = {q["id"] for q in questions}
        assert "year" in ids
        assert "month" in ids

    def test_options_shuffled(self):
        """Running multiple times should produce different option orderings."""
        orderings = set()
        for _ in range(20):
            questions = generate_orientation_questions()
            for q in questions:
                orderings.add(tuple(q["options"]))
        assert len(orderings) > 5, "Options aren't being shuffled"

    def test_question_variety(self):
        """Over many draws, should see all 6 question types."""
        all_ids = set()
        for _ in range(50):
            questions = generate_orientation_questions()
            for q in questions:
                all_ids.add(q["id"])
        assert len(all_ids) >= 5, f"Only saw {all_ids}"

    def test_each_question_has_required_fields(self):
        questions = generate_orientation_questions()
        for q in questions:
            assert "id" in q
            assert "label" in q
            assert "options" in q
            assert len(q["options"]) >= 4


# ============================================================
# TEST: Digit Span Generation
# ============================================================

class TestDigitSpanGeneration:
    def test_default_length(self):
        data = generate_digit_span()
        assert len(data["expected"]) == 4
        assert data["length"] == 4

    def test_variable_length(self):
        for offset in [-1, 0, 1, 2]:
            data = generate_digit_span(difficulty_offset=offset)
            expected_len = max(3, min(6, 4 + offset))
            assert len(data["expected"]) == expected_len

    def test_only_digits(self):
        data = generate_digit_span()
        assert data["expected"].isdigit()

    def test_no_zeros(self):
        """Digits should be 1-9."""
        for _ in range(50):
            data = generate_digit_span()
            assert "0" not in data["expected"]

    def test_excludes_sequences(self):
        exclude = ["1234", "5678", "9111"]
        for _ in range(20):
            data = generate_digit_span(exclude_sequences=exclude)
            assert data["expected"] not in exclude

    def test_uniqueness(self):
        sequences = set()
        for _ in range(50):
            data = generate_digit_span()
            sequences.add(data["expected"])
        assert len(sequences) >= 30, f"Only {len(sequences)} unique sequences in 50 draws"


# ============================================================
# TEST: Visual Recognition Generation
# ============================================================

class TestVisualRecognitionGeneration:
    def test_default_counts(self):
        data = generate_visual_recognition()
        assert len(data["targets"]) == 4
        assert len(data["distractors"]) == 2
        assert len(data["mixed_set"]) == 6

    def test_variable_counts(self):
        for tc, dc in [(3, 2), (4, 3), (5, 2)]:
            data = generate_visual_recognition(target_count=tc, distractor_count=dc)
            assert len(data["targets"]) == tc
            assert len(data["distractors"]) == dc

    def test_no_overlap_targets_distractors(self):
        data = generate_visual_recognition()
        target_ids = {t["id"] for t in data["targets"]}
        distractor_ids = {d["id"] for d in data["distractors"]}
        assert target_ids.isdisjoint(distractor_ids)

    def test_mixed_set_contains_all(self):
        data = generate_visual_recognition()
        mixed_ids = {m["id"] for m in data["mixed_set"]}
        target_ids = {t["id"] for t in data["targets"]}
        distractor_ids = {d["id"] for d in data["distractors"]}
        assert mixed_ids == target_ids | distractor_ids

    def test_excludes_ids(self):
        exclude = ["apple", "dog", "chair", "clock"]
        data = generate_visual_recognition(exclude_ids=exclude)
        all_ids = {m["id"] for m in data["mixed_set"]}
        for e in exclude:
            assert e not in all_ids

    def test_each_object_has_emoji(self):
        data = generate_visual_recognition()
        for obj in data["mixed_set"]:
            assert "emoji" in obj
            assert "label" in obj
            assert len(obj["emoji"]) > 0


# ============================================================
# TEST: Visual Pattern Generation
# ============================================================

class TestVisualPatternGeneration:
    def test_all_pattern_types_generate(self):
        for ptype in PATTERN_TYPES:
            # Generate with all others excluded to force this type
            exclude = [t for t in PATTERN_TYPES if t != ptype]
            data = generate_visual_pattern(exclude_types=exclude)
            assert data["type"] == ptype

    def test_has_required_keys(self):
        data = generate_visual_pattern()
        assert "type" in data
        assert "instruction" in data
        assert "sequence" in data
        assert "options" in data
        assert "correct" in data
        assert data["correct"] in data["options"]

    def test_four_options(self):
        data = generate_visual_pattern()
        assert len(data["options"]) == 4

    def test_correct_answer_in_options(self):
        for _ in range(20):
            data = generate_visual_pattern()
            correct_key = data["correct"]
            assert correct_key in data["options"]

    def test_excludes_type(self):
        data = generate_visual_pattern(exclude_type="alternating")
        assert data["type"] != "alternating"

    def test_excludes_multiple_types(self):
        data = generate_visual_pattern(exclude_types=["alternating", "repeating", "growing"])
        assert data["type"] in ["ascending", "mirror", "skip"]

    def test_variety_across_draws(self):
        types_seen = set()
        for _ in range(30):
            data = generate_visual_pattern()
            types_seen.add(data["type"])
        assert len(types_seen) >= 4, f"Only saw types: {types_seen}"


# ============================================================
# TEST: Verbal Fluency Category
# ============================================================

class TestFluencyCategoryGeneration:
    def test_generates_valid_category(self):
        data = generate_fluency_category()
        assert data["category"] in FLUENCY_CATEGORIES

    def test_has_time_limit(self):
        data = generate_fluency_category()
        assert data["time_limit_seconds"] == 60

    def test_has_instruction(self):
        data = generate_fluency_category()
        assert "instruction" in data
        assert data["category"] in data["instruction"]

    def test_excludes_categories(self):
        data = generate_fluency_category(exclude_categories=["animals", "fruits"])
        assert data["category"] not in ["animals", "fruits"]

    def test_rotation_across_draws(self):
        categories_seen = set()
        for _ in range(30):
            data = generate_fluency_category()
            categories_seen.add(data["category"])
        assert len(categories_seen) >= 4, f"Only saw: {categories_seen}"


# ============================================================
# TEST: Stroop Generation
# ============================================================

class TestStroopGeneration:
    def test_correct_trial_count(self):
        data = generate_stroop_trials(total=10)
        assert len(data["trials"]) == 10
        assert data["total"] == 10

    def test_l2_default_7_trials(self):
        """Default (L2) should generate 7 trials."""
        data = generate_stroop_trials()
        assert len(data["trials"]) == 7
        assert data["total"] == 7

    def test_incongruent_ratio(self):
        data = generate_stroop_trials(total=10, incongruent_ratio=0.6)
        incongruent = sum(1 for t in data["trials"] if not t["congruent"])
        assert incongruent == 6

    def test_trial_structure(self):
        data = generate_stroop_trials()
        for trial in data["trials"]:
            assert "word" in trial
            assert "color" in trial
            assert "color_hex" in trial
            assert "congruent" in trial
            assert "index" in trial

    def test_incongruent_word_ne_color(self):
        data = generate_stroop_trials(total=20, incongruent_ratio=1.0)
        for trial in data["trials"]:
            assert trial["word"] != trial["color"]

    def test_shuffled(self):
        """Trials should be in random order."""
        orderings = set()
        for _ in range(10):
            data = generate_stroop_trials()
            ordering = tuple(t["congruent"] for t in data["trials"])
            orderings.add(ordering)
        assert len(orderings) >= 3, "Trials aren't being shuffled"


# ============================================================
# TEST: Scoring — Digit Span
# ============================================================

class TestDigitSpanScoring:
    def test_perfect_score(self):
        score = score_digit_span("7392", "7392", "2937")
        assert score == 1.0

    def test_zero_score(self):
        score = score_digit_span("7392", "0000", "0000")
        assert score == 0.0

    def test_partial_forward(self):
        score = score_digit_span("7392", "7300", "2937")
        assert 0.5 < score < 1.0

    def test_variable_length(self):
        """Score should work with different lengths."""
        score = score_digit_span("12345", "12345", "54321")
        assert score == 1.0


# ============================================================
# TEST: Scoring — Visual Recognition
# ============================================================

class TestVisualRecognitionScoring:
    def test_perfect_score(self):
        score = score_visual_recognition(
            ["apple", "dog", "chair"],
            ["apple", "dog", "chair"],
            ["car", "tree"]
        )
        assert score == 1.0

    def test_false_alarm_penalty(self):
        score_no_fa = score_visual_recognition(
            ["apple", "dog"],
            ["apple", "dog", "chair"],
            ["car"]
        )
        score_with_fa = score_visual_recognition(
            ["apple", "dog", "car"],
            ["apple", "dog", "chair"],
            ["car"]
        )
        assert score_with_fa < score_no_fa


# ============================================================
# TEST: Scoring — Pattern
# ============================================================

class TestPatternScoring:
    def test_correct(self):
        assert score_pattern("A", "A") == 1.0

    def test_incorrect(self):
        assert score_pattern("B", "A") == 0.0

    def test_case_insensitive(self):
        assert score_pattern("a", "A") == 1.0


# ============================================================
# TEST: Scoring — Stroop
# ============================================================

class TestStroopScoring:
    def test_perfect_score(self):
        trials = [{"color": "RED", "congruent": True}] * 5
        responses = [{"answer": "RED", "reaction_time_ms": 500, "timed_out": False}] * 5
        result = score_stroop(trials, responses)
        assert result["accuracy"] == 100.0
        assert result["normalized_score"] > 0.8

    def test_zero_score(self):
        trials = [{"color": "RED", "congruent": True}] * 5
        responses = [{"answer": "BLUE", "reaction_time_ms": 2900, "timed_out": False}] * 5
        result = score_stroop(trials, responses)
        assert result["accuracy"] == 0.0

    def test_timed_out_not_counted(self):
        trials = [{"color": "RED", "congruent": True}]
        responses = [{"answer": "RED", "reaction_time_ms": 3500, "timed_out": True}]
        result = score_stroop(trials, responses)
        assert result["total_correct"] == 0


# ============================================================
# TEST: Level 1 Scoring (async)
# ============================================================

class TestLevel1Scoring:
    def test_basic_level1(self):
        async def _run():
            ad8_vals = [0, 0, 0, 0, 0, 0, 0, 0]  # all no
            orientation = {"year": "2026", "month": "March", "time_of_day": "Evening", "location": "Home"}
            orientation_qs = [
                {"id": "year", "correct": "2026", "scoring": "exact"},
                {"id": "month", "correct": "March", "adjacent": ["February", "April"], "scoring": "approximate"},
                {"id": "time_of_day", "correct": "Evening", "scoring": "exact"},
                {"id": "location", "scoring": "self_report"}
            ]
            user_recall = ["basket", "mirror"]
            expected_recall = ["basket", "mirror", "dragon"]
            
            result = await score_level_1(ad8_vals, orientation, orientation_qs, user_recall, expected_recall)
            assert 0 <= result["normalized_score"] <= 1
            assert "raw_scores" in result

        asyncio.get_event_loop().run_until_complete(_run())


# ============================================================
# TEST: Level 2 Scoring (async)
# ============================================================

class TestLevel2Scoring:
    def test_basic_level2(self):
        async def _run():
            result = await score_level_2(
                animals_list=["cat", "dog", "fish"],
                fluency_category="animals",
                expected_sequence="7392",
                digit_forward="7392",
                digit_backward="2937",
                visual_selected=["apple", "dog"],
                vr_targets=["apple", "dog", "chair"],
                vr_distractors=["car"],
                pattern_answer="A",
                expected_pattern="A",
                delayed_recall=["basket"],
                level1_words=["basket", "mirror", "dragon"]
            )
            assert 0 <= result["normalized_score"] <= 1
            assert "raw_scores" in result
            assert "method_breakdown" in result

        asyncio.get_event_loop().run_until_complete(_run())


# ============================================================
# TEST: Anti-Repetition Patterns (no DB required)
# ============================================================

class TestAntiRepetitionPatterns:
    def test_exclusion_produces_different_words(self):
        """If we exclude words from draw 1, draw 2 should be different."""
        draw1 = generate_recall_words(count=5)
        draw2 = generate_recall_words(count=5, exclude=draw1)
        assert set(draw1).isdisjoint(set(draw2))

    def test_simulated_5_sessions_no_repeat(self):
        """Simulate 5 sessions with exclusion tracking."""
        all_used = []
        for _ in range(5):
            words = generate_recall_words(count=5, exclude=all_used)
            # Verify no repeats
            for w in words:
                assert w not in all_used, f"Repeated word {w}"
            all_used.extend(words)
        assert len(all_used) == 25  # 5 sessions × 5 words

    def test_visual_object_exclusion_across_sessions(self):
        all_used_ids = []
        for _ in range(5):
            data = generate_visual_recognition(target_count=4, distractor_count=2, exclude_ids=all_used_ids)
            new_ids = [t["id"] for t in data["targets"]] + [d["id"] for d in data["distractors"]]
            for nid in new_ids:
                assert nid not in all_used_ids
            all_used_ids.extend(new_ids)

    def test_pattern_type_rotation(self):
        """Pattern types should rotate when excluded."""
        used_types = []
        for _ in range(6):
            exclude = used_types[-2:] if len(used_types) >= 2 else used_types
            data = generate_visual_pattern(exclude_types=exclude)
            used_types.append(data["type"])
        # Should see variety
        assert len(set(used_types)) >= 3

    def test_fluency_category_rotation(self):
        used_cats = []
        for _ in range(5):
            exclude = used_cats[-2:] if len(used_cats) >= 2 else used_cats
            data = generate_fluency_category(exclude_categories=exclude)
            assert data["category"] not in exclude[:2] or len(FLUENCY_CATEGORIES) <= 2
            used_cats.append(data["category"])
        assert len(set(used_cats)) >= 3


# ============================================================
# TEST: Context Builder Security
# ============================================================

class TestContextBuilderSecurity:
    """Ensure backend never leaks correct answers to frontend."""

    def test_orientation_strips_correct(self):
        """The _build_level1_context function should strip 'correct' keys."""
        # Import the builder
        from app.routers.screening import _build_level1_context
        
        metadata = {
            "orientation": {
                "questions": [
                    {"id": "year", "label": "What year?", "correct": "2026", "options": ["2024", "2025", "2026", "2027"], "scoring": "exact"},
                ]
            },
            "recall": {"words": ["basket", "mirror"]}
        }
        ctx = _build_level1_context(metadata)
        for q in ctx["orientation"]["questions"]:
            assert "correct" not in q
            assert "scoring" not in q
            assert "adjacent" not in q

    def test_pattern_strips_correct(self):
        """Pattern context should NOT include 'correct' key."""
        from app.routers.screening import _build_level2_context
        
        ctx = _build_level2_context(
            sequence="7392",
            vr_data={"targets": [], "mixed_set": [], "display_duration": 6000},
            pattern_data={"type": "alternating", "instruction": "What comes next?", "sequence": ["🔴", "🔵"], "options": {"A": "🔴", "B": "🔵"}, "correct": "A"},
            fluency_data={"category": "animals", "time_limit_seconds": 60, "instruction": "Name animals"}
        )
        assert "correct" not in ctx["visual_pattern"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v", "--tb=short"])
