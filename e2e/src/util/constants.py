import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

NEXT_PUBLIC_APP_URL = os.getenv("NEXT_PUBLIC_APP_URL") or "http://localhost:3000"
USER_PASSWORDS = os.getenv("BASE_USER_PASSWORDS_MAP") or "{}"
ENVIRONMENT = os.getenv("NEXT_PUBLIC_ENVIRONMENT")
VERCEL_AUTOMATION_BYPASS_SECRET = os.getenv("VERCEL_AUTOMATION_BYPASS_SECRET") or ""
