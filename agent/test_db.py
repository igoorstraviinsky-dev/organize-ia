import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get("SUPABASE_SERVICE_KEY")
url = os.environ.get("SUPABASE_URL")

print(f"URL: {url}")
print(f"Key starts with: {key[:30]}...")

supabase: Client = create_client(url, key)

res = supabase.table("integrations").select("*").execute()
print(f"Integrations (Anon/Service check): {len(res.data)} items found")
if len(res.data) > 0:
    print(res.data[0])
