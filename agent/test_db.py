import os
from supabase import create_client
from dotenv import load_dotenv
import asyncio

load_dotenv()
_supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

async def test():
    try:
        res = _supabase.table("assignments").select("*").limit(1).execute()
        print("Assignments schema ok", res)
    except Exception as e:
        print("Error assignments:", e)
        
    try:
        res = _supabase.table("project_members").select("*").limit(1).execute()
        print("Project_members schema ok", res)
    except Exception as e:
        print("Error project_members:", e)

asyncio.run(test())
