import urllib.request
import sys

url = "https://bluorng.com/collections/new-in"
out = "bluorng-new-in.html"
urllib.request.urlretrieve(url, out)
with open(out, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()
print(f"Downloaded {len(content)} bytes")
# Search keywords
keywords = ["flashlight", "torch", "Advance Filters", "mobile-facets", "facets__open", "icon-flashlight"]
for kw in keywords:
    count = content.lower().count(kw.lower())
    if count:
        print(f"  {kw}: {count} occurrences")
