import requests
res = requests.get('http://localhost:8001/openapi.json')
print('status', res.status_code)
print('paths', list(res.json()['paths'].keys())[:10])
