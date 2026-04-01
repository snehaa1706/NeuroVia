import asyncio
from app.routers.screening import start_screening, submit_level1, submit_level2
from app.models.assessment import Level1Request
from app.services.db_service import AssessmentDBService

async def run():
    print("Testing full flow...")
    user_id = "test_user_for_diagnostic_123"
    try:
        # Start
        start_res = await start_screening(user_id=user_id)
        aid = start_res["assessment_id"]
        print("Started:", aid)

        # Build payload for Level 1 that should fail (give high risk) to force advance to Level 2
        # If we answer everything wrong, score is 0, risk is high, advances to next step
        metadata = AssessmentDBService.get_assessment_metadata(aid, user_id)
        # Just send dummy answers
        or_ans = {}
        for q in metadata["orientation"]["questions"]:
            or_ans[q["id"]] = "wrong_answer"
        
        req = Level1Request(
            ad8_answers={"q1":True, "q2":True, "q3":True, "q4":True, "q5":True, "q6":True, "q7":True, "q8":True}, # 8/8 indicates high risk
            orientation_answers=or_ans,
            recall_words=["wrong", "words"]
        )

        res_l1 = await submit_level1(assessment_id=aid, request=req, user_id=user_id)
        ctx = res_l1.level2_context
        
        if ctx:
            print("Visual Recognition generated?", "visual_recognition" in ctx)
            print("Visual Pattern generated?", "visual_pattern" in ctx)
            print(ctx.get("visual_recognition", "Missing!"))
        else:
            print("Level 2 context was NONE (next_step was:", res_l1.next_step, ")")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
