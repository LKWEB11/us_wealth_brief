import json
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
import os
import sys

# Constants
SERVICE_ACCOUNT_PATH = r"C:\Users\LAVANKUMAR\Desktop\us-wealth-brief-firebase-adminsdk-fbsvc-17a896044e.json"
GEMINI_API_KEY = ""

print("Initializing Firebase...")
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Initializing Gemini API...")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

prompt = """
You are a professional financial journalist. 
Generate 30 high-CPC news headlines and brief summaries (finance, tech, insurance, wealth management) targeted at a USA audience.
Return strictly a JSON array of objects. Each object must have "title" and "summary". Do not include markdown formatting like ```json.
"""

print("Generating news from Gemini...")
response = model.generate_content(prompt)
text = response.text.replace("```json", "").replace("```", "").strip()

try:
    articles = json.loads(text)
    if not isinstance(articles, list) or len(articles) == 0:
        raise ValueError("Invalid format returned from Gemini")
        
    print(f"Successfully generated {len(articles)} articles.")
    
    print("Saving to Firebase Firestore...")
    doc_ref = db.collection('news').document('daily_feed')
    doc_ref.set({
        'articles': articles,
        'updatedAt': firestore.SERVER_TIMESTAMP
    })
    print("Done! Data saved to Firebase.")
except Exception as e:
    print(f"Error parsing or saving data: {e}")
    sys.exit(1)
