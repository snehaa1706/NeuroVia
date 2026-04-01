"""
Dynamic Test Content Generator — Phase 10 (Anti-Repetition Upgrade)
All cognitive test content is generated here. NO static/hardcoded questions anywhere else.
Every function uses generate-only-if-not-exists guards at the caller level.

Pools are intentionally massive to resist memorization across sessions.
"""

import random
from typing import List, Dict, Any, Optional
from datetime import datetime

# ============================================================
# RECALL WORD POOL — 200+ words, organized by semantic category
# ============================================================

RECALL_WORD_POOL_BY_CATEGORY = {
    "nature": [
        "tree", "leaf", "dirt", "mud", "rain", "snow", "star", "sun", "moon", "sky",
        "cloud", "wind", "lake", "pond", "rock", "hill", "sand", "wave", "grass", "weed"
    ],
    "household": [
        "bed", "door", "roof", "wall", "rug", "desk", "lamp", "cup", "fork", "spoon",
        "knife", "bowl", "pan", "pot", "soap", "sink", "tub", "lock", "key", "clock"
    ],
    "tools": [
        "saw", "axe", "nail", "glue", "tape", "rope", "wire", "box", "bag", "net",
        "hook", "pipe", "plug", "cord", "fan", "pump", "hose", "cart", "jack", "drill"
    ],
    "food": [
        "egg", "milk", "meat", "rice", "corn", "pea", "bean", "nut", "soup", "pie",
        "cake", "bun", "roll", "jam", "salt", "dip", "oil", "tea", "gum", "ice"
    ],
    "animals": [
        "dog", "cat", "cow", "pig", "fox", "bat", "rat", "bug", "ant", "bee",
        "fly", "owl", "jay", "hen", "duck", "frog", "toad", "fish", "worm", "bear"
    ],
    "body": [
        "eye", "ear", "nose", "lip", "chin", "neck", "arm", "leg", "foot", "toe",
        "hand", "back", "hip", "chest", "skin", "bone", "hair", "tooth", "knee", "thumb"
    ],
    "clothing": [
        "hat", "cap", "coat", "suit", "sock", "shoe", "boot", "belt", "tie", "bow",
        "ring", "gown", "robe", "cape", "mask", "veil", "zip", "tag", "pad", "scarf"
    ],
    "transport": [
        "car", "bus", "van", "cab", "jet", "ship", "boat", "raft", "bike", "tram",
        "train", "jeep", "tube", "sled", "wing", "tire", "seat", "helm", "sail", "mast"
    ],
    "music": [
        "drum", "horn", "bell", "gong", "lute", "song", "tune", "note", "beat", "band",
        "hum", "clap", "snap", "tap", "string", "reed", "fret", "mic", "harp", "flute"
    ],
    "objects": [
        "toy", "ball", "doll", "top", "coin", "map", "pen", "ink", "book", "card",
        "jar", "can", "lid", "gem", "seal", "wand", "dart", "dice", "kite", "tray"
    ]
}

# Flattened pool for backward compatibility
RECALL_WORD_POOL = []
for _cat_words in RECALL_WORD_POOL_BY_CATEGORY.values():
    RECALL_WORD_POOL.extend(_cat_words)

# ============================================================
# VISUAL OBJECT POOL — 60+ emoji objects
# ============================================================

