import requests

assessment_id = 'a229d489-8ca6-4a03-b5ee-be789666bd06'
url = f'http://localhost:8000/screening/{assessment_id}/level2'
headers = {'Authorization': 'Bearer dummy_dev_token'}
payload = {
    'animals': ['apple', 'banana'],
    'digit_span_forward': {'response': '12345', 'dont_remember': False},
    'digit_span_backward': {'response': '54321', 'dont_remember': False},
    'visual_recognition_selected': ['apple'],
    'pattern_answer': 'A',
    'delayed_recall': {'response': ['lip','fox'], 'dont_remember': False}
}
res = requests.post(url, json=payload, headers=headers)
print('status', res.status_code)
print('text', res.text)
