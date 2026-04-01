import asyncio
from app.database import supabase_admin

async def test():
    try:
        res = supabase_admin.table('assessments').insert({'user_id': '00000000-0000-0000-0000-000000000000', 'level': 1, 'status': 'in_progress'}).execute()
        print("SUCCESS:", res)
    except Exception as e:
        print("ERROR DETAILS:", repr(e))

if __name__ == "__main__":
    asyncio.run(test())
