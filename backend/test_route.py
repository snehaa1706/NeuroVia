import asyncio
import traceback
from app.routers.screening import submit_level1
from app.models.assessment import Level1Request
from app.services.db_service import AssessmentDBService

async def main():
    try:
        ass = AssessmentDBService.create_assessment("00000000-0000-0000-0000-000000000000", 1)
        req = Level1Request(
            ad8_answers={"q1":True,"q2":False,"q3":False,"q4":False,"q5":False,"q6":False,"q7":False,"q8":False},
            orientation_answers={"year":"2026", "month":"March", "date":"28", "location":"City"},
            recall_words=["Apple"]
        )
        res = await submit_level1(ass["id"], req, "00000000-0000-0000-0000-000000000000")
        print("FINAL", res)
    except Exception as e:
        print("CAUGHT:", repr(e))
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
