import google.generativeai as genai
import sys
import os

api_key = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=api_key)

print("Attempting generation using gemini-3.5-flash...")
try:
    model = genai.GenerativeModel('gemini-3.5-flash')
    response = model.generate_content("Say hello in one word.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
