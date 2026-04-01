import requests, json

# Start an assessment
r = requests.post('http://localhost:8000/screening/start', headers={'Authorization': 'Bearer dummy_dev_token'})
data = r.json()
aid = data['assessment_id']
print('=== Assessment started:', aid)
print('Recall words:', data.get('level1_context', {}).get('recall_words'))

orient_qs = data.get('level1_context', {}).get('orientation', {}).get('questions', [])
print('\n=== Orientation Questions:')
for q in orient_qs:
    print(f"  {q['id']}: {q['label']}")

# Submit L1 with BAD answers to force advance to L2
# AD8 all yes (high concern), wrong orientation, wrong recall
orient_answers = {}
for q in orient_qs:
    orient_answers[q['id']] = q['options'][-1]  # pick LAST option (likely wrong)

payload = {
    'ad8_answers': {f'q{i+1}': True for i in range(8)},  # all yes = high risk
    'orientation_answers': orient_answers,
    'recall_words': ['wrongword1', 'wrongword2']  # intentionally wrong recall
}

r2 = requests.post(f'http://localhost:8000/screening/{aid}/level1',
                    headers={'Authorization': 'Bearer dummy_dev_token'},
                    json=payload)
print('\n=== L1 Status:', r2.status_code)
l1_result = r2.json()
print('Cognitive score:', l1_result.get('cognitive_score'))
print('Risk band:', l1_result.get('risk_band'))
print('Next step:', l1_result.get('next_step'))

l2_ctx = l1_result.get('level2_context', {})
print('\n=== L2 Context Keys:', list(l2_ctx.keys()) if l2_ctx else 'NONE')

if l2_ctx:
    stroop = l2_ctx.get('stroop', {})
    if stroop:
        print(f"\n=== STROOP IN L2: YES")
        print(f"  Total trials: {stroop.get('total')}")
        print(f"  Time limit: {stroop.get('time_limit_ms')}ms")
        print(f"  Color options: {[c['name'] for c in stroop.get('color_options', [])]}")
        incongruent = sum(1 for t in stroop.get('trials', []) if not t.get('congruent'))
        congruent = sum(1 for t in stroop.get('trials', []) if t.get('congruent'))
        print(f"  Incongruent: {incongruent}, Congruent: {congruent}")
        print(f"  Sample trial: {json.dumps(stroop.get('trials', [{}])[0], indent=2)}")
    else:
        print("\n=== STROOP IN L2: MISSING!")

    pattern = l2_ctx.get('visual_pattern', {})
    if pattern:
        print(f"\n=== PATTERN IN L2: YES")
        print(f"  Type: {pattern.get('type')}")
        print(f"  Sequence: {pattern.get('sequence')}")
        print(f"  Options: {list(pattern.get('options', {}).keys())}")
    else:
        print("\n=== PATTERN IN L2: MISSING!")

    print(f"\n=== All L2 Components:")
    for key in l2_ctx:
        print(f"  - {key}")
else:
    print("\nDid not advance to L2. Risk band:", l1_result.get('risk_band'))
