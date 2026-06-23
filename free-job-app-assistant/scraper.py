import requests
from bs4 import BeautifulSoup
import re
import urllib.parse

def clean_html(html_content):
    if not html_content:
        return ""
    # Replace breaks with newlines
    html = re.sub(r'<br\s*/?>', '\n', html_content)
    html = re.sub(r'</?(li|p|div|h[1-6])[^>]*>', '\n', html)
    # Remove all other HTML tags
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()
    # Replace common HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    # Normalize multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def search_linkedin_jobs(keywords, location, start=0):
    url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    params = {
        "keywords": keywords,
        "location": location,
        "start": start
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code != 200:
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        jobs = []
        for li in soup.find_all('li'):
            title_el = li.find('h3', class_='base-search-card__title')
            company_el = li.find('h4', class_='base-search-card__subtitle')
            location_el = li.find('span', class_='job-search-card__location')
            link_el = li.find('a', class_='base-card__full-link')
            
            title = title_el.text.strip() if title_el else None
            company = company_el.text.strip() if company_el else None
            location_str = location_el.text.strip() if location_el else None
            
            link = ""
            job_id = ""
            if link_el and 'href' in link_el.attrs:
                link = link_el['href'].split('?')[0]
                # Extract Job ID from URL
                match = re.search(r'/view/.*?(\d+)', link)
                if match:
                    job_id = match.group(1)
            
            if title and company:
                jobs.append({
                    "id": job_id,
                    "title": title,
                    "company": company,
                    "location": location_str,
                    "link": link
                })
        return jobs
    except Exception as e:
        print(f"Error searching jobs: {e}")
        return []

def get_linkedin_job_description(job_id):
    url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return ""
            
        soup = BeautifulSoup(response.text, 'html.parser')
        desc_el = soup.find('div', class_='description__text') or soup.find('div', class_='show-more-less-html__markup')
        
        if desc_el:
            # We want to keep some structure, but strip out complex tags
            return clean_html(str(desc_el))
        return ""
    except Exception as e:
        print(f"Error fetching job description: {e}")
        return ""