VISUAL_OBJECTS = [
    # Original 22
    {"id": "apple", "emoji": "🍎", "label": "Apple"},
    {"id": "dog", "emoji": "🐕", "label": "Dog"},
    {"id": "chair", "emoji": "🪑", "label": "Chair"},
    {"id": "clock", "emoji": "🕐", "label": "Clock"},
    {"id": "book", "emoji": "📖", "label": "Book"},
    {"id": "car", "emoji": "🚗", "label": "Car"},
    {"id": "tree", "emoji": "🌳", "label": "Tree"},
    {"id": "house", "emoji": "🏠", "label": "House"},
    {"id": "fish", "emoji": "🐟", "label": "Fish"},
    {"id": "star", "emoji": "⭐", "label": "Star"},
    {"id": "key", "emoji": "🔑", "label": "Key"},
    {"id": "hat", "emoji": "🎩", "label": "Hat"},
    {"id": "cup", "emoji": "☕", "label": "Cup"},
    {"id": "bell", "emoji": "🔔", "label": "Bell"},
    {"id": "shoe", "emoji": "👟", "label": "Shoe"},
    {"id": "moon", "emoji": "🌙", "label": "Moon"},
    {"id": "sun", "emoji": "☀️", "label": "Sun"},
    {"id": "flower", "emoji": "🌺", "label": "Flower"},
    {"id": "cat", "emoji": "🐱", "label": "Cat"},
    {"id": "bicycle", "emoji": "🚲", "label": "Bicycle"},
    {"id": "umbrella", "emoji": "☂️", "label": "Umbrella"},
    {"id": "guitar", "emoji": "🎸", "label": "Guitar"},
    # Expanded — vehicles
    {"id": "airplane", "emoji": "✈️", "label": "Airplane"},
    {"id": "bus", "emoji": "🚌", "label": "Bus"},
    {"id": "train", "emoji": "🚂", "label": "Train"},
    {"id": "boat", "emoji": "⛵", "label": "Boat"},
    {"id": "rocket", "emoji": "🚀", "label": "Rocket"},
    # Expanded — food
    {"id": "banana", "emoji": "🍌", "label": "Banana"},
    {"id": "pizza", "emoji": "🍕", "label": "Pizza"},
    {"id": "cake", "emoji": "🎂", "label": "Cake"},
    {"id": "watermelon", "emoji": "🍉", "label": "Watermelon"},
    {"id": "grapes", "emoji": "🍇", "label": "Grapes"},
    {"id": "carrot", "emoji": "🥕", "label": "Carrot"},
    # Expanded — weather/nature
    {"id": "rainbow", "emoji": "🌈", "label": "Rainbow"},
    {"id": "snowflake", "emoji": "❄️", "label": "Snowflake"},
    {"id": "cloud", "emoji": "☁️", "label": "Cloud"},
    {"id": "lightning", "emoji": "⚡", "label": "Lightning"},
    {"id": "volcano_obj", "emoji": "🌋", "label": "Volcano"},
    # Expanded — tools/objects
    {"id": "scissors", "emoji": "✂️", "label": "Scissors"},
    {"id": "hammer_obj", "emoji": "🔨", "label": "Hammer"},
    {"id": "magnifier", "emoji": "🔍", "label": "Magnifier"},
    {"id": "lock", "emoji": "🔒", "label": "Lock"},
    {"id": "envelope", "emoji": "✉️", "label": "Envelope"},
    {"id": "pencil_obj", "emoji": "✏️", "label": "Pencil"},
    # Expanded — animals
    {"id": "elephant", "emoji": "🐘", "label": "Elephant"},
    {"id": "penguin_obj", "emoji": "🐧", "label": "Penguin"},
    {"id": "butterfly", "emoji": "🦋", "label": "Butterfly"},
    {"id": "turtle_obj", "emoji": "🐢", "label": "Turtle"},
    {"id": "rabbit_obj", "emoji": "🐰", "label": "Rabbit"},
    {"id": "whale", "emoji": "🐳", "label": "Whale"},
    # Expanded — sports/activities
    {"id": "soccer", "emoji": "⚽", "label": "Soccer Ball"},
    {"id": "basketball", "emoji": "🏀", "label": "Basketball"},
    {"id": "tennis", "emoji": "🎾", "label": "Tennis Ball"},
    {"id": "trophy_obj", "emoji": "🏆", "label": "Trophy"},
    # Expanded — music
    {"id": "piano", "emoji": "🎹", "label": "Piano"},
    {"id": "drum", "emoji": "🥁", "label": "Drum"},
    {"id": "violin_obj", "emoji": "🎻", "label": "Violin"},
    # Expanded — buildings/places
    {"id": "hospital", "emoji": "🏥", "label": "Hospital"},
    {"id": "school", "emoji": "🏫", "label": "School"},
    {"id": "castle_obj", "emoji": "🏰", "label": "Castle"},
    # Expanded — clothing
    {"id": "glasses", "emoji": "👓", "label": "Glasses"},
    {"id": "crown", "emoji": "👑", "label": "Crown"},
    {"id": "watch", "emoji": "⌚", "label": "Watch"},
]

# ============================================================
# VISUAL PATTERN SYMBOLS & TYPES — expanded
# ============================================================

PATTERN_SYMBOLS = [
    "🔴", "🔵", "🟢", "🟡", "🟣", "🔺", "🔷", "⭐",
    "🟩", "🟨", "🟦", "🟥", "🔶", "🟤", "⬛", "⬜",
    "🔸", "🔹", "💠", "♦️", "♠️", "🔘"
]

