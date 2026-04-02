import urllib.request as r
import urllib.error as e

req = r.Request(
    'http://localhost:8000/cognitive/history?patient_id=test_patient_id',
    headers={'Authorization': 'Bearer TEST_TOKEN'}
)

try:
    response = r.urlopen(req)
    print("STATUS:", response.getcode())
    print("BODY:", response.read().decode())
except e.HTTPError as ex:
    print("HTTP ERROR CODE:", ex.code)
    print("HTTP ERROR BODY:", ex.read().decode())
except Exception as ex:
    print("OTHER ERROR:", ex)
