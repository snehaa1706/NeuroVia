import requests
url = 'http://localhost:8000/openapi.json'
res = requests.get(url)
print('status', res.status_code)
data = res.json()
print(list(data['paths'].keys())[:20])
