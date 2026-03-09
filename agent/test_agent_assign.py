import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
import supabase_client as db
from agent import process_message

async def test():
    res_user = db._supabase.table("profiles").select("id").eq("email", "igoorstraviinsky@gmail.com").execute()
    if res_user.data:
        u_id = res_user.data[0]["id"]
        res_task = db._supabase.table("tasks").select("title").eq("creator_id", u_id).limit(1).execute()
        if res_task.data:
            t_title = res_task.data[0]["title"]
            print(f"Testing with user {u_id} and task {t_title}")
            reply = await process_message("5511999999999", f"atribua jhon na tarefa {t_title}", u_id)
            print("Agent reply:", reply)
        else:
            print("No task found for user")
    else:
        print("User not found")

if __name__ == "__main__":
    asyncio.run(test())
