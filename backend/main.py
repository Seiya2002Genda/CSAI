from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests, xml.etree.ElementTree as ET

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/search")
def search_all(q: str):
    results = []

    # === arXiv ===
    arxiv_url = f"https://export.arxiv.org/api/query?search_query=all:{q}&max_results=30"
    try:
        xml = requests.get(arxiv_url, timeout=10).text
        root = ET.fromstring(xml)
        for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
            title = entry.find("{http://www.w3.org/2005/Atom}title").text.strip()
            summary = entry.find("{http://www.w3.org/2005/Atom}summary").text.strip()
            link = entry.find("{http://www.w3.org/2005/Atom}id").text
            authors = [a.find("{http://www.w3.org/2005/Atom}name").text for a in entry.findall("{http://www.w3.org/2005/Atom}author")]
            results.append({
                "source": "arXiv",
                "title": title,
                "authors": ", ".join(authors),
                "summary": summary,
                "url": link
            })
    except Exception as e:
        print("arXiv error:", e)

    # === Google Scholar (via SerpAPI) ===
    serp_key = "YOUR_SERPAPI_KEY"  # ← 自分のAPIキーを入れる
    serp_url = f"https://serpapi.com/search.json?engine=google_scholar&q={q}&api_key={serp_key}"
    try:
        serp_data = requests.get(serp_url, timeout=10).json()
        for item in serp_data.get("organic_results", []):
            results.append({
                "source": "Google Scholar",
                "title": item.get("title"),
                "authors": item.get("publication_info", {}).get("summary", ""),
                "summary": item.get("snippet", ""),
                "url": item.get("link")
            })
    except Exception as e:
        print("Scholar error:", e)

    return {"results": results}
