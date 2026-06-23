import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "jobs.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    # Create jobs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        link TEXT UNIQUE,
        description TEXT,
        tailored_resume TEXT,
        status TEXT DEFAULT 'Draft', -- Draft, Applied, Interviewing, Offer, Rejected
        applied_date TEXT,
        notes TEXT
    )
    """)
    
    # Insert default settings if they don't exist
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('gemini_api_key', '')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('base_resume', '')")
    
    conn.commit()
    conn.close()

def get_setting(key, default=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row['value']
    return default

def save_setting(key, value):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_all_jobs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_job(job_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def add_job(title, company, location, link, description, status="Draft", tailored_resume="", applied_date=None, notes=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO jobs (title, company, location, link, description, status, tailored_resume, applied_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (title, company, location, link, description, status, tailored_resume, applied_date, notes))
        conn.commit()
        job_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        # If link already exists, update description or get existing ID
        cursor.execute("SELECT id FROM jobs WHERE link = ?", (link,))
        row = cursor.fetchone()
        job_id = row['id'] if row else None
    conn.close()
    return job_id

def update_job(job_id, **kwargs):
    if not kwargs:
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    
    fields = []
    values = []
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        values.append(v)
    
    values.append(job_id)
    query = f"UPDATE jobs SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()

def delete_job(job_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
