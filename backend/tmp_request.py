import requests

url = 'http://localhost:8000/screening/start'
headers = {'Authorization': 'Bearer dummy_dev_token'}
response = requests.post(url, headers=headers)
print('status', response.status_code)
print('body', response.text)
