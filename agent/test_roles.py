import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
import supabase_client as db

async def test():
    try:
        res = db._supabase.table("profiles").select("id, full_name, email, role").execute()
        for p in res.data:
            print(f"Profile: {p['full_name']} | Role: {p.get('role')} | Email: {p['email']}")
    except Exception as e:
        print("Error profiles:", e)

if __name__ == "__main__":
    asyncio.run(test())
