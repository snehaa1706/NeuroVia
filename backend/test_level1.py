import urllib.request
import json

data = {
    "ad8_answers": {"q1": True, "q2": False, "q3": False, "q4": False, "q5": False, "q6": False, "q7": False, "q8": False},
    "orientation_answers": {"year": "2026", "month": "March", "date": "28", "location": "Bengaluru"},
    "recall_words": ["Apple"]
}

req = urllib.request.Request(
    'http://localhost:8000/screening/start',
    method='POST',
    headers={'Authorization': 'Bearer dummy_dev_token'}
)
resp = urllib.request.urlopen(req)
start_data = json.loads(resp.read().decode())
print("STARTED:", start_data)

aid = start_data['assessment_id']

req2 = urllib.request.Request(
    f'http://localhost:8000/screening/{aid}/level1',
    method='POST',
    headers={'Authorization': 'Bearer dummy_dev_token', 'Content-Type': 'application/json'},
    data=json.dumps(data).encode('utf-8')
)
try:
    resp2 = urllib.request.urlopen(req2)
    print("SUCCESS:", resp2.read().decode())
except Exception as e:
    print("FAILED:", e)
    if hasattr(e, 'read'):
        print("DETAILS:", e.read().decode())
