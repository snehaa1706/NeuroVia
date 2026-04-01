import traceback
from app.services.db_service import AssessmentDBService

user_id = "00000000-0000-0000-0000-000000000000"

print("1. Creating Assessment")
ass = AssessmentDBService.create_assessment(user_id, 1)
aid = ass["id"]

try:
    print("2. Insert Response")
    AssessmentDBService.insert_assessment_response(aid, user_id, 1, {"q1":True})
except Exception as e:
    print("FAILED AT 2:")
    traceback.print_exc()

try:
    print("3. Insert Result")
    AssessmentDBService.insert_assessment_result(aid, user_id, "level1", 0.5, 0.5)
except Exception as e:
    print("FAILED AT 3:")
    traceback.print_exc()

try:
    print("4. Insert Recommendation")
    AssessmentDBService.insert_recommendation(aid, user_id, "Do this")
except Exception as e:
    print("FAILED AT 4:")
    traceback.print_exc()

try:
    print("5. Update Status")
    AssessmentDBService.update_assessment_status(aid, user_id, "in_progress", 2)
except Exception as e:
    print("FAILED AT 5:")
    traceback.print_exc()
