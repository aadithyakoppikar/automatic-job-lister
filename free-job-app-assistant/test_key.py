import google.generativeai as genai
import sys
import os

api_key = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=api_key)

print("Attempting to list models...")
try:
    for m in genai.list_models():
        print(f"Model: {m.name}, Supported Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error listing models: {e}")