PATTERN_TYPES = ["alternating", "repeating", "growing", "ascending", "mirror", "skip"]

# ============================================================
# ORIENTATION POOLS — expanded to 6 question types
# ============================================================

MONTHS_ALL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

DAYS_ALL = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
]

SEASONS_ALL = ["Spring", "Summer", "Autumn", "Winter"]

LOCATION_OPTIONS = ["Home", "Hospital", "Clinic", "Outside", "Office", "School", "Park", "Other"]
TIME_OF_DAY_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"]

# ============================================================
# VERBAL FLUENCY CATEGORIES
# ============================================================

FLUENCY_CATEGORIES = ["animals", "fruits", "objects", "vegetables", "occupations"]


# ============================================================
# GENERATORS
# ============================================================

def generate_recall_words(count: int = 3, exclude: Optional[List[str]] = None) -> List[str]:
    """Pick `count` random words from the pool, avoiding any in `exclude`.
    Tries to pick from different categories for diversity."""
    exclude_set = set(exclude or [])
    available = [w for w in RECALL_WORD_POOL if w not in exclude_set]
    if len(available) < count:
        available = RECALL_WORD_POOL[:]  # Reset if pool exhausted
    return random.sample(available, count)


def _get_time_of_day(hour: int) -> str:
    """Determine time of day from hour (0-23)."""
    if 5 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    else:
        return "Night"


def _get_season(month: int) -> str:
    """Determine season from month (1-12). Northern hemisphere."""
    if month in (3, 4, 5):
        return "Spring"
    elif month in (6, 7, 8):
        return "Summer"
    elif month in (9, 10, 11):
        return "Autumn"
    else:
        return "Winter"


def _get_day_of_week() -> str:
    """Get current day of week as a string."""
    return DAYS_ALL[datetime.now().weekday()]


def _shuffle_with_correct(correct: str, pool: List[str], total: int = 4) -> List[str]:
    """Build a list of `total` options containing `correct` + random distractors from `pool`."""
    distractors = [x for x in pool if x != correct]
    chosen = random.sample(distractors, min(total - 1, len(distractors)))
    options = [correct] + chosen
    random.shuffle(options)
    return options


def generate_orientation_questions(local_hour: int = None, pick_count: int = 4) -> List[Dict[str, Any]]:
    """
    Generate orientation questions with randomized options from a pool of 6 possible types.
    Picks `pick_count` questions randomly from the full pool for variety.
    `local_hour` is the user's local hour (0-23) for time-of-day question.
    """
    now = datetime.now()
    current_year = str(now.year)
    current_month = MONTHS_ALL[now.month - 1]
    current_day = _get_day_of_week()
    current_season = _get_season(now.month)

    if local_hour is None:
        local_hour = now.hour
    correct_tod = _get_time_of_day(local_hour)

    # Year options: current ± 2
    year_options = _shuffle_with_correct(
        current_year,
        [str(now.year - 2), str(now.year - 1), str(now.year + 1), str(now.year + 2)],
        4
    )

    # Month options: correct + 3 random others
    month_pool = [m for m in MONTHS_ALL if m != current_month]
    month_distractors = random.sample(month_pool, 3)
    month_options = [current_month] + month_distractors
    random.shuffle(month_options)

    # Adjacent months for approximate scoring
    month_idx = MONTHS_ALL.index(current_month)
    adjacent_months = []
    if month_idx > 0:
        adjacent_months.append(MONTHS_ALL[month_idx - 1])
    if month_idx < 11:
        adjacent_months.append(MONTHS_ALL[month_idx + 1])

    # Time of day: all 4 options, shuffled
    tod_options = TIME_OF_DAY_OPTIONS[:]
    random.shuffle(tod_options)

    # Location: shuffled (self-report)
    loc_options = random.sample(LOCATION_OPTIONS, min(4, len(LOCATION_OPTIONS)))

    # Day of week options
    day_pool = [d for d in DAYS_ALL if d != current_day]
    day_distractors = random.sample(day_pool, 3)
    day_options = [current_day] + day_distractors
    random.shuffle(day_options)

    # Season options
    season_options = SEASONS_ALL[:]
    random.shuffle(season_options)

    # Full pool of 6 question types
    all_questions = [
        {
            "id": "year",
            "label": "What year is it?",
            "correct": current_year,
            "options": year_options,
            "scoring": "exact"
        },
        {
            "id": "month",
            "label": "What month is it?",
            "correct": current_month,
            "adjacent": adjacent_months,
            "options": month_options,
            "scoring": "approximate"
        },
        {
            "id": "time_of_day",
            "label": "What time of day is it?",
            "correct": correct_tod,
            "options": tod_options,
            "scoring": "exact"
        },
        {
            "id": "location",
            "label": "Where are you right now?",
            "options": loc_options,
            "scoring": "self_report"
        },
        {
            "id": "day_of_week",
            "label": "What day of the week is it?",
            "correct": current_day,
            "options": day_options,
            "scoring": "exact"
        },
        {
            "id": "season",
            "label": "What season is it currently?",
            "correct": current_season,
            "options": season_options,
            "scoring": "exact"
        }
    ]

    # Pick a subset for variety (always include year and month for clinical validity)
    mandatory = [q for q in all_questions if q["id"] in ("year", "month")]
    optional = [q for q in all_questions if q["id"] not in ("year", "month")]
    remaining_count = max(0, pick_count - len(mandatory))
    picked_optional = random.sample(optional, min(remaining_count, len(optional)))

    selected = mandatory + picked_optional
    random.shuffle(selected)

    return selected


