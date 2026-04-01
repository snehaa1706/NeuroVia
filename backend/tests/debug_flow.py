"""Debug script: Test full L1 -> L2 -> L3 flow and print all context keys."""
import requests, json

BASE = "http://localhost:8000/screening"
HEADERS = {"Authorization": "Bearer dummy_dev_token"}

# 1. Start
print("=" * 60)
print("STEP 1: Start Assessment")
r1 = requests.post(f"{BASE}/start", headers=HEADERS)
data1 = r1.json()
aid = data1["assessment_id"]
print(f"  assessment_id: {aid}")
print(f"  level1_context keys: {list(data1.get('level1_context', {}).keys()) if data1.get('level1_context') else 'NONE'}")

l1ctx = data1.get("level1_context", {})
orientation_qs = l1ctx.get("orientation", {}).get("questions", [])
recall_words = l1ctx.get("recall_words", [])
print(f"  orientation questions count: {len(orientation_qs)}")
if orientation_qs:
    print(f"    first question: {orientation_qs[0]}")
print(f"  recall_words: {recall_words}")

# 2. Submit Level 1 (deliberately bad answers to force L2)
print("\n" + "=" * 60)
print("STEP 2: Submit Level 1")
ad8 = {f"q{i}": True for i in range(1, 9)}  # all "yes" = high risk
orient_answers = {}
for q in orientation_qs:
    opts = q.get("options", [])
    orient_answers[q["id"]] = opts[-1] if opts else "wrong"  # pick last option (likely wrong)

l1_payload = {
    "ad8_answers": ad8,
    "orientation_answers": orient_answers,
    "recall_words": ["wrong1", "wrong2"]
}
r2 = requests.post(f"{BASE}/{aid}/level1", headers=HEADERS, json=l1_payload)
data2 = r2.json()
print(f"  status: {r2.status_code}")
print(f"  current_level: {data2.get('current_level')}")
print(f"  next_step: {data2.get('next_step')}")
print(f"  risk_band: {data2.get('risk_band')}")
print(f"  level2_context keys: {list(data2.get('level2_context', {}).keys()) if data2.get('level2_context') else 'NONE'}")

l2ctx = data2.get("level2_context", {})
if l2ctx:
    print(f"    digit_span: {'YES' if l2ctx.get('digit_span') else 'NO'}")
    print(f"    visual_recognition: {'YES' if l2ctx.get('visual_recognition') else 'NO'}")
    print(f"    visual_pattern: {'YES' if l2ctx.get('visual_pattern') else 'NO'}")
    print(f"    verbal_fluency: {'YES' if l2ctx.get('verbal_fluency') else 'NO'}")
    print(f"    stroop (should be NO): {'YES' if l2ctx.get('stroop') else 'NO'}")

# 3. Submit Level 2 (deliberately bad answers to force L3)
if data2.get("next_step") == "LEVEL2":
    print("\n" + "=" * 60)
    print("STEP 3: Submit Level 2")
    vr_ids = [obj["id"] for obj in l2ctx.get("visual_recognition", {}).get("mixed_set", [])[:1]]
    pattern_opts = list(l2ctx.get("visual_pattern", {}).get("options", {}).keys())
    l2_payload = {
        "animals": ["cat"],
        "digit_span_forward": "0000",
        "digit_span_backward": "0000",
        "visual_recognition_selected": vr_ids,
        "pattern_answer": pattern_opts[-1] if pattern_opts else "D",
        "delayed_recall": ["wrong"]
    }
    r3 = requests.post(f"{BASE}/{aid}/level2", headers=HEADERS, json=l2_payload)
    data3 = r3.json()
    print(f"  status: {r3.status_code}")
    print(f"  current_level: {data3.get('current_level')}")
    print(f"  next_step: {data3.get('next_step')}")
    print(f"  risk_band: {data3.get('risk_band')}")
    print(f"  level3_context keys: {list(data3.get('level3_context', {}).keys()) if data3.get('level3_context') else 'NONE'}")
    
    l3ctx = data3.get("level3_context", {})
    if l3ctx:
        stroop = l3ctx.get("stroop", {})
        print(f"    stroop.trials count: {len(stroop.get('trials', []))}")
        print(f"    stroop.total: {stroop.get('total')}")
        print(f"    stroop.color_options: {stroop.get('color_options')}")
    else:
        print("  *** NO level3_context returned! ***")
else:
    print("\n  Skipping L2 — assessment completed at L1.")

print("\n" + "=" * 60)
print("DONE")
