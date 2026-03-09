import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
import supabase_client as db

async def test():
    try:
        # Get a real task and user
        res_t = db._supabase.table("tasks").select("id").limit(1).execute()
        res_u = db._supabase.table("profiles").select("id").limit(1).execute()
        
        if res_t.data and res_u.data:
            t_id = res_t.data[0]["id"]
            u_id = res_u.data[0]["id"]
            print(f"Assigning {u_id} to {t_id}")
            await db.assign_user_to_task(t_id, u_id)
            print("Assign task OK")
        else:
            print("No task or user found")
    except Exception as e:
        print("Error assign task:", e)
        
    try:
        # Get a real project and user
        res_p = db._supabase.table("projects").select("id").limit(1).execute()
        if res_p.data and res_u.data:
            p_id = res_p.data[0]["id"]
            u_id = res_u.data[0]["id"]
            print(f"Adding {u_id} to {p_id}")
            await db.add_project_member(p_id, u_id)
            print("Add project member OK")
        else:
            print("No project or user found")
    except Exception as e:
        print("Error add project member:", e)

if __name__ == "__main__":
    asyncio.run(test())