def generate_digit_span(difficulty_offset: int = 0, exclude_sequences: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Generate a random digit span sequence with variable length.
    Base length: 4, range: 3-6.
    """
    length = max(3, min(6, 4 + difficulty_offset))
    exclude_set = set(exclude_sequences or [])

    # Try up to 20 attempts to avoid reuse
    for _ in range(20):
        sequence = "".join([str(random.randint(1, 9)) for _ in range(length)])
        if sequence not in exclude_set:
            return {"expected": sequence, "length": length}

    # Fallback: return whatever we have
    sequence = "".join([str(random.randint(1, 9)) for _ in range(length)])
    return {"expected": sequence, "length": length}


def generate_visual_recognition(target_count: int = 4, distractor_count: int = 2, exclude_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Select target objects + distractors for visual recognition test.
    Returns targets (to show during encoding) and the full mixed set (for recognition).
    """
    available = [obj for obj in VISUAL_OBJECTS if obj["id"] not in (exclude_ids or [])]
    needed = target_count + distractor_count
    if len(available) < needed:
        available = VISUAL_OBJECTS[:]

    selected = random.sample(available, needed)
    targets = selected[:target_count]
    distractors = selected[target_count:]

    # Build mixed set (shuffled) for recognition phase
    mixed = targets[:] + distractors[:]
    random.shuffle(mixed)

    # Display duration: 6s for 3-4 items, 8s for 5+
    display_duration = 6000 if target_count <= 4 else 8000

    return {
        "targets": [{"id": t["id"], "emoji": t["emoji"], "label": t["label"]} for t in targets],
        "distractors": [{"id": d["id"], "emoji": d["emoji"], "label": d["label"]} for d in distractors],
        "mixed_set": [{"id": m["id"], "emoji": m["emoji"], "label": m["label"]} for m in mixed],
        "display_duration": display_duration
    }


def generate_visual_pattern(exclude_type: Optional[str] = None, exclude_types: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Generate a non-numeric visual pattern question using shapes/icons.
    Supports: alternating, repeating, growing, ascending, mirror, skip.
    """
    # Build exclusion set from both params
    type_exclusions = set()
    if exclude_type:
        type_exclusions.add(exclude_type)
    if exclude_types:
        type_exclusions.update(exclude_types)

    available_types = [t for t in PATTERN_TYPES if t not in type_exclusions]
    if not available_types:
        available_types = PATTERN_TYPES[:]  # Reset if all excluded

    pattern_type = random.choice(available_types)

    generators = {
        "alternating": _gen_alternating_pattern,
        "repeating": _gen_repeating_pattern,
        "growing": _gen_growing_pattern,
        "ascending": _gen_ascending_pattern,
        "mirror": _gen_mirror_pattern,
        "skip": _gen_skip_pattern,
    }

    return generators[pattern_type]()


def _gen_alternating_pattern() -> Dict[str, Any]:
    """A B A B ? → A"""
    symbols = random.sample(PATTERN_SYMBOLS, 4)
    a, b = symbols[0], symbols[1]
    sequence = [a, b, a, b]
    correct = a
    distractors = [s for s in symbols if s != correct][:3]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "alternating",
        "instruction": "What comes next?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def _gen_repeating_pattern() -> Dict[str, Any]:
    """A B C A B ? → C"""
    symbols = random.sample(PATTERN_SYMBOLS, 5)
    a, b, c = symbols[0], symbols[1], symbols[2]
    sequence = [a, b, c, a, b]
    correct = c
    distractors = [s for s in symbols if s != correct][:3]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "repeating",
        "instruction": "What comes next?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def _gen_growing_pattern() -> Dict[str, Any]:
    """⭐ ⭐⭐ ⭐⭐⭐ ? → ⭐⭐⭐⭐"""
    symbol = random.choice(PATTERN_SYMBOLS)
    sequence = [symbol * i for i in range(1, 4)]
    correct = symbol * 4

    distractors = [symbol * 3, symbol * 5, symbol * 2]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "growing",
        "instruction": "What comes next?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def _gen_ascending_pattern() -> Dict[str, Any]:
    """A AA AAA AAAA ? → AAAAA (count-based with different symbol)"""
    symbols = random.sample(PATTERN_SYMBOLS, 4)
    symbol = symbols[0]
    # Show 1, 2, 3 → answer is 4
    sequence = [symbol * i for i in range(1, 4)]
    correct = symbol * 4

    # Distractors: wrong counts or wrong symbols
    distractors = [symbol * 5, symbol * 3, symbols[1] * 4]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "ascending",
        "instruction": "What comes next in the count?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def _gen_mirror_pattern() -> Dict[str, Any]:
    """A B C B ? → A"""
    symbols = random.sample(PATTERN_SYMBOLS, 5)
    a, b, c = symbols[0], symbols[1], symbols[2]
    sequence = [a, b, c, b]
    correct = a
    distractors = [s for s in symbols if s != correct][:3]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "mirror",
        "instruction": "This pattern mirrors itself. What comes next?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def _gen_skip_pattern() -> Dict[str, Any]:
    """A X B X ? → A  (alternating with spacer)"""
    symbols = random.sample(PATTERN_SYMBOLS, 5)
    a, b, spacer = symbols[0], symbols[1], symbols[2]
    sequence = [a, spacer, b, spacer]
    # The pattern alternates: a, b then restarts → a
    correct = a
    distractors = [s for s in symbols if s != correct][:3]

    options_list = [correct] + distractors
    random.shuffle(options_list)
    options = {chr(65 + i): v for i, v in enumerate(options_list)}
    correct_key = [k for k, v in options.items() if v == correct][0]

    return {
        "type": "skip",
        "instruction": "Ignoring the spacer, what comes next?",
        "sequence": sequence,
        "options": options,
        "correct": correct_key
    }


def generate_fluency_category(exclude_categories: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Select a random verbal fluency category, avoiding recently used ones.
    """
    available = [c for c in FLUENCY_CATEGORIES if c not in (exclude_categories or [])]
    if not available:
        available = FLUENCY_CATEGORIES[:]

    category = random.choice(available)
    return {
        "category": category,
        "time_limit_seconds": 60,
        "instruction": f"Name as many {category} as you can in 60 seconds."
    }


# ============================================================
# STROOP TEST GENERATOR
# ============================================================

STROOP_COLORS = [
    {"name": "RED", "hex": "#DC3545"},
    {"name": "BLUE", "hex": "#0D6EFD"},
    {"name": "GREEN", "hex": "#198754"},
    {"name": "YELLOW", "hex": "#FFC107"},
]

def generate_stroop_trials(total: int = 7, incongruent_ratio: float = 0.71, time_limit_ms: int = 3000) -> Dict[str, Any]:
    """
    Generate Stroop Test trials for Level 3.
    """
    color_names = [c["name"] for c in STROOP_COLORS]
    color_map = {c["name"]: c["hex"] for c in STROOP_COLORS}

    num_incongruent = int(total * incongruent_ratio)
    num_congruent = total - num_incongruent

    trials = []

    for _ in range(num_congruent):
        color = random.choice(color_names)
        trials.append({
            "word": color,
            "color": color,
            "color_hex": color_map[color],
            "congruent": True
        })

    for _ in range(num_incongruent):
        word = random.choice(color_names)
        other_colors = [c for c in color_names if c != word]
        color = random.choice(other_colors)
        trials.append({
            "word": word,
            "color": color,
            "color_hex": color_map[color],
            "congruent": False
        })

    random.shuffle(trials)

    for i, trial in enumerate(trials):
        trial["index"] = i

    return {
        "trials": trials,
        "total": total,
        "time_limit_ms": time_limit_ms,
        "color_options": STROOP_COLORS
    }
