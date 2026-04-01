import requests

base = 'http://localhost:8001/screening'
headers = {'Authorization': 'Bearer dummy_dev_token'}

r = requests.post(f'{base}/start', headers=headers, timeout=5)
print('start', r.status_code)
assessment_id = r.json()['assessment_id']

payload1 = {
    'ad8_answers': {f'q{i+1}': False for i in range(8)},
    'orientation_answers': {},
    'recall_words': {'response': [], 'dont_remember': True}
}
r1 = requests.post(f'{base}/{assessment_id}/level1', json=payload1, headers=headers, timeout=5)
print('l1', r1.status_code)

payload2 = {
    'animals': ['apple', 'banana'],
    'digit_span_forward': {'response': '12345', 'dont_remember': False},
    'digit_span_backward': {'response': '54321', 'dont_remember': False},
    'visual_recognition_selected': ['apple'],
    'pattern_answer': 'A',
    'delayed_recall': {'response': [], 'dont_remember': True}
}
r2 = requests.post(f'{base}/{assessment_id}/level2', json=payload2, headers=headers, timeout=5)
print('l2', r2.status_code)
print('l2body', r2.text)
