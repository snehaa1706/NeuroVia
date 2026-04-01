import asyncio
import httpx
import json

async def main():
    async with httpx.AsyncClient() as client:
        # Generate activity
        generate_req = {
            "patient_id": "mock",
            "activity_type": "memory_recall",
            "difficulty": "easy"
        }
        gen_res = await client.post("http://localhost:8000/activities/generate-activity", json=generate_req)
        # Wait, the generate route is /ai/generate-activity
        gen_res = await client.post("http://localhost:8000/ai/generate-activity", json=generate_req, headers={"Authorization": "Bearer TEST_TOKEN"})
        print("GENERATE:", gen_res.text)
        if gen_res.status_code != 200:
            return
            
        activity = gen_res.json()["activity"]
        act_id = activity["id"]
        
        # Submit activity with random values
        submit_req = {
            "responses": {
                "q0": "random1",
                "q1": "random2",
                "q2": "random3"
            }
        }
        submit_res = await client.post(f"http://localhost:8000/activities/{act_id}/submit", json=submit_req, headers={"Authorization": "Bearer TEST_TOKEN"})
        print("SUBMIT STATUS:", submit_res.status_code)
        print("SUBMIT:", submit_res.text)

if __name__ == "__main__":
    asyncio.run(main())
