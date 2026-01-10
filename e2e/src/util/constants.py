import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

APP_URL = os.getenv("APP_URL") or "http://localhost:3000"
