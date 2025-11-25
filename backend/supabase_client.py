from supabase import create_client
import os
from dotenv import load_dotenv
from pathlib import Path

# Load backend/.env first (common place to keep server secrets). Fall back to project root .env.
env_path = Path(__file__).resolve().parent / '.env'
if env_path.exists():
	load_dotenv(dotenv_path=str(env_path))
else:
	# fallback: load .env from current working directory if present
	load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


# Use ANON KEY — required for OTP sign-in, signup, magic link, etc.
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
	# Create a dummy supabase object that surfaces clear errors at runtime
	class _DummyQuery:
		def __init__(self, *args, **kwargs):
			pass

		def select(self, *args, **kwargs):
			return self

		def insert(self, *args, **kwargs):
			return self

		def update(self, *args, **kwargs):
			return self

		def delete(self, *args, **kwargs):
			return self

		def eq(self, *args, **kwargs):
			return self

		def contains(self, *args, **kwargs):
			return self

		def range(self, *args, **kwargs):
			return self

		def limit(self, *args, **kwargs):
			return self

		def ilike(self, *args, **kwargs):
			return self

		def execute(self, *args, **kwargs):
			raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env")

	class _DummyStorage:
		def from_(self, *args, **kwargs):
			raise RuntimeError("Supabase storage not available because SUPABASE_URL/KEY are not set")

	class _DummyAuth:
		def get_user(self, *args, **kwargs):
			raise RuntimeError("Supabase auth not available because SUPABASE_URL/KEY are not set")

		class api:
			@staticmethod
			def get_user(*args, **kwargs):
				raise RuntimeError("Supabase auth API not available because SUPABASE_URL/KEY are not set")

	class _DummySupabase:
		def table(self, *args, **kwargs):
			return _DummyQuery()

		@property
		def storage(self):
			return _DummyStorage()

		@property
		def auth(self):
			return _DummyAuth()

	supabase = _DummySupabase()
else:
	supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
