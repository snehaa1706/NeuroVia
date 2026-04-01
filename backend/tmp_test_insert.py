import sys
sys.path.insert(0, r'C:\Users\91974\Desktop\Projects\Neurovia\backend')
from app.services import db_service

print('supabase_admin type:', type(db_service.supabase_admin))
ass = db_service.AssessmentDBService.create_assessment('00000000-0000-0000-0000-000000000000', level=1)
print('created assessment', ass)
res = db_service.AssessmentDBService.insert_assessment_result(ass['id'], '00000000-0000-0000-0000-000000000000', 'level1', 0.75, 0.25)
print('insert result', res)
