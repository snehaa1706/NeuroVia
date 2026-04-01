import requests
for aid in ['abc', '123', 'a1b2', 'a229d489-8ca6-4a03-b5ee-be789666bd06']:
    url = f'http://localhost:8000/screening/{aid}/level1'
    try:
        res = requests.post(url, json={'ad8_answers': {}, 'orientation_answers': {}, 'recall_words': {'response': [], 'dont_remember': True}}, headers={'Authorization': 'Bearer dummy_dev_token'})
        print(aid, res.status_code, res.text)
    except Exception as e:
        print(aid, 'ERROR', e)
