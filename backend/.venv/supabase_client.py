from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Use ANON KEY — required for OTP sign-in, signup, magic link, etc.
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
