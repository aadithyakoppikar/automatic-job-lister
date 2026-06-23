import requests
from bs4 import BeautifulSoup

def test_job_desc(job_id):
    url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=10)
    print("Status code:", response.status_code)
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # In guest job description pages, the description is usually in a div with class "description__text"
        desc_el = soup.find('div', class_='description__text') or soup.find('div', class_='show-more-less-html__markup')
        if desc_el:
            print("Description found!")
            print(desc_el.text.strip()[:1000])
        else:
            print("Description element not found. Page HTML:")
            print(response.text[:2000])
    else:
        print("Failed to fetch. Content:", response.text[:500])

if __name__ == "__main__":
    import sys
    job_id = "4318514364"
    if len(sys.argv) > 1:
        job_id = sys.argv[1]
    test_job_desc(job_id)
