import requests
from bs4 import BeautifulSoup
import json

def test_scrape():
    url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    params = {
        "keywords": "Software Engineer",
        "location": "San Francisco, CA",
        "start": 0
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*"
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print("Status code:", response.status_code)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            jobs = []
            for li in soup.find_all('li'):
                # Try to find job card details
                # The public guest search li structure has job-card-container or class containing elements
                title_el = li.find('h3', class_='base-search-card__title')
                company_el = li.find('h4', class_='base-search-card__subtitle')
                location_el = li.find('span', class_='job-search-card__location')
                link_el = li.find('a', class_='base-card__full-link')
                
                title = title_el.text.strip() if title_el else None
                company = company_el.text.strip() if company_el else None
                location = location_el.text.strip() if location_el else None
                link = link_el['href'].split('?')[0] if link_el and 'href' in link_el.attrs else None
                
                if title and company:
                    jobs.append({
                        "title": title,
                        "company": company,
                        "location": location,
                        "link": link
                    })
            print(f"Scraped {len(jobs)} jobs:")
            print(json.dumps(jobs[:3], indent=2))
        else:
            print("Content:", response.text[:500])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_scrape()
