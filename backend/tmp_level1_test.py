import requests
assessment_id = 'a229d489-8ca6-4a03-b5ee-be789666bd06'
url = f'http://localhost:8000/screening/{assessment_id}/level1'
headers = {'Authorization': 'Bearer dummy_dev_token'}
payload = {
    'ad8_answers': {'q1': False, 'q2': False, 'q3': False, 'q4': False, 'q5': False, 'q6': False, 'q7': False, 'q8': False},
    'orientation_answers': {},
    'recall_words': {'response': [], 'dont_remember': True}
}
res = requests.post(url, json=payload, headers=headers)
print('status', res.status_code)
print('body', res.text)
