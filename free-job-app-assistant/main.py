import os
import io
import docx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from pypdf import PdfReader
import google.generativeai as genai

import database
import scraper

app = FastAPI(title="Free Resume Optimizer & Job Tracker")

# Initialize SQLite DB on startup
database.init_db()

# Request schemas
class SettingsUpdate(BaseModel):
    gemini_api_key: str
    base_resume: str

class OptimizeRequest(BaseModel):
    job_description: str
    base_resume: Optional[str] = None

class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = ""
    link: Optional[str] = ""
    description: Optional[str] = ""
    status: Optional[str] = "Draft"
    tailored_resume: Optional[str] = ""
    notes: Optional[str] = ""

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tailored_resume: Optional[str] = None
    applied_date: Optional[str] = None
    notes: Optional[str] = None

# Ensure static directories exist relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

# Helper to configure Gemini
def get_gemini_client():
    api_key = database.get_setting("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is not configured. Please add it in settings.")
    genai.configure(api_key=api_key)
    return genai

@app.get("/api/settings")
def get_settings():
    return {
        "gemini_api_key": database.get_setting("gemini_api_key"),
        "base_resume": database.get_setting("base_resume")
    }

@app.post("/api/settings")
def update_settings(data: SettingsUpdate):
    database.save_setting("gemini_api_key", data.gemini_api_key)
    database.save_setting("base_resume", data.base_resume)
    return {"status": "success", "message": "Settings updated successfully"}

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename.lower()
    text = ""
    try:
        contents = await file.read()
        file_like = io.BytesIO(contents)
        
        if filename.endswith(".pdf"):
            reader = PdfReader(file_like)
            for page in reader.pages:
                text += page.extract_text() or ""
        elif filename.endswith(".docx"):
            doc = docx.Document(file_like)
            text = "\n".join([p.text for p in doc.paragraphs])
        elif filename.endswith(".txt"):
            text = contents.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")
            
        if not text.strip():
            raise HTTPException(status_code=400, detail="Failed to extract any text from the file.")
            
        return {"filename": file.filename, "text": text.strip()}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")

@app.get("/api/search")
def search_jobs(keywords: str, location: str, start: int = 0):
    return scraper.search_linkedin_jobs(keywords, location, start)

@app.get("/api/job-description/{job_id}")
def get_job_description(job_id: str):
    description = scraper.get_linkedin_job_description(job_id)
    if not description:
        raise HTTPException(status_code=404, detail="Could not retrieve job description from LinkedIn.")
    return {"description": description}

@app.post("/api/optimize")
def optimize_resume(req: OptimizeRequest):
    base_resume = req.base_resume or database.get_setting("base_resume")
    if not base_resume or not base_resume.strip():
        raise HTTPException(status_code=400, detail="Base resume is empty. Please upload or write a base resume first.")
        
    ai = get_gemini_client()
    
    system_prompt = (
        "You are an expert ATS resume optimizer.\n\n"
        "Your task is to revise the resume so it is optimized for Applicant Tracking Systems (ATS) and tailored to the target job (JD).\n\n"
        "Keyword Optimization: Extract the most important hard skills, technical terms, tools, certifications, and role-specific keywords from the JD. Naturally integrate these throughout the resume — especially in experience bullet points, summary, and skills section.\n\n"
        "Role Alignment: Identify responsibilities and achievements from the current resume that most closely match the target role. Rewrite bullet points to highlight quantifiable achievements, results, and leadership impact. Reorder or reframe content so the most role-aligned experiences are emphasized.\n\n"
        "Professional Voice: Use strong action verbs (Led, Launched, Optimized, Delivered, Drove, Built, Reduced, Increased). Focus on measurable outcomes where they exist in the original. Do NOT invent metrics.\n\n"
        "Bullet rules: Each bullet = action + what + outcome. Max 4-6 bullets per role. Max 2 pages total content.\n\n"
        "Final Output (STRICT — follow exactly):\n"
        "Return ONLY plain text. No Markdown. No asterisks. No ### headers. No horizontal rules. No bullet symbols like •.\n\n"
        "Use ONLY these section headers (ALL CAPS, on their own line):\n"
        "NAME\n"
        "CONTACT\n"
        "SUMMARY\n"
        "PROFESSIONAL EXPERIENCE\n"
        "EDUCATION\n"
        "SKILLS\n\n"
        "Separate sections with one blank line.\n"
        "For bullets use: - (hyphen + space)\n"
        "For job entries use exactly:\n"
        "COMPANY | LOCATION\n"
        "TITLE | DATES\n"
        "- bullet\n"
        "- bullet\n\n"
        "Do not invent facts, companies, dates, or metrics."
    )
    
    prompt = (
        "I am providing two pieces of information:\n\n"
        "My current resume:\n"
        f"{base_resume}\n\n"
        "A target job description (JD) for the role I am applying to:\n"
        f"{req.job_description}\n\n"
        "Generate the tailored resume exactly matching the specified format."
    )
    
    try:
        model = ai.GenerativeModel('gemini-2.5-flash', system_instruction=system_prompt)
        response = model.generate_content(prompt)
        return {"optimized_resume": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

# Job database endpoints
@app.get("/api/jobs")
def get_jobs():
    return database.get_all_jobs()

@app.get("/api/jobs/{job_id}")
def get_single_job(job_id: int):
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/jobs")
def add_job_record(job: JobCreate):
    job_id = database.add_job(
        title=job.title,
        company=job.company,
        location=job.location,
        link=job.link,
        description=job.description,
        status=job.status,
        tailored_resume=job.tailored_resume,
        notes=job.notes
    )
    return {"status": "success", "job_id": job_id}

@app.put("/api/jobs/{job_id}")
def update_job_record(job_id: int, job: JobUpdate):
    update_data = {k: v for k, v in job.dict().items() if v is not None}
    database.update_job(job_id, **update_data)
    return {"status": "success", "message": "Job updated successfully"}

@app.delete("/api/jobs/{job_id}")
def delete_job_record(job_id: int):
    database.delete_job(job_id)
    return {"status": "success", "message": "Job deleted successfully"}

# Catch-all for serving index.html
@app.get("/")
def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

# Serve other static files
app.mount("/", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
